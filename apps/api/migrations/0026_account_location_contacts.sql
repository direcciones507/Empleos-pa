alter table candidate_profiles
  add column if not exists contact_email text,
  add column if not exists mobile_whatsapp text,
  add column if not exists landline_phone text,
  add column if not exists address_reference text;

update candidate_profiles cp
set mobile_whatsapp=coalesce(cp.mobile_whatsapp,nullif(trim(cp.phone),'')),
    contact_email=coalesce(cp.contact_email,u.email)
from users u
where u.user_id=cp.user_id
  and (cp.mobile_whatsapp is null or cp.contact_email is null);

alter table companies
  add column if not exists mobile_whatsapp text,
  add column if not exists landline_phone text,
  add column if not exists corregimiento text;

update companies
set mobile_whatsapp=coalesce(mobile_whatsapp,nullif(trim(phone),''))
where mobile_whatsapp is null;

alter table vacancies
  add column if not exists province text,
  add column if not exists district text,
  add column if not exists corregimiento text;

