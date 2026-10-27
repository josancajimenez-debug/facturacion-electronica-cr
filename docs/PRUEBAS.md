# Pruebas

| Comando | Qué prueba | Requiere | Resultado verificado (26/10/2026) |
| --- | --- | --- | --- |
| `npm test` | Core: clave, consecutivo, fechas, cálculos, validaciones, XML, simulador, recepción, entornos, división territorial, formas farmacéuticas, códigos de referencia 13-17 y actualización v4.4 del 1/11/2026: cédula alfanumérica, REP, claves 17-20, período de 13/14 y saldo de la NC; tablas oficiales de monedas y formas farmacéuticas; IVA devuelto con varios medios de pago; código 12; datos de la nota frente al referenciado; secuencia del consecutivo y sucursal/terminal registradas; regresiones de la revisión integral (vigencia según la fecha del simulador, tipo 10 en NC/ND/REP, base del IVA devuelto, fechas imposibles en la clave) (87). Web: backend local, reanudación, sincronización entre pestañas, PDF de varias páginas, CSV, identificación alfanumérica y glosario (cada cita de términos y códigos con su referencia APA, orden alfabético, catálogos sin códigos repetidos, tipos de comprobante 01-10, búsqueda sin tildes) y limpieza de datos local (17). Supabase: esquema, RLS, consecutivo atómico y auditoría (7), función Edge completa sobre PostgreSQL/PGlite (9) y limpieza de datos (6: administrador por correo, acciones negadas a los demás, cada usuario limpia lo suyo sin tocar a otros, emisor compartido, limpieza por usuario en todas las tablas, «limpiar todo» con frase y cuentas intactas) | Node | 126/126 ✔ |
| `npm run typecheck` | TypeScript estricto en core, web y lógica de la función Edge | Node | Sin errores ✔ |
| `npm run build` | Paquete de la función Edge y compilación de la web | Node | ✔ |
| `npm audit` | Vulnerabilidades conocidas en dependencias | Node | 0 ✔ |

## Pruebas de regresión de la revisión integral (23/10/2026)

Cada error corregido quedó cubierto por una prueba automática:

| Error | Prueba |
| --- | --- |
| Descuentos fuera de 0-100 % o que juntos superan el monto de la línea | `emision.test.ts` › Descuentos y medios de pago |
| Un único medio de pago conservaba un monto parcial anterior | `emision.test.ts` › con un único medio de pago… |
| XML recibido sin `FechaEmision` hacía fallar el cálculo del plazo | `emision.test.ts` › rechaza XML sin FechaEmision… |
| Nombres con `&amp;` u otras entidades se mostraban escapados | `emision.test.ts` › revierte las entidades XML… |
| Plazo de confirmación contado con el día UTC (vencía un día antes desde las 18:00) | `emision.test.ts` › cuenta el plazo con el día de Costa Rica |
| Montos negativos o gasto mayor que el total en la confirmación | `emision.test.ts` › no admite montos negativos… |
| Dos confirmaciones simultáneas del mismo comprobante | `api.test.ts` › dos confirmaciones simultáneas: solo una gana |
| Falla del simulador dejaba el comprobante en «procesando» | `api.test.ts` › si el simulador falla… |
| Recargar la página (modo local) dejaba el comprobante a medio procesar | `local.test.ts` › retoma al cargar… |
| Dos pestañas (modo local) se sobrescribían los cambios | `local.test.ts` › recarga los datos cuando otra pestaña… |
| PDF de varias páginas sin franja de simulación ni numeración | `pdf.test.ts` |

## Pruebas de regresión de la segunda revisión integral (26/10/2026)

