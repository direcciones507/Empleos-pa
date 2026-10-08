import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import type {FastifyInstance} from 'fastify';
import {db} from './db.js';
import {config} from './config.js';
import {enableProfile} from './auth.js';
export async function companySelectionIntegration(app:FastifyInstance,f:any){
 const q=(sql:string,p:any[]=[])=>db.query(sql,p),one=async(sql:string,p:any[]=[]) => (await q(sql,p)).rows[0];
 const saved={...config},originalFetch=globalThis.fetch;
 const companyId=(await one('select company_id from companies where owner_user_id=$1',[f.company.id])).company_id;
 const ids:string[]=[];
 try{
  config.deepSeekApiKey='';config.requestPaymentMode='MANUAL';config.yappyPaymentsEnabled=true;
  config.yappyMerchantId='fixture';config.yappySecretKey=Buffer.from('pr91-signature.fixture').toString('base64');config.yappyApiBase='https://yappy.fixture.invalid';
  for(let i=0;i<16;i++){
   const u=await one("insert into users(email,normalized_email,password_hash,role) values($1,$1,'isolated','CANDIDATO') returning user_id",[`pr91-person-${i}@example.test`]);await enableProfile(u.user_id,'CANDIDATO');
   const cp=await one("insert into candidate_profiles(user_id,candidate_code,full_name,phone,primary_job_area,skills,province,district,status,valid_until) values($1,$2,'Private PR91 name','60000000','Perfil de procesos','PR91 labor evidence','Veraguas','Santiago','ACTIVO',current_date+45) returning candidate_id",[u.user_id,'CAN-PR91-'+i]);ids.push(cp.candidate_id);
  }
  const fixture=async(n:number)=>{
   const v=await one("insert into vacancies(company_id,request_type,position,quantity,work_location,province,district,schedule,skills,main_functions,status,confirmations) values($1,'VACANTE','Proceso fixture',3,'Santiago','Veraguas','Santiago','Diurno','PR91 labor evidence','Operar','APROBADA',jsonb_build_object('requested_candidates',$2::int)) returning vacancy_id,vacancy_code",[companyId,n]);return {...v,base:`/v1/company/vacancies/${v.vacancy_code}`};
  };
  for(const request_type of ['VACANTE','EVENTUAL'])for(const requested_candidates of [1,5,10,15]){
   const created=(await f.call(f.company,'POST','/v1/company/vacancies',{request_type,requested_candidates,quantity:3,position:'Asistente contable',work_location:'Santiago',province:'Veraguas',district:'Santiago',corregimiento:'Santiago',schedule:'Diurno',skills:'Registro',main_functions:'Registrar',confirm_correct:true,confirm_terms:true,confirm_scope:true},201)).vacancy;
   const stored=await one('select quantity,confirmations from vacancies where vacancy_code=$1',[created.vacancy_code]);assert.equal(stored.quantity,3);assert.equal(stored.confirmations.requested_candidates,requested_candidates);
  }
  for(const n of [1,5,10,15]){
   const v=await fixture(n);const m=await f.call(f.company,'GET',v.base+'/matches');assert.equal(m.count,n);assert.equal((await one('select quantity from vacancies where vacancy_id=$1',[v.vacancy_id])).quantity,3);
   assert.ok(m.analyses.every((a:any)=>ids.includes(a.candidate_id)));assert.ok(!JSON.stringify(m).includes('Private PR91 name'));assert.ok(!JSON.stringify(m).includes('60000000'));
   const picked=m.analyses.slice(0,Math.min(2,n)).map((a:any)=>a.candidate_id);
   await f.call(f.company,'POST',v.base+'/candidates/accept',{candidate_ids:[],confirm_price:true},400);
   if(n===1)await f.call(f.company,'POST',v.base+'/candidates/accept',{candidate_ids:ids.slice(0,2),confirm_price:true},409);
   const selection=await f.call(f.company,'POST',v.base+'/candidates/accept',{candidate_ids:picked,confirm_price:true,total:0.01});assert.equal(selection.quote.total,picked.length*2.5);
   const preview=await f.call(f.company,'GET',v.base+'/matches');assert.deepEqual(new Set(preview.analyses.map((a:any)=>a.candidate_id)),new Set(picked));assert.equal(preview.selection_locked,true);
   const refreshed=await f.call(f.company,'POST',v.base+'/matches/refresh',{});assert.deepEqual(new Set(refreshed.selected_candidate_ids),new Set(picked));assert.equal((await f.call(f.company,'GET',v.base+'/matches')).count,n);
  }
  const few=await fixture(15);await q('update candidate_profiles set status=\'RETIRADO\' where candidate_id=any($1::uuid[])',[ids.slice(3)]);
  assert.equal((await f.call(f.company,'GET',few.base+'/matches')).count,3);
  await q("update candidate_profiles set status='ACTIVO' where candidate_id=any($1::uuid[])",[ids]);
  // Invalid requested counts are rejected for both real creation flows.
  for(const request_type of ['VACANTE','EVENTUAL'])for(const requested_candidates of [0,16,1.5,true])await f.call(f.company,'POST','/v1/company/vacancies',{request_type,requested_candidates},400);
  const v=await fixture(10),m=await f.call(f.company,'GET',v.base+'/matches');const picked=m.analyses.slice(0,2).map((a:any)=>a.candidate_id);
  await f.call(f.company,'POST',v.base+'/candidates/accept',{candidate_ids:picked,confirm_price:true});
  let providerCalls=0;globalThis.fetch=async(input:any,init:any)=>{
   assert.ok(String(input).startsWith(config.yappyApiBase),'No real payment network');
   if(String(input).endsWith('/validate/merchant'))return new Response(JSON.stringify({body:{token:'fixture',epochTime:1}}));
   providerCalls++;assert.equal(JSON.parse(init.body).total,'5.00');return new Response(JSON.stringify({body:{token:'fixture',documentName:'fixture',transactionId:'pr91-fixture'}}));
  };
  const order=await f.call(f.company,'POST',v.base+'/payments/yappy',{aliasYappy:'60000000'});assert.equal(order.amount,'5.00');
  await f.call(f.company,'POST',v.base+'/matches/refresh',{},409);await f.call(f.company,'POST',v.base+'/cancel',{confirm:true},409);await f.call(f.company,'DELETE',v.base,{confirm:true},409);
  assert.equal((await f.call(f.company,'GET',v.base+'/matches')).count,2);await f.call(f.company,'GET',v.base+'/delivery',undefined,404);
  const ipn=async(status:string)=>app.inject({method:'GET',url:'/v1/payments/yappy/ipn?'+new URLSearchParams({orderId:order.orderId,status,domain:config.webUrl,hash:crypto.createHmac('sha256','pr91-signature').update(order.orderId+status+config.webUrl).digest('hex')})});
  for(const status of ['E','E','R','C','X'])assert.equal((await ipn(status)).statusCode,200);
  const delivery=await f.call(f.company,'GET',v.base+'/delivery');const snapshot=await q('select dc.candidate_id from vacancy_delivery_candidates dc join vacancy_deliveries d on d.delivery_id=dc.delivery_id where d.vacancy_id=$1',[v.vacancy_id]);assert.deepEqual(new Set(snapshot.rows.map((a:any)=>a.candidate_id)),new Set(picked));assert.equal(delivery.candidates.length,2);assert.ok(JSON.stringify(delivery).includes('Private PR91 name'));
  await f.call(f.company,'POST',v.base+'/matches/refresh',{},409);await f.call(f.company,'POST',v.base+'/candidates/accept',{candidate_ids:[ids.find(x=>!picked.includes(x))],confirm_price:true},409);
  assert.equal((await f.call(f.company,'POST',v.base+'/payments/yappy',{aliasYappy:'60000000'})).orderId,order.orderId);assert.equal(providerCalls,1);
  assert.equal((await one("select count(*)::int n from vacancy_deliveries where vacancy_id=$1 and status='ENVIADA'",[v.vacancy_id])).n,1);
  const safe=await fixture(5);await f.call(f.company,'POST',safe.base+'/cancel',{},400);await f.call(f.other,'POST',safe.base+'/cancel',{confirm:true},404);await f.call(f.company,'POST',safe.base+'/cancel',{confirm:true});await f.call(f.company,'GET',safe.base+'/matches',undefined,409);await f.call(f.company,'DELETE',safe.base,{confirm:true});
  // Separate provider profiles and acceptance flow retain $1.89 per connection.
  const providers=(await q('select user_id from candidate_profiles where candidate_id=any($1::uuid[]) order by candidate_id',[ids])).rows.map((r:any)=>r.user_id);
  for(const provider of providers){
   await q("insert into service_provider_profiles(user_id,full_name,service_trade,service_province,service_district,service_corregimiento) values($1,'Private service name','Proceso fixture','Veraguas','Santiago','Santiago')",[provider]);
   await q("insert into service_provider_verifications(user_id,provider,provider_session_id,status) values($1,'DIDIT',$2,'APPROVED')",[provider,'pr91-'+provider]);
  }
  for(const n of [1,5,10,15]){
   const service=await fixture(n);await q("update vacancies set request_type='EVENTUAL' where vacancy_id=$1",[service.vacancy_id]);
   const found=await f.call(f.company,'GET',service.base+'/service-matches');assert.equal(found.items.length,n);assert.equal(found.pricing.unit_price,1.89);assert.ok(!JSON.stringify(found).includes('Private service name'));
   for(const item of found.items)await f.call(f.company,'POST',service.base+'/service-contact-requests',{provider_id:item.provider_id});
   const outside=providers.find((id:string)=>!found.items.some((x:any)=>x.provider_id===id));await f.call(f.company,'POST',service.base+'/service-contact-requests',{provider_id:outside},409);
   const requests=await f.call(f.company,'GET',service.base+'/service-contact-requests');assert.equal(requests.items.length,n);
   const first=requests.items[0],endpoint=`/v1/company/service-contact-requests/${first.contact_request_id}/payments/yappy`;
   await f.call(f.company,'POST',endpoint,{aliasYappy:'60000000'},409);
   await f.call(f.company,'POST',service.base+'/cancel',{confirm:true});
  }
  console.log('PR91_SELECTION PASS quantities-1-5-10-15/fewer/partial/zero/server-total/pending-reopen/explicit-refresh/selection-preserved/signed-repeat-late-IPN/exact-delivery/no-more-purchases/cancel/ownership/privacy');
 }finally{globalThis.fetch=originalFetch;Object.assign(config,saved);}
}
