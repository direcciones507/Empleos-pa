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
- El perfil tiene vigencia configurable.
- Debe poder actualizarse y renovarse.
- Antes del vencimiento se podrá solicitar confirmación de que continúa buscando empleo.
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
- La solicitud queda PENDIENTE_PAGO hasta completar el proceso comercial.
- La empresa es responsable de entrevistar, validar documentación y tomar la decisión final de contratación.

## 7. Pago inicial
- El modelo inicial permite verificación manual del pago por ADMIN.
- El pago no se considera aprobado únicamente porque el cliente envíe un comprobante.
- La búsqueda/preselección pagada comienza después de aprobación.
- Precio, cantidad de candidatos y condiciones del paquete deben quedar configurables y documentados antes de producción.

## 8. Preselección y matching
- Primero utilizar filtros estructurados y económicos.
- Solo considerar candidatos activos.
- Comparar contra los requisitos de ESA vacante.
- La IA se utiliza únicamente cuando aporte valor.
- No utilizar IA para operaciones simples que PostgreSQL puede resolver.
- No producir un ranking general de personas ni declarar automáticamente quién debe ser contratado.
- El reporte describe alineación: requisitos cumplidos/declarados, experiencia, educación, habilidades, ubicación, disponibilidad y puntos que deben verificarse en entrevista.

## 9. Interés, autorización y contacto
- Antes de compartir datos de contacto cuando corresponda, registrar el interés/autorización aplicable del candidato.
- No entregar como disponible a un candidato que haya rechazado la oportunidad.
- Mantener trazabilidad de la autorización y entrega.
- La comunicación directa empresa-candidato ocurre después de la entrega autorizada.

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
- Utiliza el mismo flujo central: solicitud → pago → aprobación → búsqueda/preselección → confirmación/autorización → entrega de candidatos → cierre.
- Puede tener precio y cantidad de candidatos distintos a una vacante regular, pero esos valores deben ser configurables.
- La portada debe explicar claramente la diferencia entre una vacante de personal y un trabajo eventual.

## 14. Economía
- No gastar IA en transcribir CV si el candidato puede completar datos estructurados.
- No gastar IA en conteos, estados, filtros o métricas simples.
- Usar automatización convencional siempre que resuelva correctamente el proceso.
- IA principalmente para análisis descriptivo asociado a una solicitud pagada cuando aporte valor.

## 15. Diseño y dispositivos
Todo flujo público y administrativo relevante debe funcionar en:
- móvil;
- tablet;
- laptop;
- desktop.

Prioridad especial al móvil para candidatos.

## 16. Regla de construcción
- No construir funciones que contradigan estas reglas.
- No activar bloques reservados por conveniencia técnica.
- No reconstruir componentes cerrados sin una causa real.
- Mantener trazabilidad de estados.
- Probar los flujos completos, no solamente componentes aislados.
- El panel administrativo y métricas forman parte del núcleo del MVP.

## 17. Flujo candidato resumido
Crear cuenta → Busco empleo → completar formulario → revisar → aceptar condiciones → enviar → EMP-###### → ACTIVO.

## 18. Flujo empresa resumido
Crear cuenta → Busco personal → elegir VACANTE o EVENTUAL → completar solicitud → revisar → aceptar condiciones → enviar → VAC-###### → pago → revisión ADMIN → aprobación → búsqueda/preselección → confirmación/autorización de candidatos → reporte/entrega → cierre.

## 19. Criterio de éxito de UX
Debe ser posible grabar un video corto desde un teléfono mostrando el registro completo sin necesitar explicar una secuencia complicada.

## 20. Control de cambios
Estas reglas son la referencia transversal. Una nueva función o cambio que las afecte debe:
1. identificar la regla afectada;
2. justificar el cambio;
3. actualizar documentación relacionada;
4. probar que no rompe los flujos existentes;
5. dejar el nuevo comportamiento explícitamente documentado.
