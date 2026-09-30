# Flujo administrativo de Servicios

## Estados operativos previstos

1. Solicitud recibida.
2. Disponibilidad verificada.
3. Sin disponibilidad o pendiente de pago.
4. Pagada.
5. Entregada.

## Regla de cobro

- Si no existen proveedores compatibles disponibles, la solicitud queda como **sin disponibilidad** y no se cobra al cliente.
- Si existe uno o más proveedores compatibles, se informa la disponibilidad y se habilita el cobro.
- El cobro corresponde a la solicitud/entrega del servicio, no a cada proveedor compatible encontrado.
- La entrega de la información correspondiente ocurre después de confirmar el pago.

## Métricas administrativas previstas

- Servicios solicitados.
- Solicitudes con disponibilidad.
- Solicitudes sin disponibilidad.
- Pendientes de pago.
- Pagadas.
- Entregadas.
- Servicios/proveedores agregados.
- Demanda por categoría y ubicación.
- Oferta disponible por categoría y ubicación.

Estas métricas deberán calcularse en la API y quedar disponibles para el dashboard y para la futura capa de reportes asistidos por IA.
