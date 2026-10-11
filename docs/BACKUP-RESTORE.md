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

## Verificación del 11 de octubre de 2026

Se probó `pg_dump --format=custom --no-owner --no-acl` y `pg_restore --no-owner --no-acl --exit-on-error` con PostgreSQL 16.15 y datos ficticios de integración, en dos bases locales aisladas. Coincidieron los conteos de diez tablas: users, candidate_profiles, companies, vacancies, vacancy_payments, yappy_payment_orders, vacancy_deliveries, vacancy_delivery_candidates, candidate_notifications y admin_audit_log. La base restaurada de prueba se eliminó después.

Esto **no verifica los respaldos de Railway ni la recuperación de producción**. El conector disponible no expone listado/programación/restauración de backups y entrega solamente nombres de variables, sin acceso a DATABASE_URL. No se crearon recursos facturables ni se alteró Postgres de Railway.

Para cerrar K1 antes de cobrar:

1. En el proyecto `empleos-pa`, entorno production, servicio Postgres, comprobar los respaldos disponibles y registrar fecha, estado y retención; un volumen persistente no equivale a respaldo.
2. Confirmar costo antes de programar respaldos o crear una base de recuperación facturable. Si existe costo adicional, solicitar autorización.
3. Crear un respaldo reciente mediante el mecanismo protegido existente. Mantener conexión y archivo fuera de Git, mensajes y logs públicos.
4. Restaurar una copia **en una base aislada**, con hostname/nombre de destino comprobados. No usar producción como destino ni ejecutar `--clean` sobre ella.
5. Comparar esquema, registros y snapshots, comprobar `/ready` y consultas de perfiles/vacantes/entregas con credenciales de prueba. Registrar evidencia sin datos personales.
6. Antes de una recuperación real, suspender escrituras mediante el proceso de despliegue autorizado, elegir punto de recuperación y validar en aislamiento. El cambio de conexión de producción requiere aprobación expresa.

La frecuencia y retención de respaldos siguen pendientes de definir y verificar; no se inventa un RPO/RTO ni se declara restaurable producción a partir del ensayo local.
