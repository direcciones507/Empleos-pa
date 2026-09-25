# PostgreSQL backup and restore runbook

This runbook defines the operational baseline for Empleos.pa. It does not invent business-data retention periods.

## Backup

1. Read `DATABASE_URL` only from the protected runtime environment.
2. Create a PostgreSQL custom-format backup:
   `pg_dump --format=custom --no-owner --no-acl --dbname="$DATABASE_URL" --file="empleos-pa.backup"`
3. Store the backup in encrypted, access-controlled storage outside the application runtime.
4. Record backup timestamp, environment and PostgreSQL version without recording credentials.
5. Never commit database dumps, connection strings or production secrets to Git.

## Restore validation

Restore into an isolated database, never directly over production:

`createdb empleos_pa_restore_test`

`pg_restore --no-owner --no-acl --clean --if-exists --dbname="postgresql://.../empleos_pa_restore_test" empleos-pa.backup`

Then validate:

- API migrations/schema are compatible.
- `/ready` succeeds against the restored database.
- Core counts for users, candidate profiles, companies, vacancies, deliveries and admin audit records are readable.
- Delivery snapshots and audit history remain intact.

Destroy the isolated restore database after validation.

## Production rule

A backup is not considered operationally valid until a restore has been tested successfully. Backup frequency, retention duration and deletion schedules must be set by the final privacy/legal and production policy before launch.
