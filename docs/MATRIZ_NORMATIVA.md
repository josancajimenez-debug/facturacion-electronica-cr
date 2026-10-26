# Matriz normativa — Comprobantes electrónicos de Costa Rica

Fecha de consulta de todas las fuentes: **23 de octubre de 2026**.

Método: primero se consultaron los enlaces oficiales de SINALEVI (ficha de la norma, versión vigente, normas afectantes y observaciones) y la documentación del API público de Hacienda; luego se contrastaron con los documentos de la carpeta `Bibliogafía`. Se priorizó la norma vigente. Donde las fuentes no coinciden se deja constancia en la sección 3.

> El enlace de SINALEVI de la Resolución 27 que se recibió apunta a la **versión 1 de 3**. La versión vigente es la **3 de 3 (27/08/2025)**, que ya incorpora las reformas de las resoluciones MH-DGT-RES-0001-2025 y MH-DGT-RES-0043-2025. Esta matriz usa la versión vigente. La copia de la carpeta `Bibliogafía` es la versión original (Transitorio I de «seis meses») y conviene reemplazarla por la vigente.

> **Actualización v4.4 («4.4 v2»), revisada el 26/10/2026.** Contraste del comunicado DGT con el Decreto 44739-H (arts. 8, 10, 12, 19 y 20), la RES-0027-2024 (arts. 1, 9 y 10) y cuatro fuentes secundarias coincidentes (KPMG, FACBOX, Factura Profesional y Delfino/Cámara de Pymes). SINALEVI bloquea la descarga automatizada, por lo que el texto de las normas se tomó de las copias de SINALEVI incluidas en la bibliografía. Ninguna norma publicada transcribe los códigos 13-17: están en el Anexo técnico, que debe descargarse de la OVi para la verificación final.

## 1. Normas vigentes y su aplicación

