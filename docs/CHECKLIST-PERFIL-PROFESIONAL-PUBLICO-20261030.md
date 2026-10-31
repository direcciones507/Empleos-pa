# EMPLEOS.PA | Checklist: Perfil Profesional Público

**Fecha:** 30 de octubre de 2026  
**Estado:** requerimiento aprobado para documentar; **no implementado ni publicado**.  
**Origen:** tercera tarjeta del diseño de Mi Contacto, trasladada a Empleos.pa.

## Decisión de producto
- [x] Crear en **Empleos.pa** un servicio de ficha personal/profesional pública.
- [x] Nombre provisional: **Perfil Profesional Público** (nombre comercial definitivo pendiente).
- [x] La ficha **debe ser indexable** por Google y otros buscadores, con consentimiento del titular. La indexación efectiva y el posicionamiento no se garantizan.
- [x] Ficha compartible por URL y QR.
- [x] Inspirarse en la tercera tarjeta del mockup de Mi Contacto y en la tecnología existente de tarjetas de Direcciones507/LATAM, **sin acoplar ni modificar producción de esos proyectos**.
- [x] Mantener el servicio exclusivamente en Empleos.pa, separado del directorio Mi Contacto.

## Diseño y contenido deseado
- [ ] Foto de perfil, nombre, profesión/oficio, ubicación.
- [ ] Descripción libre («Sobre mí»), experiencia, servicios, cobertura y horarios si aplican.
- [ ] Botones de contacto (WhatsApp, llamada, correo) según datos que el titular autorice publicar.
- [ ] Sitio web y redes opcionales, sujetos a validación.
- [ ] Galería con **foto de perfil + hasta cuatro fotografías adicionales** (cinco en total), según el diseño de referencia.
- [ ] Diseño adaptable a celular/tableta/escritorio; presentación pública profesional.
- [ ] Enlace y QR estables; edición por propietario autenticado.

## SEO e indexación
- [ ] Página individual con respuesta 200 y URL canónica estable.
- [ ] **No usar noindex** en perfiles publicados y consentidos; excluir borradores, suspendidos y eliminados.
- [ ] Incluir perfiles elegibles en sitemap XML y enlaces internos de descubrimiento.
- [ ] Título, descripción, Open Graph y datos estructurados apropiados al tipo de perfil; evitar afirmaciones o reseñas inventadas.
- [ ] Verificar robots.txt, permisos de rastreo, canonical, redirecciones y baja/desindexación al retirar consentimiento.
- [ ] Comprobar en Search Console después de publicación autorizada; no prometer aparecer inmediatamente ni en todas las búsquedas.

## Reutilización técnica segura
- [ ] Auditar primero el repositorio actual Empleos.pa: modelos de usuarios/candidatos/proveedores, autenticación, perfiles, imágenes, servicios, rutas y SEO.
- [ ] Identificar componentes/patrones reutilizables de Direcciones507/LATAM **sin copiar secretos, bases de datos, dependencias productivas ni datos personales**.
- [ ] Definir integración con las categorías ya existentes de Empleos.pa, evitando duplicar perfiles y cuentas.
- [ ] Definir moderación ADMIN, validación de imágenes, permisos y mecanismos de denuncia.
- [ ] Implementar y probar en rama aislada; no ejecutar Actions, Railway ni despliegues sin autorización expresa.

## Decisiones comerciales pendientes
- [ ] Confirmar si este servicio será gratuito, pago único o suscripción.
- [ ] Confirmar si las cinco fotos se incluyen siempre o dependen del plan.
- [ ] Confirmar nombre comercial definitivo, campos obligatorios y público objetivo.
- [ ] Definir verificación de identidad, normas de contenido y reglas de eliminación.

## Criterios de aceptación
- [ ] Perfil creado/editado solo por su titular autorizado.
- [ ] Perfil público consentido visible y compartible; URL/QR funcionales.
- [ ] Indexación permitida técnicamente, con sitemap/canonical/metadata adecuados.
- [ ] Retiro de consentimiento elimina la ficha del descubrimiento y solicita desindexación según mecanismos disponibles.
- [ ] Sin regresiones en registro de candidatos, empresas, publicaciones de vacantes, chat ni pagos actuales.
- [ ] Pruebas locales y autorización expresa antes de publicar.

**Nota:** «Indexable» significa que el buscador puede rastrear e incluir el perfil, no que Google garantice mostrarlo. El alcance aquí es documentación del producto, no autorización para modificar producción.
