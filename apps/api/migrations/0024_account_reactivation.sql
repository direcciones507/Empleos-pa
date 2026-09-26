begin;
create table if not exists account_reactivation_tokens(
  token_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(user_id) on delete cascade,
  token_hash text not null unique,
  return_to text not null default '/',
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists account_reactivation_user_idx on account_reactivation_tokens(user_id);
create index if not exists account_reactivation_expiry_idx on account_reactivation_tokens(expires_at) where used_at is null;
commit;
