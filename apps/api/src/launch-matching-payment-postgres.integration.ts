import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import type {FastifyInstance} from 'fastify';
import {db} from './db.js';
import {config} from './config.js';
import {enableProfile,createSession} from './auth.js';
import {deliveryRoutes} from './delivery-routes.js';
import {processFreeVacancy} from './free-matching-engine.js';
export async function launchMatchingPaymentIntegration(app:FastifyInstance,f:any){
  await app.register(deliveryRoutes);
  const q=(sql:string,p:any[]=[])=>db.query(sql,p),one=async(sql:string,p:any[]=[]) => (await q(sql,p)).rows[0];
  const saved={...config},originalFetch=globalThis.fetch;
  try{
    config.deepSeekApiKey='';config.nodeEnv='production';config.requestPaymentMode='FREE';config.yappyPaymentsEnabled=false;
    const user=await one("insert into users(email,normalized_email,password_hash,role) values('launch-persona@example.test','launch-persona@example.test','isolated','EMPRESA') returning user_id");
    await enableProfile(user.user_id,'EMPRESA');await enableProfile(user.user_id,'CANDIDATO');
    // A Persona with both profiles must still match. Structured Excel + accented/spaced role.
    const cp=await one(`insert into candidate_profiles(user_id,candidate_code,full_name,phone,province,district,work_locations,primary_job_area,skills,structured_skills,status,valid_until,available_from)
      values($1,'CAN-LAUNCH','Private launch name','60000000','Veraguas','Santiago','Toda mi provincia','  ASISTÉNTE   CONTABLE  ','','[{"name":"Excel"}]','ACTIVO',current_date+45,current_date) returning candidate_id`,[user.user_id]);
    const negative=await one(`insert into candidate_profiles(user_id,candidate_code,full_name,province,district,work_locations,primary_job_area,skills,status,valid_until)
      values($1,'CAN-INCOMPATIBLE','Private mismatch','Veraguas','Santiago','Santiago','Electricista','Excel','ACTIVO',current_date+45) returning candidate_id`,[f.wrongProvider.id]);
    const vacancy=(await f.call(f.company,'POST','/v1/company/vacancies',{position:'Asistente contable',quantity:1,work_location:'Santiago / Veraguas',province:'Veraguas',district:'Santiago',corregimiento:'Santiago',schedule:'Diurno',skills:'Excel',main_functions:'Registrar cuentas',confirm_correct:true,confirm_terms:true,confirm_scope:true,package_price:0.01,total:0.01},201)).vacancy;
    const base=`/v1/company/vacancies/${vacancy.vacancy_code}`;
    const row=await one('select * from vacancies where vacancy_code=$1',[vacancy.vacancy_code]);assert.equal(row.status,'APROBADA');assert.equal(Number(row.package_price),0);
    const before=await one('select count(*)::int n from yappy_payment_orders');
    const noFree=await processFreeVacancy(vacancy.vacancy_code,app.log);assert.equal(noFree.status,'SKIPPED_PAYMENT_MODE');
    let matches=await f.call(f.company,'GET',base+'/matches');assert.ok(matches.count>=1);assert.equal(matches.analyses.length,matches.count);assert.ok(matches.analyses.some((a:any)=>a.candidate_id===cp.candidate_id));assert.ok(!matches.analyses.some((a:any)=>a.candidate_id===negative.candidate_id));assert.equal(matches.ai_available,false);
    assert.ok(!JSON.stringify(matches).includes('Private launch name'));assert.equal(matches.pricing.unit_price,2.50);assert.equal(matches.pricing.normal_unit_price,4.99);assert.equal(matches.pricing.discount_percent,50);
    // AI outage or missing AI rows must never remove a deterministic match.
    config.deepSeekApiKey='fixture-analysis';globalThis.fetch=async()=>{throw new Error('simulated analysis outage');};
    matches=await f.call(f.company,'GET',base+'/matches');assert.ok(matches.analyses.some((a:any)=>a.candidate_id===cp.candidate_id));assert.equal(matches.ai_available,false);
    globalThis.fetch=async()=>new Response(JSON.stringify({choices:[{message:{content:'{"analyses":[]}'}}]}),{status:200});
    matches=await f.call(f.company,'GET',base+'/matches');assert.ok(matches.analyses.some((a:any)=>a.candidate_id===cp.candidate_id));
    config.deepSeekApiKey='';
    await f.call(f.company,'POST',base+'/candidates/accept',{candidate_ids:[negative.candidate_id],confirm_price:true},409);
    const payload={candidate_ids:[cp.candidate_id,cp.candidate_id],confirm_price:true,amount:0.01,total:0.01,unit_price:0.01,discount_percent:100,analyses:[{candidate_id:cp.candidate_id,summary:'Descripción conservada',strengths:['Excel']}]};
    const selected=await f.call(f.company,'POST',base+'/candidates/accept',payload);assert.equal(selected.status,'PENDIENTE_PAGO');assert.equal(selected.payment_required,true);assert.deepEqual(selected.quote,{quantity:1,total:2.50});
    const repeated=await f.call(f.company,'POST',base+'/candidates/accept',payload);assert.equal(repeated.reused,true);
    assert.equal((await one('select count(*)::int n from vacancy_deliveries where vacancy_id=$1',[row.vacancy_id])).n,1);
    const frozen=await one('select * from vacancies where vacancy_id=$1',[row.vacancy_id]);assert.equal(Number(frozen.package_price),2.50);assert.equal(frozen.package_candidate_limit,1);
    await f.call(f.company,'GET',base+'/delivery',undefined,404);
    await f.call(f.company,'POST',base+'/payments/yappy',{aliasYappy:'60000000'},409);
    assert.equal((await one('select count(*)::int n from yappy_payment_orders')).n,before.n);
    // An administrative route cannot use the FREE mode to bypass payment either.
    const admin=await one("insert into users(email,normalized_email,password_hash,role) values('launch-admin@example.test','launch-admin@example.test','isolated','ADMIN') returning user_id");
    const token=await createSession(admin.user_id);
    const blocked=await app.inject({method:'POST',url:`/v1/admin/vacancies/${vacancy.vacancy_code}/delivery/send`,headers:{cookie:`empleos_session=${token}`},payload:{}});assert.equal(blocked.statusCode,409);assert.equal(blocked.json().error,'PAYMENT_REQUIRED');
    config.requestPaymentMode='MANUAL';config.yappyPaymentsEnabled=true;config.yappyMerchantId='fixture-merchant';config.yappySecretKey=Buffer.from('launch-signature.fixture').toString('base64');config.yappyApiBase='https://yappy.fixture.invalid';
    let providerOrders=0;
    globalThis.fetch=async(input:any,init:any)=>{
      const url=String(input);assert.ok(url.startsWith(config.yappyApiBase),'real network forbidden');
      if(url.endsWith('/validate/merchant'))return new Response(JSON.stringify({body:{token:'fixture-auth',epochTime:1}}),{status:200});
      const b=JSON.parse(init.body);assert.equal(b.total,'2.50');assert.equal(b.subtotal,'2.50');providerOrders++;
      return new Response(JSON.stringify({body:{token:'fixture-token',documentName:'fixture-document',transactionId:'fixture-launch'}}),{status:200});
    };
    const endpoint=base+'/payments/yappy';
    const orders=await Promise.all([0,1].map(()=>app.inject({method:'POST',url:endpoint,headers:{cookie:`empleos_session=${f.company.token}`},payload:{aliasYappy:'60000000',amount:0.01}})));
    assert.ok(orders.every((r:any)=>[200,409].includes(r.statusCode)));const order=orders.find((r:any)=>r.statusCode===200)!.json();assert.equal(order.amount,'2.50');assert.equal(providerOrders,1);
    const ipn=async(valid=true)=>app.inject({method:'GET',url:'/v1/payments/yappy/ipn?'+new URLSearchParams({orderId:order.orderId,status:'E',domain:config.webUrl,hash:valid?crypto.createHmac('sha256','launch-signature').update(order.orderId+'E'+config.webUrl).digest('hex'):'invalid'})});
    assert.equal((await ipn(false)).statusCode,401);await f.call(f.company,'GET',base+'/delivery',undefined,404);
    assert.equal((await ipn()).statusCode,200);assert.equal((await ipn()).statusCode,200);
    const delivered=await f.call(f.company,'GET',base+'/delivery');assert.equal(delivered.candidates.length,1);assert.equal(delivered.candidates[0].full_name,'Private launch name');
    assert.equal((await one('select status from vacancies where vacancy_id=$1',[row.vacancy_id])).status,'ENTREGADA');
    assert.equal((await one("select count(*)::int n from vacancy_deliveries where vacancy_id=$1 and status='ENVIADA'",[row.vacancy_id])).n,1);
    assert.equal((await one("select count(*)::int n from vacancy_payments where vacancy_id=$1 and status='APROBADO'",[row.vacancy_id])).n,1);
    assert.equal((await one('select match_analysis from vacancy_delivery_candidates where candidate_id=$1',[cp.candidate_id])).match_analysis.summary,'Descripción conservada');
    assert.equal((await f.call(f.company,'POST',base+'/candidates/accept',payload)).reused,true);
    assert.equal((await f.call(f.company,'POST',endpoint,{aliasYappy:'60000000'})).orderId,order.orderId);assert.equal(providerOrders,1);
    // Existing pending operations retain their original amount and cannot be repriced by selection.
    const historical=await one(`insert into vacancies(company_id,request_type,position,work_location,schedule,skills,main_functions,package,package_candidate_limit,package_price,status)
      values($1,'VACANTE','Legacy pending','Santiago','Diurno','Excel','Cuentas','DISPONIBLES',3,14.97,'PENDIENTE_PAGO') returning vacancy_id,vacancy_code`,[row.company_id]);
    await f.call(f.company,'POST',`/v1/company/vacancies/${historical.vacancy_code}/candidates/accept`,payload,409);
    assert.equal((await one('select package_price from vacancies where vacancy_id=$1',[historical.vacancy_id])).package_price,'14.97');
    // Services honor declared Santiago coverage while preserving verification and pricing.
    await q("update service_provider_profiles set service_district='Atalaya',service_corregimiento='Atalaya',service_areas='Santiago / Veraguas',service_trade='  ELECTRÍCISTA   ' where user_id=$1",[f.provider.id]);
    const service=(await f.call(f.company,'POST','/v1/company/vacancies',{request_type:'EVENTUAL',position:'Electricista',work_location:'Santiago',province:'Veraguas',district:'Santiago',corregimiento:'Santiago',schedule:'Diurno',skills:'Electricidad',main_functions:'Reparar',confirm_correct:true,confirm_terms:true,confirm_scope:true},201)).vacancy;
    const sm=await f.call(f.company,'GET',`/v1/company/vacancies/${service.vacancy_code}/service-matches`);assert.ok(sm.items.some((i:any)=>i.provider_id===f.provider.id));assert.ok(!sm.items.some((i:any)=>i.provider_id===f.wrongProvider.id));assert.equal(sm.pricing.unit_price,1.89);
    await q("update service_provider_profiles set service_trade='Plomero' where user_id=$1",[f.provider.id]);assert.equal((await f.call(f.company,'GET',`/v1/company/vacancies/${service.vacancy_code}/service-matches`)).items.length,0);
    console.log('LAUNCH_MATCHING_PAYMENT PASS accounting-positive/negative/structured/normalization/persona/AI-outage/FREE-block/server-250/spoof-resistant/private-before-pay/signed-IPN/one-delivery/history/verified-service-coverage');
  }finally{globalThis.fetch=originalFetch;Object.assign(config,saved);}
}
