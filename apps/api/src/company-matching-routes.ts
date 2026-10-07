import type {FastifyInstance} from 'fastify';
import {db} from './db.js';
import {requireRoles} from './rbac.js';
import {analyzeFilteredCandidates,deepSeekConfigured} from './ai-analysis.js';
import {config} from './config.js';
import {compatibleCandidates} from './candidate-match-query.js';
import {candidatePricing as pricing,candidateQuote,PROMOTION_VERSION} from './candidate-pricing.js';
import {hasApprovedVacancyPayment,sendPreparedCandidateDelivery} from './paid-candidate-delivery.js';
const vacancyCode=/^VAC-\d{6}$/;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const cleanList=(v:any)=>Array.isArray(v)?v.filter((x:any)=>typeof x==='string').map((x:string)=>x.trim().slice(0,500)).filter(Boolean).slice(0,10):[];
function cleanAnalysis(x:any){return {candidate_id:String(x?.candidate_id??''),summary:typeof x?.summary==='string'?x.summary.trim().slice(0,1200):'',strengths:cleanList(x?.strengths),gaps:cleanList(x?.gaps),considerations:cleanList(x?.considerations)};}
export async function companyMatchingRoutes(app:FastifyInstance){
  app.get('/v1/company/vacancies/:code/matches',{preHandler:requireRoles("EMPRESA")},async(req:any,reply)=>{
    const code=String(req.params.code??'').trim();if(!vacancyCode.test(code))return reply.code(400).send({error:'INVALID_VACANCY_CODE'});
    const v=await db.query('select v.* from vacancies v join companies c on c.company_id=v.company_id where v.vacancy_code=$1 and c.owner_user_id=$2',[code,req.authUser!.user_id]);
    if(!v.rowCount)return reply.code(404).send({error:'VACANCY_NOT_FOUND'});
    const x=v.rows[0];
    if(x.request_type==='VACANTE'&&x.status==='PENDIENTE_PAGO'&&x.confirmations?.candidate_purchase){
      const snapshot=await db.query(`select dc.candidate_id,dc.primary_job_area,dc.province,dc.district,dc.skills,dc.match_analysis
        from vacancy_deliveries d join vacancy_delivery_candidates dc on dc.delivery_id=d.delivery_id
        where d.vacancy_id=$1 and d.status='LISTA' order by dc.candidate_id`,[x.vacancy_id]);
      const items=snapshot.rows.map((r:any)=>({candidate_id:r.candidate_id,...(r.match_analysis??{summary:'Selección conservada pendiente de pago.',strengths:[],gaps:[],considerations:[]}),facts:{job_area:r.primary_job_area,province:r.province,district:r.district,skills:r.skills}}));
      return {vacancy:{code:x.vacancy_code,position:x.position},count:items.length,pricing,quote:{quantity:x.confirmations.candidate_purchase.quantity,total:x.confirmations.candidate_purchase.total},ai_available:false,selection_locked:true,analyses:items};
    }
    if(x.request_type==='EVENTUAL'||!['APROBADA','EN_BUSQUEDA'].includes(x.status))return reply.code(409).send({error:'VACANCY_NOT_READY_FOR_MATCHING'});
    const requested=Number(x.confirmations?.requested_candidates ?? 15);
    const maxProfiles=Number.isInteger(requested)&&requested>=1&&requested<=15?requested:15;
    const q=await compatibleCandidates(db,x.vacancy_id);
    q.rows.splice(maxProfiles);
    q.rowCount=q.rows.length;
    let analyses:any[]=[],aiAvailable=false;
    if(q.rowCount&&deepSeekConfigured())try{
      analyses=(await analyzeFilteredCandidates(x,q.rows,AbortSignal.timeout(config.deepSeekTimeoutMs))).analyses;aiAvailable=true;
    }catch{req.log.warn('Optional descriptive analysis unavailable');}
    const descriptions=new Map(analyses.map(a=>[a.candidate_id,a]));
    // Membership never depends on AI availability or the IDs it returns.
    const items=q.rows.map((r:any)=>({candidate_id:r.candidate_id,...(descriptions.get(r.candidate_id)??{summary:'Perfil encontrado por evidencia laboral de puesto, experiencia o habilidades pertinentes; disponibilidad y requisitos por verificar.',strengths:[],gaps:[],considerations:[]}),
      facts:{job_area:r.primary_job_area,province:r.province,district:r.district,skills:r.skills||r.structured_skills?.map((s:any)=>s.name??s.value).filter(Boolean).join(', ')},match_trace:r.match_trace}));
    return {vacancy:{code:x.vacancy_code,position:x.position},count:items.length,pricing,quote:items.length?candidateQuote(items.length):{quantity:0,total:0},ai_available:aiAvailable,analyses:items};
  });
  app.post('/v1/company/vacancies/:code/candidates/accept',{preHandler:requireRoles("EMPRESA")},async(req:any,reply)=>{
    const code=String(req.params.code??'').trim();if(!vacancyCode.test(code))return reply.code(400).send({error:'INVALID_VACANCY_CODE'});
    const ids=Array.isArray(req.body?.candidate_ids)?req.body.candidate_ids.map((x:any)=>String(x).trim()):[];
    if(!ids.length)return reply.code(400).send({error:'CANDIDATES_REQUIRED'});
    const unique=[...new Set<string>(ids)];if(unique.length>15)return reply.code(400).send({error:'TOO_MANY_CANDIDATES'});
    if(unique.some(id=>!uuid.test(id)))return reply.code(400).send({error:'INVALID_CANDIDATE_ID'});
    const quote=candidateQuote(unique.length);
    if(req.body?.confirm_price!==true)return reply.code(409).send({error:'PRICE_CONFIRMATION_REQUIRED',pricing,quote});
    const analyses=new Map((Array.isArray(req.body?.analyses)?req.body.analyses:[]).map(cleanAnalysis).filter((a:any)=>unique.includes(a.candidate_id)&&a.summary).map((a:any)=>[a.candidate_id,a]));
    const c=await db.connect();try{
      await c.query('begin');
      const v=await c.query('select v.* from vacancies v join companies co on co.company_id=v.company_id where v.vacancy_code=$1 and co.owner_user_id=$2 for update of v',[code,req.authUser!.user_id]);
      if(!v.rowCount){await c.query('rollback');return reply.code(404).send({error:'VACANCY_NOT_FOUND'});}
      const x=v.rows[0],prior=x.confirmations?.candidate_purchase;
      const requested=Number(x.confirmations?.requested_candidates ?? 15);
      const maxProfiles=Number.isInteger(requested)&&requested>=1&&requested<=15?requested:15;
      if(unique.length>maxProfiles){await c.query('rollback');return reply.code(400).send({error:'REQUESTED_CANDIDATE_LIMIT'});}
      if(prior){
        if(JSON.stringify([...prior.candidate_ids].sort())!==JSON.stringify([...unique].sort())){await c.query('rollback');return reply.code(409).send({error:'CANDIDATE_SELECTION_LOCKED'});}
        await c.query('commit');return {ok:true,reused:true,accepted:unique.length,status:x.status,payment_required:x.status==='PENDIENTE_PAGO',pricing,quote:{quantity:prior.quantity,total:prior.total}};
      }
      if(x.request_type==='EVENTUAL'||!['APROBADA','EN_BUSQUEDA'].includes(x.status)){await c.query('rollback');return reply.code(409).send({error:'VACANCY_NOT_READY_FOR_MATCHING'});}
      const history=await c.query('select delivery_id from vacancy_deliveries where vacancy_id=$1 limit 1',[x.vacancy_id]);
      const orders=await c.query('select yappy_order_id,status from yappy_payment_orders where vacancy_id=$1',[x.vacancy_id]);
      const historicalPaid=await hasApprovedVacancyPayment(c,x);
      if(history.rowCount||orders.rows.some((o:any)=>o.status!=='EXECUTED')){await c.query('rollback');return reply.code(409).send({error:'PAYMENT_OPERATION_REQUIRES_REVIEW'});}
      if(historicalPaid&&unique.length>Number(x.package_candidate_limit??40)){await c.query('rollback');return reply.code(409).send({error:'PACKAGE_CANDIDATE_LIMIT'});}
      const eligible=await compatibleCandidates(c,x.vacancy_id,unique,true);
      if(eligible.rowCount!==unique.length){await c.query('rollback');return reply.code(409).send({error:'CANDIDATE_SET_CHANGED'});}
      await c.query('delete from vacancy_candidates where vacancy_id=$1',[x.vacancy_id]);
      for(const id of unique)await c.query("insert into vacancy_candidates(vacancy_id,candidate_id,interest_status,contact_authorized,responded_at) values($1,$2,'INTERESADO',false,now())",[x.vacancy_id,id]);
      const purchase={version:PROMOTION_VERSION,candidate_ids:unique,quantity:unique.length,total:quote.total,unit_price:pricing.unit_price,normal_unit_price:pricing.normal_unit_price,discount_percent:pricing.discount_percent};
      if(!historicalPaid){
        await c.query("update vacancies set package=null,package_candidate_limit=$2,package_price=$3,status='PENDIENTE_PAGO',confirmations=confirmations||jsonb_build_object('candidate_purchase',$4::jsonb),updated_at=now() where vacancy_id=$1",[x.vacancy_id,unique.length,quote.total,JSON.stringify(purchase)]);
        x.package_candidate_limit=unique.length;x.package_price=quote.total;x.confirmations={...x.confirmations,candidate_purchase:purchase};
      }
      // Private snapshot remains inaccessible to companies until signed payment confirmation.
      const d=await c.query("insert into vacancy_deliveries(vacancy_id,status,notes) values($1,'LISTA',$2) returning delivery_id",[x.vacancy_id,`Selección confirmada de ${unique.length} candidatura(s).`]);
      await c.query(`insert into vacancy_delivery_candidates(delivery_id,candidate_id,candidate_code,full_name,phone,email,primary_job_area,work_profile,skills,province,district,education,experience)
        select $1,cp.candidate_id,cp.candidate_code,cp.full_name,cp.phone,u.email,cp.primary_job_area,cp.work_profile,cp.skills,cp.province,cp.district,cp.education,cp.experience from candidate_profiles cp join users u on u.user_id=cp.user_id where cp.candidate_id=any($2::uuid[])`,[d.rows[0].delivery_id,unique]);
      for(const id of unique){const a=analyses.get(id);if(a)await c.query('update vacancy_delivery_candidates set match_analysis=$1::jsonb where delivery_id=$2 and candidate_id=$3',[JSON.stringify(a),d.rows[0].delivery_id,id]);}
      const snapshot=await c.query('select count(*)::int total from vacancy_delivery_candidates where delivery_id=$1',[d.rows[0].delivery_id]);
      if(snapshot.rows[0].total!==unique.length)throw new Error('DELIVERY_SNAPSHOT_MISMATCH');
      if(historicalPaid)await sendPreparedCandidateDelivery(c,{...x,package_candidate_limit:unique.length});
      await c.query('commit');
      return {ok:true,accepted:unique.length,status:historicalPaid?'ENTREGADA':'PENDIENTE_PAGO',payment_required:!historicalPaid,pricing,quote};
    }catch(error){await c.query('rollback').catch(()=>{});throw error;}finally{c.release();}
  });
}
