import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const source = fs.readFileSync(new URL("../app/empresa/vacantes/[code]/page.tsx", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS}}).outputText;
const code = "VAC-000011";
const vacancy = {vacancy_code:code,position:"Asistente",status:"ENTREGADA",quantity:1,work_location:"Panamá"};
const candidate = {candidate_code:"CAN-1",full_name:"Ana",phone:"60000000",skills:"Atención",province:"Panamá",district:"Panamá"};
const analysis = {candidate_id:"1",candidate_code:"CAN-1",summary:"Experiencia relacionada",strengths:["Atención al cliente"],gaps:["Verificar horario"],considerations:[]};

// Execute the real page with controlled hooks and API responses; no network or AI.
function harness(api, initial = {}) {
  const values = [], effects = []; let cursor = 0;
  const react = {...React,useState(value){const i=cursor++;if(!(i in values))values[i]=value;return [values[i],next=>{values[i]=typeof next==="function"?next(values[i]):next}]},useEffect(fn){effects.push(fn)}};
  Object.assign(values, initial);
  const exports = {};
  vm.runInNewContext(compiled,{exports,require(name){if(name==="react")return react;if(name.endsWith("/lib/api"))return {api};if(name==="react/jsx-runtime")return ReactJSX;if(name.endsWith("/components/YappyOperation"))return {YappyOperation:()=>{throw Error("Payment must not render in approved/delivered formal fixtures")}};if(name.endsWith("/components/ServiceContacts"))return {ServiceContacts:()=>{throw Error("Service contacts must not render in formal vacancy regression fixtures")}};throw Error(name)}});
  function tree(){cursor=0;return exports.default({params:{code}})}
  return {tree,html:()=>renderToStaticMarkup(tree()),start:()=>effects[0](),values};
}
import * as ReactJSX from "react/jsx-runtime";
const ready = (analyses = [analysis], state = "ready") => ({0:false,1:false,2:state,3:[vacancy],4:{candidates:[candidate]},5:analyses});
const flush = () => new Promise(resolve=>setImmediate(resolve));
function nodes(tree, predicate) {if(!tree||typeof tree!=="object")return [];return [...(predicate(tree)?[tree]:[]),...[tree.props?.children].flat(Infinity).flatMap(child=>nodes(child,predicate))]}

test("delivered analysis renders all sections below contact in an isolated card",()=>{
  const h=harness(()=>Promise.resolve({}),ready()), html=h.html();
  for(const text of ["Compatibilidad laboral","Fortalezas relacionadas","Por verificar",analysis.summary,...analysis.strengths,...analysis.gaps])assert.ok(html.includes(text));
  assert.equal(nodes(h.tree(),n=>n.props?.className==="deliveredCandidateCard").length,1);
  assert.equal(nodes(h.tree(),n=>n.props?.className==="adminList").length,0);
  assert.ok(html.indexOf("Contacto:")<html.indexOf("Análisis descriptivo conservado"));
});

test("historical delivery displays an honest fallback without requesting matches or AI",async()=>{
  const calls=[];const h=harness(url=>{calls.push(url);return Promise.resolve(url.endsWith("delivery-analysis")?{analyses:[]}:url.endsWith("delivery")?{candidates:[candidate]}:{items:[vacancy]})});
  h.html();h.start();await flush();
  assert.ok(h.html().includes("Esta entrega no conserva un análisis descriptivo histórico."));
  assert.equal(calls.length,3);assert.ok(calls.every(url=>!url.includes("matches")&&!url.includes("accept")));
});

test("initial pending vacancy has a discreet loading state and no VAC H1",async()=>{
  let resolve;const pending=new Promise(r=>resolve=r);
  const h=harness(url=>url==="/v1/company/vacancies"?pending:Promise.resolve({}));
  assert.ok(h.html().includes("Cargando vacante…"));assert.equal(nodes(h.tree(),n=>n.type==="h1").length,0);
  h.start();await flush();assert.ok(h.html().includes("Cargando vacante…"));
  resolve({items:[vacancy]});await flush();assert.ok(h.html().includes("<h1>Asistente</h1>"));
});

test("not found and failed vacancy loads are distinct from loading",async()=>{
  for(const fail of [false,true]){const h=harness(url=>url==="/v1/company/vacancies"&&fail?Promise.reject(Error("failed")):Promise.resolve({items:[]}));h.html();h.start();await flush();const html=h.html();assert.ok(html.includes(fail?"No se pudo cargar la vacante.":"No se encontró esta vacante."));assert.ok(!html.includes("Cargando vacante…"));assert.equal(nodes(h.tree(),n=>n.type==="h1").length,0)}
});