| # | Norma | Publicación | Estado (SINALEVI) | Disposiciones relevantes | Dónde se aplica en el proyecto |
| --- | --- | --- | --- | --- | --- |
| 1 | **Resolución MH-DGT-RES-0027-2024**, disposiciones técnicas de los comprobantes electrónicos | 13/11/2024; Alcance 186, La Gaceta 217 (19/11/2024). Fe de erratas: La Gaceta 226 (2/12/2024) | Vigente desde 19/11/2024. Versión 3 de 3 (27/08/2025) | Art. 1 formatos según *Anexos y Estructuras*; art. 2 consecutivo; art. 3 clave de 50 dígitos; art. 4-5 QR y representación gráfica en PDF entregada en el acto; art. 6 controles y bitácoras; art. 7 proveedores de sistemas; art. 9 NC/ND y comprobantes rechazados; art. 10 confirmación del receptor en 8 días hábiles desde el 1.er día del mes siguiente; art. 11 validación de Hacienda en máximo 3 horas; art. 12 deroga DGT-R-12-2018, DGT-R-39-2018 y DGT-R-033-2019; Transitorio I: v4.4 obligatoria nueve meses después del 1/12/2024, uso voluntario desde 1/4/2025 (RES-0001-2025), prórroga excepcional no posterior al 6/10/2025 (RES-0043-2025); Transitorio III: QR suspendido | `core/clave.ts`, `core/xml.ts`, `core/simulador.ts`, `web/lib/pdf.ts` (QR opcional y apagado por defecto), bitácora, módulo de Recepción |
| 2 | ***Anexos y Estructuras para la Emisión de Comprobantes Electrónicos* v4.4** (DGT, nov. 2024) + comunicado de actualización | Documento técnico (Anexo 1 estructuras y notas 1-23; Anexo 2 firma XAdES-EPES; Anexo 3 API de recepción) | Obligatorio desde 1/09/2025 (Transitorio I reformado; lo confirma el considerando IV del Decreto 45953-H) | Siete tipos de comprobante (FE, FEE, FEC, TE, NC, ND, REP); condición de cada campo por tipo (1 obligatorio, 2 condicional, 3 opcional, 4 inexistente); validación en tres niveles; reglas de cálculo; redondeo a 5 decimales; medios de pago con SINPE Móvil (06) y plataforma digital (07); `MedioPago` dentro del resumen; notas 20-23 nuevas | `core/catalogos.ts` (todas las notas), `core/calculos.ts`, `core/validaciones.ts`, `core/xml.ts` (matriz de condición por tipo) |
| 3 | **Decreto Ejecutivo N.° 44739-H**, Reglamento de comprobantes electrónicos para efectos tributarios | Dado el 2/10/2024; publicado el 8/11/2024 | Vigente; derogó el Decreto 41820-H | Art. 2 definiciones (FEC, REP, receptor manual, contingencia); art. 4 obligaciones; art. 7-8 excepciones; art. 9 comprobantes autorizados; art. 10 anulación solo por NC/ND; art. 13 requisitos; art. 14 requisitos del sistema (numeración automática, fecha inaccesible al usuario, consulta por criterios); art. 18-21 entrega, rechazo, confirmación, envío inmediato (sin internet: 2 días hábiles); art. 22 conservación por 5 años; art. 23 contingencia; art. 24 infracciones (arts. 83, 85 y 86 CNPT) | Flujo de emisión, sustitución de rechazados, situación 2 y 3, filtros de consulta, descargas |
| 4 | **Decreto Ejecutivo N.° 45953-H**, adición del inciso 3 al art. 22 del Reglamento de Procedimiento Tributario | 29/09/2026; Alcance 139, La Gaceta 196 (16/10/2026) | Vigente desde su publicación (SINALEVI ya lo incorpora al Decreto 38277-H) | Registrar en el RUT los teléfonos SINPE Móvil usados como medio de pago. Transitorio: la AT tiene 3 meses para adecuar sistemas y emitir la resolución general; los inscritos tienen 12 meses desde la vigencia de esa resolución. Sanción: art. 83 CNPT | Registro de números SINPE del emisor, advertencia al cobrar con código 06 sin números, reporte por medio de pago |
| 5 | **Ley N.° 4755**, Código de Normas y Procedimientos Tributarios | 3/05/1971; La Gaceta 117 (4/06/1971) | Vigente; versión 22 de 22 (13/11/2025) | Art. 83 incumplimiento en el suministro de información (2 % de ingresos brutos, mín. 3 y máx. 100 salarios base); art. 85 no emisión o no entrega (2 salarios base); art. 85 bis no aceptar medios alternativos de pago (1 salario base); art. 86 cierre de 5 días por reincidencia; art. 109 conservar comprobantes 5 años | Advertencias y documentación; descarga y conservación de XML/PDF |
| 6 | **Ley N.° 6826**, Ley del IVA (reformada por el Título I de la Ley 9635) | 8/11/1982 | Vigente; versión 31 de 31 (7/04/2026) | Art. 10 tarifa 13 %; art. 11 tarifas reducidas; art. 20 el crédito fiscal exige comprobantes autorizados; art. 27 pago diferido hasta 90 días en ventas a crédito de MiPyMEs y otros sujetos | Tarifas (nota 8.1), condiciones 10/11 y Recibo Electrónico de Pago |
| 7 | **Ley N.° 9635**, Fortalecimiento de las finanzas públicas | 3/12/2018; Alcance 202, La Gaceta 225 (4/12/2018) | Vigente; versión 28 de 28 (7/04/2026) | Reforma integral de la LIVA. El Anexo exige el tipo de cambio de referencia del BCCR para USD «conforme lo establece la Ley 9635» | Tipo de cambio desde el API público de Hacienda |
| 8 | **Ley N.° 3284**, Código de Comercio | 30/04/1964; La Gaceta 119 (27/05/1964) | Vigente; versión 30 de 30 (3/06/2026) | Art. 460 factura electrónica como título ejecutivo con firma digital del comprador; art. 460 bis endoso y aceptación por comprobantes o mensajes de confirmación firmados; art. 460 ter aceptación conforme al procedimiento de la DGT | Mensaje de confirmación del receptor; firmas de receptor y endoso: fuera de alcance |
| 9 | **Decreto N.° 38277-H**, Reglamento de Procedimiento Tributario | 7/03/2014; Alcance 10, La Gaceta 65 (2/04/2014) | Vigente; versión 10 de 10 (29/09/2026) | Art. 22 inscripción, actividad económica, correo de notificaciones y números SINPE (inc. 3) | Datos del emisor |
| 10 | **Decreto N.° 41779-H**, Reglamento de la Ley del IVA | 7/06/2019; Alcance 129, La Gaceta 108 (11/06/2019) | Vigente; versión 16 de 16 (27/10/2025) | Citado por la RES-0027 (arts. 25, 29, 54 y 60 inc. 4). El Anexo remite al art. 32 num. 1 (tarifa 0 % con crédito) y al art. 11 (servicios complementarios a la exportación) | Tarifa 01; exoneración 09 |
| 11 | **Ley N.° 7092** (Impuesto sobre la Renta) y **Decreto 43198-H** (Reglamento) | Ley: 21/04/1988, La Gaceta 96 (19/05/1988). Reglamento: 22/07/2021, Alcance 257, La Gaceta 243 (17/12/2021) | Vigentes; versiones 83 de 83 (13/11/2025) y 5 de 5 (15/11/2023) | Fundamento de la aceptación de comprobantes como respaldo de gastos deducibles (citados por la RES-0027 y el Decreto 44739-H) | Confirmación del receptor: gasto aplicable y condición del IVA |
| 12 | **Resolución MH-DGT-RES-0043-2025**, modificaciones por TRIBU-CR | 27/08/2025; Alcance 114, La Gaceta 166 (5/09/2025) | Vigente | Art. 21 reforma el Transitorio I de la RES-0027; ATV deja de operar y TRIBU-CR inicia el 6/10/2025; el facturador gratuito ATV v4.3 funcionó hasta el 5/10/2025 | Actividades en formato CIIU 4 de TRIBU-CR |
| 13 | **Resolución MH-DGT-RES-0033-2025** (formularios de IVA) y **MH-DGT-RES-0013-2024** (deber de declarar de exentos) | 22/07/2025 y 10/06/2024 | Vigentes | Formularios de declaración del IVA en TRIBU-CR; los exentos deben presentar la D-104 | Reportes de apoyo (no sustituyen la declaración) |
| 14 | **Catálogo CAByS 2025** (BCCR, comunicado CP-BCCR-015-2025) | 1/04/2025 | Vigente | Código de 13 dígitos por línea (nota 17); la columna «Impuesto» orienta la tarifa del IVA | Los 20 506 códigos se usan en la búsqueda y en la validación de nivel 3 |
| 15 | **División Territorial Administrativa 2022** (Registro Nacional – Instituto Geográfico Nacional), tabla por provincia, cantón y distrito, v3 | 2022 (archivo en la bibliografía) | Referencia oficial de la codificación territorial | 7 provincias, 83 cantones y 488 distritos con códigos de 1, 3 y 5 dígitos | Listas dependientes provincia → cantón → distrito; el XML usa los 2 últimos dígitos de cantón y distrito (nota 14); validación con advertencia |
| 16 | **CodeSystem FHIR «drugs-presentation-code»** – Catálogo de formas farmacéuticas, Ministerio de Salud | Versión 1.1.0-ballot, estado *draft*; página generada el 22/10/2025 | Borrador publicado en la guía FHIR de receta electrónica | 91 formas farmacéuticas con códigos SNOMED CT (1 a 14 dígitos) | Catálogo de referencia del producto y de la línea; se imprime en el PDF. No se envía en el XML (ver sección 3) |
| 17 | **API público del Ministerio de Hacienda** (`api.hacienda.go.cr/docs`) | Consulta del 23/10/2026 | En servicio; límites de 20 solicitudes/s en ráfaga y 10/s sostenidas (bloqueo de IP por 10 min) | `/fe/ae`, `/fe/ex`, `/fe/cabys`, `/indicadores/tc/dolar` | Consulta de actividades del emisor y tipo de cambio (solo lectura). **No** es el API de recepción de comprobantes |

