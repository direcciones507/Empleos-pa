import type {FastifyInstance} from "fastify";
import {db} from "./db.js";
import {requireRoles} from "./rbac.js";
import {analyzeFilteredCandidates,deepSeekConfigured} from "./ai-analysis.js";
import {config} from "./config.js";

const vacancyCode=/^VAC-\d{6}$/;
const CANDIDATE_UNIT_PRICE_CENTS=299;
const money=(cents:number)=>Number((cents/100).toFixed(2));

export async function companyMatchingRoutes(app:FastifyInstance){
  app.get("/v1/company/vacancies/:code/matches",{preHandler:requireRoles("EMPRESA")},async(req:any,reply)=>{
    const code=String(req.params.code??"").trim();
    if(!vacancyCode.test(code))return reply.code(400).send({error:"INVALID_VACANCY_CODE"});
    const v=await db.query(`select v.vacancy_code,v.position,v.work_location,v.skills,v.minimum_education,v.experience_requirement,v.schedule,v.status from vacancies v join companies c on c.company_id=v.company_id where v.vacancy_code=$1 and c.owner_user_id=$2`,[code,req.authUser!.user_id]);
    if(!v.rowCount)return reply.code(404).send({error:"VACANCY_NOT_FOUND"});
    if(!["APROBADA","EN_BUSQUEDA"].includes(v.rows[0].status))return reply.code(409).send({error:"VACANCY_NOT_READY_FOR_MATCHING"});
    const x=v.rows[0];
    const q=await db.query(`select candidate_id,candidate_code,primary_job_area,province,district,work_profile,skills,education,experience,availability_notes,
      jsonb_build_object('role',lower(translate(coalesce(primary_job_area,''),'ÁÉÍÓÚÜÑáéíóúüñ','AEIOUUNaeiouun'))=lower(translate(coalesce($1,''),'ÁÉÍÓÚÜÑáéíóúüñ','AEIOUUNaeiouun')),'location',lower(translate(coalesce(work_locations,''),'ÁÉÍÓÚÜÑáéíóúüñ','AEIOUUNaeiouun')) like '%'||lower(translate(coalesce($2,''),'ÁÉÍÓÚÜÑáéíóúüñ','AEIOUUNaeiouun'))||'%','skills',coalesce((select array_agg(trim(s)) from unnest(string_to_array(coalesce($3,''),',')) s where trim(s)<>'' and lower(translate(coalesce(skills,''),'ÁÉÍÓÚÜÑáéíóúüñ','AEIOUUNaeiouun')) like '%'||lower(translate(trim(s),'ÁÉÍÓÚÜÑáéíóúüñ','AEIOUUNaeiouun'))||'%'),'{}'::text[]),'availability',(available_from is null or available_from<=current_date)) match_trace
      from candidate_profiles where status='ACTIVO' and valid_until>=current_date and (lower(translate(coalesce(primary_job_area,''),'ÁÉÍÓÚÜÑáéíóúüñ','AEIOUUNaeiouun'))=lower(translate(coalesce($1,''),'ÁÉÍÓÚÜÑáéíóúüñ','AEIOUUNaeiouun')) or (nullif(trim(coalesce($2,'')),'') is not null and lower(translate(coalesce(work_locations,''),'ÁÉÍÓÚÜÑáéíóúüñ','AEIOUUNaeiouun')) like '%'||lower(translate(trim($2),'ÁÉÍÓÚÜÑáéíóúüñ','AEIOUUNaeiouun'))||'%') or (nullif(trim(coalesce($3,'')),'') is not null and exists(select 1 from unnest(string_to_array($3,',')) s where trim(s)<>'' and lower(translate(coalesce(skills,''),'ÁÉÍÓÚÜÑáéíóúüñ','AEIOUUNaeiouun')) like '%'||lower(translate(trim(s),'ÁÉÍÓÚÜÑáéíóúüñ','AEIOUUNaeiouun'))||'%'))) order by updated_at desc limit 40`,[x.position,x.work_location,x.skills]);
    const pricing={currency:"USD",unit_price:money(CANDIDATE_UNIT_PRICE_CENTS),unit:"candidate_delivered"};
    if(!q.rowCount)return {vacancy:{code:x.vacancy_code,position:x.position},count:0,pricing,quote:{quantity:0,total:0},ai_available:deepSeekConfigured(),analyses:[]};
    if(!deepSeekConfigured())return {vacancy:{code:x.vacancy_code,position:x.position},count:q.rowCount,pricing,quote:{quantity:q.rowCount,total:money(q.rowCount*CANDIDATE_UNIT_PRICE_CENTS)},ai_available:false,analyses:[]};
    try{
      const result=await analyzeFilteredCandidates(x,q.rows,AbortSignal.timeout(config.deepSeekTimeoutMs));
      return {vacancy:{code:x.vacancy_code,position:x.position},count:q.rowCount,pricing,quote:{quantity:q.rowCount,total:money(q.rowCount*CANDIDATE_UNIT_PRICE_CENTS)},ai_available:true,provider:result.provider,model:result.model,analyses:result.analyses,coverage:result.coverage};
    }catch(error){req.log.error(error,"company candidate AI analysis failed");return reply.code(502).send({error:"AI_ANALYSIS_FAILED"});}
  });

  app.post("/v1/company/vacancies/:code/candidates/accept",{preHandler:requireRoles("EMPRESA")},async(req:any,reply)=>{
    const code=String(req.params.code??"").trim();
    if(!vacancyCode.test(code))return reply.code(400).send({error:"INVALID_VACANCY_CODE"});
    const ids=Array.isArray(req.body?.candidate_ids)?req.body.candidate_ids.map((x:any)=>String(x).trim()):[];
    if(!ids.length)return reply.code(400).send({error:"CANDIDATES_REQUIRED"});
    const unique=[...new Set<string>(ids)];
    if(unique.length>40)return reply.code(400).send({error:"TOO_MANY_CANDIDATES"});
    const expectedTotalCents=unique.length*CANDIDATE_UNIT_PRICE_CENTS;
    if(req.body?.confirm_price!==true)return reply.code(409).send({error:"PRICE_CONFIRMATION_REQUIRED",pricing:{currency:"USD",unit_price:money(CANDIDATE_UNIT_PRICE_CENTS),unit:"candidate_delivered"},quote:{quantity:unique.length,total:money(expectedTotalCents)}});
    const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if(unique.some(id=>!uuid.test(id)))return reply.code(400).send({error:"INVALID_CANDIDATE_ID"});
    const c=await db.connect();
    try{
      await c.query("begin");
      const v=await c.query(`select v.vacancy_id,v.status from vacancies v join companies co on co.company_id=v.company_id where v.vacancy_code=$1 and co.owner_user_id=$2 for update of v`,[code,req.authUser!.user_id]);
      if(!v.rowCount){await c.query("rollback");return reply.code(404).send({error:"VACANCY_NOT_FOUND"});}
      if(!["APROBADA","EN_BUSQUEDA"].includes(v.rows[0].status)){await c.query("rollback");return reply.code(409).send({error:"VACANCY_NOT_READY_FOR_MATCHING"});}
      const eligible=await c.query("select candidate_id from candidate_profiles where candidate_id=any($1::uuid[]) and status='ACTIVO' and valid_until>=current_date for update",[unique]);
      if(eligible.rowCount!==unique.length){await c.query("rollback");return reply.code(409).send({error:"CANDIDATE_SET_CHANGED"});}
      for(const id of unique)await c.query("insert into vacancy_candidates(vacancy_id,candidate_id,interest_status,contact_authorized,responded_at) values($1,$2,'INTERESADO',true,now()) on conflict(vacancy_id,candidate_id) do update set interest_status='INTERESADO',contact_authorized=true,responded_at=coalesce(vacancy_candidates.responded_at,now())",[v.rows[0].vacancy_id,id]);
      const total=await c.query("select count(*)::int total from vacancy_candidates where vacancy_id=$1",[v.rows[0].vacancy_id]);
      await c.query("update vacancies set status='EN_BUSQUEDA',updated_at=now() where vacancy_id=$1",[v.rows[0].vacancy_id]);
      await c.query("commit");
      return {ok:true,accepted:unique.length,total:total.rows[0].total,status:"EN_BUSQUEDA",pricing:{currency:"USD",unit_price:money(CANDIDATE_UNIT_PRICE_CENTS),unit:"candidate_delivered"},quote:{quantity:unique.length,total:money(expectedTotalCents)}};
    }catch(error){await c.query("rollback").catch(()=>{});throw error;}finally{c.release();}
  });
}
