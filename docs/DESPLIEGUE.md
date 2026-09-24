# DESPLIEGUE — EMPLEOS.PA

Estado: preparación técnica. Las pruebas integradas y el despliegue real permanecen pendientes.

## Servicios
Empleos.pa requiere tres piezas:
1. Web Next.js: `apps/web`.
2. API Fastify: `apps/api`.
3. PostgreSQL.

## Web
- Directorio: `apps/web`
- Build: `pnpm build`
- Inicio: `pnpm start`
- Variable pública: `NEXT_PUBLIC_API_URL` apuntando a la URL HTTPS de la API.

## API
- Directorio: `apps/api`
- Build: `pnpm build`
- Inicio: `pnpm start`
- `PORT` es suministrado por el entorno de hosting.
- `HOST=0.0.0.0`
- `DATABASE_URL`: PostgreSQL.
- `WEB_URL`: origen HTTPS exacto de la web para CORS.
- `CANDIDATE_VALIDITY_DAYS=45`.
- `REQUEST_PAYMENT_MODE=FREE` durante la promoción de lanzamiento; cambiar a `MANUAL` para volver a exigir reporte y aprobación de pago.
- Variables OAuth/correo según `.env.example`.

## Base de datos
Aplicar las migraciones de `apps/api/migrations` en orden numérico antes de abrir tráfico. No ejecutar migraciones parcialmente.

## Apertura inicial
Durante la promoción de lanzamiento, `REQUEST_PAYMENT_MODE=FREE` permite que una solicitud nueva pase directamente a `APROBADA` sin reportar pago. Los precios regulares permanecen registrados. Al finalizar la promoción, `REQUEST_PAYMENT_MODE=MANUAL` restaura el flujo de reporte y revisión manual sin cambiar el formulario ni los precios.

## Antes de producción
- Configurar secretos reales fuera del repositorio.
- Ejecutar migraciones.
- Configurar URL web/API y CORS.
- Configurar Google OAuth cuando corresponda.
- Ejecutar build/typecheck y pruebas integradas.
- Verificar móvil, tablet, laptop y desktop.
- Verificar candidato → empresa → pago → preselección → entrega → aviso.
- Mantener la pasarela automática como mejora posterior; no bloquear la apertura por ella.
