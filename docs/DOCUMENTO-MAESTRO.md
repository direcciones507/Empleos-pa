# DOCUMENTO MAESTRO — EMPLEOS.PA

Versión 0.1 | Inicio 17-sep-2026 | ESTRUCTURACIÓN ACTIVA

## Propósito
Empleos.pa conecta candidatos que buscan empleo con empresas que necesitan contratar en Panamá. El candidato se registra gratis. La empresa paga por una búsqueda/preselección concreta y recibe perfiles activos pertinentes conforme al consentimiento y condiciones aceptadas al mantener el perfil activo.

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
Empresa: solicita candidatos para una vacante y paga por la búsqueda/preselección.
Administrador: verifica pagos, supervisa resultados y autoriza el avance operativo.

## Entrada
Solo dos rutas activas: **Busco empleo** y **Necesito contratar personal**. La conversación debe ser breve; los formularios capturan los datos.

## Flujo candidato
Entrada → Busco empleo → Formulario Candidato → validación → código EMP-000001 → confirmación + vigencia → base activa.

La vigencia operativa inicial es de 45 días. Al quedar 7 días se ofrece renovación con un toque; al renovar obtiene otros 45 días sin rehacer el perfil. Si no renueva, pasa automáticamente a VENCIDO y deja de participar en búsquedas. VENCIDO no implica borrado inmediato: la eliminación definitiva se regirá por la política de retención. La política final de retención/eliminación se definirá antes de producción.

## Flujo empresa
Entrada → Necesito contratar personal → elegir VACANTE o EVENTUAL → Formulario de solicitud → solicitud → instrucciones de pago → comprobante → notificación administrativa → verificación → APROBADO → búsqueda/preselección → reporte → entrega inmediata de perfiles activos compatibles → aviso informativo al candidato.

## Matching
Primera capa sin IA: ubicación, puesto/área, experiencia, educación, habilidades y disponibilidad.
Segunda capa: evaluación descriptiva contra los requisitos de ESA vacante. Puede señalar coincidencias y puntos por validar en entrevista. No produce ranking general.

## Entrega
Puede incluir código, ubicación relevante, formación, experiencia, habilidades declaradas, disponibilidad, perfil laboral, correspondencia con requisitos, aspectos por validar y datos de contacto conforme al consentimiento y condiciones aceptadas por el candidato al mantener su perfil ACTIVO. La empresa entrevista, solicita documentos y decide.

## Datos que NO almacenamos en MVP
No se solicitarán como archivo récord policivo, cédula escaneada, diplomas, certificados, cartas de trabajo ni documentación equivalente.

## Trabajo eventual
**ACTIVO dentro del mismo flujo de contratación.** Está destinado a necesidades puntuales o temporales, por ejemplo plomería, electricidad, reparación, mantenimiento u otros oficios. No constituye un marketplace separado. La solicitud sigue pago → aprobación → búsqueda/preselección → entrega de candidatos activos → aviso informativo → cierre. Puede manejar un paquete comercial menor y una cantidad menor de candidatos, configurables antes de producción.

## Estados mínimos
Candidato: BORRADOR / ACTIVO / VENCIDO / RETIRADO.
Vacante: RECIBIDA / PENDIENTE_PAGO / PAGO_EN_REVISION / APROBADA / EN_BUSQUEDA / EN_CONFIRMACION / ENTREGADA / CERRADA / CANCELADA.
Pago: PENDIENTE / EN_REVISION / APROBADO / RECHAZADO.
Entrega: PREPARANDO / AUTORIZACIONES_PENDIENTES / LISTA / ENVIADA.

## Economía técnica
No usar IA para transcribir CV durante el registro. Formularios y filtros tradicionales resuelven la mayor parte. IA se reserva principalmente para análisis/reporte sobre candidatos preseleccionados de solicitudes aprobadas.

## Orden de construcción
Formulario Candidato → base administrativa → Formulario Vacante → pago/aprobación → matching → reporte/entrega → aviso al candidato → automatización conversacional → caducidad/renovación → métricas, seguridad y pruebas.
