import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import { api, API_URL } from "./api.ts";

const requireApi = createRequire(new URL("../../api/package.json", import.meta.url));
const Fastify = requireApi("fastify");

function capture(t, response = new Response('{"ok":true}', {status:200})) {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, init) => { calls.push({url,init}); return response.clone(); });
  return calls;
}

test("mutations without a body never invent JSON headers or a payload", async t => {
  const calls = capture(t);
  for (const method of ["POST","PUT","PATCH","DELETE"]) for (const body of [undefined,null]) {
    await api(`/contract/${method.toLowerCase()}`, {method,body});
    const request = calls.at(-1).init;
    assert.equal(request.body, body);
    assert.equal(new Headers(request.headers).has("content-type"), false);
    assert.equal(request.credentials, "include");
  }
});

test("serialized JSON remains byte-for-byte intact for all mutation methods", async t => {
  const calls = capture(t);
  for (const method of ["POST","PUT","PATCH","DELETE"]) for (const value of [{}, {name:"María",enabled:true,items:[1,2]}, [], false, 0, null]) {
    const body = JSON.stringify(value);
    await api("/contract/payload", {method,body});
    const request = calls.at(-1).init;
    assert.equal(request.body, body);
    assert.deepEqual(JSON.parse(request.body), value);
    assert.equal(new Headers(request.headers).get("content-type"), "application/json");
  }
});

test("GET without a body keeps credentials, URL and response behavior", async t => {
  const calls = capture(t);
  assert.deepEqual(await api("/contract/read"), {ok:true});
  assert.equal(calls[0].url, API_URL+"/contract/read");
  assert.equal(calls[0].init.body, undefined);
  assert.equal(new Headers(calls[0].init.headers).has("content-type"), false);
});

test("explicit object, tuple and Headers inputs are preserved case-insensitively", async t => {
  const calls = capture(t);
  for (const headers of [{"Content-Type":"application/problem+json","X-Trace":"trace"}, [["Content-Type","application/problem+json"],["X-Trace","trace"]], new Headers({"Content-Type":"application/problem+json","X-Trace":"trace"})]) {
    const before = [...new Headers(headers)];
    await api("/contract/custom", {method:"POST",body:"{}",headers});
    const actual = new Headers(calls.at(-1).init.headers);
    assert.equal(actual.get("content-type"), "application/problem+json");
    assert.equal(actual.get("x-trace"), "trace");
    assert.deepEqual([...new Headers(headers)], before);
  }
  await api("/contract/no-body", {method:"POST",headers:{"X-Trace":"empty"}});
  assert.equal(new Headers(calls.at(-1).init.headers).get("x-trace"), "empty");
  assert.equal(new Headers(calls.at(-1).init.headers).has("content-type"), false);
});

test("native body types and explicit non-JSON media types are not labelled JSON", async t => {
  const calls = capture(t), form = new FormData(); form.append("name","Ana");
  for (const body of [form, new URLSearchParams({name:"Ana"}), new Blob(["binary"]), new Uint8Array([1,2,3]), ""]) {
    await api("/contract/native", {method:"POST",body});
    assert.equal(calls.at(-1).init.body, body);
    assert.equal(new Headers(calls.at(-1).init.headers).has("content-type"), false);
  }
  await api("/contract/text", {method:"PUT",body:"plain text",headers:{"Content-Type":"text/plain"}});
  assert.equal(new Headers(calls.at(-1).init.headers).get("content-type"), "text/plain");
});

test("HTTP failures and empty responses keep the existing error contract", async t => {
  const calls = capture(t, new Response('{"error":"DENIED","detail":"reason"}',{status:403}));
  await assert.rejects(api("/contract/denied"), error => error.message==="DENIED" && error.status===403 && error.body.detail==="reason");
  assert.equal(calls.length,1);
});

test("successful non-JSON responses retain the empty-object fallback", async t => {
  capture(t, new Response(null,{status:204}));
  assert.deepEqual(await api("/contract/empty",{method:"POST"}), {});
});

test("Fastify rejects the old empty-JSON contract but accepts shared-client mutations", async t => {
  const server = Fastify(); t.after(()=>server.close());
  for (const method of ["POST","PUT","PATCH","DELETE"]) server.route({method,url:"/contract/:action",handler:request=>({handled:true,body:request.body??null})});
  const old = await server.inject({method:"POST",url:"/contract/baseline",headers:{"content-type":"application/json"}});
  assert.equal(old.statusCode,400); assert.equal(old.json().code,"FST_ERR_CTP_EMPTY_JSON_BODY");
  t.mock.method(globalThis,"fetch",async (url,init)=>{
    const response = await server.inject({method:init.method,url:new URL(url).pathname,headers:Object.fromEntries(new Headers(init.headers)),payload:init.body??undefined});
    return new Response(response.body,{status:response.statusCode,headers:response.headers});
  });
  for (const method of ["POST","PUT","PATCH","DELETE"]) {
    assert.deepEqual(await api(`/contract/${method.toLowerCase()}`,{method}),{handled:true,body:null});
    const body={method,enabled:true};
    assert.deepEqual(await api("/contract/payload",{method,body:JSON.stringify(body)}),{handled:true,body});
  }
});
