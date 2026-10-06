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
async function createProviderOrder(req:any,reply:any,{amount,purpose,vacancyId}:{amount:number;purpose:"TEST"|"VACANCY";vacancyId?:string}){
 if(!config.yappyMerchantId||!config.yappySecretKey)return reply.code(503).send({error:"YAPPY_NOT_CONFIGURED"});
 const alias=String(req.body?.aliasYappy??"").replace(/\D/g,"");
 if(!/^6\d{7}$/.test(alias))return reply.code(400).send({error:"YAPPY_ALIAS_INVALID"});
 const domain=config.webUrl;
 const auth=await yappyPost("/payments/validate/merchant",{merchantId:config.yappyMerchantId,urlDomain:domain});
 const token=String(auth.body?.token??""); const epoch=Number(auth.body?.epochTime??Date.now());
 if(!token)return reply.code(502).send({error:"YAPPY_AUTH_INVALID"});
 const id=orderId(); const ipnUrl=publicBase(req)+"/v1/payments/yappy/ipn";
 const created=await yappyPost("/payments/payment-wc",{merchantId:config.yappyMerchantId,orderId:id,domain,paymentDate:epoch,aliasYappy:alias,ipnUrl,discount:"0.00",taxes:"0.00",subtotal:money(amount),total:money(amount)},token);
 const body=created.body??{};
 if(!body.token||!body.documentName||!body.transactionId)return reply.code(502).send({error:"YAPPY_ORDER_INVALID"});
 await db.query("insert into yappy_payment_orders(yappy_order_id,user_id,vacancy_id,purpose,amount,provider_transaction_id) values($1,$2,$3,$4,$5,$6)",[id,req.authUser!.user_id,vacancyId??null,purpose,amount,String(body.transactionId)]);
 return {orderId:id,transactionId:body.transactionId,token:body.token,documentName:body.documentName,amount:money(amount)};
}

export async function yappyPaymentRoutes(app:FastifyInstance){
 app.post("/v1/company/payments/yappy/test",{preHandler:requireRoles("EMPRESA")},async(req:any,reply)=>createProviderOrder(req,reply,{amount:0.01,purpose:"TEST"}));
 app.post("/v1/company/vacancies/:code/payments/yappy",{preHandler:requireRoles("EMPRESA")},async(req:any,reply)=>{
  const code=String(req.params.code??"").trim();if(!/^VAC-\d{6}$/.test(code))return reply.code(400).send({error:"INVALID_VACANCY_CODE"});
  const q=await db.query("select v.vacancy_id,v.status,v.package_price from vacancies v join companies c on c.company_id=v.company_id where v.vacancy_code=$1 and c.owner_user_id=$2",[code,req.authUser!.user_id]);
  if(!q.rowCount)return reply.code(404).send({error:"VACANCY_NOT_FOUND"});
  if(q.rows[0].status!=="PENDIENTE_PAGO")return reply.code(409).send({error:"PAYMENT_NOT_ALLOWED"});
  const amount=Number(q.rows[0].package_price);if(!Number.isFinite(amount)||amount<=0)return reply.code(409).send({error:"PAYMENT_AMOUNT_INVALID"});
  return createProviderOrder(req,reply,{amount,purpose:"VACANCY",vacancyId:q.rows[0].vacancy_id});
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
   if(q.rows[0].status!=="EXECUTED"){await c.query("update yappy_payment_orders set status=$1,provider_confirmation_number=coalesce($2,provider_confirmation_number),completed_at=case when $1='EXECUTED' then coalesce(completed_at,now()) else completed_at end,updated_at=now() where yappy_order_id=$3",[next,String(req.query?.confirmationNumber??"")||null,orderId]);
    if(next==="EXECUTED"&&q.rows[0].vacancy_id){await c.query("update vacancies set status='APROBADA',updated_at=now() where vacancy_id=$1 and status='PENDIENTE_PAGO'",[q.rows[0].vacancy_id]);await c.query("insert into vacancy_payments(vacancy_id,status,amount,reference,submitted_at,reviewed_at) values($1,'APROBADO',$2,$3,now(),now()) on conflict do nothing",[q.rows[0].vacancy_id,q.rows[0].amount,"YAPPY:"+orderId]);}}
   await c.query("commit");return {success:true};
  }catch(e){await c.query("rollback").catch(()=>{});throw e;}finally{c.release();}
 });
}
