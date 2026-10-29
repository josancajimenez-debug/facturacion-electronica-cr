# Módulo contable

Cada comprobante electrónico **aceptado** genera su asiento de partida doble bajo la **Norma de Contabilidad NIIF para las PYMES, tercera edición (IASB, febrero de 2025)**, la única edición que aplica y cita el sistema. A partir de esos asientos se obtienen el libro diario, el libro mayor, el balance de comprobación y el libro de inventarios y balances. Las reglas siguen el prompt del motor contable v2.1 (`prompt_sistema_contabilidad_niif_pymes_cr_v2.1.md`, en la carpeta del curso).

## Marco contable: NIIF para las PYMES 2025

- **Edición única:** todas las citas (fundamento de cada asiento, manual de cuentas, notas) usan la tercera edición con los nombres oficiales de sus 35 secciones (`SECCIONES_NIIF` y `seccionNiif()` en `packages/core/src/cuentas.ts`).
- **Vigencia:** obligatoria para periodos anuales que comienzan a partir del 1/01/2027. En periodos anteriores el sistema la aplica anticipadamente, como lo permite el Apéndice A, y la Nota 2 de los estados financieros revela ese hecho.
- **Sección 11 «Instrumentos Financieros»** (unifica las antiguas 11 y 12): el deterioro de las cuentas por cobrar exige evidencia objetiva de una pérdida incurrida (párrafos 11.21 a 11.26), evaluada individualmente o en grupo por riesgo crediticio similar; la tercera edición no admite pérdidas crediticias esperadas futuras.
- **Sección 12 «Medición del Valor Razonable»:** sección nueva; el sistema mide al costo histórico.
- **Sección 23 «Ingresos de Actividades Ordinarias Procedentes de Contratos con Clientes»:** modelo de cinco pasos; el ingreso se reconoce al transferir el control, con el comprobante aceptado como evidencia.
- **Sección 8:** la Nota 3 revela «información material o con importancia relativa sobre políticas contables» (párrafos 8.4 a 8.6) e incluye juicios y estimaciones.
- **Sección 10 «Políticas Contables, Cambios en las Estimaciones Contables y Errores»:** vida útil, deterioro e impuesto sobre la renta son estimaciones contables (cambios prospectivos).
- **Alcance (Sección 1) y Grandes Contribuyentes Nacionales:** la NIIF para las PYMES no aplica a entidades con obligación pública de rendir cuentas. La DGT exige NIIF completas a los Grandes Contribuyentes Nacionales (oficio MH-DGT-OF-0201-2025; comunicado CCPCR DE-0028-2025): si la política «Gran Contribuyente Nacional» está marcada, cada asiento lleva la alerta `MARCO_NIIF_COMPLETAS` y requiere revisión.
- **Base fiscal:** los registros siguen el art. 128 del CNPT y los criterios de la Resolución DGT-R-029-2018 para las diferencias entre la base contable y la fiscal.
- **Operaciones sin comprobante electrónico:** no se contabilizan aquí; se reportan en la D-270 (RES-0055-2025 y RES-0010-2026).

> Los asientos son **propuestas en borrador**: no sustituyen el criterio ni la aprobación del contador responsable. Es un entorno de simulación.

## Componentes

| Archivo | Contenido |
| --- | --- |
| `packages/core/src/cuentas.ts` | Catálogo de cuentas de cuatro niveles con su **manual** (descripción, cuándo se debita y cuándo se acredita, sección NIIF) y la edición NIIF aplicable a cada fecha |
| `packages/core/src/contabilidad.ts` | Lectura del comprobante (emitido o XML recibido), clasificación por CAByS, tratamiento del IVA, kárdex al costo promedio ponderado, generación del asiento y del libro diario |
| `packages/core/src/apertura.ts` | Balance de apertura: aporte de capital o saldos iniciales de una empresa en marcha, lectura del balance en CSV o pegado desde Excel, validación del cuadre e inventario inicial por artículo para el kárdex |
| `packages/core/src/libros.ts` | Libro mayor, balance de comprobación y estados financieros |
| `packages/core/src/indicadores.ts` | Indicadores financieros (KPI): cálculo, semáforo, análisis del resultado y diagnóstico |
| `apps/web/src/lib/contabilidad.ts` | Arma el libro con los datos del emisor activo; guarda políticas y apertura en el navegador |
| Páginas `CatalogoCuentas`, `BalanceApertura`, `LibroDiario`, `LibroMayor`, `AjustesCierre`, `EstadosFinancieros` | Menú **Contabilidad**; además, la pestaña «Asiento contable» del detalle de cada comprobante y el botón «Asiento» en Recepción |

Los asientos **se derivan** de los comprobantes en cada consulta: el mismo comprobante produce siempre el mismo asiento, y no se guardan en la base de datos. Las políticas contables y el asiento de apertura se guardan por emisor en el navegador.

