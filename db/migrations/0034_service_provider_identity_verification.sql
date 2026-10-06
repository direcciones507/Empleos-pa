create table if not exists service_provider_verifications (
  verification_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(user_id) on delete cascade,
  provider text not null check (provider in ('DIDIT')),
  provider_session_id text not null,
  status text not null default 'PENDING' check (status in ('PENDING','IN_REVIEW','APPROVED','DECLINED')),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider,provider_session_id)
);
create index if not exists idx_service_provider_verifications_user_created on service_provider_verifications(user_id,created_at desc);
