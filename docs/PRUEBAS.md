# Pruebas

| Comando | Qué prueba | Requiere | Resultado verificado (23/10/2026) |
|---|---|---|---|
| `npm test` | Core: clave, consecutivo, fechas, cálculos, validaciones, XML, simulador, recepción, entornos, división territorial y formas farmacéuticas (51). Web: backend local y CSV (5). Supabase: esquema, RLS, consecutivo atómico y auditoría (7) y función Edge completa sobre PostgreSQL/PGlite (7) | Node | 70/70 ✔ |
| `npm run typecheck` | TypeScript estricto en core, web y lógica de la función Edge | Node | Sin errores ✔ |
| `npm run build` | Paquete de la función Edge y compilación de la web | Node | ✔ |

## Casos de cálculo verificados a mano

| Caso | Datos | Esperado |
|---|---|---|
| Servicio 13 % | 1 × ₡100 000 | IVA 13 000; total 113 000 |
| Descuentos sucesivos | 2 × 50 000; 10 % y luego 5 % | Descuentos 10 000 y 4 500; subtotal 85 500; IVA 11 115; total 96 615 |
| Exoneración total | ₡420 000 al 13 %, exonerado 13 % | IVA 54 600 exonerado; neto 0; TotalMercExonerada 420 000 |
| Exoneración parcial | ₡100 000 al 13 %, exonerado 4 % | Exonerado 4 000; neto 9 000; TotalServExonerado = 100 000 × 4/13 = 30 769,23077 |
| Regalía | ₡650 con descuento 01 de 650 | IVA 84,50 sobre el monto total, asumido por el emisor; total 0 |
| Exento y no sujeto | Libros código 10; servicio código 01 | TotalMercanciasExentas y TotalServNoSujeto, sin IVA |
| IVA devuelto (salud con tarjeta) | Consulta ₡30 000 al 4 % pagada con tarjeta | IVA 1 200 devuelto; total 30 000 |
| Selectivo de consumo | ₡1 000 con ISC 10 % | Base imponible 1 100; IVA 143; total 1 243 |
| Redondeo | 3 × 0,333335 | 1,00001 (mitad hacia arriba) |

## Prueba de punta a punta en navegador

Se ejecutó un guion con Playwright sobre Microsoft Edge contra la compilación de GitHub Pages servida bajo `/facturacion-electronica-cr/` (modo local): registra un usuario, carga la demo, ejecuta los 13 escenarios, emite una factura desde el formulario, abre el XML, descarga el PDF (`clave.pdf`), confirma un comprobante recibido, abre rutas internas directamente y revisa la vista móvil (390 px). Resultado: los 13 escenarios con el resultado esperado, sin errores de consola y sin desbordamiento horizontal.

Además, la función Edge se ejecutó en **Deno 2.1.4**: carga el mapa de importaciones, el paquete `npm:@supabase/supabase-js` y el JSON de CAByS, responde la verificación CORS y rechaza solicitudes sin sesión (401).

**Pendiente de verificar en la nube**: el despliegue real en un proyecto Supabase (requiere la cuenta del usuario).

## Escenarios incluidos en la app (página «Escenarios de prueba»)

1. Factura de contado al 13 % → aceptado
2. Tiquete con SINPE Móvil y efectivo → aceptado
3. Factura exonerada (AL-00000001-25, ficticia) → aceptado
4. Factura a crédito 30 días → aceptado
5. Venta con IVA hasta 90 días (condición 10) → aceptado
6. Factura de exportación de servicios → aceptado
7. Factura electrónica de compra (régimen especial) → aceptado
8. Comprobante «sin internet» → aceptado
9. Nota de crédito que anula la última factura → aceptado
10. Receptor no inscrito → rechazado (nivel 3)
11. CAByS inexistente → rechazado (nivel 3)
12. Rechazo forzado → rechazado (para practicar la sustitución)
13. Medios de pago que no suman el total → error de validación

## Datos ficticios

Las identificaciones de la demo (3109999001-004, 3009999003, 199990001-002, 199999999) se consultaron en `GET /fe/ae` del API público el 23/10/2026 y ninguna existe en el padrón (respuesta 404).
