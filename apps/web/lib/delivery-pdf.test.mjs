import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {jsPDF} from 'jspdf';
function load(file, deps={}){const exports={};const source=fs.readFileSync(new URL(file,import.meta.url),'utf8');vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,require:name=>deps[name]});return exports;}
const {candidateLanguage}=load('./candidate-language.ts');
const {buildDeliveryPdf}=load('./delivery-pdf.ts',{'jspdf':{jsPDF},'./candidate-language':{candidateLanguage}});
test('generic term corrects retained analyses without inferring gender or changing names',()=>{
 assert.equal(candidateLanguage('La candidata declara proactividad. Información de la candidata.'),'El candidato declara proactividad. Información del candidato.');
 assert.equal(candidateLanguage('Manuel Rodríguez · Ana Pérez'),'Manuel Rodríguez · Ana Pérez');
});
test('PDF includes delivered contacts and retained analysis, paginates long reports',()=>{
 const delivery={report:{title:'Reporte descriptivo de perfiles',vacancy_code:'VAC-000023',position:'Maestro',work_location:'Santiago'},candidates:[{candidate_code:'EMP-000001',full_name:'Manuel Rodríguez',phone:'60000000',email:'fixture@example.com',skills:'Proactividad'}]};
 const doc=buildDeliveryPdf(delivery,[{candidate_code:'EMP-000001',summary:'La candidata declara proactividad.',strengths:Array(80).fill('Experiencia y disponibilidad declaradas que corresponde verificar en la entrevista.'),gaps:['Formación por verificar'],considerations:['Información declarada']}]);
 const pdf=doc.output();assert.ok(pdf.startsWith('%PDF-'));assert.ok(pdf.includes('60000000'));assert.ok(pdf.includes('fixture@example.com'));assert.ok(pdf.includes('El candidato declara proactividad.'));assert.ok(!pdf.includes('La candidata'));assert.ok(doc.getNumberOfPages()>1);
 assert.throws(()=>buildDeliveryPdf({candidates:[]},[]),/NO_DELIVERY/);
});
