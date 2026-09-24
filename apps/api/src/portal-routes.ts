import type {FastifyInstance} from "fastify";
import {requireRoles} from "./rbac.js";
import {db} from "./db.js";
export async function portalRoutes(app:FastifyInstance){
app.get("/v1/candidate/home",{preHandler:requireRoles("CANDIDATO")},async req=>({ok:true,role:req.authUser!.role}));
app.get("/v1/company/home",{preHandler:requireRoles("EMPRESA")},async req=>({ok:true,role:req.authUser!.role}));
app.get("/v1/candidate/notifications",{preHandler:requireRoles("CANDIDATO")},async req=>{const q=await db.query(`select n.notification_id,n.type,n.title,n.message,n.read_at,n.emailed_at,n.created_at,v.vacancy_code,v.position,v.work_location from candidate_notifications n join candidate_profiles cp on cp.candidate_id=n.candidate_id left join vacancies v on v.vacancy_id=n.vacancy_id where cp.user_id=$1 order by n.created_at desc limit 50`,[req.authUser!.user_id]);return {items:q.rows};});
app.post("/v1/candidate/notifications/:id/read",{preHandler:requireRoles("CANDIDATO")},async(req:any,reply)=>{const q=await db.query(`update candidate_notifications n set read_at=coalesce(read_at,now()) from candidate_profiles cp where n.candidate_id=cp.candidate_id and cp.user_id=$1 and n.notification_id=$2 returning n.notification_id,n.read_at`,[req.authUser!.user_id,req.params.id]);return q.rowCount?{notification:q.rows[0]}:reply.code(404).send({error:"NOTIFICATION_NOT_FOUND"});});
}
