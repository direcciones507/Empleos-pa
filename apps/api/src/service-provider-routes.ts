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
  app.get("/v1/company/service-providers",{preHandler:requireRoles("EMPRESA")},async(req:any,reply)=>{
    const co=await db.query("select company_id from companies where owner_user_id=$1",[req.authUser!.user_id]);if(!co.rowCount)return reply.code(409).send({error:"COMPANY_PROFILE_REQUIRED"});
    const q=String(req.query?.q??"").trim();if(q.length<2)return {items:[]};
    const rows=await db.query(`select sp.user_id provider_user_id,sp.service_trade,sp.service_description,sp.service_province,sp.service_district,sp.service_corregimiento,sp.service_areas,sp.available_days,sp.available_hours from service_provider_profiles sp join users u on u.user_id=sp.user_id where u.status='ACTIVE' and exists(select 1 from service_provider_verifications sv where sv.user_id=sp.user_id and sv.status='APPROVED') and (sp.service_trade ilike '%'||$1||'%' or sp.service_description ilike '%'||$1||'%') order by sp.updated_at desc limit 30`,[q]);
    return {items:rows.rows};
  });
  app.post("/v1/company/service-contacts",{preHandler:requireRoles("EMPRESA")},async(req:any,reply)=>{
    const provider=String(req.body?.provider_user_id??""),code=String(req.body?.vacancy_code??"");
    if(!/^[0-9a-f-]{36}$/i.test(provider)||!/^VAC-\d{6}$/.test(code))return reply.code(400).send({error:"INVALID_SERVICE_CONTACT"});
    const co=await db.query("select company_id from companies where owner_user_id=$1",[req.authUser!.user_id]);if(!co.rowCount)return reply.code(409).send({error:"COMPANY_PROFILE_REQUIRED"});
    const v=await db.query("select vacancy_id from vacancies where vacancy_code=$1 and company_id=$2 and request_type='EVENTUAL'",[code,co.rows[0].company_id]);if(!v.rowCount)return reply.code(404).send({error:"SERVICE_REQUEST_NOT_FOUND"});
    const verified=await db.query("select 1 from service_provider_profiles sp where sp.user_id=$1 and exists(select 1 from service_provider_verifications sv where sv.user_id=sp.user_id and sv.status='APPROVED')",[provider]);if(!verified.rowCount)return reply.code(409).send({error:"SERVICE_PROVIDER_NOT_AVAILABLE"});
    const r=await db.query("insert into service_contact_requests(vacancy_id,provider_user_id,company_id) values($1,$2,$3) on conflict(vacancy_id,provider_user_id) do update set updated_at=now() returning service_contact_request_id,status,unit_price,requested_at",[v.rows[0].vacancy_id,provider,co.rows[0].company_id]);return reply.code(201).send({request:r.rows[0]});
  });
  app.get("/v1/service-provider/contact-requests",{preHandler:requireRoles("CANDIDATO")},async(req)=>{
    const q=await db.query(`select r.service_contact_request_id,r.status,r.unit_price,r.requested_at,v.position,v.work_location,v.province,v.district,v.corregimiento from service_contact_requests r join vacancies v on v.vacancy_id=r.vacancy_id where r.provider_user_id=$1 order by r.requested_at desc`,[req.authUser!.user_id]);return {items:q.rows};
  });
  app.post("/v1/service-provider/contact-requests/:id/respond",{preHandler:requireRoles("CANDIDATO")},async(req:any,reply)=>{
    const id=String(req.params.id??""),accept=req.body?.accept;if(typeof accept!=="boolean")return reply.code(400).send({error:"INVALID_RESPONSE"});
    const status=accept?"ACCEPTED_AWAITING_PAYMENT":"DECLINED";
    const q=await db.query("update service_contact_requests set status=$3,responded_at=now(),updated_at=now() where service_contact_request_id=$1 and provider_user_id=$2 and status='REQUESTED' returning service_contact_request_id,status,unit_price",[id,req.authUser!.user_id,status]);
    return q.rowCount?{request:q.rows[0]}:reply.code(409).send({error:"SERVICE_CONTACT_NOT_RESPONDABLE"});
  });
  app.get("/v1/company/service-contacts",{preHandler:requireRoles("EMPRESA")},async(req:any,reply)=>{
    const co=await db.query("select company_id from companies where owner_user_id=$1",[req.authUser!.user_id]);if(!co.rowCount)return reply.code(409).send({error:"COMPANY_PROFILE_REQUIRED"});
    const q=await db.query(`select r.service_contact_request_id,r.status,r.unit_price,r.requested_at,r.responded_at,v.vacancy_code,v.position,sp.service_trade,case when r.status='PAID' then sp.full_name end full_name,case when r.status='PAID' then sp.mobile_whatsapp end mobile_whatsapp,case when r.status='PAID' then sp.contact_email end contact_email from service_contact_requests r join vacancies v on v.vacancy_id=r.vacancy_id join service_provider_profiles sp on sp.user_id=r.provider_user_id where r.company_id=$1 order by r.requested_at desc`,[co.rows[0].company_id]);return {items:q.rows};
  });

}
