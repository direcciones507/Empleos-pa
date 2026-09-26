# Servicios V2 — especificación funcional aprobada

Estado: preparación, sin implementación ni despliegue.

## Principio
Servicios y trabajos eventuales es un flujo distinto de Vacantes. No reutiliza el formulario de Nueva vacante. Empleos.pa conecta al solicitante con prestadores compatibles y disponibles; después ambas partes se contactan directamente.

## Prestador de servicios
Una identidad CANDIDATO puede habilitar su ficha de prestador sin crear otro usuario.

Datos requeridos:
- nombre completo;
- número de cédula (interno, obligatorio, no se entrega al cliente);
- oficio/servicios ofrecidos;
- experiencia;
- provincia;
- distrito;
- corregimiento;
- dirección/referencia residencial completa (interna, no se entrega al cliente);
- correo de contacto;
- celular/WhatsApp;
- teléfono fijo opcional;
- disponibilidad estructurada.

Datos opcionales cuando correspondan:
- licencia de conducir;
- número de licencia;
- otros atributos específicos del oficio que se incorporen posteriormente.

No usar el correo de autenticación como sustituto obligatorio del correo de contacto.

## Disponibilidad del prestador
No aceptar horarios como texto libre para matching.

La disponibilidad se almacena estructurada por día de la semana y uno o más intervalos de hora. La UI debe permitir seleccionar horas en pasos de 30 minutos y contemplar disponibilidad 24 horas cuando aplique.

Ejemplos válidos conceptuales:
- lunes a viernes, 08:00–16:30;
- sábado, 08:00–12:00;
- domingo, no disponible;
- día determinado, 24 horas.

El matching debe poder determinar solapamiento real entre disponibilidad del prestador y necesidad del solicitante.

## Solicitud de servicio
Formulario propio, separado de Vacantes.

Datos:
- servicio/oficio requerido;
- descripción breve del trabajo;
- provincia;
- distrito;
- corregimiento;
- referencia del lugar donde se realizará el servicio;
- fecha o rango requerido;
- días aplicables;
- horario estructurado en que puede recibirse al prestador;
- nombre/persona de contacto;
- correo de entrega/contacto de esa solicitud;
- celular/WhatsApp;
- teléfono fijo opcional.

No solicitar salario ni precio del trabajador. El precio y demás condiciones se acuerdan directamente entre solicitante y prestador después de la entrega de contactos.

## Correos
Mantener tres conceptos independientes:
1. correo de autenticación: identidad de acceso;
2. correo de contacto del perfil: dato profesional/comercial;
3. correo de entrega de la solicitud: destino operativo para resultados/notificaciones de esa solicitud.

Pueden coincidir, pero no deben ser el mismo campo por diseño.

## Matching
Criterios base obligatorios:
- oficio/servicio compatible;
- ubicación compatible;
- fecha compatible;
- disponibilidad horaria con solapamiento real.

No incluir un prestador como compatible cuando su disponibilidad no cubra el período solicitado.

No usar ranking opaco para ocultar candidatos compatibles. La entrega es de perfiles compatibles, no una decisión automática de contratación.

## Información entregada al solicitante
Por cada prestador compatible se puede entregar:
- nombre;
- oficio/especialidad;
- experiencia pertinente;
- provincia/distrito/corregimiento o zona general necesaria;
- disponibilidad compatible;
- correo de contacto;
- celular/WhatsApp;
- teléfono fijo si fue registrado;
- demás datos profesionales expresamente definidos como compartibles.

Entregar todos los medios de contacto registrados para facilitar contacto directo.

## Información privada que NO se entrega al solicitante
- número de cédula;
- dirección residencial exacta/referencia residencial completa;
- credenciales o datos internos de autenticación;
- información interna de control;
- número de licencia u otro identificador sensible salvo que exista posteriormente una regla explícita y justificada para compartirlo.

La cédula se conserva internamente para identificación/trazabilidad. Mientras no exista verificación oficial, no presentar el perfil como “identidad verificada”; puede distinguirse como dato/cédula registrada.

## Entrega y trazabilidad
Los resultados de una solicitud deben quedar asociados a la solicitud dentro de Empleos.pa. Además, el correo de entrega de la solicitud recibe la notificación o entrega definida por el producto.

No depender exclusivamente del correo: el panel conserva el historial y el estado de la solicitud.

No notificar automáticamente al prestador solo porque apareció en una búsqueda. Una futura notificación al prestador debe corresponder a una acción concreta que requiera que la conozca.

## Compatibilidad con arquitectura actual
La base existente contiene request_type EVENTUAL dentro de vacancies y disponibilidad libre en candidate_profiles. V2 debe reemplazar conceptualmente la experiencia de EVENTUAL como “vacante” por un módulo de Servicios separado, sin destruir datos históricos.

La migración futura debe ser aditiva. No borrar registros EVENTUAL históricos ni reinterpretarlos silenciosamente.

## Fuera de este bloque
- pagos;
- tarjeta/verificación por tarjeta;
- ADMIN;
- cuenta administrativa;
- rediseño del hero;
- cambios generales de autenticación;
- cambios de Railway.

## Criterios mínimos de aceptación futuros
- formulario de Servicios distinto de Nueva vacante;
- ficha de prestador separada de CV/vacante, ligada a la misma identidad;
- cédula obligatoria e interna;
- dirección residencial interna;
- contactos separados;
- horarios estructurados por día y hora;
- solicitud con fecha y horario estructurados;
- matching por oficio, ubicación, fecha y disponibilidad;
- entrega de todos los contactos registrados del prestador compatible;
- cédula y domicilio exacto nunca expuestos al solicitante;
- resultados persistidos en el panel;
- compatibilidad con CANDIDATO + EMPRESA multiperfil;
- sin regresiones en OAuth, reactivación, vacantes o ADMIN.