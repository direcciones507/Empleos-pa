begin;
create table auth_sessions(session_id uuid primary key default gen_random_uuid(),user_id uuid not null references users(user_id) on delete cascade,token_hash text not null unique,expires_at timestamptz not null,created_at timestamptz not null default now(),last_seen_at timestamptz not null default now(),revoked_at timestamptz);
create index auth_sessions_user_idx on auth_sessions(user_id);
create index auth_sessions_expiry_idx on auth_sessions(expires_at) where revoked_at is null;
create table password_reset_tokens(reset_id uuid primary key default gen_random_uuid(),user_id uuid not null references users(user_id) on delete cascade,token_hash text not null unique,expires_at timestamptz not null,used_at timestamptz,created_at timestamptz not null default now());
create index password_reset_user_idx on password_reset_tokens(user_id);
commit;
