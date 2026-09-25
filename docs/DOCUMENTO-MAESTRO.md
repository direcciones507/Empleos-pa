# DOCUMENTO MAESTRO — EMPLEOS.PA

Versión 0.1 | Inicio 17-sep-2026 | ESTRUCTURACIÓN ACTIVA

## Propósito
Empleos.pa conecta candidatos que buscan empleo con empresas que necesitan contratar en Panamá. El candidato se registra gratis. La empresa solicita una búsqueda/preselección concreta y recibe perfiles activos pertinentes conforme al consentimiento y condiciones aceptadas al mantener el perfil activo. Durante la promoción de lanzamiento las solicitudes pueden avanzar sin pago; fuera de promociones se aplica la tarifa correspondiente.

## Principios
- Móvil primero.
- Registro corto y estructurado; CV/PDF no obligatorio.
- IA solo donde agrega valor, preferiblemente asociada a una solicitud pagada.
- Datos mínimos necesarios.
- No almacenar documentos de contratación en el MVP.
- No decidir quién debe ser contratado ni crear ranking general de personas.
- Evaluar correspondencia con requisitos concretos de una vacante.
- Mantener perfiles vigentes mediante caducidad y renovación.
- Empresa y candidato se comunican directamente después de la entrega; el candidato recibe un aviso informativo de que su perfil participó en una búsqueda.
- La empresa puede solicitar una VACANTE regular o un TRABAJO EVENTUAL; ambos usan el mismo flujo de búsqueda, entrega y aviso.

## Usuarios
Candidato: busca empleo, se registra gratuitamente y mantiene un perfil laboral activo.
Empresa: solicita candidatos para una vacante o servicio/trabajo eventual; el pago puede quedar exonerado durante una promoción de lanzamiento.
Administrador: verifica pagos, supervisa resultados y autoriza el avance operativo.

## Entrada
Solo dos rutas activas: **Busco empleo** y **Necesito contratar personal**. La conversación debe ser breve; los formularios capturan los datos.

## Flujo candidato
Entrada → Busco empleo → Formulario Candidato → validación → código EMP-000001 → confirmación + vigencia → base activa.

La vigencia operativa inicial es de 45 días. Al quedar 7 días se ofrece renovación con un toque; al renovar obtiene otros 45 días sin rehacer el perfil. Si no renueva, pasa automáticamente a VENCIDO y deja de participar en búsquedas. VENCIDO no implica borrado inmediato: la eliminación definitiva se regirá por la política de retención. La política final de retención/eliminación se definirá antes de producción.

## Flujo empresa
Entrada → Necesito contratar personal → elegir VACANTE o EVENTUAL → Formulario de solicitud → solicitud → si aplica, pago y revisión → APROBADA → búsqueda/preselección → reporte → entrega inmediata de perfiles activos compatibles → aviso informativo al candidato. En modo de lanzamiento FREE, la solicitud pasa directamente a APROBADA sin reporte de pago.

## Modelo comercial V1
- Vacante, 5 perfiles: $8.99.
- Vacante, 10 perfiles: $10.99.
- Vacante, 15 perfiles: $12.99.
- Vacante, perfiles disponibles: $25 por todos los perfiles activos y compatibles encontrados al momento de la búsqueda; no es ilimitado ni garantiza una cantidad mínima.
- Servicios y trabajos eventuales: $3.99 por solicitud.
- Promoción de lanzamiento: las solicitudes empresariales pueden avanzar sin pago mientras esté activo el modo FREE; las tarifas regulares se conservan.

## Matching
Primera capa sin IA: ubicación, puesto/área, experiencia, educación, habilidades y disponibilidad.
Segunda capa: evaluación descriptiva contra los requisitos de ESA vacante. Puede señalar coincidencias y puntos por validar en entrevista. No produce ranking general.

## Entrega
Puede incluir código, ubicación relevante, formación, experiencia, habilidades declaradas, disponibilidad, perfil laboral, correspondencia con requisitos, aspectos por validar y datos de contacto conforme al consentimiento y condiciones aceptadas por el candidato al mantener su perfil ACTIVO. La empresa entrevista, solicita documentos y decide.

## Datos que NO almacenamos en MVP
No se solicitarán como archivo récord policivo, cédula escaneada, diplomas, certificados, cartas de trabajo ni documentación equivalente.

## Trabajo eventual
**ACTIVO dentro del mismo flujo de contratación.** Está destinado a necesidades puntuales o temporales, por ejemplo plomería, electricidad, reparación, mantenimiento u otros oficios. No constituye un marketplace separado. La solicitud sigue registro → pago si aplica → aprobación → búsqueda/preselección → entrega de candidatos activos → aviso informativo → cierre. Su tarifa V1 es $3.99 por solicitud.

## Estados mínimos
Candidato: BORRADOR / ACTIVO / VENCIDO / RETIRADO.
Vacante/solicitud: RECIBIDA / PENDIENTE_PAGO / PAGO_EN_REVISION / APROBADA / EN_BUSQUEDA / ENTREGADA / CERRADA / CANCELADA. EN_CONFIRMACION queda como estado legado y no forma parte del flujo nuevo.
Pago: PENDIENTE / EN_REVISION / APROBADO / RECHAZADO.
Entrega: PREPARANDO / LISTA / ENVIADA. AUTORIZACIONES_PENDIENTES queda como estado legado y no forma parte del flujo nuevo.

## Economía técnica
No usar IA para transcribir CV durante el registro. Formularios y filtros tradicionales resuelven la mayor parte. IA se reserva principalmente para análisis/reporte sobre candidatos preseleccionados de solicitudes aprobadas.

## Orden de construcción
Formulario Candidato → base administrativa → Formulario Vacante → pago/aprobación → matching → reporte/entrega → aviso al candidato → automatización conversacional → caducidad/renovación → métricas, seguridad y pruebas.
