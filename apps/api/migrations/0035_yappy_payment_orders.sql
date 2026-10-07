begin;
create table if not exists yappy_payment_orders(
  yappy_order_id text primary key check (yappy_order_id ~ '^[A-Za-z0-9]{1,15}$'),
  user_id uuid not null references users(user_id) on delete restrict,
  vacancy_id uuid references vacancies(vacancy_id) on delete restrict,
  purpose text not null check (purpose in ('TEST','VACANCY')),
  amount numeric(10,2) not null check (amount>0),
  status text not null default 'PENDING' check (status in ('PENDING','EXECUTED','REJECTED','CANCELLED','EXPIRED')),
  provider_transaction_id text,
  provider_confirmation_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists yappy_payment_orders_user_created_idx on yappy_payment_orders(user_id,created_at desc);
create index if not exists yappy_payment_orders_vacancy_idx on yappy_payment_orders(vacancy_id) where vacancy_id is not null;
commit;