## Balance de apertura

Menú **Contabilidad → Balance de apertura**. Dos modalidades:

- **Inicio de operaciones:** aporte de capital en efectivo (Bancos contra Capital social pagado).
- **Empresa en marcha:** la tabla de saldos presenta **todas las cuentas de activo, pasivo y patrimonio del catálogo** (clases, grupos y subcuentas con sus subtotales, la ecuación contable y un aviso si un saldo queda contrario a la naturaleza de la cuenta); solo se digitan los montos. También se puede anexar el balance anterior en CSV (coma, punto y coma o tabulador) o se pegan las celdas de Excel. Columnas: código de la cuenta del catálogo, nombre (opcional) y debe y haber, o un único saldo con signo. Se omiten encabezados, subtotales y totales; solo se aceptan subcuentas de activo, pasivo y patrimonio, y el balance debe cuadrar. Hay una plantilla descargable con todas las cuentas de balance.

El inventario inicial puede detallarse por artículo (CAByS, cantidad y costo) para que el kárdex calcule el costo de ventas al promedio; su suma debe coincidir con 1.1.03.01. En los estados financieros los saldos iniciales se presentan como **saldo al inicio del periodo**: no aparecen como aportes de capital en el estado de cambios en el patrimonio ni como flujos en el estado de flujos de efectivo.

## Transición a la tercera edición

Página **Transición NIIF PYMES** (`core/transicion.ts`). Primero se elige el camino, porque no se mezclan:

- **Primera adopción (Sección 35)**: la entidad viene de otro marco (base fiscal, caja, PCGA locales). La fecha de transición es el comienzo del periodo comparativo (para el primer ejercicio 2027, el 1/01/2026). Muestra las 7 excepciones obligatorias del 35.9 (incluidas las nuevas *préstamos del gobierno* y *contratos completados*) y las 15 exenciones del 35.10, que se deciden partida por partida con su justificación. Concilia el patrimonio (35.13) y advierte si un ajuste rehace estimaciones (vidas útiles, valores residuales), algo que el 35.9(c) no permite salvo error.
- **Cambio de edición (Apéndice A)**: la entidad ya aplicaba la segunda edición. Aplica la tercera de forma retroactiva según la Sección 10, salvo los tratamientos de A3 a A49; varios son prospectivos (Secciones 12, 16, 17, 18, 19 y 26) y la Sección 23 admite elegir. Las exenciones del 35.10 no aplican.

Incluye la matriz de brechas de las 35 secciones con la naturaleza del cambio según el resumen oficial de la Norma. El plan se guarda con la configuración contable del emisor. La metodología se tomó de la guía AIC-CILEA de octubre de 2026, corregida donde difiere de la Norma (véase [REVISION_GUIA_NIIF_PYMES.md](REVISION_GUIA_NIIF_PYMES.md)).

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
- Catálogo de cuentas editable por la entidad.

## Indicadores financieros (KPI)

Pestaña **Indicadores (KPI)** de Estados financieros (`core/indicadores.ts`). Calcula 24 razones sobre el estado de situación al corte y el estado de resultados del periodo, en cinco grupos:

| Grupo | Indicadores | Fuente principal |
| --- | --- | --- |
| Liquidez | Razón corriente, prueba ácida, razón de efectivo, capital de trabajo neto (fondo de maniobra), días de autonomía (medida del intervalo) | Ross, cap. 3 (ec. 3.1 a 3.5); Amat, cap. 8; Court, cap. 2 |
| Actividad | Días de inventario y rotación, periodo medio de cobro, periodo medio de pago, ciclo de conversión del efectivo, rotación de activos totales | Ross, cap. 3 (ec. 3.12 a 3.18); Amat, cap. 8; Berk, cap. 26 |
| Endeudamiento | Razón de endeudamiento, deuda a patrimonio, multiplicador del capital, calidad de la deuda, cobertura de gastos financieros | Ross, cap. 3 (ec. 3.6 a 3.10); Amat, cap. 8 |
| Rentabilidad | Márgenes bruto, EBITDA, operativo y neto; ROA; ROE con la identidad Du Pont | Ross, cap. 3 (ec. 3.19 a 3.21); Amat, caps. 9 y 10; Soriano y Amat |
| Efectivo y valor | Conversión de la utilidad en efectivo, valor económico agregado (EVA), calificación Z″ de Altman | Ross, cap. 2; Brealey, Myers y Allen, caps. 13 y 24 |

Cada tarjeta muestra el valor, un semáforo (favorable, vigilar, desfavorable o sin datos), la tendencia frente al mismo corte del año anterior y el análisis del resultado con la acción sugerida. Al desplegarla explica qué mide, la fórmula, el cálculo con las cifras de la empresa, cómo se interpreta, la referencia y la fuente. Arriba, el **análisis de resultados** resume los cinco grupos y las acciones prioritarias; abajo, la descomposición Du Pont del ROE y la barra del ciclo de conversión del efectivo.

