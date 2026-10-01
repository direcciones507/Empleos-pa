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

  app.get("/v1/admin/activity",{preHandler:requireRoles("ADMIN")},async()=>{
    const q=await db.query(`
      select * from (
        select 'CANDIDATE' type,cp.candidate_code code,cp.full_name title,cp.created_at occurred_at,'Nuevo candidato' detail from candidate_profiles cp
        union all
        select 'COMPANY' type,c.company_id::text code,c.name title,c.created_at occurred_at,'Nueva empresa' detail from companies c
        union all
        select case when v.request_type='EVENTUAL' then 'SERVICE_REQUEST' else 'VACANCY' end type,v.vacancy_code code,c.name||' · '||v.position title,v.created_at occurred_at,case when v.request_type='EVENTUAL' then 'Servicio solicitado' else 'Vacante solicitada' end detail from vacancies v join companies c on c.company_id=v.company_id
        union all
        select 'PAYMENT' type,v.vacancy_code code,c.name title,coalesce(p.reviewed_at,p.submitted_at,p.created_at) occurred_at,'Pago · '||p.status detail from vacancy_payments p join vacancies v on v.vacancy_id=p.vacancy_id join companies c on c.company_id=v.company_id
        union all
        select 'DELIVERY' type,v.vacancy_code code,c.name||' · '||v.position title,coalesce(d.sent_at,d.created_at) occurred_at,'Entrega · '||d.status detail from vacancy_deliveries d join vacancies v on v.vacancy_id=d.vacancy_id join companies c on c.company_id=v.company_id
      ) activity order by occurred_at desc limit 30`);
    return {items:q.rows};
  });
}