## 2. Requisitos técnicos implementados

| Requisito | Fuente | Implementación |
| --- | --- | --- |
| Consecutivo de 20 dígitos: sucursal (3) + terminal (5) + tipo (2) + número (10); reinicio en 1 al tope | Anexo 1, nota 3 | `generarConsecutivo`, `siguienteNumero` |
| Clave de 50 dígitos: 506 + día + mes + año + cédula (12) + consecutivo + situación + seguridad (8) | RES-0027 art. 3; nota 3 y 4.1 | `generarClave`, `validarClave` |
| Fecha RFC 3339 en hora de Costa Rica, asignada por el sistema | Anexo p. 19; Decreto 44739-H art. 14 inc. 7 | `fechaEmisionCR` |
| Situación 1 normal, 2 contingencia, 3 sin internet | Nota 3; Decreto 44739-H arts. 21 y 23 | Campo «Situación»; validación de referencia al provisional |
| Cálculos: MontoTotal, descuentos sucesivos, SubTotal, BaseImponible, IVA, exoneración, impuesto asumido, ImpuestoNeto, MontoTotalLinea y resumen | Anexo pp. 35-55 | `calcularLinea`, `calcularResumen` (decimal.js, redondeo mitad hacia arriba a 5 decimales) |
| Validación en tres niveles (estructura, formato, base de datos) | Anexo p. 17 | `validarComoHacienda` (simulador) |
| Mensaje de confirmación del receptor (05/06/07) | Anexo sección III; RES-0027 art. 10 | `generarConfirmacion`, módulo Recepción |
| Nombres de archivo `clave.xml`, `clave_respuesta.xml`, `clave.pdf`, `clave-consecutivo.xml` | Nota 3 | `nombresArchivo` |
| Representación gráfica PDF; tipo, clave y consecutivo juntos; descripciones de códigos | RES-0027 art. 5; notas 1 y 7 | `web/lib/pdf.ts` |
| Bitácora de cada transacción | RES-0027 art. 6 | Tabla `bitacora` escrita solo por la función Edge y triggers de PostgreSQL (RLS impide escribirla desde el cliente) |
| Consulta por cédula, número, medio de pago, condición, fecha, montos, impuestos y estados | Decreto 44739-H art. 14 inc. 10 | Página «Comprobantes emitidos» |
| Separación de entornos y bloqueo del envío real | Requisito del encargo | `core/entorno.ts`; la función Edge fija el ambiente «simulacion» y no contiene código de envío real |

