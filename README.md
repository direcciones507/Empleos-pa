# Empleos.pa

Plataforma digital para registro, búsqueda, preselección y conexión de candidatos con empresas en Panamá.

## Estado
**MVP — Construcción funcional activa**

Fecha de inicio: 17-sep-2026.

## Alcance activo del MVP
- Registro gratuito de candidatos mediante formulario estructurado.
- Perfil laboral sin CV/PDF obligatorio.
- Solicitud de vacantes por empresas.
- Pago y aprobación antes de entregar candidatos.
- Filtrado por requisitos objetivos de cada vacante.
- Evaluación descriptiva de correspondencia, sin ranking general de personas.
- Entrega de perfiles ACTIVOS compatibles conforme al consentimiento aceptado; aviso informativo posterior al candidato.
- Entrega de perfiles a la empresa para que ésta entreviste y decida.
- Caducidad/renovación de perfiles para mantener la base vigente.
- Interfaz conversacional/automatizada de entrada con dos rutas: **Busco empleo** y **Necesito contratar personal**.

## Fuera del MVP
- Servicios puntuales: **RESERVADO / DESACTIVADO**. La arquitectura podrá contemplarlo, pero no tendrá formulario, pagos ni operación pública hasta definir verificación, responsabilidad y reglas.
- Almacenamiento de récord policivo, cédula, diplomas, certificados u otros documentos de contratación.
- Decidir quién debe ser contratado.
- Ranking general de candidatos.

## Principio operativo
Empleos.pa hace la conexión y preselección. La empresa realiza entrevistas, solicita documentos adicionales directamente al candidato y toma la decisión final de contratación.

## Próximos documentos
1. Documento Maestro del producto.
2. Formulario Candidato v1.
3. Formulario Vacante v1.
4. Modelo de datos y estados.
5. Flujo de pago/aprobación.
6. Matching, consentimiento y entrega.
7. Checklist Maestro del MVP.

## Despliegue MVP

Contrato reproducible, independiente del proveedor:

1. Crear PostgreSQL y configurar `DATABASE_URL`.
2. Instalar dependencias con `pnpm install --frozen-lockfile`.
3. Aplicar esquema con `pnpm --filter @empleos-pa/api migrate`.
4. Compilar API con `pnpm --filter @empleos-pa/api build` e iniciar con `pnpm --filter @empleos-pa/api start`.
5. Compilar Web con `pnpm --filter @empleos-pa/web build` e iniciar con `pnpm --filter @empleos-pa/web start`.
6. Configurar `WEB_URL` y `NEXT_PUBLIC_API_URL` con URLs HTTPS reales.
7. Mantener `REQUEST_PAYMENT_MODE=FREE` durante la promoción de lanzamiento; cambiar explícitamente a `MANUAL` cuando corresponda.
8. Configurar Google OAuth y el adaptador de correo antes de habilitarlos físicamente.

Variables y secretos se documentan en `.env.example`; nunca deben versionarse valores reales.

Antes de producción siguen siendo obligatorios CI/build, dominio, credenciales externas, automatización durable de vencimientos, seguridad/observabilidad y pruebas físicas integrales.
