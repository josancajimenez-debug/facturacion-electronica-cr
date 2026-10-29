# Módulo contable

Cada comprobante electrónico **aceptado** genera su asiento de partida doble bajo la **Norma de Contabilidad NIIF para las PYMES**. A partir de esos asientos se obtienen el libro diario, el libro mayor, el balance de comprobación y el libro de inventarios y balances. Las reglas siguen el prompt del motor contable v2.1 (`prompt_sistema_contabilidad_niif_pymes_cr_v2.1.md`, en la carpeta del curso).

> Los asientos son **propuestas en borrador**: no sustituyen el criterio ni la aprobación del contador responsable. Es un entorno de simulación.

## Componentes

| Archivo | Contenido |
| --- | --- |
| `packages/core/src/cuentas.ts` | Catálogo de cuentas de cuatro niveles con su **manual** (descripción, cuándo se debita y cuándo se acredita, sección NIIF) y la edición NIIF aplicable a cada fecha |
| `packages/core/src/contabilidad.ts` | Lectura del comprobante (emitido o XML recibido), clasificación por CAByS, tratamiento del IVA, kárdex al costo promedio ponderado, generación del asiento y del libro diario |
| `packages/core/src/apertura.ts` | Balance de apertura: aporte de capital o saldos iniciales de una empresa en marcha, lectura del balance en CSV o pegado desde Excel, validación del cuadre e inventario inicial por artículo para el kárdex |
| `packages/core/src/libros.ts` | Libro mayor, balance de comprobación y estados financieros |
| `apps/web/src/lib/contabilidad.ts` | Arma el libro con los datos del emisor activo; guarda políticas y apertura en el navegador |
| Páginas `CatalogoCuentas`, `BalanceApertura`, `LibroDiario`, `LibroMayor`, `AjustesCierre`, `EstadosFinancieros` | Menú **Contabilidad**; además, la pestaña «Asiento contable» del detalle de cada comprobante y el botón «Asiento» en Recepción |

Los asientos **se derivan** de los comprobantes en cada consulta: el mismo comprobante produce siempre el mismo asiento, y no se guardan en la base de datos. Las políticas contables y el asiento de apertura se guardan por emisor en el navegador.

## Balance de apertura

Menú **Contabilidad → Balance de apertura**. Dos modalidades:

- **Inicio de operaciones:** aporte de capital en efectivo (Bancos contra Capital social pagado).
- **Empresa en marcha:** la tabla de saldos presenta **todas las cuentas de activo, pasivo y patrimonio del catálogo** (clases, grupos y subcuentas con sus subtotales, la ecuación contable y un aviso si un saldo queda contrario a la naturaleza de la cuenta); solo se digitan los montos. También se puede anexar el balance anterior en CSV (coma, punto y coma o tabulador) o se pegan las celdas de Excel. Columnas: código de la cuenta del catálogo, nombre (opcional) y debe y haber, o un único saldo con signo. Se omiten encabezados, subtotales y totales; solo se aceptan subcuentas de activo, pasivo y patrimonio, y el balance debe cuadrar. Hay una plantilla descargable con todas las cuentas de balance.

El inventario inicial puede detallarse por artículo (CAByS, cantidad y costo) para que el kárdex calcule el costo de ventas al promedio; su suma debe coincidir con 1.1.03.01. En los estados financieros los saldos iniciales se presentan como **saldo al inicio del periodo**: no aparecen como aportes de capital en el estado de cambios en el patrimonio ni como flujos en el estado de flujos de efectivo.

## Qué se contabiliza