### 2.1 Actualización v4.4 vigente desde el 1/11/2026

Disponible en STAG y producción desde el 22/04/2026 con uso voluntario; obligatoria desde el **1/11/2026** (día de Costa Rica, `actualizacionVigente()` en `core/actualizacion.ts`). Criterio: lo que la actualización **permite** se acepta desde ya; lo que **exige** advierte hasta el 31/10/2026 y se rechaza desde el 1/11/2026.

| Cambio | Fuente | Antes del 1/11/2026 | Desde el 1/11/2026 | Implementación |
| --- | --- | --- | --- | --- |
| Códigos 13-17 de la nota 9 y ajuste del 12 | Comunicado DGT; KPMG, FACBOX, Factura Profesional, Delfino | Uso voluntario | 16 obligatorio al sustituir un rechazado (tipo 10) y 17 en el REP | `CODIGO_REFERENCIA`, `validarCodigosActualizacion` |
| 13 solo en NC; 14 en NC o ND; 15 y 16 solo en el comprobante sustituto | Decreto 44739-H arts. 10, 19 y 20; RES-0027 art. 9 | Error | Error | Reglas de uso exclusivo con su fuente normativa |
| 13 → 15: el sustituto de un comprobante anulado por error material lleva el código 15 | Comunicado; Delfino; Decreto 44739-H art. 20 (por analogía) | — | — | Botón «Emitir sustituto (código 15)» en el detalle del original y de la NC |
| 13 y 14 reflejan su efecto contable en el período del comprobante modificado | Comunicado; Delfino; KPMG | — | — | `periodoContable()`; Reportes imputa la nota al período original y lo detalla |
| Códigos 19 (FEE) y 20 (REP) de la nota 10 | Comunicado | Uso voluntario | Disponibles | `TIPO_DOC_REFERENCIA`; NC/ND sobre FEE o REP |
| Clave obligatoria del documento referenciado para los tipos 17, 18, 19 y 20 | FACBOX | Advertencia | Error | `TIPOS_DOC_CON_CLAVE_V2` |
| El REP admite los tipos 01, 04, 07, 08, 10 y 20 (ya no 02 ni 03) | FACBOX | Advertencia (02/03) y uso voluntario (07, 10, 20) | Error con 02 o 03 | `REP_TIPOS_DOC_V2` |
| La NC no puede superar lo facturado más las ND aplicadas | FACBOX | Aceptado con advertencia | Rechazo del simulador (nivel 3) | `excesosNotaCredito()`; la función Edge y el modo local pasan los comprobantes aceptados |
| Cédula jurídica de 10 caracteres alfanuméricos; la clave puede contener letras | Comunicado; FACBOX | Se acepta | Se acepta | `validarIdentificacion`, `REGEX_CLAVE`, migración `20261026000000_clave_alfanumerica.sql` |
| Teléfono sin mínimo de 8 dígitos (p. ej. 911) | FACBOX | Se acepta | Se acepta | Formulario del emisor (3-20 dígitos) |
| Tipo de cambio igual al de referencia de venta del BCCR | FACBOX | Advertencia | Advertencia (el simulador no consulta el BCCR) | `validarBorrador` |

