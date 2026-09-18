begin;
create table oauth_states(state_hash text primary key,provider text not null check(provider in ('google')),requested_role user_role,return_to text not null default '/',expires_at timestamptz not null,used_at timestamptz,created_at timestamptz not null default now());
create index oauth_states_expiry_idx on oauth_states(expires_at) where used_at is null;
commit;