| Documento | Asiento |
| --- | --- |
| FE, TE, ND emitidas | Caja, Bancos o Tarjetas por liquidar (contado, según el medio de pago) o Clientes (crédito) contra Ingresos (mercancías o servicios según el CAByS) e IVA repercutido. Las mercancías del inventario registran además el costo de ventas |
| FEE | Igual, con Ventas de exportación |
| NC emitida | Devoluciones y descuentos sobre ventas e IVA repercutido contra Clientes o efectivo. Con el código de referencia 06 (devolución de mercancía) la mercadería regresa al inventario al costo promedio |
| Condición de venta 10 u 08 | El IVA va a «IVA por devengar»; el REP lo traslada a «IVA repercutido» al cobrar |
| Comprobantes recibidos y confirmados | Inventario, activo o gasto según el CAByS; IVA acreditable según la **condición del impuesto** del mensaje receptor (01 y 03 total, 02 y 05 según `MontoTotalImpuestoAcreditar`, 04 ninguno); la parte no acreditable se suma al costo |
| Tiquete recibido | Sin crédito fiscal; deducibilidad por revisar |
| FEC | Compra; alerta para verificar la autoliquidación del IVA |
| Rechazados, pendientes, duplicados o de otro receptor | Sin asiento; se listan en el libro diario con el motivo |

**Clasificación de compras por CAByS** (sigue la Clasificación Central de Productos): mercadería si el CAByS está en «Productos y servicios» o en los prefijos de la política; equipo (43-48, 381, 452, 491) y obras (53, 54, 7212) se capitalizan si el **costo unitario** alcanza el umbral de capitalización; combustibles (333); servicios profesionales (81-83); alquileres (7211, 73); servicios públicos y telecomunicaciones (69, 84); mantenimiento (87); transporte (64-68); alimentación (63, deducibilidad por revisar); servicios financieros (71); capacitación (92). El resto va a suministros (bienes) u otros gastos (servicios).

**Fechas:** el asiento lleva la fecha de emisión. Las NC/ND con código 13 o 14 indican además el período tributario del comprobante que modifican; el asiento no se mueve a un período anterior porque los errores se corrigen con un nuevo asiento en la fecha en que se advierten (Código de Comercio, art. 254).

**Moneda extranjera:** se convierte al tipo de cambio del comprobante (Sección 30) y la diferencia de redondeo (hasta ₡1) se lleva a la línea de mayor monto.

## Alertas

Cada asiento indica si **requiere revisión** y por qué: `DESCUADRE_ARITMETICO`, `VERSION_NO_VIGENTE`, `SIN_REFERENCIA`, `SIN_EXISTENCIAS`, `TIQUETE_SIN_CREDITO`, `SIN_CONDICION_IMPUESTO`, `SIN_MONTO_ACREDITABLE`, `ACEPTACION_PARCIAL`, `VERIFICAR_AUTOLIQUIDACION`, `VERIFICAR_NORMA`, `ARRENDAMIENTO` y otras informativas (`ACTIVO_CAPITALIZADO`, `CLASIFICACION`, `AJUSTE_ERROR_MATERIAL`).

## Pendiente para una siguiente etapa

- Aprobación de asientos por el CPI con trazabilidad (usuario, fecha y hora), guardada en la base de datos.
- Asientos manuales y de ajuste: depreciación, estimación de incobrables, liquidación del IVA, provisión del impuesto sobre la renta y cierre del período.
- Catálogo de cuentas editable por la entidad.

## Fuentes

- IFRS Foundation. (2015). *Norma de Contabilidad NIIF para las PYMES* (2.ª ed.). Secciones 2, 10, 11, 13, 17, 18, 20, 22, 23, 29 y 30.
- IFRS Foundation. (2025). *Norma de Contabilidad NIIF para las PYMES* (3.ª ed., febrero de 2025). Vigencia para periodos anuales que comienzan a partir del 1 de enero de 2027.
- Asamblea Legislativa de la República de Costa Rica. (1964). *Código de Comercio* (Ley N.° 3284), arts. 251 a 263.
- Asamblea Legislativa de la República de Costa Rica. (1982). *Ley del Impuesto al Valor Agregado* (Ley N.° 6826), art. 27.
- Dirección General de Tributación. (2018). *Criterios interpretativos sobre la aplicación de las NIIF respecto a la normativa tributaria* (Resolución DGT-R-029-2018).
- Dirección General de Tributación. (2024). *Anexos y estructuras para la emisión de comprobantes electrónicos* (Versión 4.4, con bitácora de ajustes al 22 de abril de 2026): notas 5, 6, 8, 9 y 18.
