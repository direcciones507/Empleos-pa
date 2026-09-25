begin;
create table admin_audit_log(
  audit_id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references users(user_id) on delete restrict,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index admin_audit_log_created_idx on admin_audit_log(created_at desc);
create index admin_audit_log_entity_idx on admin_audit_log(entity_type,entity_id,created_at desc);
create index admin_audit_log_admin_idx on admin_audit_log(admin_user_id,created_at desc);
commit;
