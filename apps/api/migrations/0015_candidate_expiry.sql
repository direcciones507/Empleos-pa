begin;
alter table candidate_notifications alter column vacancy_id drop not null;
create unique index if not exists candidate_notifications_expiry_once_idx
on candidate_notifications(candidate_id,type)
where type='PROFILE_EXPIRING';
commit;