| Error | Causa | Prueba |
| --- | --- | --- |
| El simulador aplicaba las reglas de la actualización según el reloj del equipo y no según su propia fecha | `validarBorrador` llamaba a `actualizacionVigente()` sin fecha | `regresiones.test.ts` › el simulador aplica las reglas vigentes en su fecha |
| Un REP que referenciaba un comprobante tipo 10 nunca podía validar desde el 1/11/2026 (se le exigían a la vez los códigos 16 y 17) | Regla del tipo 10 aplicada también al REP | `regresiones.test.ts` › el REP puede referenciar un tipo 10… |
| Se permitía ajustar con NC/ND un comprobante rechazado | Faltaba la regla (art. 19 Decreto 44739-H) | `regresiones.test.ts` › una nota… no puede ajustar un rechazado |
| El IVA devuelto de salud sumaba otros impuestos de la línea | Usaba el impuesto neto total de la línea | `regresiones.test.ts` › el IVA devuelto de salud… |
| La clave aceptaba fechas imposibles (31/02) | Solo se validaban rangos de día y mes | `regresiones.test.ts` › la clave rechaza fechas… |
| No se podía escribir una cédula jurídica alfanumérica en Emisor ni Receptores | El campo eliminaba todo lo que no fuera dígito | `formato.test.ts` y guion de navegador |
| No se podía agregar una segunda terminal (la coma desaparecía al escribirla) | El campo descartaba el elemento vacío tras la coma | Guion de navegador |
| «Emitir comprobante sustituto» de una NC, ND o REP rechazados generaba un borrador inválido (código 16) y el de una FEC perdía sus referencias | Referencia fija tipo 10/16 que reemplazaba las demás | Guion de navegador (sustituto aceptado) |
| En FEC con vendedor manual se mostraba una ubicación que no estaba en el borrador | Valor por omisión solo visual | Revisión manual |
| Los errores devueltos al emitir seguían visibles después de corregir el borrador | No se limpiaban al editar | Revisión manual |
| En TE, FEE y REP viajaba en el XML la actividad del receptor aunque el campo estaba deshabilitado | Se heredaba del receptor seleccionado | Revisión manual |
| En modo Supabase, tras emitir podía verse «Comprobante no encontrado» un instante | Se navegaba antes de refrescar la lista | Revisión manual |
| El Panel contaba las NC/ND 13/14 en el mes de emisión (Reportes, en el del documento modificado) y no usaba los feriados para el plazo | Criterios distintos entre páginas | Revisión manual |
| Los escenarios de NC podían anular dos veces la misma factura | Tomaban siempre la última FE aceptada | Guion de navegador |
| En desarrollo (StrictMode) se creaban dos backends locales que procesaban los mismos comprobantes | Creación del backend en un efecto que se ejecuta dos veces | Revisión manual |
| Al cambiar de emisor activo, formularios abiertos conservaban sucursales y actividades del anterior | Las páginas no se reiniciaban | Revisión manual |

Guion de navegador (Chrome sin interfaz, modo local): registro, datos demo, cédula alfanumérica, terminal nueva, factura desde el formulario (aceptada), pestañas y PDF, nota de crédito (aceptada), rechazo forzado y su sustituto (aceptado), los 15 escenarios con el resultado esperado, Reportes, Auditoría, Recepción con confirmación, Configuración, Normativa y vista móvil a 390 px sin desbordamiento. Consola: sin errores ni advertencias.

Guion de navegador del Glosario (26/10/2026, modo local): 55 términos, 24 siglas y 11 referencias; la búsqueda «credito» encuentra 13 términos y 1 sigla; una búsqueda sin coincidencias muestra el aviso vacío; a 390 px las filas se apilan sin desbordamiento horizontal. Pestaña de códigos: 21 catálogos y 679 códigos en cinco pasos; los 3 catálogos largos empiezan plegados; «sinpe» deja 1 código; «rechazado» deja Tipo de documento de referencia, Código de referencia y Mensaje del receptor; al limpiar la búsqueda vuelven a plegarse; sin desbordamiento a 390 px. Consola: sin errores ni advertencias.

Guion de navegador de la limpieza de datos (26/10/2026, modo local, tres cuentas con datos demo): «Limpiar todo» deshabilitado hasta escribir la frase; «Limpiar mis datos» elimina 1 emisor y el panel vuelve a la bienvenida; «Limpiar datos de este usuario» deja a ana con 0 emisores; «Limpiar todo» deja a las tres cuentas en 0; la cuenta de beto sigue ingresando; sin desbordamiento a 390 px. Consola: sin errores ni advertencias.

## Casos de cálculo verificados a mano

| Caso | Datos | Esperado |
| --- | --- | --- |
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

Se ejecuta un guion con Playwright (Chrome) en **modo local** y contra el sitio publicado en **modo Supabase**: registra un usuario, carga la demo, ejecuta los 13 escenarios, emite una factura desde el formulario, abre el XML, descarga el PDF (`clave.pdf`), confirma un comprobante recibido, abre rutas internas directamente y revisa la vista móvil (390 px). Resultado en ambos modos: los 13 escenarios con el resultado esperado, total del XML correcto (₡176 065,00 = 150 000 + 13 % y 6 500 + 1 %) y sin errores de consola.

Auditoría visual: las 13 páginas en 1366, 768, 600 y 390 px, midiendo desbordamiento horizontal. Resultado: sin desbordamientos, sin errores ni advertencias de consola.

Además, la función Edge se ejecutó en **Deno 2.1.4** y está desplegada en el proyecto Supabase; una prueba de humo con un usuario ficticio verifica registro, datos demo, emisión aceptada, bitácora y que el cliente no pueda escribir en la bitácora ni leer los contadores.

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
10. Anulación por error material (código 13) → aceptado; luego «Emitir sustituto (código 15)» desde el detalle
11. Nota de crédito mayor que lo facturado → aceptado con advertencia hasta el 31/10/2026; rechazado desde el 1/11/2026
12. Receptor no inscrito → rechazado (nivel 3)
13. CAByS inexistente → rechazado (nivel 3)
14. Rechazo forzado → rechazado (para practicar la sustitución)
15. Medios de pago que no suman el total → error de validación

## Datos ficticios

Las identificaciones de la demo (3109999001-004, 3009999003, 199990001-002, 199999999) se consultaron en `GET /fe/ae` del API público el 23/10/2026 y ninguna existe en el padrón (respuesta 404).
