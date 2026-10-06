begin;
alter table candidate_notifications add column if not exists archived_at timestamptz;
alter table candidate_notifications add column if not exists deleted_at timestamptz;
create index if not exists candidate_notifications_visible_idx on candidate_notifications(candidate_id,created_at desc) where archived_at is null and deleted_at is null;
commit;
