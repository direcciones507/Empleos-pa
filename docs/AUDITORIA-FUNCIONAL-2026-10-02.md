# Auditoría funcional integral — Empleos.pa

- **Fecha:** 2 de octubre de 2026
- **HEAD auditado:** `1bab462d24434a6afef2b1795cdc1e8bb9974e1f` (main, PR #34)
- **Alcance:** frontend (`apps/web`), API (`apps/api`), logs de Railway. Pagos reales excluidos.
- **Método:** auditoría estática del código (inventario por AST, cruce frontend ↔ API, rastreo de handlers) más revisión de logs de producción. No se abrió el sitio en un navegador, no se leyó la base de datos y no se pudo consultar el estado de GitHub Actions.
- **Estado:** reporte aprobado. Las correcciones se agrupan en 3 PR (ver al final).

## 1. Inventario

| Concepto | Resultado |
| --- | --- |
| Páginas/rutas reales | 34 (más 4 componentes compartidos) |
| Elementos interactivos | 201: 97 enlaces, 57 botones, 29 inputs, 7 formularios, 6 textareas, 5 selects |
| Llamadas distintas frontend → API | 55 (81 puntos de llamada) |
| Rutas del backend | 67 |
| Llamadas con ruta y método existentes | 55 de 55 |
| Rutas del backend sin uso desde el web | 12 (P3) |
| Botones muertos | 0 |
| Enlaces a rutas inexistentes | 0 |
| Formularios sin envío | 0 |

Los campos que usan componentes propios (`F`, `A`, `Field`) cuentan como un solo elemento; los campos reales son más.

Flujos revisados rastreando el código: candidato, empresa, vacantes, servicios, cuenta, admin, cambio de perfil y logout.

## 2. Lo que está correcto

- Los campos del perfil de candidato coinciden con el backend, igual que educación y experiencia.
- Admin no tiene ranking ni IA decidiendo contratación: los candidatos se ordenan por fecha y el prompt de IA prohíbe puntajes, rankings y decisiones.
- El acceso a `/admin` funcionó el 1 oct 05:06 (llamadas en 200). El problema de redirect parece resuelto.

## 3. Hallazgos

### P0 — críticos

1. **Activar, renovar y reactivar perfil de candidato fallaban.** El SQL escribía `config.candidateValidityDays` dentro del texto de la consulta (`candidate-routes.ts`, 3 sitios). PostgreSQL lo leía como una tabla `config` inexistente. Logs: `missing FROM-clause entry for table "config"` ×6 el 30 sep. El usuario veía "No se pudo activar el perfil".
2. **Todas las rutas con código de vacante rechazaban los códigos reales.** La base genera `VAC-000004`, pero el API exigía `EMP-VAC-000004` en 11 sitios de 5 archivos. En producción, abrir `VAC-000004` en Admin dio 400. Afectaba: preselección, entrega, cierre, cancelación, análisis IA, vista de entrega de la empresa y ruta de pago.

### P1 — importantes

3. **Reportes con rango y comparación.** Consultaban `payments`, tabla inexistente (la real es `vacancy_payments`). Logs: 500 con `relation "payments" does not exist` el 1 oct. El reporte inicial sí cargaba.

### P2 — secundarios

4. Casi todos los errores del API (unos 90 códigos) se muestran con mensajes genéricos; el frontend traduce muy pocos. Ejemplo: el login dice "Revisa tus datos" para clave mala, cuenta desactivada o demasiados intentos.
5. El autoguardado del perfil dice "No se pudo guardar" mientras se escribe una educación o experiencia que aún no tiene nivel o puesto.
6. Un perfil retirado que intenta guardar ve el mensaje genérico en vez de "reactívalo primero".
7. En la solicitud de vacante solo se valida el paso 1; los errores salen como "Revisa el campo schedule" o genéricos si no se eligió paquete.
8. Vacantes y servicios no bloquean el doble clic (pueden duplicar solicitudes). Servicios tampoco redirige al terminar.
9. El botón de cambiar de perfil no maneja fallos.
10. Renovar, retirar, reactivar y desactivar no bloquean el doble clic.
11. `apps/web/app/admin/page.tsx` filtra los avisos del panel con `startsWith("EMP-VAC-")`, por lo que los enlaces a vacantes del dashboard no aparecen con códigos `VAC-######`. Se detectó al corregir el P0; se resuelve en el PR 2 (es frontend).

### P3 — menores

12. 12 rutas del backend sin uso desde el web.
13. `favicon.ico` responde 404.
14. Al enviar el perfil con éxito solo sale un mensaje, sin redirección.
15. Posibles 500 si el año de graduación o las fechas de experiencia traen formato inválido (no probado).

## 4. Railway

- **API:** 3 problemas (SQL de `config`, 500 de reportes, 400 por código de vacante), todos descritos arriba. Los fallos de arranque del 26 sep ya estaban resueltos.
- **Web:** solo ruido benigno de cada redeploy (SIGTERM de `next start`) y un 404 de `favicon.ico`.
- En la ventana de logs revisada no hubo tráfico de candidatos ni empresas, solo de admin.

## 5. Cobertura automática

- **Existente:** 40 pruebas en 3 archivos del API (`account-location-contacts`, `admin-assistant`, `profiles`), con 41 aserciones sobre el texto del código fuente en lugar de ejecutar rutas o SQL. 0 pruebas del web. El CI corre typecheck, test y build.
- **Por qué el CI estaba en verde con los P0:** nada ejecutaba el SQL contra una base real ni recorría la interfaz.
- **Falta:** SQL contra Postgres real, recorridos de navegador y errores de validación.

## 6. Propuesta de suite de pruebas (PR 3)

- Pruebas del API contra un Postgres de prueba en GitHub Actions (habrían atrapado los tres fallos).
- Playwright con web, API y Postgres levantados. Login con sesión sembrada de prueba, sin credenciales reales.
- Cobertura: navegación pública, registro/login, recuperar clave, perfil de candidato hasta activar, renovar/retirar/reactivar, publicar vacante, solicitar y ofrecer servicio, Admin completo (detalle de vacante y reportes), cambio de perfil, logout, rutas protegidas y vista móvil.

## 7. Plan de correcciones

| PR | Contenido | Alcance |
| --- | --- | --- |
| 1 | P0 (código de vacante, SQL de `config`) y P1 (`vacancy_payments`) | Solo backend |
| 2 | Mensajes de error, validaciones, doble clic, enlace de avisos del dashboard (P2) | Solo frontend |
| 3 | Suite de pruebas: API contra Postgres + Playwright + GitHub Actions | Pruebas y CI |

**Decisión tomada:** el formato oficial del código de vacante es `VAC-######`; se corrige el API y no se modifican los códigos existentes en la base de datos.

**Regla de despliegue:** no avanzar de bloque ni hacer merge con ningún workflow de GitHub en rojo o pendiente; tras el merge, Railway Web y API deben quedar en verde antes de continuar.

## 8. Estado del PR 1

Ver la descripción del PR para archivos y cambios. Verificación local: typecheck, pruebas y build sin errores; además, los tres SQL corregidos y las dos consultas de reportes se ejecutaron contra un PostgreSQL real con las 27 migraciones aplicadas.
