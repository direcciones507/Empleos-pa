# Empleos.pa — corrección prelanzamiento

Base comprobada: `main` = `3abd1e123e6a2275347be8f87d1797bdb501e978`.
Rama: `fix/prelaunch-critical-20261011`. Se revisaron los PR abiertos #103, #94, #92, #78 y #12; ninguno contiene estas correcciones. La comprobación usa los hallazgos descritos en la solicitud y el código real; no se dispuso de un informe externo adicional.

## Hallazgos y evidencia

| Hallazgo | Estado anterior | Corrección realizada | Prueba ejecutada | Resultado | Riesgo pendiente |
|---|---|---|---|---|---|
| K1 respaldos | Volumen persistente confirmado; backups no verificables con el conector | Procedimiento de recuperación actualizado; ensayo local aislado | Dump/restore PostgreSQL 16.15, diez tablas | Ensayo local PASS; K1 producción abierto | Listar/programar backups reales, costo/retención y restaurar copia real en aislamiento |
| K2 pago persistente | Pago y entrega compartían transacción; error de entrega borraba EXECUTED | Commit del hecho criptográficamente confirmado antes de la transacción de entrega; savepoint local y nota de revisión; recuperación por endpoint ADMIN existente | Trigger SQL provoca fallo de entrega; IPN firmado, IPN inválido, reintentos concurrentes, recuperación ADMIN y auditoría | PASS; un pago, entrega y aviso; cero avisos durante fallo | Validación con Yappy real; falla total de DB requiere reintento del proveedor |
| A1 límites por IP | req.ip representaba el proxy sin trustProxy | Identidad X-Real-IP validada únicamente en runtime Railway y host público conocido; no trustProxy global ni XFF arbitrario | Dos IP distintas, cabecera múltiple/inválida, host interno, entorno no confiable | PASS local | Verificar físicamente ingreso público; servicios privados deben permanecer confiables, sin rutas directas no confiables |
| A2 correo/recuperación | Envío ausente o fallido devolvía ok | Mismo webhook, 503 explícito y timeout; no logs con enlace/token | Webhook ausente/fallido/satisfactorio; restablecimiento, token de un uso, sesión revocada y login nuevo | PASS simulado | EMAIL_WEBHOOK_URL, EMAIL_WEBHOOK_SECRET y EMAIL_FROM ausentes en Railway; falta correo real |
| A3 flujo comercial | Selección por cantidad, precio en servidor, autorización y bloqueo de modo FREE ya existían | Preservados, sin cambiar precios/proveedor/modo de producción | Suites launch, selection y Yappy: importe servidor, acceso previo negado, modos deshabilitados y pago duplicado | PASS | Valores efectivos de REQUEST_PAYMENT_MODE/YAPPY_PAYMENTS_ENABLED no visibles por OAuth; confirmar antes de cobros |
| A4/K3 candidato retirado | Snapshot no verificaba nuevamente perfil/cuenta al entregar | Bloqueo y comprobación de perfil activo, vigencia y cuenta activa antes de reservar orden y antes de entregar; protección del envío ADMIN | Retirado, vencido y cuenta deshabilitada antes/después de orden | PASS; sin nueva orden para selección inelegible, sin datos/avisos después de retirada | Si se retira después de una orden externa, no se puede deshacer el pago: requiere resolución/reembolso autorizado; no se sustituye candidato ni se cobra otra vez |
| A5 CI/despliegue | Sin lockfile; CI ya llamaba las seis suites; checkSuites=false en API y web | Lockfile pnpm 9; frozen install CI; runner existente ampliado; archivos de configuración de despliegue reproducible preparados | Instalación frozen, typecheck, 102 unitarias, seis contratos, seis suites más regresiones, build API/web | PASS local | Actions del PR y activar espera de CI en Railway; los TOML no están aplicados a producción |
| A6 matching | strpos permitía SAP dentro de WhatsApp y Java dentro de JavaScript | Comparación de frase/token literal; conserva evidencia por ocupación, habilidades y experiencia, sin ranking | PostgreSQL: SAP/WhatsApp, Java/JavaScript, C/C#/C++, positivos y suites históricas | PASS | Ubicación/disponibilidad y requisitos continúan descriptivos según reglas existentes; no se cambiaron a filtros nuevos |
| A7 Yappy extremo a extremo | Requería validación real | Ensayo aislado selección→orden simulada→IPN firmado→entrega→aviso | Suites Yappy y selección, sin red de pago real | PASS simulado | Prueba real expresamente autorizada, credenciales y observación del IPN real |
| M1 CSRF | CORS solo no impedía efectos laterales | Origen permitido en operaciones mutantes, origen/referer para cookie y bloqueo cross-site; OAuth ligado al navegador | Origen ajeno/null, cookie sin origen, origen/referer válido, callback sin cookie | PASS local | Prueba física móvil y Google después de despliegue autorizado |
| M2 vinculación Google | Vinculaba por igualdad de email sin autenticar al dueño local | Exige sesión de esa cuenta para ligar contraseña con Google; bloqueo de fila; Google ya vinculado conserva login | Provider simulado y DB real: bloqueo sin sesión, enlace con dueño, login posterior Google | PASS | Correo/password real y Google físico; cuenta password desactivada debe usar su recuperación existente |

