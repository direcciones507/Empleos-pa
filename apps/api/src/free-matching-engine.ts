import {db} from "./db.js";
import {analyzeFilteredCandidates,deepSeekConfigured} from "./ai-analysis.js";
import {config} from "./config.js";

// Match the manual delivery's allowlist and limits; never persist provider extras.
const cleanList=(v:any)=>Array.isArray(v)?v.filter((x:any)=>typeof x==="string").map((x:string)=>x.trim().slice(0,500)).filter(Boolean).slice(0,10):[];
function cleanAnalysis(x:any){return {candidate_id:String(x?.candidate_id??""),summary:typeof x?.summary==="string"?x.summary.trim().slice(0,1200):"",strengths:cleanList(x?.strengths),gaps:cleanList(x?.gaps),considerations:cleanList(x?.considerations)};}

export async function processFreeVacancy(vacancyCode:string,log:any){
  if((config.nodeEnv==="production"||config.requestPaymentMode!=="FREE"))return {status:"SKIPPED_PAYMENT_MODE"};
  const v=await db.query(`select vacancy_id,vacancy_code,package_price,confirmations,position,work_location,skills,minimum_education,experience_requirement,schedule,status from vacancies where vacancy_code=$1`,[vacancyCode]);
  if(!v.rowCount||Number(v.rows[0].package_price)>0||v.rows[0].confirmations?.candidate_purchase||v.rows[0].status!=="APROBADA")return {status:"SKIPPED_STATE"};
  const x=v.rows[0];
  const q=await db.query(`select candidate_id,candidate_code,primary_job_area,province,district,work_profile,skills,education,experience,availability_notes,
    jsonb_build_object('role',lower(translate(coalesce(primary_job_area,''),'ÁÉÍÓÚÜÑáéíóúüñ','AEIOUUNaeiouun'))=lower(translate(coalesce($1,''),'ÁÉÍÓÚÜÑáéíóúüñ','AEIOUUNaeiouun')),'location',lower(translate(coalesce(work_locations,''),'ÁÉÍÓÚÜÑáéíóúüñ','AEIOUUNaeiouun')) like '%'||lower(translate(coalesce($2,''),'ÁÉÍÓÚÜÑáéíóúüñ','AEIOUUNaeiouun'))||'%','skills',coalesce((select array_agg(trim(s)) from unnest(string_to_array(coalesce($3,''),',')) s where trim(s)<>'' and lower(translate(coalesce(skills,''),'ÁÉÍÓÚÜÑáéíóúüñ','AEIOUUNaeiouun')) like '%'||lower(translate(trim(s),'ÁÉÍÓÚÜÑáéíóúüñ','AEIOUUNaeiouun'))||'%'),'{}'::text[]),'availability',(available_from is null or available_from<=current_date)) match_trace
    from candidate_profiles where status='ACTIVO' and valid_until>=current_date and (lower(translate(coalesce(primary_job_area,''),'ÁÉÍÓÚÜÑáéíóúüñ','AEIOUUNaeiouun'))=lower(translate(coalesce($1,''),'ÁÉÍÓÚÜÑáéíóúüñ','AEIOUUNaeiouun')) or (nullif(trim(coalesce($2,'')),'') is not null and lower(translate(coalesce(work_locations,''),'ÁÉÍÓÚÜÑáéíóúüñ','AEIOUUNaeiouun')) like '%'||lower(translate(trim($2),'ÁÉÍÓÚÜÑáéíóúüñ','AEIOUUNaeiouun'))||'%') or (nullif(trim(coalesce($3,'')),'') is not null and exists(select 1 from unnest(string_to_array($3,',')) s where trim(s)<>'' and lower(translate(coalesce(skills,''),'ÁÉÍÓÚÜÑáéíóúüñ','AEIOUUNaeiouun')) like '%'||lower(translate(trim(s),'ÁÉÍÓÚÜÑáéíóúüñ','AEIOUUNaeiouun'))||'%'))) order by updated_at desc limit 40`,[x.position,x.work_location,x.skills]);
  if(!q.rowCount)return {status:"NO_MATCHES",count:0};
  if(!deepSeekConfigured())return {status:"AI_UNAVAILABLE",count:q.rowCount};
  const ai=await analyzeFilteredCandidates(x,q.rows,AbortSignal.timeout(config.deepSeekTimeoutMs));
  const ids=[...new Set<string>(ai.analyses.map((a:any)=>String(a?.candidate_id??"")).filter(Boolean))].slice(0,config.freeCandidateLimit);
  if(!ids.length)return {status:"NO_ANALYSED_MATCHES",count:0};
  const c=await db.connect();
  try{
    await c.query("begin");
    const locked=await c.query("select vacancy_id,status,position,work_location from vacancies where vacancy_id=$1 for update",[x.vacancy_id]);
    if(!locked.rowCount||locked.rows[0].status!=="APROBADA"){await c.query("rollback");return {status:"SKIPPED_STATE"};}
    const eligible=await c.query("select candidate_id from candidate_profiles where candidate_id=any($1::uuid[]) and status='ACTIVO' and valid_until>=current_date for update",[ids]);
    const eligibleIds=eligible.rows.map((r:any)=>String(r.candidate_id)).slice(0,config.freeCandidateLimit);
    if(!eligibleIds.length){await c.query("rollback");return {status:"CANDIDATES_CHANGED"};}
    for(const id of eligibleIds)await c.query("insert into vacancy_candidates(vacancy_id,candidate_id,interest_status,contact_authorized,responded_at) values($1,$2,'INTERESADO',true,now()) on conflict(vacancy_id,candidate_id) do nothing",[x.vacancy_id,id]);
    const d=await c.query("insert into vacancy_deliveries(vacancy_id,status,notes) values($1,'LISTA',$2) returning delivery_id",[x.vacancy_id,`Entrega automática gratuita de hasta ${config.freeCandidateLimit} candidatura(s).`]);
    await c.query(`insert into vacancy_delivery_candidates(delivery_id,candidate_id,candidate_code,full_name,phone,email,primary_job_area,work_profile,skills,province,district,education,experience)
      select $1,cp.candidate_id,cp.candidate_code,cp.full_name,cp.phone,u.email,cp.primary_job_area,cp.work_profile,cp.skills,cp.province,cp.district,cp.education,cp.experience from candidate_profiles cp join users u on u.user_id=cp.user_id where cp.candidate_id=any($2::uuid[])`,[d.rows[0].delivery_id,eligibleIds]);
    const analyses=new Map(ai.analyses.map(cleanAnalysis).filter(a=>eligibleIds.includes(a.candidate_id)&&a.summary).map(a=>[a.candidate_id,a]));
    for(const id of eligibleIds){
      const analysis=analyses.get(id);
      if(analysis)await c.query("update vacancy_delivery_candidates set match_analysis=$1::jsonb where delivery_id=$2 and candidate_id=$3",[JSON.stringify(analysis),d.rows[0].delivery_id,id]);
    }
    const snapshot=await c.query("select count(*)::int total from vacancy_delivery_candidates where delivery_id=$1",[d.rows[0].delivery_id]);
    if(snapshot.rows[0].total!==eligibleIds.length){await c.query("rollback");return {status:"DELIVERY_SNAPSHOT_MISMATCH"};}
    await c.query(`insert into candidate_notifications(candidate_id,vacancy_id,type,title,message) select dc.candidate_id,$2,'PROFILE_DELIVERED','Tu perfil estuvo en una búsqueda',$3 from vacancy_delivery_candidates dc where dc.delivery_id=$1 on conflict(candidate_id,vacancy_id,type) do nothing`,[d.rows[0].delivery_id,x.vacancy_id,`Tu perfil estuvo incluido en una búsqueda para ${x.position} en ${x.work_location}. Una empresa podría contactarte.`]);
    await c.query("update vacancy_deliveries set status='ENVIADA',sent_at=now(),updated_at=now() where delivery_id=$1",[d.rows[0].delivery_id]);
    await c.query("update vacancies set package=null,package_candidate_limit=$1,package_price=0,status='ENTREGADA',updated_at=now() where vacancy_id=$2",[config.freeCandidateLimit,x.vacancy_id]);
    await c.query("commit");
    log.info({vacancy_code:vacancyCode,candidates:eligibleIds.length},"automatic free vacancy delivered");
    return {status:"DELIVERED",count:eligibleIds.length};
  }catch(error){await c.query("rollback").catch(()=>{});throw error;}finally{c.release();}
}

export async function processWaitingFreeVacancies(log:any){
  if((config.nodeEnv==="production"||config.requestPaymentMode!=="FREE"))return;
  const waiting=await db.query("select vacancy_code from vacancies where status='APROBADA' order by created_at asc limit 50");
  for(const row of waiting.rows){
    try{await processFreeVacancy(String(row.vacancy_code),log);}catch(error){log.error({err:error,vacancy_code:row.vacancy_code},"candidate-triggered free rematch failed");}
  }
}
