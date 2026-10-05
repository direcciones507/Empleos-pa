import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import vm from "node:vm";
import ts from "typescript";

// Small DOM/event harness: exercises the real handlers without adding a DOM dependency.
class TestNode {
  children=[]; listeners=[]; parent=null;
  append(node){node.parent=this;this.children.push(node);return node}
  contains(node){return node===this||this.children.some(child=>child.contains(node))}
  addEventListener(type,fn,capture=false){this.listeners.push({type,fn,capture})}
  removeEventListener(type,fn,capture=false){this.listeners=this.listeners.filter(x=>x.type!==type||x.fn!==fn||x.capture!==capture)}
  fire(type,target,extra={}){for(const x of [...this.listeners])if(x.type===type)x.fn({type,target,...extra})}
}
class TestElement extends TestNode {
  constructor(tag){super();this.tag=tag}
  closest(selector){for(let n=this;n;n=n.parent)if(selector==="details.requestMenu"?n instanceof TestDetails:n.tag===selector)return n;return null}
}
class TestDetails extends TestElement {open=false;constructor(){super("details")}}

function setup(){
  const root=new TestElement("div"),doc=new TestNode(),outside=new TestElement("p");
  const menus=[0,1].map(()=>{const menu=root.append(new TestDetails());return {menu,summary:menu.append(new TestElement("summary")),button:menu.append(new TestElement("button"))}});
  root.querySelectorAll=()=>menus.map(x=>x.menu);
  const exports={};const source=readFileSync(new URL("./request-menu.ts",import.meta.url),"utf8");
  vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,Node:TestNode,Element:TestElement,HTMLDetailsElement:TestDetails,document:doc});
  const cleanup=exports.bindRequestMenus(root,doc);
  // Simulate capture, then the browser's native summary default and toggle event.
  const clickSummary=(i)=>{const {menu,summary}=menus[i];doc.fire("pointerdown",summary);root.fire("click",summary);menu.open=!menu.open;root.fire("toggle",menu)};
  return {root,doc,outside,menus,cleanup,clickSummary};
}

test("summary opens and toggles normally; opening another card closes the previous menu",()=>{
  const h=setup();h.clickSummary(0);assert.equal(h.menus[0].menu.open,true);h.clickSummary(1);assert.equal(h.menus[0].menu.open,false);assert.equal(h.menus[1].menu.open,true);h.clickSummary(1);assert.equal(h.menus[1].menu.open,false);h.cleanup();
});

test("outside pointerdown closes immediately for mouse and touch; inside taps stay open",()=>{
  for(const pointerType of ["mouse","touch","pen"]){const h=setup();h.clickSummary(0);h.doc.fire("pointerdown",h.menus[0].button,{pointerType});assert.equal(h.menus[0].menu.open,true);h.doc.fire("pointerdown",h.outside,{pointerType});assert.equal(h.menus[0].menu.open,false);h.cleanup()}
});

test("an action closes during capture before its handler or confirmation runs",()=>{
  const h=setup();h.clickSummary(0);const child=h.menus[0].button.append(new TestElement("span"));h.root.fire("click",child);assert.equal(h.menus[0].menu.open,false);h.cleanup();
});

test("Escape closes menus; native keyboard toggle also keeps only one menu open",()=>{
  const h=setup();h.clickSummary(0);h.menus[1].menu.open=true;h.root.fire("toggle",h.menus[1].menu);assert.equal(h.menus[0].menu.open,false);h.doc.fire("keydown",h.doc,{key:"Enter"});assert.equal(h.menus[1].menu.open,true);h.doc.fire("keydown",h.doc,{key:"Escape"});assert.equal(h.menus[1].menu.open,false);h.cleanup();
});

test("cleanup removes every listener and supports reattachment without orphan handlers",()=>{
  const h=setup();assert.equal(h.doc.listeners.length,2);assert.equal(h.root.listeners.length,2);h.cleanup();assert.equal(h.doc.listeners.length,0);assert.equal(h.root.listeners.length,0);h.menus[0].menu.open=true;h.doc.fire("pointerdown",h.outside);assert.equal(h.menus[0].menu.open,true);
});

test("company page binds the menu lifecycle to its list without changing action handlers",()=>{
  const source=readFileSync(new URL("../app/empresa/page.tsx",import.meta.url),"utf8");
  assert.match(source,/useEffect\(\(\)=>\{if\(requestListRef.current\)return bindRequestMenus\(requestListRef.current\)\},\[items,showArchived\]\)/);
  assert.match(source,/<div className="companyVacancies" ref=\{requestListRef\}>/);
  assert.match(source,/onClick=\{\(\)=>archive\(x.vacancy_code\)\}/);assert.match(source,/onClick=\{\(\)=>remove\(x.vacancy_code\)\}/);
});