## Validaciones

- PostgreSQL 16.15 aislado en loopback: runner existente completo, migraciones, persistencia, RBAC, sesión, retiro/renovación y regresiones.
- Pruebas unitarias: API 75 + web 27 = 102; contratos 6.
- Typecheck API/web, build API/web e instalación con lockfile frozen.
- Ensayo dump/restore local: datos exclusivamente ficticios. El entorno local solo permite UID 0; un ajuste de identificación de usuario, fuera del repositorio, permitió iniciar el servidor de prueba. CI usa el servicio PostgreSQL 16 estándar sin ese ajuste.
- No migraciones nuevas, no pagos reales, no despliegue ni cambios de variables/productos en producción.
- La notificación transaccional queda visible únicamente después del commit de la entrega. No se agregó un proveedor de correo ni un mecanismo de notificaciones paralelo.

## Configuración pendiente de aprobación de despliegue

Railway `empleos-pa`, production: API, web y Postgres en SUCCESS, sin pendingWork en la lectura inicial. API/web usan main y tienen source.checkSuites=false. El estado SUCCESS existente no representa estas correcciones.

Tras aprobar integración/despliegue y cerrar los bloqueos:

1. Activar **Wait for CI** en API y web, exigir el job CI del PR y comprobar protección de main. El conector no permite editar source.checkSuites; no se modificó ese control ni se redeplegó.
2. Para API, asociar `/railway.api.toml` con raíz `/`. Para web, asociar `/railway.web.toml` con raíz `/` para acceder al lockfile del workspace. Son cambios mínimos preparados, pendientes de aplicar; los comandos anteriores de Railway siguen activos.
3. Configurar en Railway el adaptador de correo existente y su remitente autorizado mediante secretos protegidos. No pegar secretos en conversaciones, PRs o archivos de Git.
4. Confirmar modo comercial efectivo y mantener la autorización expresa para cobros reales. No se habilitó FREE ni se modificaron precios.
5. Comprobar backups reales y la restauración de una copia de producción en aislamiento; aprobar cualquier costo adicional antes de crear recursos.
6. Desplegar solo después de CI verde y aprobación; esperar SUCCESS API/web y pendingWork=0, luego pruebas físicas de Google, recuperación, origen/IP y pago controlado aprobado.

## Referencia del contrato de proxy

Railway documenta X-Real-IP en https://docs.railway.com/networking/public-networking/specs-and-limits. Confirmación de personal de Railway sobre reemplazo de cabeceras en el ingreso público y limitación de la red privada: https://station.railway.com/questions/need-authoritative-client-ip-proxy-tru-090eac86. No se usa un CIDR supuesto ni trustProxy=true.

## Decisión de lanzamiento

**NO LISTA para lanzamiento con cobros reales.** Las correcciones y pruebas locales no cierran respaldo real, correo real, barrera de CI en Railway ni prueba real de Yappy. Un pago confirmado con un candidato que se retiró se conserva para revisión; resolver/reembolsar esa operación requiere intervención administrativa y autorización correspondientes. No se implementó cobro adicional, sustitución automática ni reembolso nuevo.