**Cambios de la actualización sin efecto en el simulador:** hasta 5 firmas digitales por documento (no se firma); proporción de impuestos específicos con 5 decimales, surtidos con impuestos específicos e IVA cobrado en fábrica (fuera de alcance); impuesto en el REP = tarifa × subtotal y exentos asociados a la tarifa 10 (ya se calculaban así); código de actividad del receptor (ya incluido).

**Fuera de alcance (no implementado):** firma XAdES-EPES (Anexo 2) y firmas de receptor o endoso; envío real al API de recepción; impuestos específicos no tarifarios (códigos 03-06), IVA cobrado en fábrica (nota 21), IVA de bienes usados por factor (08) y surtidos; el documento oficial de Hacienda «Código de forma farmacéutica» (nota 19) y la tabla «Codigodemoneda_V4.4» (nota 13.1), que no forman parte de la bibliografía.

## 3. Contradicciones y decisiones de interpretación

| Tema | Hallazgo | Decisión |
| --- | --- | --- |
| Vigencia de la v4.4 | El control de cambios del Anexo dice «rige a partir del 01 de junio del 2025»; el Transitorio I reformado de la RES-0027 lleva la obligatoriedad al 1/09/2025, con prórroga excepcional hasta el 6/10/2025 | Prevalece la resolución publicada en La Gaceta (art. 1 RES-0027; art. 12 Decreto 44739-H). El Decreto 45953-H confirma el 1/09/2025 |
| Fecha del Decreto 44739-H | La RES-0027 citaba «8 de noviembre de 2024»; la fe de erratas lo corrige a «2 de octubre de 2024» | Se cita como dado el 2/10/2024 y publicado el 8/11/2024 |
| Nota 6, «Recaudado por terceros» | La tabla asigna 05 a terceros y 06 a SINPE Móvil; la nota al pie 26 habla de «código 06, Recaudado por terceros» | Se sigue la tabla, que coincide con la presentación de setiembre de 2025 |
| Etiqueta de exoneración | La bitácora dice que la etiqueta pasa a «TipoDocumentoEX»; la tabla muestra «TipoDocumentoEX1» | Se usa la de la tabla; debe confirmarse con el XSD oficial |
| Impuesto en el REP | El REP solo admite condiciones 09 y 11, pero el nodo Impuesto es obligatorio «cuando la condición sea 08 y 10» | Se interpreta como la condición de la factura original; el REP siempre lleva impuesto |
| Referencia 08 en el REP | Para el REP se admiten referencias 01-04 y 08 descrita como «Factura Electrónica de Compras»; en la nota 10 el 08 es «Comprobante emitido en contingencia». Según FACBOX, la actualización deja 01, 04, 07, 08, 10 y 20 | Se permite el 08 con la descripción de la nota 10 y se aplica la lista nueva desde el 1/11/2026; queda pendiente de aclaración oficial |
| Total del REP | El TotalComprobante del REP «se obtiene de la suma de los campos Total de la venta», sin el impuesto | Se aplica literalmente y se señala para verificación |
| Códigos nuevos (notas 9 y 10) | El comunicado de actualización agrega 13-17 (nota 9) y 19-20 (nota 10), obligatorios desde el **1.º de noviembre de 2026** (uso voluntario antes), y ajusta el 12, sin transcribir las descripciones de la nota 9 | Se incorporan con las descripciones en que coinciden KPMG, FACBOX, Factura Profesional y Delfino (2026): 12 NC financiera por exoneración posterior; 13 anula por error material; 14 corrige monto por error material; 15 sustituye por error material; 16 sustituye rechazado; 17 pago a comprobante (solo REP). Las reglas de uso de 13-16 se fundamentan en el Decreto 44739-H (arts. 10, 19 y 20) y la RES-0027 (art. 9). El comunicado es vehículo válido: el art. 12 del Decreto 44739-H permite comunicar por aviso los cambios de parametrización que no alteran la estructura. Ver la sección 2.1. Confirmar con el Anexo actualizado |
| Código de actividad | `CodigoActividadEmisor` es String(6); TRIBU-CR publica códigos CIIU 4 con punto («6920.0») y ATV usaba 6 dígitos | Se usa el formato del API público; validar con el XSD vigente |
| Espacios de nombres de los mensajes | La nota 2 no enumera los de MensajeReceptor y MensajeHacienda | Se usa el mismo patrón del CDN; verificar con los XSD |
| Forma farmacéutica (nota 19) | El campo FormaFarmaceutica del XML es String(3) y remite al documento «Código de forma farmacéutica» de Hacienda; el catálogo del Ministerio de Salud usa códigos SNOMED CT de hasta 14 dígitos (solo 5 de 91 caben en 3 caracteres) y está en estado borrador | El catálogo del Ministerio de Salud se usa como referencia descriptiva (producto, línea y PDF). En el XML solo se acepta un código de hasta 3 caracteres digitado por el usuario según la tabla de Hacienda; códigos más largos se rechazan |
| Codificación de ubicación (nota 14) | La nota 14 remite a «Codificacionubicacion_V4.4», no incluido; se usa la DTA 2022 del Registro Nacional. El archivo convertido termina en el distrito 70603 (Pocora, Guácimo), por lo que podría faltar el final de la tabla | Una ubicación ausente del catálogo genera advertencia, no rechazo |
| Material de terceros | El resumen de ACC Contadores habla de «código CAByS de la actividad económica del receptor» | Impreciso: se exige el código de actividad económica, no un CAByS |
| Video de referencia | Charla del Colegio de Contadores Privados de Costa Rica (22/10/2026); no se pudo obtener la transcripción | Se cita solo como referencia; ningún requisito depende de él |

