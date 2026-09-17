# PANEL ADMINISTRATIVO V1

Estado: ESTRUCTURADO
Fecha: 17-sep-2026

## Objetivo
Dar al administrador una vista sencilla de operación y métricas desde el inicio del MVP. El panel no se deja para una fase final.

## Inicio / resumen
Tarjetas simples con:
- candidatos registrados;
- candidatos activos;
- candidatos nuevos hoy;
- candidatos nuevos esta semana;
- candidatos nuevos este mes;
- perfiles próximos a vencer;
- perfiles vencidos;
- empresas registradas;
- vacantes recibidas;
- vacantes pendientes de pago;
- pagos en revisión;
- vacantes aprobadas/en búsqueda;
- vacantes entregadas/cerradas;
- candidatos entregados;
- ingresos registrados.

## Candidatos
- Buscar por código/nombre.
- Filtrar por estado, provincia, distrito, área/puesto, experiencia, educación, habilidades y disponibilidad.
- Ver ficha laboral y estado.
- Ver fecha de registro/vigencia.
- Actualizar estados administrativos autorizados.
- Exportación administrativa posterior a XLSX.

## Empresas y vacantes
- Ver empresas.
- Ver VAC-###### y sus requisitos.
- Filtrar por estado.
- Revisar comprobante/pago.
- Aprobar o rechazar pago manualmente.
- Pasar la vacante al flujo de búsqueda/preselección.

## Preselección y entrega
- Ejecutar filtros estructurados.
- Trabajar únicamente con candidatos activos.
- Registrar confirmación de interés/autorización cuando corresponda.
- Preparar reporte descriptivo por vacante.
- Registrar entrega y cantidad de perfiles entregados.

## Métricas
Las métricas se calculan desde PostgreSQL, sin requerir IA:
- altas por día/semana/mes;
- candidatos activos/vencidos;
- distribución geográfica;
- áreas/puestos buscados;
- vacantes por estado;
- solicitudes convertidas a pago;
- perfiles entregados;
- ingresos;
- tiempos operativos básicos.

## Principios
- Interfaz clara y rápida.
- Responsive.
- PostgreSQL es la fuente oficial.
- Excel/XLSX es exportación, no base de datos.
- IA no se usa para contar, filtrar estados ni calcular métricas simples.
- Servicios Puntuales permanece RESERVADO/DESHABILITADO.
