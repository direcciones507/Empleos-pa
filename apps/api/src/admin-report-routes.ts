import type {FastifyInstance} from "fastify";
import {db} from "./db.js";
import {requireRoles} from "./rbac.js";

export async function adminReportRoutes(app:FastifyInstance){
  app.get("/v1/admin/report-metrics",{preHandler:requireRoles("ADMIN")},async()=>{
    const [requests,providers,serviceStatuses]=await Promise.all([
      db.query(`select request_type,count(*) filter (where created_at>=current_date)::int today,count(*) filter (where created_at>=now()-interval '7 days')::int last_7_days,count(*) filter (where created_at>=now()-interval '30 days')::int last_30_days,count(*)::int total from vacancies group by request_type`),
      db.query(`select count(*) filter (where created_at>=current_date)::int today,count(*) filter (where created_at>=now()-interval '7 days')::int last_7_days,count(*) filter (where created_at>=now()-interval '30 days')::int last_30_days,count(*)::int total from service_provider_profiles`),
      db.query(`select status,count(*)::int count from vacancies where request_type='EVENTUAL' group by status`)
    ]);
    const byType=Object.fromEntries(requests.rows.map((row:any)=>[row.request_type,{today:row.today,last_7_days:row.last_7_days,last_30_days:row.last_30_days,total:row.total}]));
    const zero={today:0,last_7_days:0,last_30_days:0,total:0};
    return {vacancy_requests:byType.VACANTE??zero,service_requests:byType.EVENTUAL??zero,service_providers:providers.rows[0]??zero,service_requests_by_status:Object.fromEntries(serviceStatuses.rows.map((row:any)=>[row.status,row.count]))};
  });

  app.get("/v1/admin/report-range",{preHandler:requireRoles("ADMIN")},async(req:any,reply)=>{
    const from=String(req.query?.from??"").trim(),to=String(req.query?.to??"").trim();
    if(!/^\d{4}-\d{2}-\d{2}$/.test(from)||!/^\d{4}-\d{2}-\d{2}$/.test(to)||from>to)return reply.code(400).send({error:"INVALID_DATE_RANGE"});
    const [requests,providers,candidates,revenue,locations]=await Promise.all([
      db.query(`select request_type,count(*)::int total from vacancies where created_at >= $1::date and created_at < ($2::date + interval '1 day') group by request_type`,[from,to]),
      db.query(`select count(*)::int total from service_provider_profiles where created_at >= $1::date and created_at < ($2::date + interval '1 day')`,[from,to]),
      db.query(`select count(*)::int total from candidate_profiles where created_at >= $1::date and created_at < ($2::date + interval '1 day')`,[from,to]),
      db.query(`select coalesce(sum(amount),0)::numeric(12,2) total from payments where status='APROBADO' and created_at >= $1::date and created_at < ($2::date + interval '1 day')`,[from,to]),
      db.query(`select coalesce(nullif(trim(province),''),'Sin provincia') province,coalesce(nullif(trim(district),''),'Sin distrito') district,count(*)::int candidates from candidate_profiles where created_at >= $1::date and created_at < ($2::date + interval '1 day') group by 1,2 order by candidates desc,1,2 limit 100`,[from,to])
    ]);
    const byType=Object.fromEntries(requests.rows.map((row:any)=>[row.request_type,row.total]));
    return {from,to,candidates:Number(candidates.rows[0]?.total??0),vacancy_requests:Number(byType.VACANTE??0),service_requests:Number(byType.EVENTUAL??0),service_providers:Number(providers.rows[0]?.total??0),revenue:String(revenue.rows[0]?.total??"0.00"),candidate_locations:locations.rows};
  });
}
