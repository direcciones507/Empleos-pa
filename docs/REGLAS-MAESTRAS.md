# REGLAS MAESTRAS — EMPLEOS.PA

Estado: OFICIAL
Fecha: 17-sep-2026

Este documento fija las reglas de producto, operación y arquitectura de Empleos.pa. No deben cambiarse silenciosamente durante la implementación. Cualquier cambio posterior debe ser deliberado, documentado y reconciliado con el Documento Maestro y Checklist Maestro.

## 1. Principio de simplicidad
- Empleos.pa debe ser simple para candidatos y empresas.
- Si un candidato necesita instrucciones extensas para registrarse, el flujo es demasiado complicado.
- Mobile-first: una persona debe poder completar el proceso desde su teléfono.
- Evitar menús, configuraciones y pasos que no sean necesarios.
- Formularios propios de Empleos.pa; no Google Forms.
- Formularios divididos en pasos cortos, legibles y con controles grandes.
- Guardar borrador para evitar pérdida accidental.
- Permitir revisar antes de enviar.
- La aceptación de condiciones forma parte del flujo nativo.

## 2. Canal principal
- La web es el canal principal.
- Registro de candidatos y vacantes no dependen de WhatsApp, Meta ni Natalie.
- WhatsApp puede utilizarse como asistencia.
- La plataforma debe seguir funcionando aunque WhatsApp/Meta no esté disponible.

## 3. Cuentas y roles
Roles iniciales:
- CANDIDATO
- EMPRESA
- ADMIN

Funciones mínimas de cuenta:
- crear cuenta;
- iniciar sesión;
- cerrar sesión;
- recuperar contraseña.

Cada rol solo accede a la información y funciones que le corresponden.

## 4. Candidato
- Registrarse es gratuito.
- Completa un perfil estructurado dentro de Empleos.pa.
- No se exige CV/PDF.
- El sistema genera un código EMP-######.
- El perfil ACTIVO tiene una vigencia operativa de 45 días por defecto; el valor permanece configurable.
- Debe poder actualizarse y renovarse.
- Cuando quedan 7 días se muestra un aviso simple de renovación. Si confirma, obtiene otros 45 días sin rehacer el formulario. Si deja vencer el plazo, el perfil sale automáticamente de las búsquedas. La eliminación definitiva de datos se rige por la política de retención, no por el vencimiento operativo.
- Los perfiles vencidos no participan en búsquedas activas.
- No inventar experiencia ni penalizar automáticamente a quien no tenga experiencia.

## 5. Datos que NO se almacenan en el MVP
No solicitar ni almacenar inicialmente:
- récord policivo;
- copia de cédula;
- diplomas;
- certificados;
- cartas de trabajo;
- archivos similares de contratación.

La empresa solicita y verifica directamente esa documentación cuando corresponda.

## 6. Empresa y vacante
- La empresa crea/inicia su cuenta.
- Registra la vacante mediante formulario propio.
- Cada vacante recibe VAC-######.
- Debe declarar requisitos y funciones de forma estructurada.
- En modo comercial MANUAL, la solicitud queda PENDIENTE_PAGO hasta completar el proceso comercial. Durante la promoción de lanzamiento, el modo FREE permite que nuevas solicitudes queden APROBADAS y avancen sin reportar pago.
- La empresa es responsable de entrevistar, validar documentación y tomar la decisión final de contratación.

## 7. Pago y promoción de lanzamiento
- El flujo comercial es configurable mediante REQUEST_PAYMENT_MODE.
- FREE es el modo de lanzamiento: la solicitud puede quedar APROBADA y avanzar a búsqueda sin reportar pago.
- MANUAL conserva el flujo de cobro: referencia de pago → revisión por ADMIN → aprobación → búsqueda/preselección.
- En MANUAL, el pago no se considera aprobado únicamente porque el cliente envíe una referencia o comprobante.
- Modelo comercial V1: 5 perfiles por $8.99; 10 por $10.99; 15 por $12.99; o $25 por todos los perfiles activos y compatibles disponibles al momento de la búsqueda. “Disponibles” no significa ilimitados ni garantiza una cantidad mínima.

## 8. Preselección y matching
- Primero utilizar filtros estructurados y económicos.
- Solo considerar candidatos activos.
- Comparar contra los requisitos de ESA vacante.
- La IA se utiliza únicamente cuando aporte valor.
- No utilizar IA para operaciones simples que PostgreSQL puede resolver.
- No producir un ranking general de personas ni declarar automáticamente quién debe ser contratado.
- El reporte describe alineación: requisitos cumplidos/declarados, experiencia, educación, habilidades, ubicación, disponibilidad y puntos que deben verificarse en entrevista.

## 9. Perfil activo, entrega y aviso al candidato
- Un perfil ACTIVO significa que el candidato mantiene su disponibilidad para participar en búsquedas compatibles con lo declarado en su perfil, conforme a los términos y la política de privacidad aceptados.
- No existe una confirmación individual previa que bloquee cada entrega. Una solicitud pagada y aprobada debe poder resolverse con rapidez usando perfiles activos y compatibles.
- Empleos.pa registra qué perfiles fueron entregados y conserva snapshot y trazabilidad de la entrega.
- Después de la entrega, el candidato recibe un aviso informativo: su perfil estuvo incluido en una búsqueda para determinado puesto/oficio y zona, una empresa podría contactarlo y debe mantenerse pendiente de sus medios de contacto.
- Ese aviso no significa entrevista, contratación ni selección final por la empresa y no revela necesariamente la identidad de la empresa.
- La empresa decide a quién contactar, entrevistar, verificar y contratar. La gestión posterior entre empresa y candidato no constituye una garantía ni obligación de Empleos.pa.

