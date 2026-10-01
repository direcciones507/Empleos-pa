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

  app.get("/v1/admin/companies/:id",{preHandler:requireRoles("ADMIN")},async(req:any,reply)=>{
    const id=String(req.params.id??"");if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))return reply.code(400).send({error:"INVALID_COMPANY_ID"});
    const [company,requests,payments,deliveries]=await Promise.all([
      db.query(`select c.*,u.email account_email,u.status account_status from companies c join users u on u.user_id=c.owner_user_id where c.company_id=$1`,[id]),
      db.query(`select vacancy_code,status,request_type,position,quantity,work_location,package,package_price,created_at,updated_at from vacancies where company_id=$1 order by created_at desc limit 100`,[id]),
      db.query(`select p.payment_id,p.status,p.amount,p.reference,p.submitted_at,p.reviewed_at,p.created_at,v.vacancy_code,v.position from vacancy_payments p join vacancies v on v.vacancy_id=p.vacancy_id where v.company_id=$1 order by p.created_at desc limit 100`,[id]),
      db.query(`select d.delivery_id,d.status,d.created_at,d.sent_at,v.vacancy_code,v.position,count(dc.delivery_candidate_id)::int profiles from vacancy_deliveries d join vacancies v on v.vacancy_id=d.vacancy_id left join vacancy_delivery_candidates dc on dc.delivery_id=d.delivery_id where v.company_id=$1 group by d.delivery_id,v.vacancy_code,v.position order by d.created_at desc limit 100`,[id])]);
    if(!company.rowCount)return reply.code(404).send({error:"COMPANY_NOT_FOUND"});return {company:company.rows[0],requests:requests.rows,payments:payments.rows,deliveries:deliveries.rows};
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
