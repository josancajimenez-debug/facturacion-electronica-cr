# Pruebas

| Comando | Qué prueba | Requiere | Resultado verificado (23/10/2026) |
|---|---|---|---|
| `npm test` | Core: clave, consecutivo, fechas y plazos, cálculos, validaciones, XML, simulador, recepción y bloqueo de entornos (46). Web: backend local completo y CSV (5) | Node | 51/51 ✔ |
| `npm run typecheck` | TypeScript estricto en core, web y functions | Node | Sin errores ✔ |
| `npm run test:reglas` | Reglas de Firestore: membresía, consultas, escrituras prohibidas, validación de productos (7) | Java + emulador | 7/7 ✔ |
| `npm run test:integracion` | Auth + Firestore + Functions: sembrar demo, emitir FE aceptada con su historial de estados, rechazo por validación, escritura directa denegada, recepción y confirmación 05 (5) | Java + emuladores | 5/5 ✔ |
| `npm run build` | Compilación de producción de Functions y web | Node | ✔ |

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

Se ejecutó un guion con Playwright sobre Microsoft Edge, en **modo local** y en **modo Firebase con emuladores**, que registra un usuario, carga la demo, ejecuta los 13 escenarios de prueba, emite una factura desde el formulario, abre el XML, descarga el PDF (`clave.pdf`), simula y confirma un comprobante recibido, recorre reportes, auditoría y matriz, y revisa la vista móvil (390 px).

Resultado en ambos modos: los 13 escenarios dieron el resultado esperado (9 aceptados, 3 rechazados en nivel 3 y 1 error de validación local sin consumir consecutivo), sin errores de consola y sin desbordamiento horizontal en móvil. En modo Firebase el único 400 registrado es el del escenario de error de validación, que la función rechaza a propósito.

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
