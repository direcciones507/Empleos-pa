create table if not exists occupation_catalog (
  occupation_id uuid primary key default gen_random_uuid(),
  normalized_name text not null unique,
  display_name text not null,
  usage_count integer not null default 1 check (usage_count >= 1),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index if not exists occupation_catalog_display_name_idx on occupation_catalog (lower(display_name));
