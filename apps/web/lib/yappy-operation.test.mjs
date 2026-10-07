import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as React from 'react';
import * as JSX from 'react/jsx-runtime';
import {renderToStaticMarkup} from 'react-dom/server';
test('disabled payments never mount the official button, script, alias field or provider operation',()=>{
  const source=fs.readFileSync(new URL('../components/YappyOperation.tsx',import.meta.url),'utf8');let index=0,calls=0;
  const values=[false,'','','',false],exports={};
  const hooks={...React,useState(v){const i=index++;return [values[i]??v,()=>{}];},useRef:v=>({current:v}),useEffect:()=>{}};
  vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:n=>n==='react'?hooks:n==='react/jsx-runtime'?JSX:n==='next/script'?{default:()=>{throw Error('Payment script is forbidden when disabled');}}:{api:()=>{calls++;throw Error('No order request expected');}}});
  const html=renderToStaticMarkup(exports.YappyOperation({endpoint:'/v1/company/service-contact-requests/id/payments/yappy',amount:1.89}));
  assert.ok(html.includes('Los cobros están desactivados'));assert.ok(html.includes('$1.89'));assert.ok(!html.includes('<input'));assert.ok(!html.includes('<script'));assert.equal(calls,0);
});