Los XSD oficiales no pudieron descargarse (el CDN respondió *Access Denied*), por lo que el orden de los elementos sigue las tablas del Anexo 1. **Antes de cualquier uso real, el XML debe validarse contra los XSD oficiales.**

## 4. Referencias (APA, 7.ª ed.)

Asamblea Legislativa de la República de Costa Rica. (1964). *Código de Comercio* (Ley N.° 3284). Sistema Costarricense de Información Jurídica. Recuperado el 23 de octubre de 2026, de https://sinalevi.go.cr/ResultadosNormativa/Informacion?param1=6239&param2=151293&param3=1

Asamblea Legislativa de la República de Costa Rica. (1971). *Código de Normas y Procedimientos Tributarios* (Ley N.° 4755). Sistema Costarricense de Información Jurídica. Recuperado el 23 de octubre de 2026, de https://sinalevi.go.cr/ResultadosNormativa/Informacion?param1=6530&param2=148766&param3=1

Asamblea Legislativa de la República de Costa Rica. (1982). *Ley del Impuesto al Valor Agregado* (Ley N.° 6826). Sistema Costarricense de Información Jurídica. Recuperado el 23 de octubre de 2026, de https://sinalevi.go.cr/ResultadosNormativa/Informacion?param1=32526&param2=150649&param3=1

