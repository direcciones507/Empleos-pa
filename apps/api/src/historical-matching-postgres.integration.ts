import assert from 'node:assert/strict';
import type {FastifyInstance} from 'fastify';
import {db} from './db.js';
import {config} from './config.js';
import {createSession,enableProfile} from './auth.js';

// Invoked only by the loopback-only PostgreSQL runner. Profile and vacancy data
// go through the same save/submit routes as the UI; provider verification is mocked.
export async function historicalMatchingIntegration(app:FastifyInstance,f:any){
  const saved={...config},originalFetch=globalThis.fetch;
  const call=async(who:any,method:any,url:string,payload?:any,status=200)=>{
    const r=await app.inject({method,url,headers:{cookie:`empleos_session=${who.token}`},...(payload===undefined?{}:{payload})});
    assert.equal(r.statusCode,status,`${method} ${url}: ${r.body}`);return r.json();
  };
  const person=async(name:string)=>{
    const r=(await db.query("insert into users(email,normalized_email,password_hash,role) values($1,$1,'isolated','CANDIDATO') returning user_id",[name+'@example.test'])).rows[0];
    await enableProfile(r.user_id,'CANDIDATO');return {id:r.user_id,token:await createSession(r.user_id)};
  };
  try{
    config.nodeEnv='test';config.requestPaymentMode='MANUAL';config.deepSeekApiKey='';
    const base={full_name:'Isolated profile',identity_document_type:'CEDULA',identity_document_number:'fixture',contact_email:'isolated@example.test',mobile_whatsapp:'60000000',province:'Chiriquí',district:'David',corregimiento:'David',address_reference:'Isolated address',work_profile:'Experiencia declarada',primary_job_area:'Plomero',currently_working:false,available_from:'2099-01-01',work_locations:'David',skills:'Tuberías',has_experience:false,education:[{level:'Secundaria'}],confirmations:{correct:true,data_processing:true,no_hiring_guarantee:true}};
    const makeCandidate=async(name:string,fields:any)=>{
      const who=await person(name);
      const result=await call(who,'PUT','/v1/candidate/profile',{...base,...fields});
      const submitted=await call(who,'POST','/v1/candidate/profile/submit',{});
      assert.equal(submitted.profile.status,'ACTIVO');return {...who,candidate_id:result.profile.candidate_id};
    };
    const role=await makeCandidate('historical-role',{primary_job_area:'  MAÉSTRO   '});
    const location=await makeCandidate('historical-location',{primary_job_area:'Electricista',province:'  VERÁGUAS ',district:'  SANTIAGO ',corregimiento:'Santiago',work_locations:'Atalaya'});
    const skill=await makeCandidate('historical-skill',{skills:'  ÉXCEL  , Cableado'});
    const structured=await makeCandidate('historical-structured',{structured_skills:[{name:'  ÉXCEL  '}]});
    const area=await makeCandidate('historical-other-area',{other_job_areas:'Auxiliar;  Maéstro  '});
    const negative=await makeCandidate('historical-negative',{});
    const legacyZone=await makeCandidate('historical-zone',{work_locations:'Santiago / Veraguas'});
    const vacancy=async(fields:any={})=>(await call(f.company,'POST','/v1/company/vacancies',{position:'Maestro',quantity:1,work_location:'Santiago / Veraguas',province:'Veraguas',district:'Santiago',corregimiento:'Santiago',schedule:'Diurno',skills:'Excel, Inglés avanzado',main_functions:'Enseñar',confirm_correct:true,confirm_terms:true,confirm_scope:true,...fields},201)).vacancy;
    const v=await vacancy({structured_skills:[{name:'Inglés',priority:'PREFERRED'},{name:'Python'},{name:'SAP',priority:'OPTIONAL'}],structured_requirements:[{type:'SKILL',value:'Excel',priority:'PREFERRED'},{type:'SKILL',value:'Francés'},{type:'SKILL',value:'ERP',priority:'OPTIONAL'}]});
    const path=`/v1/company/vacancies/${v.vacancy_code}/matches`;
    const includes=(r:any,id:string)=>r.analyses.some((a:any)=>a.candidate_id===id);
    let matches=await call(f.company,'GET',path);
    for(const cp of [role,skill,structured,area])assert.ok(includes(matches,cp.candidate_id));
    for(const cp of [negative,location,legacyZone])assert.ok(!includes(matches,cp.candidate_id));
    const trace=(cp:any)=>matches.analyses.find((a:any)=>a.candidate_id===cp.candidate_id).match_trace;
    assert.deepEqual(trace(role),{role:true,location:false,skills:false,experience:false,availability:false});

    assert.equal(trace(skill).skills,true);assert.equal(trace(skill).role,false);assert.equal(trace(skill).location,false);
    assert.equal(trace(structured).skills,true);
    // Legacy skill evidence still works alongside nonmatching structured fields.
    const legacy=await vacancy({position:'Contador',province:'Panamá',district:'Chepo',work_location:'Chepo',skills:'Excel, SAP',structured_skills:[{name:'Python'}]});
    assert.ok(includes(await call(f.company,'GET',`/v1/company/vacancies/${legacy.vacancy_code}/matches`),skill.candidate_id));
    // A structured requirement alone may contribute evidence; absence of any
    // occupation/location/skill evidence still excludes the unrelated profile.
    const onlyStructured=await vacancy({position:'Contador',province:'Panamá',district:'Chepo',work_location:'Chepo',skills:'SAP',structured_requirements:[{type:'SKILL',value:'Excel'}]});
    assert.ok(includes(await call(f.company,'GET',`/v1/company/vacancies/${onlyStructured.vacancy_code}/matches`),structured.candidate_id));
    // Location, availability, generic words and a SERVICE trade cannot stand
    // in for labor evidence in the CANDIDATO profile.
    const teacher=await makeCandidate('surgical-teacher',{primary_job_area:'Maestro',province:'Veraguas',district:'Santiago',corregimiento:'Santiago',work_locations:'Santiago',available_from:'2020-01-01',skills:'Proactivo, responsable, trabajador, dinámico'});
    const experienced=await makeCandidate('surgical-sales-experience',{primary_job_area:'Maestro',has_experience:true,experience:[{position:'Asesor comercial',duties:'Ventas de productos y seguimiento a clientes'}]});
    await call(teacher,'PUT','/v1/service-provider/profile',{full_name:'Separate service',identity_document_type:'CEDULA',identity_document_number:'fixture',service_trade:'Vendedor',service_province:'Veraguas',service_district:'Santiago',service_corregimiento:'Santiago'});
    const sales=await vacancy({position:'Vendedor',skills:'Proactivo, responsable, trabajador, dinámico',structured_skills:[],structured_requirements:[]});
    const salesMatches=await call(f.company,'GET',`/v1/company/vacancies/${sales.vacancy_code}/matches`);
    assert.ok(!includes(salesMatches,teacher.candidate_id));
    assert.ok(includes(salesMatches,experienced.candidate_id));
    assert.equal(salesMatches.analyses.find((a:any)=>a.candidate_id===experienced.candidate_id).match_trace.experience,true);
    matches=await call(f.company,'GET',path);
    const before=matches.analyses.map((a:any)=>a.candidate_id).sort();
    config.deepSeekApiKey='isolated-description';globalThis.fetch=async()=>{throw Error('simulated DeepSeek outage');};
    matches=await call(f.company,'GET',path);assert.deepEqual(matches.analyses.map((a:any)=>a.candidate_id).sort(),before);
    globalThis.fetch=async()=>new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({analyses:[{candidate_id:role.candidate_id,summary:'Experiencia docente declarada',strengths:['Docencia'],gaps:['Verificar fecha'],considerations:['Entrevista']}]})}}]}),{status:200});
    matches=await call(f.company,'GET',path);assert.deepEqual(matches.analyses.map((a:any)=>a.candidate_id).sort(),before);
    assert.equal(matches.analyses.find((a:any)=>a.candidate_id===role.candidate_id).summary,'Experiencia docente declarada');
    config.deepSeekApiKey='';
    // Security eligibility remains eliminatory, without altering field evidence.
    await db.query("update users set status='DISABLED' where user_id=$1",[role.id]);
    assert.ok(!includes(await call(f.company,'GET',path),role.candidate_id));
    await db.query("update users set status='ACTIVE' where user_id=$1",[role.id]);
    await db.query("update candidate_profiles set valid_until=current_date-1 where candidate_id=$1",[role.candidate_id]);
    assert.ok(!includes(await call(f.company,'GET',path),role.candidate_id));

    const provider=await person('historical-service'),wrong=await person('historical-wrong-service');
    for(const [who,trade] of [[provider,'  ELECTRÍCISTA   '],[wrong,'Plomero']] as const){
      await call(who,'PUT','/v1/service-provider/profile',{full_name:'Isolated provider',identity_document_type:'CEDULA',identity_document_number:'fixture',service_trade:trade,service_province:'Chiriquí',service_district:'David',service_corregimiento:'David',service_areas:'  SANTIAGO / VERÁGUAS  ',available_days:'Lunes',available_hours:'Diurno'});
      config.diditApiKey='isolated-didit';config.diditWorkflowId='isolated-workflow';
      globalThis.fetch=async(input:any)=>{assert.ok(String(input).startsWith('https://verification.didit.me/v3/session/'));return new Response(JSON.stringify(String(input).endsWith('/decision/')?{status:'Approved'}:{session_id:'historical-'+who.id,url:'https://identity.fixture.invalid'}),{status:200});};
      await call(who,'POST','/v1/service-provider/verification/start',{});
      assert.equal((await call(who,'POST','/v1/service-provider/verification/refresh',{})).verification.status,'APPROVED');
    }
    const service=await vacancy({request_type:'EVENTUAL',position:'Electricista'});
    const servicePath=`/v1/company/vacancies/${service.vacancy_code}/service-matches`;
    const sm=await call(f.company,'GET',servicePath);
    assert.ok(sm.items.some((a:any)=>a.provider_id===provider.id));assert.ok(!sm.items.some((a:any)=>a.provider_id===wrong.id));
    assert.equal(sm.items.find((a:any)=>a.provider_id===provider.id).full_name,undefined);
    await db.query("update service_provider_verifications set status='PENDING' where user_id=$1",[provider.id]);
    assert.ok(!(await call(f.company,'GET',servicePath)).items.some((a:any)=>a.provider_id===provider.id));
    console.log('HISTORICAL_MATCHING PASS UI-save-submit/role/location/legacy-zone/legacy-skill/structured-skill/other-area/preferences/missing-priority/optional/availability/normalization/negative/security/AI-outage/AI-omission/service-save-mocked-verification/service-areas/wrong-trade');
  }finally{Object.assign(config,saved);globalThis.fetch=originalFetch;}
}
