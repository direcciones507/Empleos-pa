import type {FastifyInstance} from "fastify";
import {db} from "./db.js";
import {requireRoles} from "./rbac.js";

export async function adminCompanyRoutes(app:FastifyInstance){
  app.get("/v1/admin/company-activity",{preHandler:requireRoles("ADMIN")},async()=>{
    const q=await db.query(`select c.company_id,c.name,c.contact_name,c.phone,c.email,c.province,c.district,c.created_at,
      count(v.vacancy_id)::int requests_total,
      count(v.vacancy_id) filter (where v.request_type='VACANTE')::int vacancies_total,
      count(v.vacancy_id) filter (where v.request_type='EVENTUAL')::int services_total,
      count(v.vacancy_id) filter (where v.status in ('APROBADA','EN_BUSQUEDA','ENTREGADA'))::int active_requests,
      max(v.created_at) last_request_at
      from companies c left join vacancies v on v.company_id=c.company_id
      group by c.company_id,c.name,c.contact_name,c.phone,c.email,c.province,c.district,c.created_at
      order by c.created_at desc limit 100`);
    return {items:q.rows};
  });
}
