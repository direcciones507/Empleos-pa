import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import type {FastifyInstance} from 'fastify';
import {db} from './db.js';
import {config} from './config.js';
export async function yappyOperationIntegration(app:FastifyInstance,f:any){
  const q=(sql:string,p:any[]=[])=>db.query(sql,p),one=async(sql:string,p:any[]=[]) => (await q(sql,p)).rows[0];
  const saved={requestPaymentMode:config.requestPaymentMode,yappyApiBase:config.yappyApiBase,yappyMerchantId:config.yappyMerchantId,yappySecretKey:config.yappySecretKey};
  const originalFetch=globalThis.fetch;let providerOrders=0;const totals:string[]=[];
  try{
    config.requestPaymentMode='FREE';
    config.yappyApiBase='https://yappy.fixture.invalid';config.yappyMerchantId='isolated-merchant';config.yappySecretKey=Buffer.from('isolated-signature.fixture').toString('base64');
    globalThis.fetch=async(input:any,init:any)=>{
      const url=String(input);assert.ok(url.startsWith(config.yappyApiBase),'External payment network is forbidden in this test');
      if(url.endsWith('/validate/merchant'))return new Response(JSON.stringify({body:{token:'fixture-auth',epochTime:1}}),{status:200});
      assert.ok(url.endsWith('/payment-wc'));providerOrders++;const b=JSON.parse(init.body);totals.push(b.total);
      // The operation must already exist before the provider is invoked.
      assert.ok(await one('select yappy_order_id from yappy_payment_orders where yappy_order_id=$1',[b.orderId]));
      return new Response(JSON.stringify({body:{token:'fixture-token',documentName:'fixture-document',transactionId:'fixture-'+providerOrders}}),{status:200});
    };
    const companyId=(await one('select company_id from companies where owner_user_id=$1',[f.company.id])).company_id;
    const v=await one(`insert into vacancies(company_id,request_type,position,work_location,province,district,corregimiento,schedule,skills,main_functions,status) values($1,'EVENTUAL','Electricista','Santiago','Veraguas','Santiago','Santiago','Diurno','Electricidad','Reparar','APROBADA') returning vacancy_code`,[companyId]);
    const r=(await f.call(f.company,'POST',`/v1/company/vacancies/${v.vacancy_code}/service-contact-requests`,{provider_id:f.provider.id})).request;
    const endpoint=`/v1/company/service-contact-requests/${r.contact_request_id}/payments/yappy`,payload={aliasYappy:'60000000',amount:0.01,total:0.01};
    assert.equal((await f.call(f.company,'GET','/v1/company/payments/yappy/config')).enabled,false);
    await f.call(f.company,'POST',endpoint,payload,409);await f.call(f.other,'POST',endpoint,payload,404);
    await f.call(f.company,'POST',`/v1/company/service-contact-requests/${f.rejectedId}/payments/yappy`,payload,409);
    await f.call(f.company,'POST','/v1/company/payments/yappy/test',payload,409);assert.equal(providerOrders,0);
    await f.call(f.provider,'POST',`/v1/service-provider/contact-requests/${r.contact_request_id}/respond`,{action:'ACCEPT'});
    await f.call(f.company,'POST',endpoint,payload,409);assert.equal(providerOrders,0);
    config.requestPaymentMode='MANUAL';
    const raw=()=>app.inject({method:'POST',url:endpoint,headers:{cookie:`empleos_session=${f.company.token}`},payload});
    const simultaneous=await Promise.all([raw(),raw()]);assert.ok(simultaneous.some(x=>x.statusCode===200));
    for(const x of simultaneous){assert.ok([200,409].includes(x.statusCode),x.body);if(x.statusCode===409)assert.equal(x.json().error,'PAYMENT_INITIALIZING');}
    const order=simultaneous.find(x=>x.statusCode===200)!.json();assert.equal(order.amount,'1.89');assert.equal(providerOrders,1);
    const reused=await f.call(f.company,'POST',endpoint,payload);assert.equal(reused.orderId,order.orderId);assert.equal(reused.reused,true);assert.equal(providerOrders,1);
    await f.call(f.other,'GET',`/v1/company/payments/yappy/${order.orderId}`,undefined,404);
    const contact=`/v1/company/service-contact-requests/${r.contact_request_id}/contact`;await f.call(f.company,'GET',contact,undefined,403);
    const ipn=async(id:string,status:string,valid=true)=>{
      const hash=valid?crypto.createHmac('sha256','isolated-signature').update(id+status+config.webUrl).digest('hex'):'invalid';
      return app.inject({method:'GET',url:'/v1/payments/yappy/ipn?'+new URLSearchParams({orderId:id,status,domain:config.webUrl,hash}).toString()});
    };
    assert.equal((await ipn(order.orderId,'E',false)).statusCode,401);await f.call(f.company,'GET',contact,undefined,403);
    assert.equal((await ipn(order.orderId,'E')).statusCode,200);
    const settled=await one('select * from service_contact_requests where contact_request_id=$1',[r.contact_request_id]);assert.equal(settled.status,'PAID');assert.equal(settled.paid_order_id,order.orderId);assert.ok(settled.paid_at);
    assert.equal((await f.call(f.company,'GET',contact)).contact.contact_email,'private@example.test');await f.call(f.other,'GET',contact,undefined,404);
    assert.equal((await ipn(order.orderId,'E')).statusCode,200);assert.equal((await ipn(order.orderId,'R')).statusCode,200);
    assert.deepEqual(await one('select paid_at,paid_order_id from service_contact_requests where contact_request_id=$1',[r.contact_request_id]),{paid_at:settled.paid_at,paid_order_id:order.orderId});
    assert.equal((await f.call(f.company,'POST',endpoint,payload)).orderId,order.orderId);assert.equal(providerOrders,1);
    const formal=await one(`insert into vacancies(company_id,request_type,position,work_location,schedule,skills,main_functions,package,package_candidate_limit,package_price,status) values($1,'VACANTE','Asistente','Santiago','Diurno','Office','Asistir','DISPONIBLES',3,14.97,'PENDIENTE_PAGO') returning vacancy_id,vacancy_code`,[companyId]);
    const formalEndpoint=`/v1/company/vacancies/${formal.vacancy_code}/payments/yappy`;
    await f.call(f.other,'POST',formalEndpoint,payload,404);
    const vacancyOrder=await f.call(f.company,'POST',formalEndpoint,payload);assert.equal(vacancyOrder.amount,'14.97');assert.equal(providerOrders,2);
    assert.equal((await f.call(f.company,'POST',formalEndpoint,payload)).orderId,vacancyOrder.orderId);assert.equal(providerOrders,2);
    assert.equal((await ipn(vacancyOrder.orderId,'E')).statusCode,200);assert.equal((await ipn(vacancyOrder.orderId,'E')).statusCode,200);
    assert.equal((await one('select status from vacancies where vacancy_id=$1',[formal.vacancy_id])).status,'APROBADA');
    assert.equal((await one("select count(*)::int n from vacancy_payments where vacancy_id=$1 and status='APROBADO'",[formal.vacancy_id])).n,1);
    assert.equal((await f.call(f.company,'POST',formalEndpoint,payload)).orderId,vacancyOrder.orderId);assert.equal(providerOrders,2);
    const cp=await one("insert into candidate_profiles(user_id,candidate_code,full_name,phone,status,valid_until,primary_job_area,work_profile,skills) values($1,'CAN-YAPPY-FIXTURE','Provider candidate','60000000','ACTIVO',current_date+45,'Asistente','Asistente','Office') returning candidate_id",[f.provider.id]);
    const delivered=await f.call(f.company,'POST',`/v1/company/vacancies/${formal.vacancy_code}/candidates/accept`,{candidate_ids:[cp.candidate_id],confirm_price:true});
    assert.equal(delivered.status,'ENTREGADA');assert.equal(delivered.payment_required,false);
    const preserved=await one('select package_candidate_limit,package_price from vacancies where vacancy_id=$1',[formal.vacancy_id]);assert.equal(preserved.package_candidate_limit,3);assert.equal(preserved.package_price,'14.97');
    assert.equal((await one("select count(*)::int n from yappy_payment_orders where vacancy_id=$1",[formal.vacancy_id])).n,1);assert.equal(providerOrders,2);
    assert.deepEqual(totals,['1.89','14.97']);
    const registration=await app.inject({method:'POST',url:'/v1/auth/register',payload:{email:'auth-roundtrip@example.test',password:'IsolatedFixture123',role:'CANDIDATO'}});assert.equal(registration.statusCode,200,registration.body);assert.deepEqual(registration.json().user.profiles,['CANDIDATO']);
    const session=String(registration.headers['set-cookie']).split(';')[0];
    const logout=await app.inject({method:'POST',url:'/v1/auth/logout',headers:{cookie:session},payload:{}});assert.equal(logout.statusCode,200);assert.match(String(logout.headers['set-cookie']),/empleos_session=;/);
    assert.equal((await app.inject({method:'GET',url:'/v1/auth/me',headers:{cookie:session}})).statusCode,401);
    const login=await app.inject({method:'POST',url:'/v1/auth/login',payload:{email:'auth-roundtrip@example.test',password:'IsolatedFixture123'}});assert.equal(login.statusCode,200,login.body);assert.deepEqual(login.json().user.profiles,['CANDIDATO']);
    const newCookie=String(login.headers['set-cookie']).split(';')[0];assert.notEqual(newCookie,session);
    assert.equal((await app.inject({method:'GET',url:'/v1/company/profile',headers:{cookie:newCookie}})).statusCode,403);
    console.log('AUTH_ROUNDTRIP PASS registration/logout/relogin/persona-company-isolation');
    console.log('YAPPY_OPERATIONS PASS no-real-network/disabled-mode/ownership/acceptance/server-totals/concurrent-dedup/signed-IPN/private-unlock/idempotency');
  }finally{globalThis.fetch=originalFetch;Object.assign(config,saved);}
}
