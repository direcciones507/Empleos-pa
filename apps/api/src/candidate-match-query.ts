// Only deterministic evidence decides membership; AI may describe this set.
export const normalizeSql = (value: string) => `lower(regexp_replace(trim(translate(coalesce(${value},''),'ÁÉÍÓÚÜÑáéíóúüñ','AEIOUUNaeiouun')), '\\s+', ' ', 'g'))`;
const n = normalizeSql;
const names = (value: string) => `select ${n("coalesce(s->>'name',s->>'value')")} name from jsonb_array_elements(coalesce(${value},'[]'::jsonb)) s where coalesce(s->>'priority','REQUIRED')<>'OPTIONAL'`;
export const candidateCompatibility = `
  cp.status='ACTIVO' and cp.valid_until>=current_date and u.status='ACTIVE'
  and exists(select 1 from user_profiles up where up.user_id=cp.user_id and up.profile_type='CANDIDATO')
  and (cp.available_from is null or cp.available_from<=coalesce(v.estimated_start,current_date))
  and (${n('cp.primary_job_area')}=${n('v.position')}
    or ${n('cp.primary_job_area')}=${n('v.occupation_code')}
    or ${n('v.position')}=any(regexp_split_to_array(${n('cp.other_job_areas')},'[,;]\\s*')))
  and (case when nullif(trim(v.province),'') is not null then
    (${n('cp.province')}=${n('v.province')} or strpos(${n('cp.work_locations')},${n('v.province')})>0 or ${n('cp.work_locations')} in ('todo panama','todo el pais','a nivel nacional'))
    and (nullif(trim(v.district),'') is null or ${n('cp.district')}=${n('v.district')}
      or strpos(${n('cp.work_locations')},${n('v.district')})>0
      or ${n('cp.work_locations')} in ('toda mi provincia','toda la provincia','todo panama','todo el pais','a nivel nacional'))
    else nullif(trim(v.work_location),'') is null or strpos(${n("concat_ws(' ',cp.province,cp.district,cp.work_locations)")},${n('v.work_location')})>0 end)
  and not exists(
    select 1 from (
      ${names('v.structured_skills')}
      union ${names("(select coalesce(jsonb_agg(r),'[]'::jsonb) from jsonb_array_elements(coalesce(v.structured_requirements,'[]'::jsonb)) r where r->>'type'='SKILL' and coalesce(r->>'priority','REQUIRED')<>'OPTIONAL')")}
      union select ${n('legacy')} from regexp_split_to_table(coalesce(v.skills,''),'[,;]') legacy
      where jsonb_array_length(coalesce(v.structured_skills,'[]'::jsonb))=0
        and not exists(select 1 from jsonb_array_elements(coalesce(v.structured_requirements,'[]'::jsonb)) r where r->>'type'='SKILL')
    ) required where required.name<>'' and not (
      strpos(${n('cp.skills')},required.name)>0 or exists(select 1 from (${names('cp.structured_skills')}) owned where owned.name=required.name)
    )
  )`;
export async function compatibleCandidates(queryable: any, vacancyId: string, ids?: string[], lock = false) {
  return queryable.query(`select cp.candidate_id,cp.candidate_code,cp.primary_job_area,cp.province,cp.district,cp.work_profile,cp.skills,cp.structured_skills,cp.education,cp.experience,cp.availability_notes,
    jsonb_build_object('role',true,'location',true,'skills',true,'availability',true) match_trace
    from vacancies v cross join candidate_profiles cp join users u on u.user_id=cp.user_id
    where v.vacancy_id=$1 and ${candidateCompatibility} ${ids ? 'and cp.candidate_id=any($2::uuid[])' : ''}
    order by cp.updated_at desc,cp.candidate_id limit 40 ${lock ? 'for update of cp' : ''}`, ids ? [vacancyId,ids] : [vacancyId]);
}
