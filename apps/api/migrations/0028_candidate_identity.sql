alter table candidate_profiles
  add column if not exists identity_document_type text,
  add column if not exists identity_document_number text;

alter table service_provider_profiles
  add column if not exists identity_document_type text,
  add column if not exists identity_document_number text;
