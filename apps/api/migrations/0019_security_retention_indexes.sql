begin;
create index if not exists auth_sessions_expiry_idx on auth_sessions(expires_at);
create index if not exists password_reset_tokens_expiry_idx on password_reset_tokens(expires_at);
create index if not exists candidate_notifications_created_idx on candidate_notifications(created_at);
commit;
