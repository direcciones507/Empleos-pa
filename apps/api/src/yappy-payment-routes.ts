import type {FastifyInstance} from "fastify";
import crypto from "node:crypto";
import {db} from "./db.js";
import {requireRoles} from "./rbac.js";
import {config} from "./config.js";

function orderId(){return ("EP"+Date.now().toString(36)+crypto.randomBytes(2).toString("hex")).slice(0,15);}
function money(n:number){return n.toFixed(2);}
function publicBase(req:any){const proto=String(req.headers["x-forwarded-proto"]??"https").split(",")[0].trim();const host=String(req.headers["x-forwarded-host"]??req.headers.host??"").split(",")[0].trim();return proto+"://"+host;}
async function yappyPost(path:string,body:any,authorization?:string){
 const r=await fetch(config.yappyApiBase+path,{method:"POST",headers:{"content-type":"application/json",...(authorization?{authorization}: {})},body:JSON.stringify(body)});
 const data:any=await r.json().catch(()=>({}));
 if(!r.ok||!data?.body)throw Object.assign(new Error("YAPPY_PROVIDER_ERROR"),{status:r.status,data});
 return data;
}
async function createProviderOrder(req:any,reply:any,{amount,purpose,vacancyId,contactRequestId}:{amount:number;purpose:"TEST"|"VACANCY"|"SERVICE_CONTACT";vacancyId?:string;contactRequestId?:string}){
 if(config.requestPaymentMode!=="MANUAL")return reply.code(409).send({error:"PAYMENTS_DISABLED"});
 if(!config.yappyMerchantId||!config.yappySecretKey)return reply.code(503).send({error:"YAPPY_NOT_CONFIGURED"});
 const alias=String(req.body?.aliasYappy??"").replace(/\D/g,"");
 if(!/^6\d{7}$/.test(alias))return reply.code(400).send({error:"YAPPY_ALIAS_INVALID"});
 const id=orderId(),key=purpose==="TEST"?"TEST:"+id:purpose+":"+(vacancyId??contactRequestId);
 // Commit the operation reservation before calling the provider. Concurrent retries
 // can only reuse this order; an early IPN already has a durable operation to find.
 const reserved=await db.query("insert into yappy_payment_orders(yappy_order_id,user_id,vacancy_id,contact_request_id,purpose,amount,operation_key) values($1,$2,$3,$4,$5,$6,$7) on conflict(operation_key) do nothing returning yappy_order_id",[id,req.authUser!.user_id,vacancyId??null,contactRequestId??null,purpose,amount,key]);
 if(!reserved.rowCount){
  const existing=await db.query("select * from yappy_payment_orders where operation_key=$1 and user_id=$2",[key,req.authUser!.user_id]);
  const row=existing.rows[0];if(!row)return reply.code(409).send({error:"PAYMENT_OPERATION_CONFLICT"});
  if(Number(row.amount)!==amount)return reply.code(409).send({error:"PAYMENT_AMOUNT_CHANGED"});
  if(row.status==="EXECUTED")return {orderId:row.yappy_order_id,amount:money(Number(row.amount)),status:row.status,reused:true};
  if(row.provider_response&&row.status==="PENDING")return {...row.provider_response,status:row.status,reused:true};
  return reply.code(409).send({error:row.status==="PENDING"?"PAYMENT_INITIALIZING":"PAYMENT_REQUIRES_REVIEW",orderId:row.yappy_order_id});
 }
 try{
  const domain=config.webUrl;
  const auth=await yappyPost("/payments/validate/merchant",{merchantId:config.yappyMerchantId,urlDomain:domain});
  const token=String(auth.body?.token??""),epoch=Number(auth.body?.epochTime??Date.now());
  if(!token)throw Error("YAPPY_AUTH_INVALID");
  const created=await yappyPost("/payments/payment-wc",{merchantId:config.yappyMerchantId,orderId:id,domain,paymentDate:epoch,aliasYappy:alias,ipnUrl:publicBase(req)+"/v1/payments/yappy/ipn",discount:"0.00",taxes:"0.00",subtotal:money(amount),total:money(amount)},token);
  const body=created.body??{};
  if(!body.token||!body.documentName||!body.transactionId)throw Error("YAPPY_ORDER_INVALID");
  const response={orderId:id,transactionId:String(body.transactionId),token:String(body.token),documentName:String(body.documentName),amount:money(amount)};
  await db.query("update yappy_payment_orders set provider_transaction_id=$2,provider_response=$3::jsonb,updated_at=now() where yappy_order_id=$1",[id,response.transactionId,JSON.stringify(response)]);
  return response;
 }catch{
  await db.query("update yappy_payment_orders set status='REJECTED',updated_at=now() where yappy_order_id=$1 and status='PENDING'",[id]);
  return reply.code(502).send({error:"YAPPY_PROVIDER_ERROR",orderId:id});
 }
}

