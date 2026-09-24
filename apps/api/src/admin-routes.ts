import type {FastifyInstance} from "fastify";
import {db} from "./db.js";
import {requireRoles} from "./rbac.js";
export async function adminRoutes(app:FastifyInstance){
app.get("/v1/admin/summary",{preHandler:requireRoles("ADMIN")},async()=>{const [users,candidates,companies,vacancies,payments,revenue,newToday,newWeek,newMonth,expiring,deliveries,notices,unreadNotices]=await Promise.all([
db.query("select role,count(*)::int total from users group by role"),
db.query("select status,count(*)::int total from candidate_profiles group by status"),
db.query("select count(*)::int total from companies"),
db.query("select status,count(*)::int total from vacancies group by status"),
db.query("select status,count(*)::int total from vacancy_payments group by status"),
db.query("select coalesce(sum(amount),0)::text total from vacancy_payments where status='APROBADO'"),
db.query("select count(*)::int total from candidate_profiles where created_at>=current_date"),
db.query("select count(*)::int total from candidate_profiles where created_at>=now()-interval '7 days'"),
db.query("select count(*)::int total from candidate_profiles where created_at>=now()-interval '30 days'"),
db.query("select count(*)::int total from candidate_profiles where status='ACTIVO' and valid_until between current_date and current_date+interval '7 days'"),
db.query("select count(*)::int total from vacancy_deliveries where status='ENVIADA'"),
db.query("select count(*)::int total from candidate_notifications"),
db.query("select count(*)::int total from candidate_notifications where read_at is null")
]);return {users:Object.fromEntries(users.rows.map(x=>[x.role,x.total])),candidates:Object.fromEntries(candidates.rows.map(x=>[x.status,x.total])),companies:companies.rows[0]?.total??0,vacancies:Object.fromEntries(vacancies.rows.map(x=>[x.status,x.total])),payments:Object.fromEntries(payments.rows.map(x=>[x.status,x.total])),revenue:revenue.rows[0]?.total??"0",new_candidates:{today:newToday.rows[0]?.total??0,last_7_days:newWeek.rows[0]?.total??0,last_30_days:newMonth.rows[0]?.total??0},candidates_expiring_7_days:expiring.rows[0]?.total??0,deliveries_sent:deliveries.rows[0]?.total??0,candidate_notices:notices.rows[0]?.total??0,unread_candidate_notices:unreadNotices.rows[0]?.total??0};});
app.get("/v1/admin/candidates",{preHandler:requireRoles("ADMIN")},async(req:any)=>{const status=typeof req.query?.status==="string"?req.query.status:null;const search=typeof req.query?.q==="string"?req.query.q.trim():"";const values:any[]=[];const where:string[]=[];if(["BORRADOR","ACTIVO","VENCIDO","RETIRADO"].includes(status)){values.push(status);where.push("cp.status=$"+values.length);}if(search){values.push("%"+search+"%");where.push("(cp.candidate_code ilike $"+values.length+" or cp.full_name ilike $"+values.length+" or cp.primary_job_area ilike $"+values.length+" or cp.province ilike $"+values.length+")");}const q=await db.query("select cp.candidate_id,cp.candidate_code,cp.status,cp.full_name,cp.province,cp.district,cp.primary_job_area,cp.valid_until,cp.created_at from candidate_profiles cp "+(where.length?"where "+where.join(" and "):"")+" order by cp.created_at desc limit 100",values);return {items:q.rows};});
app.get("/v1/admin/companies",{preHandler:requireRoles("ADMIN")},async()=>{const q=await db.query("select company_id,name,contact_name,province,district,created_at from companies order by created_at desc limit 100");return {items:q.rows};});
app.get("/v1/admin/vacancies",{preHandler:requireRoles("ADMIN")},async(req:any)=>{const status=typeof req.query?.status==="string"?req.query.status:null;const values:any[]=[];let where="";if(status){values.push(status);where="where v.status=$1";}const q=await db.query("select v.vacancy_id,v.vacancy_code,v.status,v.position,v.quantity,v.work_location,v.created_at,c.name company_name from vacancies v join companies c on c.company_id=v.company_id "+where+" order by v.created_at desc limit 100",values);return {items:q.rows};});
}
