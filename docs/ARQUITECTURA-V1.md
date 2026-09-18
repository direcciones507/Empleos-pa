# ARQUITECTURA V1 — EMPLEOS.PA

Estado: EN IMPLEMENTACIÓN

## Componentes
- apps/web: Next.js 15 + React 19, interfaz pública y portales.
- apps/api: Fastify + TypeScript, API independiente.
- PostgreSQL: fuente única de verdad operacional.

## Límites
Empleos.pa no comparte base de datos, OAuth, secretos ni despliegue con LeveIA. Se reutilizan patrones propios, no dependencias de producción entre productos.

## Roles
CANDIDATO, EMPRESA y ADMIN. El rol se valida en servidor. La UI nunca será la autoridad de permisos.

## Datos
La migración inicial separa cuenta, perfil de candidato y empresa. Vacantes, experiencia, estudios, habilidades, sesiones, consentimientos y auditoría se agregan mediante migraciones posteriores sin convertir el perfil en un documento monolítico.

## Salud
GET /health confirma proceso API. GET /ready comprueba PostgreSQL y devuelve 503 si la base no está disponible.

## Seguridad base
- secretos solo por variables de entorno;
- ninguna credencial real en Git;
- contraseñas se almacenarán únicamente como hash fuerte cuando se implemente autenticación;
- Google OAuth será independiente;
- autorización por rol y ownership en API;
- datos mínimos necesarios.

## Próximo incremento
Sesiones/autenticación, recuperación de contraseña, Google OAuth, RBAC y base ADMIN.
