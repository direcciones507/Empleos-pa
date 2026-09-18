# CHECKLIST MAESTRO — MVP EMPLEOS.PA

Regla: este checklist gobierna la construcción. No cerrar un punto por apariencia visual; debe existir implementación o decisión documentada verificable.

## Fase 0 — Fundamentos
- [x] Repositorio privado independiente.
- [x] README inicial.
- [x] Empleos activo.
- [x] Servicios Puntuales reservado/desactivado.
- [x] Documento Maestro v0.1.
- [x] Formulario Candidato v1 estructurado.
- [x] Reglas Maestras.
- [x] Alcance del servicio/responsabilidades v1 (borrador para revisión legal).

## Fase 1 — Diseño funcional
- [x] Formulario Candidato v1 estructurado para implementación.
- [ ] Definir vigencia inicial del perfil.
- [x] Formulario Vacante v1.
- [ ] Definir paquete/precio inicial para empresas.
- [ ] Definir cantidad de perfiles por paquete.
- [x] Definir principio de autorización/interés antes de compartir contacto.
- [ ] Definir formato final de reporte.
- [ ] Definir política de retención/eliminación.
- [x] Panel administrativo v1.
- [x] UX simple/mobile-first v1.
- [x] Portada pública v1.
- [x] Web como canal principal; WhatsApp solo asistencia.
- [x] PostgreSQL como fuente de verdad; XLSX solo exportación.

## Fase 2 — Base técnica
- [x] Stack web inicial: Next.js 15 + React 19 + TypeScript + pnpm.
- [x] Esqueleto app web móvil-first.
- [x] API/backend.
- [x] PostgreSQL y migraciones.
- [ ] Ambientes y secretos.
- [x] Autenticación real (correo/contraseña + sesiones; pendiente prueba integrada).
- [x] Recuperación de contraseña a nivel API/tokens; pendiente canal de correo y prueba integrada.
- [ ] Google OAuth real e independiente de LeveIA.
- [x] Roles CANDIDATO / EMPRESA / ADMIN con enforcement server-side; pendiente prueba integrada.
- [x] Base funcional del panel ADMIN a nivel API; pendiente interfaz y prueba integrada.
- [ ] CI mínimo: typecheck/build.
- [ ] Configuración de despliegue.

## Fase 3 — Candidatos
- [ ] Registro/login candidato.
- [ ] Formulario wizard responsive y validaciones.
- [ ] Guardado automático de borrador.
- [ ] Código EMP-###### secuencial seguro.
- [ ] Persistencia y confirmación.
- [ ] Vista Mi perfil.
- [ ] Edición/actualización.
- [ ] Caducidad, renovación y retiro.
- [ ] Estados BORRADOR / ACTIVO / VENCIDO / RETIRADO.

## Fase 4 — Empresas y vacantes
- [ ] Registro/login empresa.
- [ ] Datos persistentes de empresa/contacto.
- [ ] Formulario wizard de vacante.
- [ ] Código VAC-######.
- [ ] Estados de vacante.
- [ ] Pago/comprobante.
- [ ] Estados de pago.
- [ ] Notificación administrativa.
- [ ] Aprobación/rechazo manual.
- [ ] Historial de vacantes de la empresa.

## Fase 5 — Preselección
- [ ] Filtros estructurados por ubicación, puesto/área, experiencia, educación, habilidades y disponibilidad.
- [ ] Excluir perfiles vencidos/inactivos.
- [ ] Evaluación descriptiva específica por vacante.
- [ ] Sin ranking general.
- [ ] Trazabilidad de criterios.
- [ ] IA solo después del filtrado y cuando aporte valor.

## Fase 6 — Consentimiento y entrega
- [ ] Confirmar interés del candidato.
- [ ] Registrar autorización aplicable.
- [ ] Excluir quien rechace/no autorice.
- [ ] Preparar reporte descriptivo.
- [ ] Entregar cantidad contratada.
- [ ] Registrar entrega y fecha.
- [ ] Empresa continúa entrevista/verificación/contratación directamente.

## Fase 7 — Panel administrativo y métricas
- [ ] Dashboard candidatos: total/activos/nuevos/vencimiento/vencidos.
- [ ] Dashboard empresas y vacantes.
- [ ] Pagos pendientes/en revisión/aprobados/rechazados.
- [ ] Gestión de estados.
- [ ] Buscador y filtros.
- [ ] Entregas y perfiles entregados.
- [ ] Ingresos registrados.
- [ ] Métricas día/semana/mes.
- [ ] Exportación XLSX administrativa.
- [ ] Sin IA para conteos, filtros o métricas.

## Fase 8 — Automatización
- [ ] Entrada Busco empleo / Busco personal conectada a flujo real.
- [ ] Mensajes de estado y vencimiento.
- [ ] Notificaciones administrativas.
- [ ] Renovación de perfil sin reingreso completo.
- [ ] IA limitada a tareas con valor real.

## Fase 9 — Legal, seguridad y privacidad
- [ ] Términos y Condiciones finales con revisión legal.
- [ ] Política de Privacidad final con revisión legal.
- [ ] Consentimientos enlazados y versionados.
- [ ] Minimización y separación práctica de datos de contacto/perfil laboral.
- [ ] RBAC probado.
- [ ] Protección de secretos.
- [ ] Backups y restauración.
- [ ] Retención/eliminación implementada.
- [ ] Registro/auditoría de acciones administrativas críticas.

## Fase 10 — Producción
- [ ] Observabilidad y métricas técnicas.
- [ ] Pruebas móvil/tablet/laptop/desktop.
- [ ] Prueba física candidato extremo a extremo.
- [ ] Prueba física empresa extremo a extremo.
- [ ] Prueba física pago→matching→autorización→entrega.
- [ ] Accesibilidad y textos/errores.
- [ ] Rendimiento básico.
- [ ] Dominio definitivo.
- [ ] Despliegue.
- [ ] Google OAuth configurado para dominio de producción.
- [ ] Checklist final sin bloqueadores críticos.
