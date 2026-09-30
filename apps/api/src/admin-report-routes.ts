import type {FastifyInstance} from "fastify";
import {db} from "./db.js";
import {requireRoles} from "./rbac.js";

export async function adminReportRoutes(app:FastifyInstance){
  app.get("/v1/admin/report-metrics",{preHandler:requireRoles("ADMIN")},async()=>{
    const [requests,providers,serviceStatuses]=await Promise.all([
      db.query(`select request_type,
        count(*) filter (where created_at>=current_date)::int today,
        count(*) filter (where created_at>=now()-interval '7 days')::int last_7_days,
        count(*) filter (where created_at>=now()-interval '30 days')::int last_30_days,
        count(*)::int total
        from vacancies group by request_type`),
      db.query(`select
        count(*) filter (where created_at>=current_date)::int today,
        count(*) filter (where created_at>=now()-interval '7 days')::int last_7_days,
        count(*) filter (where created_at>=now()-interval '30 days')::int last_30_days,
        count(*)::int total
        from service_provider_profiles`),
      db.query(`select status,count(*)::int count
        from vacancies
        where request_type='EVENTUAL'
        group by status`)
    ]);
    const byType=Object.fromEntries(requests.rows.map((row:any)=>[row.request_type,{today:row.today,last_7_days:row.last_7_days,last_30_days:row.last_30_days,total:row.total}]));
    const zero={today:0,last_7_days:0,last_30_days:0,total:0};
    const serviceRequestsByStatus=Object.fromEntries(serviceStatuses.rows.map((row:any)=>[row.status,row.count]));
    return {
      vacancy_requests:byType.VACANTE??zero,
      service_requests:byType.EVENTUAL??zero,
      service_providers:providers.rows[0]??zero,
      service_requests_by_status:serviceRequestsByStatus
    };
  });
}
