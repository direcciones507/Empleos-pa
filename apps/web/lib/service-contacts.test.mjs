import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as React from 'react';
import * as JSX from 'react/jsx-runtime';
import {renderToStaticMarkup} from 'react-dom/server';
const source=fs.readFileSync(new URL('../components/ServiceContacts.tsx',import.meta.url),'utf8');
function harness(kind,api,initial={}){
  const values=[],effects=[];let cursor=0;
  Object.assign(values,initial);
  const hooks={...React,useState(v){const i=cursor++;if(!(i in values))values[i]=v;return [values[i],n=>values[i]=typeof n==='function'?n(values[i]):n];},useEffect(fn){effects.push(fn);}};
  const exports={};vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:n=>n==='react'?hooks:n==='react/jsx-runtime'?JSX:{api}});
  function tree(){cursor=0;return exports[kind]({code:'VAC-000001'});}
  return {tree,html:()=>renderToStaticMarkup(tree()),start:()=>effects[0]()};
}
function nodes(t,p){if(!t||typeof t!=='object')return [];return [...(p(t)?[t]:[]),...[t.props?.children].flat(Infinity).flatMap(c=>nodes(c,p))];}
const button=(h,label)=>nodes(h.tree(),t=>t.type==='button'&&t.props.children===label)[0];
test('provider accepts and rejects through its inbox, without a payment call',async()=>{
  for(const action of ['ACCEPT','REJECT']){
    const calls=[];const h=harness('ServiceContactInbox',(url,opts)=>{calls.push({url,opts});return Promise.resolve({items:[]});},{0:[{contact_request_id:'r1',status:'REQUESTED',company_name:'Company',position:'Electricista'}]});
    await button(h,action==='ACCEPT'?'Aceptar conexión':'Rechazar').props.onClick();
    assert.deepEqual(JSON.parse(calls[0].opts.body),{action});assert.equal(calls[0].url,'/v1/service-provider/contact-requests/r1/respond');
    assert.ok(calls.every(c=>!c.url.includes('/payments/')));assert.ok(h.html().includes(action==='ACCEPT'?'La empresa debe pagar':'No se cobra'));
  }
});
test('company never requests contact for an unpaid connection and requests only its selected provider',async()=>{
  const calls=[];const h=harness('ServiceContacts',(url,opts)=>{calls.push({url,opts});return Promise.resolve({items:[]});},{0:[{provider_id:'p1',service_trade:'Electricista'}],1:[{contact_request_id:'r1',status:'ACCEPTED_AWAITING_PAYMENT',service_trade:'Electricista'}]});
  assert.equal(button(h,'Ver contacto'),undefined);assert.ok(h.html().includes('$1.89'));
  await button(h,'Solicitar contacto').props.onClick();assert.deepEqual(JSON.parse(calls[0].opts.body),{provider_id:'p1'});assert.ok(calls.every(c=>!c.url.endsWith('/contact')));
});
