import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import Fastify, {type FastifyInstance} from 'fastify';
import cookie from '@fastify/cookie';
import {googleOAuthRoutes} from './google-oauth.js';
import {db} from './db.js';
import {config} from './config.js';
import {enableProfile,createSession} from './auth.js';
import {compatibleCandidates} from './candidate-match-query.js';
export async function prelaunchIntegration(app:FastifyInstance,f:any){
 const q=(sql:string,p:any[]=[])=>db.query(sql,p),one=async(sql:string,p:any[]=[]) => (await q(sql,p)).rows[0];
 const saved={...config},originalFetch=globalThis.fetch;
 try{
  config.deepSeekApiKey='';config.requestPaymentMode='MANUAL';config.yappyPaymentsEnabled=true;config.yappyMerchantId='fixture';
  config.yappySecretKey=Buffer.from('prelaunch.fixture').toString('base64');config.yappyApiBase='https://yappy.fixture.invalid';
  const user=await one("insert into users(email,normalized_email,password_hash,role) values('prelaunch@example.test','prelaunch@example.test','isolated','CANDIDATO') returning user_id");
  await enableProfile(user.user_id,'CANDIDATO');
  const cp=await one("insert into candidate_profiles(user_id,candidate_code,full_name,phone,primary_job_area,skills,province,district,status,valid_until) values($1,'CAN-PRELAUNCH','Private fixture','60000000','Unique fixture occupation','WhatsApp, JavaScript','Veraguas','Santiago','ACTIVO',current_date+45) returning candidate_id",[user.user_id]);
  const company=(await one('select company_id from companies where owner_user_id=$1',[f.company.id])).company_id;
  const fixture=async()=>{
   const v=await one("insert into vacancies(company_id,request_type,position,quantity,work_location,province,district,schedule,skills,main_functions,status,confirmations) values($1,'VACANTE','Unique fixture occupation',1,'Santiago','Veraguas','Santiago','Diurno','Specific skill','Work','APROBADA','{\"requested_candidates\":15}') returning vacancy_id,vacancy_code",[company]);
   const base=`/v1/company/vacancies/${v.vacancy_code}`;
   await f.call(f.company,'POST',base+'/candidates/accept',{candidate_ids:[cp.candidate_id],confirm_price:true});
   return {...v,base};
  };
  let charges=0;globalThis.fetch=async(input:any)=>{
   assert.ok(String(input).startsWith(config.yappyApiBase),'Never contact a real payment provider');
   if(String(input).endsWith('/validate/merchant'))return new Response(JSON.stringify({body:{token:'fixture',epochTime:1}}));
   charges++;return new Response(JSON.stringify({body:{token:'fixture',documentName:'fixture',transactionId:'fixture'}}));
  };
  const ipn=(id:string,valid=true)=>app.inject({method:'GET',url:'/v1/payments/yappy/ipn?'+new URLSearchParams({orderId:id,status:'E',domain:config.webUrl,hash:valid?crypto.createHmac('sha256','prelaunch').update(id+'E'+config.webUrl).digest('hex'):'invalid'})});
  const notify=async(id:string)=>(await one("select count(*)::int n from candidate_notifications where vacancy_id=$1 and type='PROFILE_DELIVERED'",[id])).n;
  const v=await fixture();const order=await f.call(f.company,'POST',v.base+'/payments/yappy',{aliasYappy:'60000000'});
  assert.equal(await notify(v.vacancy_id),0);assert.equal((await ipn(order.orderId,false)).statusCode,401);
  // A PostgreSQL statement failure aborts the delivery subtransaction, not the payment.
  await q(`create function prelaunch_delivery_failure() returns trigger language plpgsql as $$ begin raise exception 'isolated failure'; end $$`);
  await q(`create trigger prelaunch_delivery_failure before update on vacancy_deliveries for each row when (new.status='ENVIADA') execute function prelaunch_delivery_failure()`);
  assert.equal((await ipn(order.orderId)).statusCode,200);
  assert.equal((await one('select status from yappy_payment_orders where yappy_order_id=$1',[order.orderId])).status,'EXECUTED');
  assert.equal((await one("select count(*)::int n from vacancy_payments where vacancy_id=$1 and status='APROBADO'",[v.vacancy_id])).n,1);
  const pending=await one('select status,notes from vacancy_deliveries where vacancy_id=$1',[v.vacancy_id]);assert.equal(pending.status,'LISTA');assert.match(pending.notes,/REVISIÓN/);assert.equal(await notify(v.vacancy_id),0);
  await f.call(f.company,'GET',v.base+'/delivery',undefined,404);
  await q('drop trigger prelaunch_delivery_failure on vacancy_deliveries');await q('drop function prelaunch_delivery_failure()');
  const retry=await Promise.all([ipn(order.orderId),ipn(order.orderId)]);retry.forEach(r=>assert.equal(r.statusCode,200));
  assert.equal((await f.call(f.company,'GET',v.base+'/delivery')).candidates.length,1);assert.equal(await notify(v.vacancy_id),1);
  assert.equal((await one("select count(*)::int n from vacancy_payments where vacancy_id=$1",[v.vacancy_id])).n,1);assert.equal(charges,1);
  // Administrative recovery reuses the existing send endpoint and keeps RBAC.
  const admin=await one("insert into users(email,normalized_email,password_hash,role) values('prelaunch-admin@example.test','prelaunch-admin@example.test','isolated','ADMIN') returning user_id");
  const adminToken=await createSession(admin.user_id),recover=await fixture();
  const recoverOrder=await f.call(f.company,'POST',recover.base+'/payments/yappy',{aliasYappy:'60000000'});
  await q("update candidate_profiles set status='RETIRADO' where candidate_id=$1",[cp.candidate_id]);await ipn(recoverOrder.orderId);
  const adminEndpoint=`/v1/admin/vacancies/${recover.vacancy_code}/delivery/send`;
  await f.call(f.company,'POST',adminEndpoint,{},403);
  assert.equal((await app.inject({method:'POST',url:adminEndpoint,headers:{cookie:'empleos_session='+adminToken},payload:{}})).statusCode,409);
  assert.equal(await notify(recover.vacancy_id),0);
  await q("update candidate_profiles set status='ACTIVO' where candidate_id=$1",[cp.candidate_id]);
  assert.equal((await app.inject({method:'POST',url:adminEndpoint,headers:{cookie:'empleos_session='+adminToken},payload:{}})).statusCode,200);
  assert.equal(await notify(recover.vacancy_id),1);
  assert.equal((await one("select count(*)::int n from admin_audit_log where action='DELIVERY_SENT' and entity_id=$1",[recover.vacancy_code])).n,1);
  // Recheck withdrawal, expiry and disabled account both before the provider
  // reservation and after it, when an external confirmation cannot be undone.
  for(const [change,restore] of [
   ["update candidate_profiles set status='RETIRADO' where candidate_id=$1","update candidate_profiles set status='ACTIVO' where candidate_id=$1"],
   ["update candidate_profiles set valid_until=current_date-1 where candidate_id=$1","update candidate_profiles set valid_until=current_date+45 where candidate_id=$1"],
   ["update users set status='DISABLED' where user_id=(select user_id from candidate_profiles where candidate_id=$1)","update users set status='ACTIVE' where user_id=(select user_id from candidate_profiles where candidate_id=$1)"]]){
   const before=await fixture();const calls:number=charges;await q(change,[cp.candidate_id]);
   await f.call(f.company,'POST',before.base+'/payments/yappy',{aliasYappy:'60000000'},409);assert.equal(charges,calls);
   await q(restore,[cp.candidate_id]);const after=await fixture();const payment=await f.call(f.company,'POST',after.base+'/payments/yappy',{aliasYappy:'60000000'});await q(change,[cp.candidate_id]);
   assert.equal((await ipn(payment.orderId)).statusCode,200);assert.equal((await one('select status from yappy_payment_orders where yappy_order_id=$1',[payment.orderId])).status,'EXECUTED');
   await f.call(f.company,'GET',after.base+'/delivery',undefined,404);assert.equal(await notify(after.vacancy_id),0);await q(restore,[cp.candidate_id]);
  }
  // Fragment false positives are tested against PostgreSQL, not string snapshots.
  const fragment=await fixture();await q("update vacancies set position='Other occupation',skills='SAP, Java' where vacancy_id=$1",[fragment.vacancy_id]);
  assert.ok(!(await compatibleCandidates(db,fragment.vacancy_id)).rows.some((r:any)=>r.candidate_id===cp.candidate_id));
  await q("update vacancies set skills='WhatsApp' where vacancy_id=$1",[fragment.vacancy_id]);assert.ok((await compatibleCandidates(db,fragment.vacancy_id)).rows.some((r:any)=>r.candidate_id===cp.candidate_id));
  await q("update candidate_profiles set skills='C++' where candidate_id=$1",[cp.candidate_id]);
  for(const skill of ['C','C#']){await q('update vacancies set skills=$2 where vacancy_id=$1',[fragment.vacancy_id,skill]);assert.ok(!(await compatibleCandidates(db,fragment.vacancy_id)).rows.some((r:any)=>r.candidate_id===cp.candidate_id));}
  await q("update vacancies set skills='C++' where vacancy_id=$1",[fragment.vacancy_id]);assert.ok((await compatibleCandidates(db,fragment.vacancy_id)).rows.some((r:any)=>r.candidate_id===cp.candidate_id));
  // Recovery uses only the existing webhook, validates one-use token and revokes sessions.
  config.emailWebhookUrl='';assert.equal((await app.inject({method:'POST',url:'/v1/auth/password/forgot',payload:{email:'prelaunch@example.test'}})).statusCode,503);
  config.emailWebhookUrl='https://email.fixture.invalid';config.emailWebhookSecret='fixture';
  globalThis.fetch=async()=>new Response('',{status:503});assert.equal((await app.inject({method:'POST',url:'/v1/auth/password/forgot',payload:{email:'prelaunch@example.test'}})).statusCode,503);
  let resetToken='';globalThis.fetch=async(input:any,init:any)=>{assert.equal(input,config.emailWebhookUrl);assert.equal(init.headers.authorization,'Bearer fixture');resetToken=new URL(JSON.parse(init.body).text.match(/https?:\/\/\S+/)[0]).searchParams.get('token')!;return new Response('{}');};
  const session=await createSession(user.user_id);
  assert.equal((await app.inject({method:'POST',url:'/v1/auth/password/forgot',payload:{email:'prelaunch@example.test'}})).statusCode,200);assert.ok(resetToken);
  assert.equal((await app.inject({method:'POST',url:'/v1/auth/password/reset',payload:{token:resetToken,password:'IsolatedChanged123'}})).statusCode,200);
  assert.equal((await app.inject({method:'POST',url:'/v1/auth/password/reset',payload:{token:resetToken,password:'IsolatedChanged123'}})).statusCode,400);
  assert.equal((await app.inject({method:'GET',url:'/v1/auth/me',headers:{cookie:`empleos_session=${session}`}})).statusCode,401);
  assert.equal((await app.inject({method:'POST',url:'/v1/auth/login',payload:{email:'prelaunch@example.test',password:'IsolatedChanged123'}})).statusCode,200);
  const envKeys=['GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET','GOOGLE_REDIRECT_URI','WEB_URL'];
  const envSaved=Object.fromEntries(envKeys.map(k=>[k,process.env[k]]));
  process.env.GOOGLE_CLIENT_ID='fixture';process.env.GOOGLE_CLIENT_SECRET='fixture';process.env.GOOGLE_REDIRECT_URI='http://localhost/callback';process.env.WEB_URL=config.webUrl;
  const google=Fastify();await google.register(cookie);await google.register(googleOAuthRoutes);
  try{
   globalThis.fetch=async(input:any)=>{
    if(String(input)==='https://oauth2.googleapis.com/token')return new Response(JSON.stringify({access_token:'fixture'}));
    assert.equal(String(input),'https://openidconnect.googleapis.com/v1/userinfo');return new Response(JSON.stringify({sub:'prelaunch-google',email:'prelaunch@example.test',email_verified:true}));
   };
   const start=async()=>{
    const r=await google.inject({method:'GET',url:'/v1/auth/google/start?role=CANDIDATO'});assert.equal(r.statusCode,302);
    return {state:new URL(String(r.headers.location)).searchParams.get('state')!,cookie:String(r.headers['set-cookie']).split(';')[0]};
   };
   const first=await start(),url='/v1/auth/google/callback?code=fixture&state='+first.state;
   assert.equal((await google.inject({method:'GET',url})).statusCode,400);
   const blocked=await google.inject({method:'GET',url,headers:{cookie:first.cookie}});assert.match(String(blocked.headers.location),/password-login-required/);
   assert.equal((await one('select google_subject from users where user_id=$1',[user.user_id])).google_subject,null);
   const second=await start(),ownerSession=await createSession(user.user_id);
   const linked=await google.inject({method:'GET',url:'/v1/auth/google/callback?code=fixture&state='+second.state,headers:{cookie:second.cookie+'; empleos_session='+ownerSession}});assert.equal(linked.statusCode,302,linked.body);
   assert.equal((await one('select google_subject from users where user_id=$1',[user.user_id])).google_subject,'prelaunch-google');
   const third=await start();assert.equal((await google.inject({method:'GET',url:'/v1/auth/google/callback?code=fixture&state='+third.state,headers:{cookie:third.cookie}})).statusCode,302);
   console.log('GOOGLE_SECURITY PASS browser-binding/password-owner-required/link-after-auth/existing-google-login');
  }finally{await google.close();for(const k of envKeys){if(envSaved[k]===undefined)delete process.env[k];else process.env[k]=envSaved[k];}}
  console.log('PRELAUNCH PASS SQL-failed-delivery/persistent-EXECUTED/persistent-approved-payment/concurrent-retry/one-notification/no-premature-notification/withdrawn-expired-disabled/before-and-after-order/fragment-matching/webhook-failure/password-reset-single-use/session-revocation');
 }finally{globalThis.fetch=originalFetch;Object.assign(config,saved);}
}
