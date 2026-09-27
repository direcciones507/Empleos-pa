import type {FastifyInstance} from "fastify";
import {db} from "./db.js";
import {requireRoles} from "./rbac.js";

const normalizeSql=(value:string)=>`lower(translate(coalesce(${value},''),'ÁÉÍÓÚÜÑáéíóúüñ','AEIOUUNaeiouun'))`;

export async function serviceMatchingRoutes(app:FastifyInstance){
  app.get("/v1/admin/services/:code/matches",{preHandler:requireRoles("ADMIN")},async(req:any,reply)=>{
    const code=String(req.params.code??"").trim();
    if(!/^EMP-VAC-\d{6}$/.test(code))return reply.code(400).send({error:"INVALID_VACANCY_CODE"});
    const vacancy=await db.query("select vacancy_code,request_type,position,province,district,corregimiento,work_location,schedule,estimated_start,status from vacancies where vacancy_code=$1",[code]);
    if(!vacancy.rowCount)return reply.code(404).send({error:"VACANCY_NOT_FOUND"});
    const service=vacancy.rows[0];
    if(service.request_type!=="EVENTUAL")return reply.code(409).send({error:"NOT_EVENTUAL_SERVICE"});
    if(!["APROBADA","EN_BUSQUEDA"].includes(service.status))return reply.code(409).send({error:"VACANCY_NOT_READY_FOR_MATCHING"});
    const role=normalizeSql("service_trade");
    const area=normalizeSql("service_areas");
    const province=normalizeSql("service_province");
    const district=normalizeSql("service_district");
    const corregimiento=normalizeSql("service_corregimiento");
    const q=await db.query(`select full_name,service_trade,service_description,service_province,service_district,service_corregimiento,service_areas,available_days,available_hours,contact_email,mobile_whatsapp,landline_phone,fixed_location_name,fixed_location_province,fixed_location_district,fixed_location_corregimiento,fixed_location_address,
      (${role}=${normalizeSql("$1")}) service_match,
      (${province}=${normalizeSql("$2")} or ${area} like '%'||${normalizeSql("$2")}||'%') province_match,
      (${district}=${normalizeSql("$3")} or ${area} like '%'||${normalizeSql("$3")}||'%') district_match,
      (nullif(trim(coalesce($4,'')),'') is null or ${corregimiento}=${normalizeSql("$4")} or ${area} like '%'||${normalizeSql("$4")}||'%') corregimiento_match
      from service_provider_profiles
      where ${role}=${normalizeSql("$1")}
        and (${province}=${normalizeSql("$2")} or ${area} like '%'||${normalizeSql("$2")}||'%')
        and (${district}=${normalizeSql("$3")} or ${area} like '%'||${normalizeSql("$3")}||'%')
        and (nullif(trim(coalesce($4,'')),'') is null or ${corregimiento}=${normalizeSql("$4")} or ${area} like '%'||${normalizeSql("$4")}||'%')
      order by updated_at desc limit 100`,[service.position,service.province,service.district,service.corregimiento]);
    return {service:{code:service.vacancy_code,service:service.position,province:service.province,district:service.district,corregimiento:service.corregimiento,schedule:service.schedule,estimated_start:service.estimated_start},items:q.rows};
  });
}