Criterios de cálculo:

- Las rotaciones, el ROA, el ROE y la UAII de la Z″ se **anualizan** (× 365 ÷ días del periodo) cuando el corte es anterior al 31 de diciembre; los días de inventario, cobro y pago usan los días del periodo.
- Se usan saldos al corte, no promedios, como en las razones de la industria (Ross, cap. 3).
- El **costo de capital** (12 % por omisión) lo define el usuario y se guarda con la configuración contable; se usa en el ROE y el EVA.
- Los rangos son orientativos. Donde la bibliografía da un rango, se usa ese (Amat: liquidez entre 1 y 2, endeudamiento hasta 0,6); en los demás, la tarjeta indica que es una referencia práctica que debe compararse con el sector y con la historia de la empresa.
- Una división entre cero no produce un número: la tarjeta muestra «N/A» con el motivo (por ejemplo, sin deuda no hay cobertura de intereses que medir). Una empresa sin saldos ni operaciones aparece completa como «sin datos».
- Los gastos financieros del catálogo incluyen comisiones y diferencias de cambio, y las cuentas por cobrar incluyen el IVA. Por eso la cobertura de intereses es conservadora y el periodo de cobro tiende a ser algo mayor que el real.

El CSV de estados financieros incluye los indicadores y el diagnóstico.

## Fuentes

- Consejo de Normas Internacionales de Contabilidad (IASB). (2025). *Norma de Contabilidad NIIF para las PYMES* (3.ª ed., febrero de 2025). IFRS Foundation. Secciones 2 a 8, 10, 11, 13, 17, 18, 20 a 23, 29, 30, 32 y 35; Apéndice A (fecha de vigencia y transición).
- Asociación Interamericana de Contabilidad y Comité de Integración Latino Europa-América. (2026, octubre). *Guía de implementación NIIF para las PYMES y micropymes en todas las jurisdicciones* (N. Aragón Granja, R. Helouani et al.; revisión técnica de I. Estrella).
- Amat, O. *Contabilidad y finanzas para Dummies*. Caps. 8 (Estudio de los ratios), 9, 10 y 21.
- Berk, J., DeMarzo, P. y Harford, J. *Finanzas corporativas*. Caps. 2 (análisis de estados financieros) y 26 (administración del capital de trabajo).
- Brealey, R. A., Myers, S. C. y Allen, F. *Principios de finanzas corporativas* (9.ª ed.). Caps. 13 (valor económico agregado) y 24 (modelos de calificación de crédito).
- Court, E. *Aplicaciones para finanzas empresariales*. Cap. 2 (fondo de maniobra y razones financieras).
- Ross, S. A., Westerfield, R. W. y Jordan, B. D. *Fundamentos de finanzas corporativas* (9.ª ed.). Caps. 2 y 3 (análisis de razones e identidad Du Pont).
- Soriano, M. J. y Amat, O. (coord.). *Introducción a la contabilidad y las finanzas*. Resultado operativo y EBITDA.
- Asamblea Legislativa de la República de Costa Rica. (1964). *Código de Comercio* (Ley N.° 3284), arts. 251 a 263.
- Asamblea Legislativa de la República de Costa Rica. (1971). *Código de Normas y Procedimientos Tributarios* (Ley N.° 4755), art. 128.
- Asamblea Legislativa de la República de Costa Rica. (1982). *Ley del Impuesto al Valor Agregado* (Ley N.° 6826), art. 27.
- Asamblea Legislativa de la República de Costa Rica. (1988). *Ley del Impuesto sobre la Renta* (Ley N.° 7092), art. 4 (periodo fiscal).
- Colegio de Contadores Públicos de Costa Rica. (2025, 2 de junio). *Comunicado DE-0028-2025* (oficio MH-DGT-OF-0201-2025: NIIF completas para los Grandes Contribuyentes Nacionales).
- Dirección General de Tributación. (2018). *Criterios interpretativos sobre la aplicación de las NIIF respecto a la normativa tributaria* (Resolución DGT-R-029-2018).
- Dirección General de Tributación. (2024). *Anexos y estructuras para la emisión de comprobantes electrónicos* (Versión 4.4, con bitácora de ajustes al 22 de abril de 2026): notas 5, 6, 8, 9 y 18.
- Dirección General de Tributación. (2025, 9 de octubre). *Formulario de la Declaración «Informativa Resumen Mensual de Clientes, Proveedores y Gastos Específicos que no estén amparados en un comprobante electrónico»* (Resolución MH-DGT-RES-0055-2025; plazos de la Resolución MH-DGT-RES-0010-2026).
