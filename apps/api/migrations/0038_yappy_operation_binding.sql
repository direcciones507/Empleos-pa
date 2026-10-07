begin;
alter table yappy_payment_orders drop constraint yappy_payment_orders_purpose_check;
alter table yappy_payment_orders add column contact_request_id uuid references service_contact_requests(contact_request_id) on delete restrict;
alter table yappy_payment_orders add column operation_key text unique;
alter table yappy_payment_orders add column provider_response jsonb;
-- Bind one existing live/settled vacancy order without deleting historical duplicates.
-- A confirmed order takes precedence; a pending legacy order requires review,
-- rather than creating another external payment without its old SDK response.
with legacy as (
  select distinct on (vacancy_id) yappy_order_id,vacancy_id
  from yappy_payment_orders
  where purpose='VACANCY' and vacancy_id is not null and status in ('PENDING','EXECUTED')
  order by vacancy_id,(status='EXECUTED') desc,created_at desc,yappy_order_id
)
update yappy_payment_orders o set operation_key='VACANCY:'||legacy.vacancy_id::text
from legacy where o.yappy_order_id=legacy.yappy_order_id;
alter table yappy_payment_orders add constraint yappy_payment_orders_purpose_check check(purpose in ('TEST','VACANCY','SERVICE_CONTACT'));
alter table yappy_payment_orders add constraint yappy_service_binding_check check (
  (purpose='SERVICE_CONTACT' and contact_request_id is not null and vacancy_id is null and amount=1.89) or
  (purpose<>'SERVICE_CONTACT' and contact_request_id is null)
);
alter table service_contact_requests add column paid_order_id text unique references yappy_payment_orders(yappy_order_id) on delete restrict;
commit;
