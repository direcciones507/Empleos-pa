// Labor evidence is required; location and availability remain descriptive.
// Structured fields add evidence; priorities and availability remain descriptive.
export const normalizeSql = (value: string) => `lower(regexp_replace(trim(translate(coalesce(${value},''),'ÁÉÍÓÚÜÑáéíóúüñ','AEIOUUNaeiouun')), '\\s+', ' ', 'g'))`;
const n = normalizeSql;
const names = (value: string) => `select ${n("coalesce(s->>'name',s->>'value')")} name from jsonb_array_elements(coalesce(${value},'[]'::jsonb)) s`;
const occupation = `(
  (nullif(${n('v.position')},'') is not null and ${n('cp.primary_job_area')}=${n('v.position')})
  or (nullif(${n('v.occupation_code')},'') is not null and ${n('cp.primary_job_area')}=${n('v.occupation_code')})
  or (nullif(${n('v.position')},'') is not null and ${n('v.position')}=any(regexp_split_to_array(${n('cp.other_job_areas')},'[,;]\\s*')))
)`;
const location = `(
  (nullif(${n('v.work_location')},'') is not null and strpos(${n('cp.work_locations')},${n('v.work_location')})>0)
  or (nullif(${n('v.province')},'') is not null
    and (${n('cp.province')}=${n('v.province')} or strpos(${n('cp.work_locations')},${n('v.province')})>0 or ${n('cp.work_locations')} in ('todo panama','todo el pais','a nivel nacional'))
    and (nullif(${n('v.district')},'') is null or ${n('cp.district')}=${n('v.district')} or strpos(${n('cp.work_locations')},${n('v.district')})>0
      or ${n('cp.work_locations')} in ('toda mi provincia','toda la provincia','todo panama','todo el pais','a nivel nacional')))
)`;
const skills = `exists(
  select 1 from (
    select ${n('legacy')} name from regexp_split_to_table(coalesce(v.skills,''),'[,;]') legacy
    union ${names('v.structured_skills')}
    union ${names("(select coalesce(jsonb_agg(r),'[]'::jsonb) from jsonb_array_elements(coalesce(v.structured_requirements,'[]'::jsonb)) r where r->>'type'='SKILL')")}
  ) requested where requested.name<>'' and requested.name not in ('proactivo','proactiva','responsable','trabajador','trabajadora','dinamico','dinamica','puntual','honesto','honesta','comprometido','comprometida','trabajo en equipo') and (
    strpos(${n('cp.skills')},requested.name)>0
    or exists(select 1 from (${names('cp.structured_skills')}) owned where owned.name=requested.name)
  )
)`;
// Use only candidate employment records (position/duties), never service profiles.
const experience = `exists(select 1 from jsonb_array_elements(coalesce(cp.experience,'[]'::jsonb)) e
  where nullif(${n('v.position')},'') is not null and (
    to_tsvector('spanish',${n("coalesce(e->>'position','')||' '||coalesce(e->>'duties','')")}) @@ plainto_tsquery('spanish',${n('v.position')})
    or (${n('v.position')} ~ '(^| )(vendedor[a-z]*|ventas|comercial)( |$)'
      and ${n("coalesce(e->>'position','')||' '||coalesce(e->>'duties','')")} ~ '(^| )(vendedor[a-z]*|ventas|comercial)( |$)')
  ))`;
export const candidateCompatibility = `
  cp.status='ACTIVO' and cp.valid_until>=current_date and u.status='ACTIVE'
  and exists(select 1 from user_profiles up where up.user_id=cp.user_id and up.profile_type='CANDIDATO')
  and (${occupation} or ${skills} or ${experience})`;
export async function compatibleCandidates(queryable: any, vacancyId: string, ids?: string[], lock = false) {
  return queryable.query(`select cp.candidate_id,cp.candidate_code,cp.primary_job_area,cp.province,cp.district,cp.work_profile,cp.skills,cp.structured_skills,cp.education,cp.experience,cp.availability_notes,
    jsonb_build_object('role',${occupation},'location',${location},'skills',${skills},'experience',${experience},'availability',(cp.available_from is null or cp.available_from<=current_date)) match_trace
    from vacancies v cross join candidate_profiles cp join users u on u.user_id=cp.user_id
    where v.vacancy_id=$1 and ${candidateCompatibility} ${ids ? 'and cp.candidate_id=any($2::uuid[])' : ''}
    order by cp.updated_at desc,cp.candidate_id limit 40 ${lock ? 'for update of cp' : ''}`, ids ? [vacancyId,ids] : [vacancyId]);
}
