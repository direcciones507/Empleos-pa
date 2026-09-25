begin;
create unique index if not exists vacancy_deliveries_one_ready_idx
on vacancy_deliveries(vacancy_id)
where status='LISTA';
commit;
