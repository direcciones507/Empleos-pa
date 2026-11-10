import type {FastifyInstance} from "fastify";
import {db} from "./db.js";
import {requireRoles} from "./rbac.js";
export async function candidateCvRoutes(app:FastifyInstance){
 app.get("/v1/candidate/cv/usage",{preHandler:requireRoles("CANDIDATO")},async(req,reply)=>{
  const q=await db.query("select count(g.generation_id)::int as used from candidate_profiles p left join candidate_cv_generations g on g.candidate_id=p.candidate_id where p.user_id=$1 group by p.candidate_id",[req.authUser!.user_id]);
  if(!q.rowCount)return reply.code(404).send({error:"PROFILE_NOT_FOUND"});
  return {free_used:q.rows[0].used,free_remaining:Math.max(0,2-q.rows[0].used)};
 });
 app.post("/v1/candidate/cv/free-generate",{preHandler:requireRoles("CANDIDATO")},async(req:any,reply)=>{
  const template=String(req.body?.template??"");
  if(!["clasico","moderno"].includes(template))return reply.code(400).send({error:"INVALID_TEMPLATE"});
  const client=await db.connect();
  try{
   await client.query("begin");
   const p=await client.query("select candidate_id,status from candidate_profiles where user_id=$1 for update",[req.authUser!.user_id]);
   if(!p.rowCount||p.rows[0].status!=="ACTIVO"){await client.query("rollback");return reply.code(409).send({error:"PROFILE_NOT_ACTIVE"});}
   const q=await client.query("select count(*)::int as used from candidate_cv_generations where candidate_id=$1",[p.rows[0].candidate_id]);
   if(q.rows[0].used>=2){await client.query("rollback");return reply.code(409).send({error:"FREE_LIMIT_REACHED"});}
   await client.query("insert into candidate_cv_generations(candidate_id,template) values($1,$2)",[p.rows[0].candidate_id,template]);
   await client.query("commit");
   return {ok:true,free_remaining:1-q.rows[0].used};
  }catch(e){await client.query("rollback").catch(()=>{});throw e;}finally{client.release();}
 });
}