Asamblea Legislativa de la República de Costa Rica. (1988). *Ley del Impuesto sobre la Renta* (Ley N.° 7092). Sistema Costarricense de Información Jurídica. Recuperado el 23 de octubre de 2026, de https://sinalevi.go.cr/ResultadosNormativa/Informacion?param1=10969&param2=148972&param3=1

Asamblea Legislativa de la República de Costa Rica. (2018). *Ley de Fortalecimiento de las Finanzas Públicas* (Ley N.° 9635). Sistema Costarricense de Información Jurídica. Recuperado el 23 de octubre de 2026, de https://sinalevi.go.cr/ResultadosNormativa/Informacion?param1=87720&param2=150648&param3=1

Banco Central de Costa Rica y Ministerio de Hacienda. (2025, 1 de abril). *Actualización del Catálogo de Bienes y Servicios (Cabys) 2025* (Comunicado CP-BCCR-015-2025) [Comunicado de prensa].

Colegio de Contadores Privados de Costa Rica. (2026, 22 de octubre). *Charla: Nuevos ajustes factura electrónica versión 4.4* [Video]. YouTube. https://www.youtube.com/watch?v=NmcMxtNwJHc

Dirección General de Tributación. (2024a). *Anexos y estructuras para la emisión de comprobantes electrónicos* (Versión 4.4) [Documento técnico]. Ministerio de Hacienda.

Dirección General de Tributación. (2024b, 13 de noviembre). *Resolución general sobre las disposiciones técnicas de los comprobantes electrónicos para efectos tributarios* (Resolución MH-DGT-RES-0027-2024). Sistema Costarricense de Información Jurídica. Recuperado el 23 de octubre de 2026, de https://sinalevi.go.cr/ResultadosNormativa/Informacion?param1=103276&param2=143300&param3=3&param4=20

Dirección General de Tributación. (2024c, 10 de junio). *Resolución general sobre el deber formal de declarar que les asiste a los obligados tributarios exentos en el impuesto sobre el valor agregado* (Resolución MH-DGT-RES-0013-2024).

Delfino.cr. (2026, octubre). *Cámara de Pymes recuerda que cambios para corregir facturas electrónicas inician el 1 de noviembre*. https://delfino.cr/2026/10/camara-de-pymes-recuerda-que-cambios-para-corregir-facturas-electronicas-inician-el-1-de-noviembre

Dirección General de Tributación. (2025a). *Comprobantes electrónicos y versión 4.4* [Presentación]. Ministerio de Hacienda.

Dirección General de Tributación. (2025b, 22 de julio). *Formularios y medio para la presentación de declaraciones del impuesto al valor agregado* (Resolución MH-DGT-RES-0033-2025).

Dirección General de Tributación. (2025c, 27 de agosto). *Modificaciones a las resoluciones generales que implementan las distintas funcionalidades y formularios dentro del Sistema Integrado de Gestión Tributaria denominado «TRIBU-CR»* (Resolución MH-DGT-RES-0043-2025). *La Gaceta*, Alcance 114, N.° 166.

