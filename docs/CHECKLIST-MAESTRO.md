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
- [x] Vigencia inicial configurable del perfil: 45 días por defecto; renovación simple en los últimos 7 días.
- [x] Formulario Vacante v1.
- [x] Precios V1: VACANTE 5/$8.99, 10/$10.99, 15/$12.99, disponibles/$25; SERVICIOS Y TRABAJOS EVENTUALES $3.99 por solicitud.
- [x] Cantidad por paquete definida; opción $25 entrega todos los perfiles activos y compatibles disponibles, sin promesa de cantidad mínima.
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
- [x] Caducidad operativa automática al consultar perfil; renovación implementada. Pendiente automatización programada global y política de eliminación definitiva.
- [x] Estados BORRADOR / ACTIVO / VENCIDO / RETIRADO definidos; VENCIDO se aplica automáticamente al detectar fecha superada.

## Fase 4 — Empresas y vacantes
- [x] Registro/login empresa implementado; pendiente prueba integrada.
- [x] Datos persistentes de empresa/contacto implementados.
- [x] Formulario wizard para VACANTE y EVENTUAL implementado. EVENTUAL se presenta al usuario como Servicios y trabajos eventuales, con tarifa definida de $3.99.
- [x] Código VAC-###### implementado.
- [x] Estados de vacante implementados.
- [x] Modo comercial configurable: FREE para promoción de lanzamiento y MANUAL para cobro con revisión ADMIN.
- [x] Reporte/referencia de pago implementado para modo MANUAL; verificación manual ADMIN.
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
- [x] Consentimiento operativo definido: un perfil ACTIVO puede participar en búsquedas compatibles sin confirmación individual previa.
- [x] Entrega inmediata de perfiles activos seleccionados implementada; la respuesta individual previa no bloquea la entrega.
- [x] Aviso informativo posterior a la entrega implementado para el candidato.
- [ ] Preparar reporte descriptivo.
- [x] Límite de candidatos del paquete comprado aplicado al seleccionar y antes de preparar la entrega; paquete DISPONIBLES no fija límite numérico.
- [x] Entrega, fecha y snapshot histórico implementados.
- [x] Empresa recibe los perfiles activos entregados y continúa contacto/verificación directamente.

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
- [x] Aviso de renovación creado cuando quedan 7 días al consultar perfil; aviso posterior a entrega implementado en cuenta y correo. Pendiente ejecución programada global/correo de vencimiento.
- [ ] Notificaciones administrativas; notificación al candidato posterior a entrega ya implementada.
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

- Avance funcional estimado: **70%**.
- Núcleo ya construido: arquitectura web/API/PostgreSQL, autenticación y roles, candidato, empresa, VACANTE/EVENTUAL, pago manual, preselección estructurada, entrega y métricas principales.
- Pendiente principal: reporte descriptivo final, automatización de vencimiento, correo de recuperación y configuración real del proveedor de notificaciones, trazabilidad, administración/exportación final, seguridad/observabilidad, CI/despliegue, dominio y pruebas físicas integrales.
- Desde el corte anterior también quedaron implementados el modo FREE de lanzamiento, la tarifa EVENTUAL $3.99 de punta a punta, protección web por rol, continuidad segura de retorno login/registro y alta inicial de datos de empresa.
- Las pruebas físicas completas permanecen deliberadamente pendientes hasta cerrar construcción, según decisión operativa actual.
