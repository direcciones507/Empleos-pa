import type {FastifyInstance} from "fastify";
import {db} from "./db.js";
import {requireRoles} from "./rbac.js";
export async function companyDeliveryAnalysisRoutes(app:FastifyInstance){
 app.get("/v1/company/vacancies/:code/delivery-analysis",{preHandler:requireRoles("EMPRESA")},async(req:any,reply)=>{const code=String(req.params.code??"").trim();if(!/^VAC-\d{6}$/.test(code))return reply.code(400).send({error:"INVALID_VACANCY_CODE"});const q=await db.query(`select vdc.candidate_code,vdc.match_analysis from vacancy_delivery_candidates vdc join vacancy_deliveries vd on vd.delivery_id=vdc.delivery_id join vacancies v on v.vacancy_id=vd.vacancy_id join companies c on c.company_id=v.company_id where v.vacancy_code=$1 and c.owner_user_id=$2 and vd.status='ENVIADA' order by vd.sent_at desc`,[code,req.authUser!.user_id]);return {analyses:q.rows.filter((x:any)=>x.match_analysis).map((x:any)=>({candidate_code:x.candidate_code,...x.match_analysis}))};});
}
