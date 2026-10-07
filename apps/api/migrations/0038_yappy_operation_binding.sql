begin;
alter table yappy_payment_orders drop constraint yappy_payment_orders_purpose_check;
alter table yappy_payment_orders add column contact_request_id uuid references service_contact_requests(contact_request_id) on delete restrict;
alter table yappy_payment_orders add column operation_key text unique;
alter table yappy_payment_orders add column provider_response jsonb;
alter table yappy_payment_orders add constraint yappy_payment_orders_purpose_check check(purpose in ('TEST','VACANCY','SERVICE_CONTACT'));
alter table yappy_payment_orders add constraint yappy_service_binding_check check (
  (purpose='SERVICE_CONTACT' and contact_request_id is not null and vacancy_id is null and amount=1.89) or
  (purpose<>'SERVICE_CONTACT' and contact_request_id is null)
);
alter table service_contact_requests add column paid_order_id text unique references yappy_payment_orders(yappy_order_id) on delete restrict;
commit;
