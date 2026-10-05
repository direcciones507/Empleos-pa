import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function load(path:string, dependencies:Record<string,unknown>){
  const exports:any={};
  const source=readFileSync(new URL(path,import.meta.url),"utf8");
  vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,AbortSignal,require:(name:string)=>{if(!(name in dependencies))throw Error(name);return dependencies[name]}});
  return exports;
}
const ids=["11111111-1111-4111-8111-111111111111","22222222-2222-4222-8222-222222222222","33333333-3333-4333-8333-333333333333"];
const analysis=(id:string)=>({candidate_id:id,summary:` Summary ${id} `,strengths:[" Strength "],gaps:[" Gap "],considerations:[" Consideration "],unexpected:"never store",facts:{phone:"private"}});

async function deliver(analyses:any[],eligibleIds:string[],failWrite=false){
  const calls:{sql:string;params:any[]}[]=[],snapshot=new Map<string,any>();let aiCalls=0,released=false;
  const vacancy={vacancy_id:"vacancy",vacancy_code:"VAC-000011",status:"APROBADA",position:"Asistente",work_location:"Panamá"};
  const query=async(sql:string,params:any[]=[])=>{
    calls.push({sql,params});
    if(sql.includes("from vacancies where"))return {rowCount:1,rows:[vacancy]};
    if(sql.includes("for update")&&sql.includes("from candidate_profiles"))return {rowCount:eligibleIds.length,rows:eligibleIds.map(candidate_id=>({candidate_id}))};
    if(sql.includes("from candidate_profiles where status"))return {rowCount:ids.length,rows:ids.map(candidate_id=>({candidate_id}))};
    if(sql.startsWith("insert into vacancy_deliveries"))return {rowCount:1,rows:[{delivery_id:"delivery"}]};
    if(sql.startsWith("insert into vacancy_delivery_candidates"))for(const id of params[1])snapshot.set(id,null);
    if(sql.startsWith("update vacancy_delivery_candidates")){if(failWrite)throw Error("write failed");assert.equal(params[1],"delivery");assert.ok(snapshot.has(params[2]));snapshot.set(params[2],JSON.parse(params[0]));}
    if(sql.startsWith("select count"))return {rowCount:1,rows:[{total:snapshot.size}]};
    return {rowCount:1,rows:[]};
  };
  const engine=load("./free-matching-engine.ts",{"./db.js":{db:{query,connect:async()=>({query,release:()=>{released=true}})}},"./config.js":{config:{requestPaymentMode:"FREE",freeCandidateLimit:10,deepSeekTimeoutMs:1000}},"./ai-analysis.js":{deepSeekConfigured:()=>true,analyzeFilteredCandidates:async()=>{aiCalls++;return {analyses}}}});
  let result,error;try{result=await engine.processFreeVacancy(vacancy.vacancy_code,{info(){}})}catch(e){error=e}
  return {result,error,calls,snapshot,aiCalls,released};
}

test("automatic delivery persists only eligible analyses by ID, independent of order",async()=>{
  const r=await deliver([analysis(ids[2]),analysis(ids[0]),analysis(ids[1])],[ids[1],ids[0]]);
  assert.equal(r.error,undefined);assert.equal(r.result.status,"DELIVERED");assert.equal(r.aiCalls,1);assert.equal(r.released,true);
  assert.equal(r.snapshot.has(ids[2]),false);
  for(const id of [ids[0],ids[1]])assert.deepEqual(r.snapshot.get(id),{candidate_id:id,summary:`Summary ${id}`,strengths:["Strength"],gaps:["Gap"],considerations:["Consideration"]});
  assert.equal(r.calls.filter(x=>x.sql.startsWith("update vacancy_delivery_candidates")).length,2);
  assert.ok(r.calls.findIndex(x=>x.sql.startsWith("update vacancy_delivery_candidates"))<r.calls.findIndex(x=>x.sql==="commit"));
});

test("automatic persistence applies manual string/list limits and excludes provider extras",async()=>{
  const a={...analysis(ids[0]),summary:" "+"s".repeat(1400)+" ",strengths:[null,42,"  ",...Array(12).fill(" "+"x".repeat(600)+" ")],gaps:"wrong type",considerations:[false," check "]};
  const r=await deliver([a],[ids[0]]),saved=r.snapshot.get(ids[0]);
  assert.equal(saved.summary.length,1200);assert.equal(saved.strengths.length,10);assert.ok(saved.strengths.every((x:string)=>x.length===500));assert.deepEqual(saved.gaps,[]);assert.deepEqual(saved.considerations,["check"]);assert.deepEqual(Object.keys(saved).sort(),["candidate_id","summary","strengths","gaps","considerations"].sort());
});

test("missing or invalid analysis keeps NULL without breaking delivery or another AI call",async()=>{
  const r=await deliver([analysis(ids[0]),{candidate_id:ids[1],summary:"   "}],[ids[0],ids[1],ids[2]]);
  assert.equal(r.error,undefined);assert.equal(r.result.status,"DELIVERED");assert.equal(r.snapshot.get(ids[1]),null);assert.equal(r.snapshot.get(ids[2]),null);assert.equal(r.aiCalls,1);
});

test("analysis write failure rolls back delivery and releases the transaction",async()=>{
  const r=await deliver([analysis(ids[0])],[ids[0]],true);
  assert.ok(r.error);assert.ok(r.calls.some(x=>x.sql==="rollback"));assert.ok(!r.calls.some(x=>x.sql==="commit"));assert.equal(r.released,true);
});

test("delivery-analysis returns stored data and excludes historical NULL without AI",async()=>{
  let handler:any,queries=0;
  const saved={...analysis(ids[0])};delete (saved as any).unexpected;delete (saved as any).facts;
  const route=load("./company-delivery-analysis-routes.ts",{"./db.js":{db:{query:async()=>{queries++;return {rows:[{candidate_code:"CAN-1",match_analysis:saved},{candidate_code:"CAN-OLD",match_analysis:null}]}}}},"./rbac.js":{requireRoles:()=>()=>{}}});
  await route.companyDeliveryAnalysisRoutes({get:(_path:any,_options:any,fn:any)=>{handler=fn}});
  const response=await handler({params:{code:"VAC-000011"},authUser:{user_id:"owner"}},{});
  assert.equal(queries,1);assert.equal(response.analyses.length,1);assert.equal(response.analyses[0].candidate_code,"CAN-1");assert.equal(response.analyses[0].summary,saved.summary);
});
