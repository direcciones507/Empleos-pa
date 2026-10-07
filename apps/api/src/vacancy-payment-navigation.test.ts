import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Exercise the actual page, with deterministic React hooks and API responses.
async function harness(status='PENDIENTE_PAGO'){
 let vacancy:any={vacancy_code:'VAC-000001',position:'Vendedor',request_type:'VACANTE',status,has_candidate_selection:status==='PENDIENTE_PAGO',package_price:2.50};
 const analysis={candidate_id:'candidate',summary:'Experiencia en ventas',strengths:[],gaps:[],considerations:[],facts:{job_area:'Vendedor'}};
 const calls:string[]=[],states:any[]=[],effects:Function[]=[];let cursor=0,first=true;
 const api=async(url:string,options?:any)=>{calls.push(url);
  if(url==='/v1/company/vacancies')return {items:[{...vacancy}]};
  if(url.endsWith('/delivery'))return {candidates:[]};
  if(url.endsWith('/delivery-analysis'))return {analyses:[]};
  if(url.endsWith('/matches'))return {count:1,selection_locked:vacancy.has_candidate_selection,analyses:[analysis],pricing:{unit_price:2.50}};
  if(url.endsWith('/candidates/accept')){assert.deepEqual(JSON.parse(options.body).candidate_ids,['candidate']);vacancy={...vacancy,status:'PENDIENTE_PAGO',has_candidate_selection:true};return {status:'PENDIENTE_PAGO',accepted:1};}throw Error(url);
 };
 const jsx=(type:any,props:any)=>({type,props});function YappyOperation(){}function ServiceContacts(){}
 const react={useState:(initial:any)=>{const i=cursor++;if(!(i in states))states[i]=initial;return [states[i],(v:any)=>{states[i]=typeof v==='function'?v(states[i]):v;}];},useEffect:(effect:Function)=>{if(first)effects.push(effect);}};
 const exports:any={};const source=readFileSync(new URL('../../web/app/empresa/vacantes/[code]/page.tsx',import.meta.url),'utf8');
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:(n:string)=>n==='react'?react:n==='react/jsx-runtime'?{jsx,jsxs:jsx}:n.endsWith('/lib/api')?{api}:n.endsWith('/YappyOperation')?{YappyOperation}:{ServiceContacts},window:{history:{length:1},location:{reload(){},href:''}}});
 const render=()=>{cursor=0;const t=exports.default({params:{code:'VAC-000001'}});first=false;return t;};
 const flush=async()=>{await new Promise(r=>setImmediate(r));return render();};
 function nodes(n:any):any[]{if(!n||typeof n!=='object')return [];if(Array.isArray(n))return n.flatMap(nodes);return [n,...nodes(n.props?.children)];}
 const text=(n:any):string=>Array.isArray(n)?n.map(text).join(''):n&&typeof n==='object'?text(n.props?.children):String(n??'');
 render();for(const e of effects)e();const initial=await flush();
 return {render,flush,nodes,text,calls,YappyOperation,initial};
}
test('pending selection opens preview; Yappy and Previous preserve result',async()=>{
 const h=await harness();let t=h.initial;assert.ok(h.text(t).includes('Experiencia en ventas'));assert.equal(h.nodes(t).filter(n=>n.type===h.YappyOperation).length,0);
 h.nodes(t).find(n=>n.type==='button'&&h.text(n)==='Continuar con Yappy').props.onClick();t=h.render();assert.equal(h.nodes(t).filter(n=>n.type===h.YappyOperation).length,1);
 h.nodes(t).find(n=>n.type==='button'&&h.text(n)==='← Anterior').props.onClick();t=h.render();assert.ok(h.text(t).includes('Experiencia en ventas'));assert.equal(h.nodes(t).filter(n=>n.type===h.YappyOperation).length,0);assert.equal(h.calls.filter(x=>x.endsWith('/matches')).length,1);assert.ok(h.text(t).includes('PENDIENTE_PAGO'));
});
test('acceptance keeps selection when returning without payment',async()=>{
 const h=await harness('APROBADA');let t=h.initial;h.nodes(t).find(n=>n.type==='button'&&h.text(n)==='Buscar perfiles compatibles').props.onClick();t=await h.flush();
 h.nodes(t).find(n=>n.type==='input'&&n.props.type==='checkbox').props.onChange();t=h.render();h.nodes(t).find(n=>n.type==='button'&&h.text(n)==='Confirmar candidatos y pagar con Yappy').props.onClick();t=await h.flush();assert.equal(h.nodes(t).filter(n=>n.type===h.YappyOperation).length,1);
 h.nodes(t).find(n=>n.type==='button'&&h.text(n)==='← Anterior').props.onClick();t=h.render();assert.ok(h.text(t).includes('Experiencia en ventas'));assert.ok(h.text(t).includes('Continuar con Yappy'));assert.equal(h.calls.filter(x=>x.endsWith('/matches')).length,1);
});
test('reopening delivered vacancy never requests payment',async()=>{
 const h=await harness('ENTREGADA');assert.ok(h.text(h.initial).includes('Candidaturas entregadas'));assert.equal(h.nodes(h.initial).filter(n=>n.type===h.YappyOperation).length,0);assert.equal(h.calls.filter(x=>x.endsWith('/matches')).length,0);
});
