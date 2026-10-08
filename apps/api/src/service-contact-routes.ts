import type {FastifyInstance} from 'fastify';
import {db} from './db.js';
import {requireRoles} from './rbac.js';

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
import {requestedProfileLimit} from './company-selection-policy.js';
import {normalizeSql as norm} from './candidate-match-query.js';
// Keep identity approval; honor the profile's explicitly declared service areas.
const area=norm('sp.service_areas');
const national=`${area} in ('todo panama','todo el pais','a nivel nacional')`;
const province=`(${norm('sp.service_province')}=${norm('v.province')} or (nullif(trim(v.province),'') is not null and strpos(${area},${norm('v.province')})>0) or ${national})`;
const district=`(${norm('sp.service_district')}=${norm('v.district')} or (nullif(trim(v.district),'') is not null and strpos(${area},${norm('v.district')})>0) or ${national} or (${norm('sp.service_province')}=${norm('v.province')} and ${area} in ('toda mi provincia','toda la provincia')))`;
const corregimiento=`(nullif(trim(v.corregimiento),'') is null or ${norm('sp.service_corregimiento')}=${norm('v.corregimiento')} or strpos(${area},${norm('v.corregimiento')})>0 or (nullif(trim(v.district),'') is not null and strpos(${area},${norm('v.district')})>0) or ${national} or (${norm('sp.service_province')}=${norm('v.province')} and ${area} in ('toda mi provincia','toda la provincia')))`;
const compatible=`nullif(trim(sp.service_trade),'') is not null and ${norm('sp.service_trade')}=${norm('v.position')} and ${province} and ${district} and ${corregimiento} and u.status='ACTIVE' and exists(select 1 from user_profiles up where up.user_id=sp.user_id and up.profile_type='CANDIDATO') and exists(select 1 from service_provider_verifications sv where sv.user_id=sp.user_id and sv.status='APPROVED')`;
export async function serviceContactRoutes(app:FastifyInstance){
  app.get('/v1/company/vacancies/:code/service-matches',{preHandler:requireRoles('EMPRESA')},async(req:any,reply)=>{
    const code=String(req.params.code??'');
    if(!/^VAC-\d{6}$/.test(code))return reply.code(400).send({error:'INVALID_VACANCY_CODE'});
    const own=await db.query(`select v.vacancy_id,v.request_type,v.status,v.confirmations,v.package_candidate_limit from vacancies v join companies c on c.company_id=v.company_id where v.vacancy_code=$1 and c.owner_user_id=$2`,[code,req.authUser!.user_id]);
    if(!own.rowCount)return reply.code(404).send({error:'VACANCY_NOT_FOUND'});
    if(own.rows[0].request_type!=='EVENTUAL'||!['APROBADA','EN_BUSQUEDA'].includes(own.rows[0].status))return reply.code(409).send({error:'SERVICE_NOT_READY'});
    const frozen=await db.query("select 1 from service_contact_requests where vacancy_id=$1 and status in ('PAID','ACCEPTED_AWAITING_PAYMENT') limit 1",[own.rows[0].vacancy_id]);
    if(frozen.rowCount)return reply.code(409).send({error:'SERVICE_SELECTION_LOCKED'});
    const q=await db.query(`select sp.user_id provider_id,sp.service_trade,sp.service_province,sp.service_district,sp.available_days,sp.available_hours from vacancies v cross join service_provider_profiles sp join users u on u.user_id=sp.user_id where v.vacancy_id=$1 and ${compatible} order by sp.updated_at desc,sp.user_id limit $2`,[own.rows[0].vacancy_id,requestedProfileLimit(own.rows[0])]);
    return {items:q.rows,pricing:{currency:'USD',unit_price:1.89,unit:'accepted_connection'}};
  });
  app.post('/v1/company/vacancies/:code/service-contact-requests',{preHandler:requireRoles('EMPRESA')},async(req:any,reply)=>{
    const provider=String(req.body?.provider_id??''),code=String(req.params.code??'');
    if(!uuid.test(provider)||!/^VAC-\d{6}$/.test(code))return reply.code(400).send({error:'INVALID_SERVICE_REQUEST'});
    const c=await db.connect();try{
      await c.query('begin');
      const own=await c.query(`select v.vacancy_id,v.request_type,v.status,v.confirmations,v.package_candidate_limit from vacancies v join companies co on co.company_id=v.company_id where v.vacancy_code=$1 and co.owner_user_id=$2 for update of v`,[code,req.authUser!.user_id]);
      if(!own.rowCount){await c.query('rollback');return reply.code(404).send({error:'VACANCY_NOT_FOUND'});}
      const v=own.rows[0];
      if(v.request_type!=='EVENTUAL'||!['APROBADA','EN_BUSQUEDA'].includes(v.status)){await c.query('rollback');return reply.code(409).send({error:'SERVICE_NOT_READY'});}
      const existing=await c.query('select contact_request_id,status,price,created_at,responded_at,paid_at from service_contact_requests where vacancy_id=$1 and provider_user_id=$2',[v.vacancy_id,provider]);
      if(existing.rowCount){await c.query('commit');return {request:existing.rows[0]};}
      const selected=await c.query("select count(*)::int total,bool_or(status='PAID') paid from service_contact_requests where vacancy_id=$1 and status<>'DECLINED'",[v.vacancy_id]);
      if(selected.rows[0].paid||selected.rows[0].total>=requestedProfileLimit(v)){await c.query('rollback');return reply.code(409).send({error:'SERVICE_SELECTION_LOCKED_OR_FULL'});}
      const eligible=await c.query(`select sp.user_id from vacancies v cross join service_provider_profiles sp join users u on u.user_id=sp.user_id where v.vacancy_id=$1 and sp.user_id=$2 and ${compatible}`,[v.vacancy_id,provider]);
      if(!eligible.rowCount){await c.query('rollback');return reply.code(409).send({error:'PROVIDER_NOT_COMPATIBLE'});}
      const q=await c.query(`insert into service_contact_requests(vacancy_id,provider_user_id) values($1,$2) on conflict(vacancy_id,provider_user_id) do update set vacancy_id=excluded.vacancy_id returning contact_request_id,status,price,created_at,responded_at,paid_at`,[v.vacancy_id,provider]);
      await c.query('commit');return {request:q.rows[0]};
    }catch(e){await c.query('rollback').catch(()=>{});throw e;}finally{c.release();}
  });
  app.get('/v1/company/vacancies/:code/service-contact-requests',{preHandler:requireRoles('EMPRESA')},async(req:any,reply)=>{
    const own=await db.query(`select v.vacancy_id from vacancies v join companies c on c.company_id=v.company_id where v.vacancy_code=$1 and c.owner_user_id=$2`,[String(req.params.code),req.authUser!.user_id]);
    if(!own.rowCount)return reply.code(404).send({error:'VACANCY_NOT_FOUND'});
    const q=await db.query(`select r.contact_request_id,r.provider_user_id provider_id,r.status,r.price,r.created_at,r.responded_at,r.paid_at,sp.service_trade from service_contact_requests r join service_provider_profiles sp on sp.user_id=r.provider_user_id where r.vacancy_id=$1 order by r.created_at desc`,[own.rows[0].vacancy_id]);return {items:q.rows};
  });
  app.get('/v1/service-provider/contact-requests',{preHandler:requireRoles('CANDIDATO')},async(req)=>{
    const q=await db.query(`select r.contact_request_id,r.status,r.price,r.created_at,v.vacancy_code,v.position,v.province,v.district,v.schedule,c.name company_name from service_contact_requests r join vacancies v on v.vacancy_id=r.vacancy_id join companies c on c.company_id=v.company_id join users u on u.user_id=c.owner_user_id where r.provider_user_id=$1 and u.status='ACTIVE' and v.status in ('APROBADA','EN_BUSQUEDA') order by r.created_at desc limit 100`,[req.authUser!.user_id]);return {items:q.rows};
  });
  app.post('/v1/service-provider/contact-requests/:id/respond',{preHandler:requireRoles('CANDIDATO')},async(req:any,reply)=>{
    const id=String(req.params.id??''),action=req.body?.action;
    if(!uuid.test(id)||!['ACCEPT','REJECT'].includes(action))return reply.code(400).send({error:'INVALID_SERVICE_RESPONSE'});
    const c=await db.connect();try{
      await c.query('begin');
      const parent=await c.query('select vacancy_id from service_contact_requests where contact_request_id=$1 and provider_user_id=$2',[id,req.authUser!.user_id]);
      if(parent.rowCount)await c.query('select vacancy_id from vacancies where vacancy_id=$1 for update',[parent.rows[0].vacancy_id]);
      const q=await c.query(`select r.* from service_contact_requests r join vacancies v on v.vacancy_id=r.vacancy_id join companies co on co.company_id=v.company_id join users u on u.user_id=co.owner_user_id where r.contact_request_id=$1 and r.provider_user_id=$2 and u.status='ACTIVE' and v.status in ('APROBADA','EN_BUSQUEDA') for update of r`,[id,req.authUser!.user_id]);
      if(!q.rowCount){await c.query('rollback');return reply.code(404).send({error:'CONTACT_REQUEST_NOT_FOUND'});}
      const next=action==='ACCEPT'?'ACCEPTED_AWAITING_PAYMENT':'DECLINED';
      if(q.rows[0].status!=='REQUESTED'&&q.rows[0].status!==next&&!(action==='ACCEPT'&&q.rows[0].status==='PAID')){await c.query('rollback');return reply.code(409).send({error:'CONTACT_REQUEST_ALREADY_RESPONDED'});}
      if(q.rows[0].status==='REQUESTED')await c.query(`update service_contact_requests set status=$2,responded_at=now() where contact_request_id=$1`,[id,next]);
      await c.query('commit');return {request:{contact_request_id:id,status:q.rows[0].status==='PAID'?'PAID':next,price:1.89}};
    }catch(e){await c.query('rollback').catch(()=>{});throw e;}finally{c.release();}
  });
  app.get('/v1/company/service-contact-requests/:id/contact',{preHandler:requireRoles('EMPRESA')},async(req:any,reply)=>{
    const id=String(req.params.id??'');if(!uuid.test(id))return reply.code(400).send({error:'INVALID_CONTACT_REQUEST_ID'});
    const own=await db.query(`select r.provider_user_id,r.status,r.paid_at from service_contact_requests r join vacancies v on v.vacancy_id=r.vacancy_id join companies c on c.company_id=v.company_id join users u on u.user_id=r.provider_user_id where r.contact_request_id=$1 and c.owner_user_id=$2 and u.status='ACTIVE' and v.status in ('APROBADA','EN_BUSQUEDA')`,[id,req.authUser!.user_id]);
    if(!own.rowCount)return reply.code(404).send({error:'CONTACT_REQUEST_NOT_FOUND'});
    if(own.rows[0].status!=='PAID'||!own.rows[0].paid_at)return reply.code(403).send({error:'CONTACT_LOCKED_UNTIL_PAYMENT'});
    const q=await db.query(`select full_name,contact_email,mobile_whatsapp,landline_phone,fixed_location_name,fixed_location_address from service_provider_profiles where user_id=$1`,[own.rows[0].provider_user_id]);return {contact:q.rows[0]};
  });
}
