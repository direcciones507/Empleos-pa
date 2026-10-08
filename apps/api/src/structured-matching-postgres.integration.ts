import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import {db} from './db.js';
import {config} from './config.js';
import {candidateRoutes} from './candidate-routes.js';
import {companySelectionIntegration} from './company-selection-postgres.integration.js';
import {companyRequestManagementRoutes} from './company-request-management-routes.js';
import {companyRoutes} from './company-routes.js';
import {companyMatchingRoutes} from './company-matching-routes.js';
import {yappyPaymentRoutes} from './yappy-payment-routes.js';
import {deliveryRoutes} from './delivery-routes.js';
import {historicalMatchingIntegration} from './historical-matching-postgres.integration.js';
import {companyDeliveryAnalysisRoutes} from './company-delivery-analysis-routes.js';
import {launchMatchingPaymentIntegration} from './launch-matching-payment-postgres.integration.js';
import {yappyOperationIntegration} from './yappy-operation-postgres.integration.js';
import {serviceContactIntegration} from './service-contact-postgres.integration.js';
import {authRoutes} from './auth-routes.js';
import {createSession,sessionUser,enableProfile} from './auth.js';
const url=new URL(config.databaseUrl); assert.equal(url.hostname,'127.0.0.1'); assert.equal(url.port,'55450'); assert.equal(url.pathname,'/empleos_pr50');
// This runner is intentionally opt-in: it applies migrations to a fresh local fixture.
// Reject every connection except the explicitly named loopback test database.
const results:any={};
const q=(sql:string,params:any[]=[])=>db.query(sql,params);
const one=async(sql:string,params:any[]=[]) => (await q(sql,params)).rows[0];
const log=(name:string,detail:any=true)=>{results[name]=detail;console.log(name,'PASS',JSON.stringify(detail));};
const migrationDir=new URL('../migrations/',import.meta.url);
const migrations=readdirSync(migrationDir).filter(n=>/^\d+.*\.sql$/.test(n)).sort();
let app:any;
try {
 console.log('POSTGRESQL',await one('select version(),current_database(),inet_server_addr(),inet_server_port()'));
 for(const n of migrations.filter(n=>n<'0031')) {await q(readFileSync(new URL(n,migrationDir),'utf8'));console.log('BASE MIGRATION',n,'PASS');}
 const columns=async(t:string)=>(await q('select column_name,data_type,is_nullable,column_default from information_schema.columns where table_schema=\'public\' and table_name=$1 order by ordinal_position',[t])).rows;
 const before:Record<string,any[]>={candidate_profiles:await columns('candidate_profiles'),vacancies:await columns('vacancies')};
 await q(readFileSync(new URL('0031_structured_matching_fields.sql',migrationDir),'utf8'));
 const expected:any={candidate_profiles:['salary_minimum','salary_period','employment_types','schedule_preferences','structured_skills','structured_languages','structured_licenses','mobility'],vacancies:['employment_type','employment_duration','schedule_structured','salary_minimum','salary_maximum','salary_period','salary_negotiable','experience_min_years','experience_scope','structured_requirements','structured_skills','structured_languages','structured_licenses','mobility_requirement','job_level','occupation_code']};
 for(const t of Object.keys(before)){const after=await columns(t);for(const col of before[t])assert.deepEqual(after.find(x=>x.column_name===col.column_name),col,`old ${t}.${col.column_name}`);for(const col of expected[t])assert.ok(after.some(x=>x.column_name===col),`${t}.${col}`);}
 const makeUser=async(name:string,role:string)=> (await one("insert into users(email,normalized_email,password_hash,role) values($1,$1,'isolated-fixture',$2) returning user_id",[name+'@example.test',role])).user_id;
 const candidateUser=await makeUser('candidate','CANDIDATO'), companyUser=await makeUser('company','EMPRESA');
 await enableProfile(candidateUser,'CANDIDATO');await enableProfile(companyUser,'EMPRESA');
 const companyId=(await one("insert into companies(owner_user_id,name) values($1,'Isolated company') returning company_id",[companyUser])).company_id;
 const legacyCandidateId=(await one("insert into candidate_profiles(user_id,skills,languages,driver_license) values($1,'Excel, contabilidad; liderazgo','Español e inglés intermedio','D y otras, según puesto') returning candidate_id",[candidateUser])).candidate_id;
 const legacyVacancyId=(await one("insert into vacancies(company_id,position,work_location,schedule,skills,languages,license_requirement,main_functions) values($1,'Contador','Santiago','Rotativo','Excel o similares; contabilidad','Español / inglés deseable','D u otra según transporte','Gestionar cuentas') returning vacancy_id",[companyId])).vacancy_id;
 await makeUser('admin','ADMIN');
 const structuredUser=await makeUser('structured','CANDIDATO');await enableProfile(structuredUser,'CANDIDATO');
 await q("insert into candidate_profiles(user_id,skills,languages,driver_license,structured_skills,structured_languages,structured_licenses) values($1,'Legacy intact','Legacy languages','Legacy license',$2::jsonb,$3::jsonb,$4::jsonb)",[structuredUser,JSON.stringify([{name:'Excel',priority:'REQUIRED'}]),JSON.stringify([{language:'INGLES',level:'B2'}]),JSON.stringify([{category:'D'}])]);
 const structuredVacancyId=(await one("insert into vacancies(company_id,position,work_location,schedule,skills,languages,license_requirement,main_functions,structured_requirements,structured_skills,structured_languages,structured_licenses) values($1,'Auxiliar','Santiago','Diurno','Legacy intact','Legacy languages','Legacy license','Gestionar cuentas',$2::jsonb,$3::jsonb,$4::jsonb,$5::jsonb) returning vacancy_id",[companyId,JSON.stringify([{type:'SKILL',value:'Excel'}]),JSON.stringify([{name:'Excel'}]),JSON.stringify([{language:'INGLES'}]),JSON.stringify([{category:'D'}])])).vacancy_id;
 for(const [sql,params,constraint] of [
  ['update candidate_profiles set salary_minimum=-1 where candidate_id=$1',[legacyCandidateId],'candidate_salary_minimum_nonnegative'],
  ['update vacancies set salary_minimum=-1 where vacancy_id=$1',[legacyVacancyId],'vacancy_salary_minimum_nonnegative'],
  ['update vacancies set salary_maximum=-1 where vacancy_id=$1',[legacyVacancyId],'vacancy_salary_maximum_nonnegative'],
  ['update vacancies set salary_minimum=1000,salary_maximum=800 where vacancy_id=$1',[legacyVacancyId],'vacancy_salary_range_valid'],
  ['update vacancies set experience_min_years=-0.5 where vacancy_id=$1',[legacyVacancyId],'vacancy_experience_min_years_nonnegative'],
 ] as any[]){await assert.rejects(q(sql,params),(e:any)=>e.code==='23514'&&e.constraint===constraint);console.log('REJECTED REAL INVALID VALUE',constraint);}
 log('0031',{oldCandidateColumns:before.candidate_profiles.length,oldVacancyColumns:before.vacancies.length,newCandidateColumns:8,newVacancyColumns:16,rejectedConstraints:5});
 const snapshot=async()=>({candidates:(await q('select * from candidate_profiles order by candidate_id')).rows,vacancies:(await q('select * from vacancies order by vacancy_id')).rows});
 const legacyBefore=await snapshot();await q(readFileSync(new URL('0032_structured_matching_legacy_backfill.sql',migrationDir),'utf8'));assert.deepEqual(await snapshot(),legacyBefore);
 await q(readFileSync(new URL('0033_candidate_notification_lifecycle.sql',migrationDir),'utf8'));
 for(const row of [await one('select * from candidate_profiles where candidate_id=$1',[legacyCandidateId]),await one('select * from vacancies where vacancy_id=$1',[legacyVacancyId])])for(const col of ['structured_skills','structured_languages','structured_licenses'])assert.deepEqual(row[col],[]);
 assert.deepEqual((await one('select structured_requirements from vacancies where vacancy_id=$1',[legacyVacancyId])).structured_requirements,[]);
 log('0032_LEGACY',{rowsChecked:4,fullRowsUnchanged:true,emptyArraysUnchanged:true,preexistingStructuresUnchanged:true});
 assert.ok((await one("select to_regclass('public.user_profiles') as relation")).relation);
 assert.equal((await one('select count(*)::int n from user_profiles')).n,3);
 await q('delete from user_profiles');
 await q(readFileSync(new URL('0025_user_profiles.sql',migrationDir),'utf8'));
 await q(readFileSync(new URL('0025_user_profiles.sql',migrationDir),'utf8'));
 assert.equal((await one('select count(*)::int n from user_profiles')).n,3);
 await assert.rejects(q("insert into user_profiles(user_id,profile_type) values($1,'ADMIN')",[candidateUser]),(e:any)=>e.code==='23514');
 const candidateSession=await createSession(candidateUser),companySession=await createSession(companyUser);
 assert.ok(candidateSession);assert.ok(companySession);
 assert.deepEqual((await sessionUser(candidateSession))?.profiles,['CANDIDATO']);
 assert.deepEqual((await sessionUser(companySession))?.profiles,['EMPRESA']);
 log('AUTH_REAL',{sessions:true,roleBackfill:true,idempotent:true,invalidPublicRoleRejected:true});
 for(const n of migrations.filter(n=>n>'0033')) {await q(readFileSync(new URL(n,migrationDir),'utf8'));console.log('LATER MIGRATION',n,'PASS');}
 app=Fastify();await app.register(cookie);await app.register(authRoutes);await app.register(candidateRoutes);await app.register(companyRoutes);
 await app.register(companyMatchingRoutes);
 await app.register(companyRequestManagementRoutes);
 await app.register(yappyPaymentRoutes);
 await app.register(deliveryRoutes);
 await app.register(companyDeliveryAnalysisRoutes);
 const serviceFixture=await serviceContactIntegration(app);
 await yappyOperationIntegration(app,serviceFixture);
 await launchMatchingPaymentIntegration(app,serviceFixture);
 await historicalMatchingIntegration(app,serviceFixture);
 await companySelectionIntegration(app,serviceFixture);
 const call=async(method:string,path:string,payload?:any,status=200)=>{const raw=path.startsWith('/v1/company')?companySession:candidateSession;const r=await app.inject({method,url:path,headers:{cookie:`empleos_session=${raw}`},...(payload===undefined?{}:{payload})});assert.equal(r.statusCode,status,`${method} ${path}: ${r.body}`);return r;};
 const unauthorized=await app.inject({method:'GET',url:'/v1/candidate/profile'});assert.equal(unauthorized.statusCode,401);
 const lc={full_name:'Ana Pérez',contact_email:'ana@example.test',mobile_whatsapp:'60000000',identity_document_type:'Cédula',identity_document_number:'8-1-1',landline_phone:'',province:'Veraguas',district:'Santiago',corregimiento:'Santiago',address_reference:'Casa azul',work_profile:'Contadora',primary_job_area:'Contabilidad',other_job_areas:'Administración',currently_working:false,available_from:'2099-01-01',availability_notes:'Diurno',work_locations:'Toda mi provincia',salary_expectation:'850',education:[{level:'Universitario'}],has_experience:true,experience:[{position:'Auxiliar',duties:'Registro contable'}],skills:'Excel, contabilidad',languages:'Español e inglés',computer_skills:'Office',driver_license:'D',contact_preference:'WhatsApp',confirmations:{correct:true,data_processing:true,no_hiring_guarantee:true}};
 const sc={salary_minimum:850,salary_period:'MES',employment_types:['INDEFINIDO','TEMPORAL'],schedule_preferences:{shift:'DIURNO',days:['LUNES','VIERNES']},structured_skills:[{name:'Excel',level:'INTERMEDIO'}],structured_languages:[{language:'INGLES',level:'B2'}],structured_licenses:[{category:'D'}],mobility:{own_transport:true,travel_available:false}};
 const check=(row:any,values:any)=>{for(const[k,v]of Object.entries(values)){if(['salary_minimum','salary_maximum','experience_min_years'].includes(k))assert.equal(Number(row[k]),v,k);else if(['available_from','estimated_start'].includes(k))assert.equal(new Date(row[k]).toISOString().slice(0,10),v,k);else if(['confirm_correct','confirm_scope','confirm_terms'].includes(k))continue;else assert.deepEqual(row[k],typeof v==='string'?v.trim():v,k);}};
 const newCandidate=await makeUser('new-candidate','CANDIDATO');await enableProfile(newCandidate,'CANDIDATO');const newSession=await createSession(newCandidate);assert.ok(newSession);
 const newResponse=await app.inject({method:'PUT',url:'/v1/candidate/profile',headers:{cookie:`empleos_session=${newSession}`},payload:{...lc,...sc}});assert.equal(newResponse.statusCode,200,newResponse.body);check(await one('select * from candidate_profiles where user_id=$1',[newCandidate]),{...lc,...sc});
 await call('PUT','/v1/candidate/profile',{...lc,...sc});check(await one('select * from candidate_profiles where user_id=$1',[candidateUser]),{...lc,...sc});
 await call('PUT','/v1/candidate/profile',{...lc,...sc,salary_minimum:875});sc.salary_minimum=875;check(await one('select * from candidate_profiles where user_id=$1',[candidateUser]),{...lc,...sc});log('CANDIDATE_PERSISTENCE',{createAndUpdate:true,readDirectlyFromPostgres:true});
 await call('PUT','/v1/candidate/profile',{...lc,skills:'Excel actualizado, contabilidad',availability_notes:'Flexible'});check(await one('select * from candidate_profiles where user_id=$1',[candidateUser]),{...lc,skills:'Excel actualizado, contabilidad',availability_notes:'Flexible',...sc});log('OLD_CLIENT_COMPATIBILITY',{structuredFieldsPreserved:8,legacyAutosaveUpdated:true});
 const lv={position:'Asistente contable',quantity:2,work_location:'Santiago',province:'Veraguas',district:'Santiago',corregimiento:'Santiago',modality:'Presencial',schedule:'Lunes a viernes',estimated_start:'2099-01-01',salary:'800 a 1000',minimum_education:'Universitario',experience_requirement:'Un año',skills:'Excel, contabilidad',languages:'Español',license_requirement:'Opcional',main_functions:'Gestionar cuentas',profile_notes:'Atención al detalle',additional_info:'Entrevista',package:'PERFILES_10',confirm_correct:true,confirm_terms:true,confirm_scope:true};
 const sv={employment_type:'TEMPORAL',employment_duration:'6 meses',schedule_structured:{shift:'DIURNO'},salary_minimum:800,salary_maximum:1000,salary_period:'MES',salary_negotiable:true,experience_min_years:1.5,experience_scope:'SECTOR',structured_requirements:[{type:'SKILL',value:'Excel',priority:'REQUIRED'}],structured_skills:[{name:'Excel'}],structured_languages:[{language:'INGLES'}],structured_licenses:[{category:'D'}],mobility_requirement:{travel_required:false},job_level:'TECNICO',occupation_code:'ACCOUNTING'};
 const vr=(await call('POST','/v1/company/vacancies',{...lv,...sv},201)).json().vacancy;
 const vacancy=await one('select * from vacancies where vacancy_code=$1',[vr.vacancy_code]);check(vacancy,{...lv,...sv,package:null});assert.equal(vacancy.status,'APROBADA');assert.equal(vacancy.package_price,'0.00');assert.equal(vacancy.package_candidate_limit,null);assert.ok(await one("select * from occupation_catalog where normalized_name='asistente contable'"));log('VACANCY_PERSISTENCE',{fields:16,legacyFields:true,transactionAndOccupationCatalog:true});
 config.requestPaymentMode='MANUAL';
 const paidResponse=(await call('POST','/v1/company/vacancies',{...lv,request_type:'EVENTUAL',package:'EVENTUAL_399'},201)).json().vacancy;
 const paidVacancy=await one('select * from vacancies where vacancy_code=$1',[paidResponse.vacancy_code]);assert.equal(paidVacancy.status,'APROBADA');assert.equal(paidVacancy.package_price,'0.00');assert.deepEqual(paidVacancy.structured_requirements,[]);assert.equal(paidVacancy.occupation_code,null);
 config.requestPaymentMode='FREE';
 // A real trigger-induced failure after vacancy insertion must roll back the whole transaction.
 await q("create function pr50_fail_occupation() returns trigger language plpgsql as $$ begin if NEW.normalized_name='rollback fixture' then raise exception 'isolated rollback fixture'; end if; return NEW; end $$; create trigger pr50_fail_occupation before insert on occupation_catalog for each row execute function pr50_fail_occupation()");
 await call('POST','/v1/company/vacancies',{...lv,...sv,position:'Rollback fixture'},500);assert.equal((await one("select count(*)::int n from vacancies where position='Rollback fixture'")).n,0);await q('drop trigger pr50_fail_occupation on occupation_catalog; drop function pr50_fail_occupation()');
 await call('POST','/v1/candidate/profile/submit',{});const cp=await one('select * from candidate_profiles where user_id=$1',[candidateUser]);assert.equal(cp.status,'ACTIVO');
 const link=async()=>q('insert into vacancy_candidates(vacancy_id,candidate_id) values($1,$2) on conflict do nothing',[vacancy.vacancy_id,cp.candidate_id]);
 await link();await q('update candidate_profiles set valid_until=current_date+7 where candidate_id=$1',[cp.candidate_id]);
 const notifications=(await call('GET','/v1/candidate/notifications')).json().items;const exp=notifications.find((n:any)=>n.type==='PROFILE_EXPIRING');assert.ok(exp);await call('POST',`/v1/candidate/notifications/${exp.notification_id}/read`,{});assert.ok((await one('select read_at from candidate_notifications where notification_id=$1',[exp.notification_id])).read_at);
 await call('POST','/v1/candidate/profile/renew',{});assert.equal((await one('select (valid_until=current_date+45) good from candidate_profiles where candidate_id=$1',[cp.candidate_id])).good,true);assert.equal((await one("select count(*)::int n from candidate_notifications where candidate_id=$1 and type='PROFILE_EXPIRING'",[cp.candidate_id])).n,0);
 await call('POST','/v1/candidate/profile/withdraw',{});assert.equal((await one('select status from candidate_profiles where candidate_id=$1',[cp.candidate_id])).status,'RETIRADO');assert.equal((await one('select count(*)::int n from vacancy_candidates where candidate_id=$1',[cp.candidate_id])).n,0);
 await call('POST','/v1/candidate/profile/reactivate',{});assert.equal((await one('select status from candidate_profiles where candidate_id=$1',[cp.candidate_id])).status,'ACTIVO');await link();
 const disableCandidate=await call('POST','/v1/candidate/account/disable',{confirm:'DESACTIVAR'});assert.deepEqual(disableCandidate.json(),{ok:true,profile_status:'RETIRADO'});assert.equal((await one('select status from candidate_profiles where candidate_id=$1',[cp.candidate_id])).status,'RETIRADO');assert.equal((await one('select status from users where user_id=$1',[candidateUser])).status,'DISABLED');assert.equal((await one('select count(*)::int n from auth_sessions where user_id=$1 and revoked_at is null',[candidateUser])).n,0);assert.equal((await one('select count(*)::int n from vacancy_candidates where candidate_id=$1',[cp.candidate_id])).n,0);
 const disabledCandidateReactivate=await app.inject({method:'POST',url:'/v1/candidate/profile/reactivate',headers:{cookie:`empleos_session=${candidateSession}`},payload:{}});assert.equal(disabledCandidateReactivate.statusCode,401);
 log('CANDIDATE_LIFECYCLE',{submit:true,renew:true,withdraw:true,reactivate:true,disable:true,notificationCreatedReadAndCleaned:true,structuredFieldsRetained:true});
 await link();await q("insert into vacancy_deliveries(vacancy_id,status) values($1,'LISTA')",[vacancy.vacancy_id]);await q("insert into vacancy_payments(vacancy_id,status,amount) values($1,'EN_REVISION',10.99)",[vacancy.vacancy_id]);
 await q("insert into auth_sessions(user_id,token_hash,expires_at) values($1,'isolated-session',now()+interval '1 day')",[companyUser]);await q("insert into password_reset_tokens(user_id,token_hash,expires_at) values($1,'isolated-reset',now()+interval '1 hour')",[companyUser]);
 // Reject invalidation in a real transaction; prior changes must also roll back.
 await q("create function pr50_fail_reset() returns trigger language plpgsql as $$ begin raise exception 'isolated reset failure'; end $$; create trigger pr50_fail_reset before update on password_reset_tokens for each row execute function pr50_fail_reset()");
 const failed=await call('POST','/v1/company/account/disable',{confirm:'DESACTIVAR'},500);assert.equal(failed.headers['set-cookie'],undefined);assert.equal((await one('select status from users where user_id=$1',[companyUser])).status,'ACTIVE');assert.equal((await one('select status from vacancies where vacancy_id=$1',[vacancy.vacancy_id])).status,'APROBADA');assert.equal((await one('select revoked_at from auth_sessions where user_id=$1',[companyUser])).revoked_at,null);assert.equal((await one('select status from vacancy_payments where vacancy_id=$1',[vacancy.vacancy_id])).status,'EN_REVISION');assert.equal((await one('select count(*)::int n from vacancy_candidates where vacancy_id=$1',[vacancy.vacancy_id])).n,1);assert.equal((await one('select count(*)::int n from vacancy_deliveries where vacancy_id=$1',[vacancy.vacancy_id])).n,1);await q('drop trigger pr50_fail_reset on password_reset_tokens; drop function pr50_fail_reset()');
 const cd=await call('POST','/v1/company/account/disable',{confirm:'DESACTIVAR'});assert.deepEqual(cd.json(),{ok:true,account_status:'DISABLED'});assert.match(String(cd.headers['set-cookie']),/empleos_session=;.*Path=\/;.*Expires=/);assert.equal((await one('select status from users where user_id=$1',[companyUser])).status,'DISABLED');assert.ok((await one('select revoked_at from auth_sessions where user_id=$1',[companyUser])).revoked_at);assert.ok((await one('select used_at from password_reset_tokens where user_id=$1',[companyUser])).used_at);assert.equal((await one('select status from vacancies where vacancy_id=$1',[vacancy.vacancy_id])).status,'CANCELADA');assert.equal((await one('select status from vacancy_payments where vacancy_id=$1',[vacancy.vacancy_id])).status,'RECHAZADO');assert.equal((await one('select count(*)::int n from vacancy_candidates where vacancy_id=$1',[vacancy.vacancy_id])).n,0);assert.equal((await one('select count(*)::int n from vacancy_deliveries where vacancy_id=$1',[vacancy.vacancy_id])).n,0);
 log('COMPANY_SIDE_EFFECTS',{sessionsRevoked:true,resetTokensInvalidated:true,cookieCleared:true,responseOriginal:true,vacanciesCancelled:true,paymentsRejected:true,linksAndReadyDeliveryCleaned:true,rollbackPhysicallyVerified:true});
 assert.equal(await sessionUser(companySession),null);assert.equal(await createSession(companyUser),null);
 console.log('FINAL',JSON.stringify(results));
} finally {if(app)await app.close();await db.end();}