export async function yappyPaymentRoutes(app:FastifyInstance){
 app.get("/v1/company/payments/yappy/config",{preHandler:requireRoles("EMPRESA")},async()=>({enabled:config.requestPaymentMode==="MANUAL"&&Boolean(config.yappyMerchantId&&config.yappySecretKey)}));
 app.post("/v1/company/payments/yappy/test",{preHandler:requireRoles("EMPRESA")},async(req:any,reply)=>createProviderOrder(req,reply,{amount:0.01,purpose:"TEST"}));
 app.post("/v1/company/vacancies/:code/payments/yappy",{preHandler:requireRoles("EMPRESA")},async(req:any,reply)=>{
  const code=String(req.params.code??"").trim();if(!/^VAC-\d{6}$/.test(code))return reply.code(400).send({error:"INVALID_VACANCY_CODE"});
  const q=await db.query("select v.vacancy_id,v.status,v.request_type,v.package_price from vacancies v join companies c on c.company_id=v.company_id where v.vacancy_code=$1 and c.owner_user_id=$2",[code,req.authUser!.user_id]);
  if(!q.rowCount)return reply.code(404).send({error:"VACANCY_NOT_FOUND"});
  if(q.rows[0].request_type!=="VACANTE")return reply.code(409).send({error:"SERVICE_CONNECTION_PAYMENT_REQUIRED"});
  const prior=await db.query("select yappy_order_id from yappy_payment_orders where operation_key=$1 and user_id=$2 and status='EXECUTED'",["VACANCY:"+q.rows[0].vacancy_id,req.authUser!.user_id]);
  if(q.rows[0].status!=="PENDIENTE_PAGO"&&!prior.rowCount)return reply.code(409).send({error:"PAYMENT_NOT_ALLOWED"});
  const amount=Number(q.rows[0].package_price);if(!Number.isFinite(amount)||amount<=0)return reply.code(409).send({error:"PAYMENT_AMOUNT_INVALID"});
  return createProviderOrder(req,reply,{amount,purpose:"VACANCY",vacancyId:q.rows[0].vacancy_id});
 });
 app.post("/v1/company/service-contact-requests/:id/payments/yappy",{preHandler:requireRoles("EMPRESA")},async(req:any,reply)=>{
  const id=String(req.params.id??"");if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))return reply.code(400).send({error:"INVALID_CONTACT_REQUEST_ID"});
  const q=await db.query("select r.contact_request_id,r.status,r.price from service_contact_requests r join vacancies v on v.vacancy_id=r.vacancy_id join companies co on co.company_id=v.company_id join users u on u.user_id=r.provider_user_id where r.contact_request_id=$1 and co.owner_user_id=$2 and u.status='ACTIVE' and v.request_type='EVENTUAL' and v.status in ('APROBADA','EN_BUSQUEDA')",[id,req.authUser!.user_id]);
  if(!q.rowCount)return reply.code(404).send({error:"CONTACT_REQUEST_NOT_FOUND"});
  if(!["ACCEPTED_AWAITING_PAYMENT","PAID"].includes(q.rows[0].status))return reply.code(409).send({error:"PROVIDER_ACCEPTANCE_REQUIRED"});
  return createProviderOrder(req,reply,{amount:1.89,purpose:"SERVICE_CONTACT",contactRequestId:id});
 });
 app.get("/v1/company/payments/yappy/:orderId",{preHandler:requireRoles("EMPRESA")},async(req:any,reply)=>{
  const id=String(req.params.orderId??"");const q=await db.query("select yappy_order_id,purpose,amount,status,created_at,completed_at from yappy_payment_orders where yappy_order_id=$1 and user_id=$2",[id,req.authUser!.user_id]);
  return q.rowCount?{payment:q.rows[0]}:reply.code(404).send({error:"PAYMENT_NOT_FOUND"});
 });
 app.get("/v1/payments/yappy/ipn",async(req:any,reply)=>{
  const {orderId,status,domain}=req.query??{};const hash=String(req.query?.hash??req.query?.Hash??"");
  if(typeof orderId!=="string"||typeof status!=="string"||typeof domain!=="string"||!hash)return reply.code(400).send({success:false});
  if(domain!==config.webUrl)return reply.code(400).send({success:false});
  let decoded="";try{decoded=Buffer.from(config.yappySecretKey,"base64").toString("utf8");}catch{return reply.code(500).send({success:false});}
  const secret=decoded.split(".")[0];if(!secret)return reply.code(500).send({success:false});
  const expected=crypto.createHmac("sha256",secret).update(orderId+status+domain).digest("hex");
  const a=Buffer.from(expected),b=Buffer.from(hash.toLowerCase());if(a.length!==b.length||!crypto.timingSafeEqual(a,b))return reply.code(401).send({success:false});
  const map:any={E:"EXECUTED",R:"REJECTED",C:"CANCELLED",X:"EXPIRED"};const next=map[status];if(!next)return reply.code(400).send({success:false});
  const c=await db.connect();try{await c.query("begin");const q=await c.query("select * from yappy_payment_orders where yappy_order_id=$1 for update",[orderId]);if(!q.rowCount){await c.query("rollback");return reply.code(404).send({success:false});}
   const order=q.rows[0];
   if(order.status==="PENDING"){
    if(next==="EXECUTED"&&order.purpose==="SERVICE_CONTACT"){
     const contact=await c.query("select r.*,co.owner_user_id from service_contact_requests r join vacancies v on v.vacancy_id=r.vacancy_id join companies co on co.company_id=v.company_id where r.contact_request_id=$1 for update of r,v",[order.contact_request_id]);
     const r=contact.rows[0];
     if(!r||r.status!=="ACCEPTED_AWAITING_PAYMENT"||r.owner_user_id!==order.user_id||Number(order.amount)!==1.89||Number(r.price)!==1.89){await c.query("rollback");return reply.code(409).send({success:false});}
     await c.query("update service_contact_requests set status='PAID',paid_at=now(),paid_order_id=$2 where contact_request_id=$1 and status='ACCEPTED_AWAITING_PAYMENT'",[r.contact_request_id,orderId]);
    }
    if(next==="EXECUTED"&&order.purpose==="VACANCY"&&order.vacancy_id){
     const vacancy=await c.query("select v.*,co.owner_user_id from vacancies v join companies co on co.company_id=v.company_id where v.vacancy_id=$1 for update of v",[order.vacancy_id]);
     const v=vacancy.rows[0];if(!v||v.request_type!=="VACANTE"||v.owner_user_id!==order.user_id||Number(v.package_price)!==Number(order.amount)){await c.query("rollback");return reply.code(409).send({success:false});}
     await c.query("update vacancies set status='APROBADA',updated_at=now() where vacancy_id=$1 and status='PENDIENTE_PAGO'",[order.vacancy_id]);
     await c.query("insert into vacancy_payments(vacancy_id,status,amount,reference,submitted_at,reviewed_at) values($1,'APROBADO',$2,$3,now(),now()) on conflict do nothing",[order.vacancy_id,order.amount,"YAPPY:"+orderId]);
    }
    await c.query("update yappy_payment_orders set status=$1,provider_confirmation_number=coalesce($2,provider_confirmation_number),completed_at=case when $1='EXECUTED' then now() else completed_at end,updated_at=now() where yappy_order_id=$3",[next,String(req.query?.confirmationNumber??"")||null,orderId]);
   }
   await c.query("commit");return {success:true};
  }catch(e){await c.query("rollback").catch(()=>{});throw e;}finally{c.release();}
 });
}
