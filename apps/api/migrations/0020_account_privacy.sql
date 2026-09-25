begin;
alter table users add column if not exists disabled_at timestamptz;
alter table users add column if not exists disabled_reason text;
commit;
