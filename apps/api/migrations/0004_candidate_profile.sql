begin;
create sequence candidate_code_seq start 1;
alter table candidate_profiles add column other_job_areas text,add column work_locations text,add column education jsonb not null default '[]'::jsonb,add column has_experience boolean,add column experience jsonb not null default '[]'::jsonb,add column skills text,add column languages text,add column computer_skills text,add column driver_license text,add column contact_preference text,add column confirmations jsonb not null default '{}'::jsonb;
commit;
