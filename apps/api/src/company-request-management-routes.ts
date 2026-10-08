import type {FastifyInstance} from "fastify";
import {db} from "./db.js";import {requireRoles} from "./rbac.js";import {selectionObligation} from './company-selection-policy.js';
const valid=/^VAC-\d{6}$/;
export async function companyRequestManagementRoutes(app:FastifyInstance){
 app.get("/v1/company/requests",{preHandler:requireRoles("EMPRESA")},async(req:any)=>{const q=await db.query(`select v.vacancy_code,v.status,v.request_type,v.position,v.quantity,v.work_location,v.created_at,v.archived_at from vacancies v join companies c on c.company_id=v.company_id where c.owner_user_id=$1 order by v.created_at desc`,[req.authUser!.user_id]);return {items:q.rows};});
 app.post("/v1/company/vacancies/:code/archive",{preHandler:requireRoles("EMPRESA")},async(req:any,reply)=>{const code=String(req.params.code??"").trim();if(!valid.test(code))return reply.code(400).send({error:"INVALID_VACANCY_CODE"});const q=await db.query(`update vacancies v set archived_at=now(),updated_at=now() from companies c where v.company_id=c.company_id and v.vacancy_code=$1 and c.owner_user_id=$2 returning v.vacancy_code,v.status,v.archived_at`,[code,req.authUser!.user_id]);return q.rowCount?{vacancy:q.rows[0]}:reply.code(404).send({error:"VACANCY_NOT_FOUND"});});
 app.post("/v1/company/vacancies/:code/unarchive",{preHandler:requireRoles("EMPRESA")},async(req:any,reply)=>{const code=String(req.params.code??"").trim();if(!valid.test(code))return reply.code(400).send({error:"INVALID_VACANCY_CODE"});const q=await db.query(`update vacancies v set archived_at=null,updated_at=now() from companies c where v.company_id=c.company_id and v.vacancy_code=$1 and c.owner_user_id=$2 returning v.vacancy_code,v.status`,[code,req.authUser!.user_id]);return q.rowCount?{vacancy:q.rows[0]}:reply.code(404).send({error:"VACANCY_NOT_FOUND"});});
 app.delete("/v1/company/vacancies/:code",{preHandler:requireRoles("EMPRESA")},async(req:any,reply)=>{const code=String(req.params.code??"").trim();if(!valid.test(code))return reply.code(400).send({error:"INVALID_VACANCY_CODE"});const c=await db.connect();try{await c.query("begin");const v=await c.query(`select v.vacancy_id,v.status from vacancies v join companies co on co.company_id=v.company_id where v.vacancy_code=$1 and co.owner_user_id=$2 for update of v`,[code,req.authUser!.user_id]);if(!v.rowCount){await c.query("rollback");return reply.code(404).send({error:"VACANCY_NOT_FOUND"});}if(req.body?.confirm!==true){await c.query('rollback');return reply.code(400).send({error:'REQUEST_CONFIRMATION_REQUIRED'});}if(await selectionObligation(c,v.rows[0].vacancy_id)){await c.query('rollback');return reply.code(409).send({error:'REQUEST_HAS_PAYMENT_OBLIGATION'});}const history=await c.query(`select exists(select 1 from vacancy_deliveries where vacancy_id=$1) or exists(select 1 from vacancy_payments where vacancy_id=$1) or exists(select 1 from service_contact_requests where vacancy_id=$1) has_history`,[v.rows[0].vacancy_id]);if(history.rows[0].has_history){await c.query("rollback");return reply.code(409).send({error:"REQUEST_HAS_HISTORY",message:"Archiva esta solicitud para conservar su trazabilidad."});}await c.query("delete from vacancies where vacancy_id=$1",[v.rows[0].vacancy_id]);await c.query("commit");return {ok:true,deleted:code};}catch(e){await c.query("rollback").catch(()=>{});throw e;}finally{c.release();}});
 app.post('/v1/company/vacancies/:code/cancel',{preHandler:requireRoles("EMPRESA")},async(req:any,reply)=>{
  const code=String(req.params.code??'');if(!valid.test(code))return reply.code(400).send({error:'INVALID_VACANCY_CODE'});
  if(req.body?.confirm!==true)return reply.code(400).send({error:'REQUEST_CONFIRMATION_REQUIRED'});
  const c=await db.connect();try{
   await c.query('begin');
   const q=await c.query('select v.* from vacancies v join companies co on co.company_id=v.company_id where v.vacancy_code=$1 and co.owner_user_id=$2 for update of v',[code,req.authUser!.user_id]);
   const v=q.rows[0];if(!v){await c.query('rollback');return reply.code(404).send({error:'VACANCY_NOT_FOUND'});}
   if(!['APROBADA','EN_BUSQUEDA','PENDIENTE_PAGO','CANCELADA'].includes(v.status)||await selectionObligation(c,v.vacancy_id)){
    await c.query('rollback');return reply.code(409).send({error:'REQUEST_HAS_PAYMENT_OBLIGATION'});
   }
   await c.query("update vacancies set status='CANCELADA',updated_at=now() where vacancy_id=$1",[v.vacancy_id]);
   await c.query('commit');return {ok:true,cancelled:code};
  }catch(e){await c.query('rollback').catch(()=>{});throw e;}finally{c.release();}
 });

}
