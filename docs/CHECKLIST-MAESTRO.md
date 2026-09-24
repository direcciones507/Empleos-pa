# CHECKLIST MAESTRO — MVP EMPLEOS.PA

Regla: este checklist gobierna la construcción. No cerrar un punto por apariencia visual; debe existir implementación o decisión documentada verificable.

## Fase 0 — Fundamentos
- [x] Repositorio independiente (público temporalmente durante construcción; volver a privado antes de producción).
- [x] README inicial.
- [x] Empleos activo.
- [x] Trabajo eventual integrado al mismo flujo de contratación; no plataforma separada.
- [x] Documento Maestro v0.1.
- [x] Formulario Candidato v1 estructurado.
- [x] Reglas Maestras.
- [x] Alcance del servicio/responsabilidades v1 (borrador para revisión legal).

## Fase 1 — Diseño funcional
- [x] Formulario Candidato v1 estructurado para implementación.
- [x] Vigencia inicial configurable del perfil: 90 días por defecto.
- [x] Formulario Vacante v1.
- [ ] Definir paquete/precio inicial para empresas.
- [ ] Definir cantidad de perfiles por paquete.
- [x] Definir consentimiento operativo: perfil ACTIVO participa en búsquedas compatibles y puede entregarse sin confirmación individual previa; aviso posterior al candidato.
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
- [x] Google OAuth implementado de forma independiente; pendiente credenciales Google, dominio y prueba integrada.
- [x] Roles CANDIDATO / EMPRESA / ADMIN con enforcement server-side; pendiente prueba integrada.
- [x] Base funcional del panel ADMIN a nivel API; pendiente interfaz y prueba integrada.
- [ ] CI mínimo: typecheck/build.
- [ ] Configuración de despliegue.

## Fase 3 — Candidatos
- [x] Registro/login candidato implementado; pendiente prueba integrada.
- [x] Formulario wizard candidato de 6 pasos y validaciones implementado; pendiente prueba física.
- [ ] Guardado automático de borrador.
- [x] Código EMP-###### secuencial implementado.
- [x] Persistencia y confirmación de perfil implementadas.
- [x] Vista Mi perfil/portal candidato implementada.
- [x] Edición/actualización de perfil implementada.
- [ ] Caducidad automática y retiro pendientes; renovación implementada.
- [x] Estados BORRADOR / ACTIVO / VENCIDO / RETIRADO definidos; automatización de vencimiento pendiente.

## Fase 4 — Empresas y vacantes
- [x] Registro/login empresa implementado; pendiente prueba integrada.
- [x] Datos persistentes de empresa/contacto implementados.
- [x] Formulario wizard para VACANTE y EVENTUAL implementado.
- [x] Código VAC-###### implementado.
- [x] Estados de vacante implementados.
- [x] Reporte/referencia de pago implementado; verificación manual ADMIN.
- [x] Estados de pago implementados.
- [ ] Notificación administrativa.
- [x] Aprobación/rechazo manual implementado.
- [x] Historial de solicitudes de la empresa implementado.

## Fase 5 — Preselección
- [x] Matching estructurado implementado: puesto, ubicación, habilidades, educación, experiencia y disponibilidad.
- [x] Matching excluye perfiles vencidos/inactivos.
- [x] Coincidencias descriptivas por solicitud implementadas.
- [x] Sin ranking general ni puntuación de candidatos.
- [ ] Trazabilidad de criterios.
- [ ] IA solo después del filtrado y cuando aporte valor.

## Fase 6 — Consentimiento y entrega
- [x] Confirmación de interés del candidato implementada.
- [x] Autorización de contacto registrada con la respuesta.
- [x] Entrega excluye quien rechace/no autorice.
- [ ] Preparar reporte descriptivo.
- [ ] Entregar cantidad contratada.
- [x] Entrega, fecha y snapshot histórico implementados.
- [x] Empresa recibe candidatos autorizados y continúa contacto/verificación directamente.

## Fase 7 — Panel administrativo y métricas
- [x] Métricas API de candidatos total/estado/nuevos/vencimiento implementadas; revisar interfaz.
- [x] Métricas API de empresas y vacantes implementadas; revisar interfaz.
- [x] Gestión y métricas de pagos implementadas.
- [ ] Gestión de estados.
- [x] Búsqueda/filtros administrativos básicos implementados.
- [x] Entregas y perfiles entregados implementados.
- [x] Ingresos aprobados calculados desde PostgreSQL.
- [ ] Métricas día/semana/mes.
- [ ] Exportación XLSX administrativa.
- [x] Conteos, filtros y métricas sin IA.

## Fase 8 — Automatización
- [x] Entrada Busco empleo / Busco personal conectada a registro; portada distingue VACANTE y EVENTUAL.
- [ ] Mensajes de estado y vencimiento.
- [ ] Notificaciones administrativas.
- [x] Renovación de perfil sin reingreso completo implementada.
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
- [ ] Prueba física pago→matching→entrega→aviso.
- [ ] Accesibilidad y textos/errores.
- [ ] Rendimiento básico.
- [ ] Dominio definitivo.
- [ ] Despliegue.
- [ ] Google OAuth configurado para dominio de producción.
- [ ] Checklist final sin bloqueadores críticos.

## Corte de avance — 24-sep-2026

Criterio: porcentaje de construcción funcional del MVP, no porcentaje de pruebas ni preparación legal para producción.

- Avance funcional estimado: **64%**.
- Núcleo ya construido: arquitectura web/API/PostgreSQL, autenticación y roles, candidato, empresa, VACANTE/EVENTUAL, pago manual, preselección estructurada, entrega y métricas principales.
- Pendiente principal: reporte descriptivo final, automatización de vencimiento, correo de recuperación/notificaciones, páginas legales enlazadas, protección/UX final, CI/despliegue, dominio y pruebas físicas integrales.
- Las pruebas físicas completas permanecen deliberadamente pendientes hasta cerrar construcción, según decisión operativa actual.
