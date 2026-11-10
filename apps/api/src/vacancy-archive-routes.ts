import type {FastifyInstance} from "fastify";
import {db} from "./db.js";
import {requireRoles} from "./rbac.js";
import {writeAdminAudit} from "./admin-audit.js";

const codePattern=/^VAC-\d{6}$/;
export async function vacancyArchiveRoutes(app:FastifyInstance) {
  app.get("/v1/admin/candidates/incomplete-summary",{preHandler:requireRoles("ADMIN")},async()=>{
    const q=await db.query("select count(*)::int total, count(*) filter (where updated_at < now()-interval '24 hours')::int inactive_over_24h, count(*) filter (where updated_at < now()-interval '7 days')::int inactive_over_7d from candidate_profiles where status='BORRADOR'");
    return {summary:q.rows[0],emails_sent:0,mode:"READ_ONLY"};
  });
  app.get("/v1/admin/vacancies/archived",{preHandler:requireRoles("ADMIN")},async()=>{
    const q=await db.query("select v.vacancy_code,v.position,v.status,v.closed_at,v.archived_at,c.name company_name from vacancies v join companies c on c.company_id=v.company_id where v.archived_at is not null order by v.archived_at desc limit 100");
    return {items:q.rows};
  });
  app.post("/v1/admin/vacancies/:code/archive",{preHandler:requireRoles("ADMIN")},async(req:any,reply)=>{
    const code=String(req.params.code??"");
    if(!codePattern.test(code))return reply.code(400).send({error:"INVALID_VACANCY_CODE"});
    const client=await db.connect();
    try {
      await client.query("begin");
      const q=await client.query("update vacancies set closed_at=coalesce(closed_at,now()),archived_at=coalesce(archived_at,now()),updated_at=now() where vacancy_code=$1 and status in ('CERRADA','CANCELADA') returning vacancy_id,vacancy_code,status,archived_at",[code]);
      if(!q.rowCount){await client.query("rollback");return reply.code(409).send({error:"VACANCY_NOT_CLOSED_OR_NOT_FOUND"});}
      await writeAdminAudit({adminUserId:req.authUser!.user_id,action:"VACANCY_ARCHIVED",entityType:"VACANCY",entityId:code},client);
      await client.query("commit");return {vacancy:q.rows[0]};
    }catch(e){await client.query("rollback").catch(()=>{});throw e;}finally{client.release();}
  });
  app.post("/v1/admin/vacancies/:code/unarchive",{preHandler:requireRoles("ADMIN")},async(req:any,reply)=>{
    const code=String(req.params.code??"");
    if(!codePattern.test(code))return reply.code(400).send({error:"INVALID_VACANCY_CODE"});
    const client=await db.connect();
    try{
      await client.query("begin");
      const q=await client.query("update vacancies set archived_at=null,updated_at=now() where vacancy_code=$1 and archived_at is not null and status in ('CERRADA','CANCELADA') returning vacancy_id,vacancy_code,status",[code]);
      if(!q.rowCount){await client.query("rollback");return reply.code(409).send({error:"VACANCY_NOT_ARCHIVED"});}
      await writeAdminAudit({adminUserId:req.authUser!.user_id,action:"VACANCY_UNARCHIVED",entityType:"VACANCY",entityId:code},client);
      await client.query("commit");return {vacancy:q.rows[0]};
    }catch(e){await client.query("rollback").catch(()=>{});throw e;}finally{client.release();}
  });
}