test("analysis still loading or failed is never described as missing historical data",()=>{
  for(const state of ["loading","error"]){const html=harness(()=>Promise.resolve({}),ready([],state)).html();assert.ok(html.includes(state==="loading"?"Cargando análisis conservado…":"No se pudo cargar el análisis conservado."));assert.ok(!html.includes("no conserva un análisis descriptivo histórico"))}
});

test("candidate analysis uses horizontal label-and-content rows at every screen width",()=>{
  const tree=harness(()=>Promise.resolve({}),ready()).tree();const css=nodes(tree,n=>n.type==="style")[0].props.children;
  assert.equal(tree.props.className,"portal matchingView");
  assert.match(css,/\\.candidateGrid>div\\{display:grid;grid-template-columns:minmax\\(150px,22%\\) minmax\\(0,1fr\\)/);
  assert.match(css,/\\.deliveredGrid>div\\{display:grid;grid-template-columns:minmax\\(150px,22%\\) minmax\\(0,1fr\\)/);
  assert.match(css,/@media\\(max-width:620px\\).*?\\.candidateGrid>div,\\.deliveredGrid>div\\{grid-template-columns:minmax\\(105px,30%\\) minmax\\(0,1fr\\)/);
  assert.ok(!css.includes("overflow-x:auto"));
});

test("service matching reuses horizontal cards with mobile stacking and keeps the contact actions",()=>{
  const serviceSource=fs.readFileSync(new URL("../components/ServiceContacts.tsx",import.meta.url),"utf8");
  const output=ts.transpileModule(serviceSource,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS}}).outputText;
  let index=0;
  const values=[[{provider_id:"1",service_trade:"Electricista",service_province:"Chiriquí",service_district:"David"}],[],{},"",false];
  const exports={};
  vm.runInNewContext(output,{exports,require(name){if(name==="react")return {...React,useState:()=>[values[index++],()=>{}],useEffect:()=>{}};if(name==="react/jsx-runtime")return ReactJSX;if(name.endsWith("/lib/api"))return {api:()=>{throw Error("no network")}};if(name.endsWith("/YappyOperation"))return {YappyOperation:()=>null};throw Error(name)}});
  const tree=exports.ServiceContacts({code});
  const css=nodes(tree,n=>n.type==="style")[0].props.children;
  assert.match(css,/\.serviceCompare\{display:grid;grid-template-columns:repeat\(auto-fit,minmax\(360px,1fr\)\)/);
  assert.match(css,/@media\(max-width:620px\)\{\.serviceCompare\{grid-template-columns:1fr\}\}/);
  assert.equal(nodes(tree,n=>n.props?.className==="serviceCompare").length,2);
  const html=renderToStaticMarkup(tree);assert.ok(html.includes("Electricista"));assert.ok(html.includes("Solicitar contacto"));
});

test("search, selection and acceptance still send selected analyses and reload delivery",async()=>{
  const calls=[];const h=harness((url,options)=>{calls.push({url,options});return Promise.resolve(url.endsWith("/matches")?{count:1,ai_available:true,analyses:[analysis]}:url.endsWith("/accept")?{status:"ENTREGADA",accepted:1}:url.endsWith("delivery-analysis")?{analyses:[analysis]}:url.endsWith("delivery")?{candidates:[candidate]}:{items:[vacancy]})},{...ready(),3:[{...vacancy,status:"APROBADA"}],4:null});
  let button=nodes(h.tree(),n=>n.type==="button"&&n.props.children==="Buscar perfiles compatibles")[0];await button.props.onClick();
  nodes(h.tree(),n=>n.type==="input"&&n.props.type==="checkbox")[0].props.onChange();
  button=nodes(h.tree(),n=>n.type==="button"&&n.props.children==="Confirmar candidatos y pagar con Yappy")[0];assert.equal(button.props.disabled,false);await button.props.onClick();
  const acceptance=calls.find(x=>x.url.endsWith("/accept"));assert.equal(acceptance.options.method,"POST");assert.deepEqual(JSON.parse(acceptance.options.body),{candidate_ids:["1"],analyses:[analysis],confirm_price:true});
  assert.ok(h.html().includes("Análisis descriptivo conservado"));assert.ok(calls.some(x=>x.url.endsWith("/delivery")));
});