## 10. Fuente oficial de datos
- PostgreSQL es la fuente oficial operativa.
- Excel/XLSX es exportación administrativa, no base de datos.
- Google Drive puede almacenar exportaciones/reportes, pero no será la base operativa.
- Las métricas salen de la base de datos.

## 11. Panel administrativo
El panel ADMIN se construye desde el inicio, no al final.
Debe permitir como mínimo:
- conteo de candidatos registrados/activos/vencidos;
- altas por día, semana y mes;
- empresas registradas;
- vacantes por estado;
- pagos pendientes/en revisión/aprobados;
- búsquedas y entregas;
- candidatos entregados;
- ingresos registrados;
- filtros y búsqueda;
- métricas operativas.

## 12. Privacidad y minimización
- Solicitar únicamente información necesaria para el servicio.
- Evitar dirección residencial exacta si no existe una necesidad justificada.
- Separar en lo posible datos de contacto de la información laboral utilizada para búsqueda.
- Aplicar controles de acceso por rol.
- Definir y documentar política de retención/eliminación antes de producción.
- No usar datos para finalidades distintas de las informadas/aceptadas.

## 13. Trabajo eventual
- ACTIVO como tipo de solicitud dentro del flujo de contratación.
- No es una plataforma separada ni un marketplace abierto de servicios.
- Cubre necesidades puntuales o temporales, por ejemplo plomería, electricidad, reparación, mantenimiento u otros oficios.
- Utiliza el mismo flujo central: solicitud → pago y revisión si aplica → aprobación → búsqueda/preselección → entrega de candidatos activos → aviso informativo al candidato → cierre.
- Tarifa V1 aprobada para Servicios y trabajos eventuales: $3.99 por solicitud. Se mantiene separado de los paquetes de vacantes regulares.
- La portada debe explicar claramente la diferencia entre una vacante de personal y un trabajo eventual.

## 14. Profesionales destacados — módulo comercial posterior al MVP
- Empleos.pa podrá ofrecer visibilidad publicitaria a profesionales, técnicos y prestadores de servicios mediante fichas públicas.
- Tarifa inicial aprobada como referencia comercial: $4.99 por 30 días.
- La ficha podrá incluir nombre o negocio, profesión/servicio, zona, descripción breve, teléfono/WhatsApp y foto o logo opcional.
- El profesional completa su información mediante formulario; ADMIN aprueba, pausa o renueva desde el panel. No debe requerir editar código para publicar una ficha.
- La publicación se activa y vence automáticamente según el período contratado.
- Esta modalidad es distinta de Servicios y trabajos eventuales: en una solicitud eventual el cliente solicita una búsqueda; en Profesionales destacados el prestador paga por visibilidad pública y contacto directo.
- La etiqueta será “Profesional destacado” o equivalente publicitario. No usar “verificado” salvo que exista un proceso real de verificación de credenciales.
- Este módulo queda aprobado como extensión comercial posterior y no bloquea el cierre del MVP actual.

## 15. Economía
- No gastar IA en transcribir CV si el candidato puede completar datos estructurados.
- No gastar IA en conteos, estados, filtros o métricas simples.
- Usar automatización convencional siempre que resuelva correctamente el proceso.
- IA principalmente para análisis descriptivo asociado a una solicitud pagada cuando aporte valor.

## 16. Diseño y dispositivos
Todo flujo público y administrativo relevante debe funcionar en:
- móvil;
- tablet;
- laptop;
- desktop.

Prioridad especial al móvil para candidatos.

## 17. Regla de construcción
- No construir funciones que contradigan estas reglas.
- No activar bloques reservados por conveniencia técnica.
- No reconstruir componentes cerrados sin una causa real.
- Mantener trazabilidad de estados.
- Probar los flujos completos, no solamente componentes aislados.
- El panel administrativo y métricas forman parte del núcleo del MVP.

## 18. Flujo candidato resumido
Crear cuenta → Busco empleo → completar formulario → revisar → aceptar condiciones → enviar → EMP-###### → ACTIVO.

## 19. Flujo empresa resumido
Crear cuenta → Busco personal → elegir VACANTE o EVENTUAL → completar solicitud → revisar → aceptar condiciones → enviar → VAC-###### → en FREE: aprobación directa; en MANUAL: pago → revisión ADMIN → aprobación → búsqueda/preselección → entrega inmediata de perfiles activos compatibles → aviso informativo a candidatos entregados → cierre.

## 20. Criterio de éxito de UX
Debe ser posible grabar un video corto desde un teléfono mostrando el registro completo sin necesitar explicar una secuencia complicada.

## 21. Control de cambios
Estas reglas son la referencia transversal. Una nueva función o cambio que las afecte debe:
1. identificar la regla afectada;
2. justificar el cambio;
3. actualizar documentación relacionada;
4. probar que no rompe los flujos existentes;
5. dejar el nuevo comportamiento explícitamente documentado.
