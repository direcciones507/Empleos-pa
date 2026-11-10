create table if not exists candidate_cv_purchases (
 purchase_id uuid primary key default gen_random_uuid(),
 candidate_id uuid not null references candidate_profiles(candidate_id),
 user_id uuid not null references users(user_id),
 template text not null check(template in ('ejecutivo-clasico','ejecutivo-moderno','ejecutivo-minimalista')),
 amount numeric(10,2) not null default 0.50 check(amount=0.50),
 order_id text unique,
 status text not null default 'CREATED' check(status in ('CREATED','PENDING','EXECUTED','REJECTED','CANCELLED','EXPIRED')),
 provider_response jsonb,
 generations int not null default 0 check(generations between 0 and 3),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists candidate_cv_purchases_owner_idx on candidate_cv_purchases(user_id,created_at desc);