Dirección General de Tributación. (2026). *Actualización de los Anexos y Estructuras versión 4.4 y validación de comprobantes electrónicos* [Comunicado]. Ministerio de Hacienda.

Dirección General de Tributación. (s. f.). *Correspondencia de actividades económicas ATV (CIIU 3) – TRIBU-CR (CIIU 4)* [Tabla].

FACBOX. (2026). *Hacienda 4.4 v2: cambios obligatorios en noviembre 2026* [Entrada de blog]. https://facbox.com/blog/hacienda-4-4-v2-cambios-obligatorios-noviembre-2026

Factura Profesional. (2026). *Lo que necesita saber sobre la nueva actualización de la versión 4.4 v2* [Entrada de blog]. https://www.facturaprofesional.com/index.php/blog/lo-que-necesita-saber-sobre-la-nueva-actualizacion-de-la-version-44-v2

Grant Thornton Costa Rica. (2025, setiembre). *Factura electrónica: prepárese para los cambios de la versión 4.4* [Presentación]. CAMTIC.

Instituto Geográfico Nacional y Registro Nacional. (2022). *Tabla por provincias, cantones y distritos de Costa Rica: División territorial administrativa 2022* (v3) [Tabla].

KPMG Costa Rica. (2024, noviembre). *NewsFlash: Reglamento de Comprobantes Electrónicos para efectos tributarios*. https://kpmg.com/cr/es/home/tendencias/2024/11/newsflash-noviembre-2024-2.html

KPMG. (2026, 11 de mayo). *Costa Rica: Changes to annexes and structures of electronic receipts* (Tax News Flash). https://kpmg.com/kpmg-us/content/dam/kpmg/taxnewsflash/pdf/2026/05/tnf-costa-rica-may-11-2026.pdf

Ministerio de Hacienda de Costa Rica. (s. f.). *API Hacienda* [Documentación de API]. Recuperado el 23 de octubre de 2026, de https://api.hacienda.go.cr/docs

Ministerio de Salud de Costa Rica. (2025). *Catálogo de formas farmacéuticas de medicamento* (CodeSystem drugs-presentation-code, versión 1.1.0-ballot) [Conjunto de datos FHIR]. Recuperado el 23 de octubre de 2026, de https://www.ministeriodesalud.go.cr/fhir/receta/CodeSystem-drugs-presentation-code.html

Poder Ejecutivo de la República de Costa Rica. (2014). *Reglamento de Procedimiento Tributario* (Decreto Ejecutivo N.° 38277-H). Sistema Costarricense de Información Jurídica. Recuperado el 23 de octubre de 2026, de https://sinalevi.go.cr/ResultadosNormativa/Informacion?param1=76926&param2=152753&param3=1

Poder Ejecutivo de la República de Costa Rica. (2019). *Reglamento de la Ley del Impuesto sobre el Valor Agregado* (Decreto Ejecutivo N.° 41779-H). Sistema Costarricense de Información Jurídica. Recuperado el 23 de octubre de 2026, de https://sinalevi.go.cr/ResultadosNormativa/Informacion?param1=88953&param2=148633&param3=1

Poder Ejecutivo de la República de Costa Rica. (2021). *Reglamento de la Ley del Impuesto sobre la Renta* (Decreto Ejecutivo N.° 43198-H). Sistema Costarricense de Información Jurídica. Recuperado el 23 de octubre de 2026, de https://sinalevi.go.cr/ResultadosNormativa/Informacion?param1=95992&param2=139872&param3=1

Poder Ejecutivo de la República de Costa Rica. (2024, 2 de octubre). *Reglamento de comprobantes electrónicos para efectos tributarios* (Decreto Ejecutivo N.° 44739-H).

Poder Ejecutivo de la República de Costa Rica. (2026, 29 de setiembre). *Adición al artículo 22 del Reglamento del Procedimiento Tributario, Decreto Ejecutivo N.° 38277-H del 07 de marzo de 2014* (Decreto Ejecutivo N.° 45953-H). *La Gaceta*, Alcance 139, N.° 196.
