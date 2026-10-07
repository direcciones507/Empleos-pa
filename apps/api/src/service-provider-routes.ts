import type {FastifyInstance} from "fastify";
import {db} from "./db.js";
import {requireRoles} from "./rbac.js";
import {config} from "./config.js";

const fields=`full_name,identity_document_type,identity_document_number,service_trade,service_description,service_province,service_district,service_corregimiento,service_areas,available_days,available_hours,mobile_whatsapp,landline_phone,contact_email,fixed_location_name,fixed_location_province,fixed_location_district,fixed_location_corregimiento,fixed_location_address,updated_at`;
const limits:Record<string,number>={full_name:200,identity_document_type:50,identity_document_number:80,service_trade:200,service_description:4000,service_province:120,service_district:120,service_corregimiento:120,service_areas:1000,available_days:500,available_hours:500,mobile_whatsapp:50,landline_phone:50,contact_email:320,fixed_location_name:200,fixed_location_province:120,fixed_location_district:120,fixed_location_corregimiento:120,fixed_location_address:1000};
function text(v:any){return typeof v==="string"&&v.trim()?v.trim():null}
export async function serviceProviderRoutes(app:FastifyInstance){
  app.post("/v1/service-provider/verification/start",{preHandler:requireRoles("CANDIDATO")},async(req,reply)=>{
    if(!config.diditApiKey||!config.diditWorkflowId)return reply.code(503).send({error:"IDENTITY_VERIFICATION_NOT_CONFIGURED"});
    const p=await db.query("select full_name,identity_document_type,identity_document_number,contact_email from service_provider_profiles where user_id=$1",[req.authUser!.user_id]);
    if(!p.rowCount){const me=await db.query("select email from users where user_id=$1",[req.authUser!.user_id]);await db.query("insert into service_provider_profiles(user_id,full_name,contact_email,identity_document_type,identity_document_number) values($1,$2,$3,$4,$5) on conflict(user_id) do nothing",[req.authUser!.user_id,"Pendiente",me.rows[0]?.email??null,"DIDIT","PENDING"]);}
    const response=await fetch("https://verification.didit.me/v3/session/",{method:"POST",headers:{"content-type":"application/json","x-api-key":config.diditApiKey},body:JSON.stringify({workflow_id:config.diditWorkflowId,vendor_data:req.authUser!.user_id,callback:config.webUrl+"/servicios/ofrecer?verification=returned"})});
    const data:any=await response.json().catch(()=>({}));
    if(!response.ok)return reply.code(502).send({error:"IDENTITY_PROVIDER_ERROR"});
    const sessionId=String(data.session_id??data.id??"").trim(),url=String(data.url??data.verification_url??"").trim();
    if(!sessionId||!url)return reply.code(502).send({error:"IDENTITY_PROVIDER_INVALID_RESPONSE"});
    await db.query("insert into service_provider_verifications(user_id,provider,provider_session_id,status) values($1,'DIDIT',$2,'PENDING') on conflict(provider,provider_session_id) do update set updated_at=now()",[req.authUser!.user_id,sessionId]);
    return {verification_url:url,status:"PENDING"};
  });
  app.get("/v1/service-provider/verification",{preHandler:requireRoles("CANDIDATO")},async(req)=>{
    const q=await db.query("select status,verified_at,updated_at from service_provider_verifications where user_id=$1 order by created_at desc limit 1",[req.authUser!.user_id]);
    return {verification:q.rows[0]??null};
  });
  app.post("/v1/service-provider/verification/refresh",{preHandler:requireRoles("CANDIDATO")},async(req,reply)=>{
    if(!config.diditApiKey)return reply.code(503).send({error:"IDENTITY_VERIFICATION_NOT_CONFIGURED"});
    const q=await db.query("select verification_id,provider_session_id,status from service_provider_verifications where user_id=$1 order by created_at desc limit 1",[req.authUser!.user_id]);
    if(!q.rowCount)return reply.code(404).send({error:"VERIFICATION_NOT_FOUND"});
    const response=await fetch("https://verification.didit.me/v3/session/"+encodeURIComponent(q.rows[0].provider_session_id)+"/decision/",{headers:{"x-api-key":config.diditApiKey}});
    const data:any=await response.json().catch(()=>({}));
    if(!response.ok)return reply.code(502).send({error:"IDENTITY_PROVIDER_ERROR"});
    const raw=String(data.status??data.decision?.status??data.decision??"").toUpperCase();
    const status=raw.includes("APPROV")?"APPROVED":raw.includes("DECLIN")?"DECLINED":raw.includes("REVIEW")?"IN_REVIEW":"PENDING";
    const updated=await db.query("update service_provider_verifications set status=$2,verified_at=case when $2='APPROVED' then coalesce(verified_at,now()) else verified_at end,updated_at=now() where verification_id=$1 returning status,verified_at,updated_at",[q.rows[0].verification_id,status]);
    return {verification:updated.rows[0]};
  });
  app.get("/v1/admin/service-providers",{preHandler:requireRoles("ADMIN")},async()=>{const q=await db.query(`select sp.user_id,sp.full_name,sp.service_trade,sp.service_description,sp.service_province,sp.service_district,sp.service_corregimiento,sp.service_areas,sp.available_days,sp.available_hours,sp.mobile_whatsapp,sp.landline_phone,sp.contact_email,sp.fixed_location_name,sp.created_at,sp.updated_at,u.status account_status from service_provider_profiles sp join users u on u.user_id=sp.user_id order by sp.created_at desc limit 100`);return {items:q.rows};});
  app.get("/v1/service-provider/profile",{preHandler:requireRoles("CANDIDATO")},async(req,reply)=>{const q=await db.query(`select ${fields} from service_provider_profiles where user_id=$1`,[req.authUser!.user_id]);return q.rows[0]?{profile:q.rows[0]}:reply.code(404).send({error:"SERVICE_PROFILE_NOT_FOUND"});});
  app.put("/v1/service-provider/profile",{preHandler:requireRoles("CANDIDATO")},async(req:any,reply)=>{const b=req.body??{};for(const [key,max] of Object.entries(limits)){if(b[key]!==undefined&&b[key]!==null&&typeof b[key]!=="string")return reply.code(400).send({error:"INVALID_SERVICE_FIELD",field:key});if(typeof b[key]==="string"&&b[key].trim().length>max)return reply.code(400).send({error:"SERVICE_FIELD_TOO_LONG",field:key,max});}if(b.contact_email&& !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(b.contact_email).trim()))return reply.code(400).send({error:"INVALID_CONTACT_EMAIL"});if(!text(b.identity_document_type)||!text(b.identity_document_number))return reply.code(400).send({error:"SERVICE_IDENTITY_REQUIRED"});const names=Object.keys(limits);const vals=names.map(k=>text(b[k]));const q=await db.query(`insert into service_provider_profiles(user_id,${names.join(",")}) values($1,${names.map((_,i)=>`$${i+2}`).join(",")}) on conflict(user_id) do update set ${names.map(n=>`${n}=excluded.${n}`).join(",")},updated_at=now() returning ${fields}`,[req.authUser!.user_id,...vals]);return {profile:q.rows[0]};});
}
