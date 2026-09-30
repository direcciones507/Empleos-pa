# Admin dashboard foundation

Base incremental del panel administrativo de Empleos.pa.

## Alcance de esta rama

- Reorganizar el resumen principal del Admin en bloques operativos.
- Añadir resumen operativo de candidatos.
- Añadir resumen operativo de empresas.
- Mantener intactos pagos, matching, migraciones y despliegues.

## Arquitectura prevista

Los datos y cálculos administrativos deben provenir de la API de Empleos.pa. La capa de IA podrá interpretar y redactar reportes a partir de esos datos, sin calcular ni inventar cifras comerciales por su cuenta.

## Próximos bloques

- Reportes administrativos estructurados.
- Servicios: solicitudes, disponibilidad, pago y entrega.
- Vacantes y actividad operativa.
- Integración posterior del motor de IA con endpoints administrativos autorizados.
