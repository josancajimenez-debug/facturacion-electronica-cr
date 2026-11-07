/**
 * Matriz normativa verificada el 23/10/2026 y reverificada el 7/11/2026 contra SINALEVI (fichas, versión
 * vigente y texto de los artículos citados de cada norma) y la bibliografía adjunta. Ver docs/MATRIZ_NORMATIVA.md para el detalle y las citas APA.
 */
export const FECHA_CONSULTA = '7 de noviembre de 2026';

export interface NormaMatriz {
  norma: string;
  datos: string;
  estado: string;
  disposiciones: string;
  implementacion: string;
  url?: string;
}

const S = 'https://sinalevi.go.cr/ResultadosNormativa/Informacion?';

export const MATRIZ: NormaMatriz[] = [
  {
    norma: 'Resolución MH-DGT-RES-0027-2024 – Disposiciones técnicas de los comprobantes electrónicos',
    datos: '13/11/2024 · Alcance 186, La Gaceta 217 del 19/11/2024 · Fe de erratas La Gaceta 226 del 2/12/2024',
    estado: 'Vigente desde 19/11/2024; SINALEVI versión 3 de 3 (27/08/2025), verificada el 26/10/2026 y el 7/11/2026. Transitorio I reformado: párrafo 1 por la RES-0001-2025 (Alcance 20, La Gaceta 29 del 13/02/2025) y párrafo 2 por la RES-0043-2025. El resto del articulado no cambió.',
    disposiciones: 'Art. 1 formatos (Anexos y Estructuras); 2 consecutivo; 3 clave de 50 dígitos; 4-5 QR y representación gráfica PDF; 6 bitácoras; 7 proveedores; 9 NC/ND y rechazos; 10 confirmación del receptor en 8 días hábiles; 11 validación MH en máx. 3 horas; 12 deroga DGT-R-12-2018, DGT-R-39-2018 y DGT-R-033-2019; Transitorio I v4.4 obligatoria tras 9 meses desde 1/12/2024 (voluntaria desde 1/4/2025; prórroga máx. 6/10/2025); Transitorio II registro de medicamento y forma farmacéutica desde 1/01/2025; Transitorio III QR suspendido.',
    implementacion: 'core/clave.ts, core/xml.ts, core/simulador.ts (secuencia del consecutivo), lib/pdf.ts (QR opcional y apagado), bitácora, Recepción (plazo 8 días hábiles).',
    url: `${S}param1=103276&param2=147532&param3=1`,
  },
  {
    norma: 'Anexos y Estructuras para la Emisión de Comprobantes Electrónicos v4.4 (DGT, nov. 2024; bitácora de ajustes al 22/04/2026) y comunicado de actualización',
    datos: 'Anexo 1 (estructuras y notas 1-23), Anexo 2 (firma XAdES-EPES), Anexo 3 (API de recepción). Publicado en la OVi de TRIBU-CR.',
    url: 'https://ovitribucr.hacienda.go.cr/comprobantes-electronicos',
    estado: 'Obligatoria desde 1/09/2025 según el Transitorio I reformado (confirmado en el considerando IV del Decreto 45953-H). Actualización «4.4 v2»: voluntaria desde el 22/04/2026 y obligatoria desde el 1/11/2026.',
    disposiciones: 'Tipos FE, FEE, FEC, TE, NC, ND, REP; condición de campos 1-4; validación en 3 niveles; reglas de cálculo; SINPE Móvil (06) y Plataforma digital (07) en nota 6; MedioPago dentro del resumen; nuevas notas 20-23. Actualización: códigos 13-17 (nota 9) y 19-20 (nota 10), efecto de 13/14 en el período original, límite de la NC, tipos de referencia del REP, cédula jurídica alfanumérica, teléfono 911, fórmula del IVA devuelto. Tablas oficiales de monedas (nota 13.1) y formas farmacéuticas (nota 19).',
    implementacion: 'core/catalogos.ts (todas las notas), core/calculos.ts, core/validaciones.ts, core/xml.ts (matriz de condición por tipo), core/actualizacion.ts (vigencia del 1/11/2026, período contable y saldo de la NC).',
  },
  {
    norma: 'Decreto Ejecutivo N.° 44739-H – Reglamento de comprobantes electrónicos para efectos tributarios',
    datos: 'Dado el 2/10/2024 · Alcance 181, La Gaceta 210 del 8/11/2024',
    estado: 'Vigente desde el 8/11/2024; SINALEVI versión 1 de 1, sin reformas al 7/11/2026. Su art. 26 derogó el Decreto 41820-H.',
    disposiciones: 'Art. 2 definiciones (incl. REP y FEC); 4 obligaciones; 5-7 proveedores y excepciones; 9 comprobantes autorizados; 10 anulación por NC/ND; 13 requisitos; 14 requisitos del sistema (consulta por criterios); 18-21 entrega, rechazo, confirmación y envío (sin internet: 2 días hábiles); 22 conservación 5 años; 23 contingencia; 24 sanciones (arts. 83, 85 y 86 CNPT).',
    implementacion: 'Flujos de emisión, sustitución de rechazados, contingencia/sin internet, filtros de consulta, descarga de XML/PDF.',
    url: `${S}param1=103206&param2=143152&param3=1`,
  },
  {
    norma: 'Decreto Ejecutivo N.° 45953-H – Adición al art. 22 del Reglamento de Procedimiento Tributario (SINPE Móvil en el RUT)',
    datos: '29/09/2026 · Alcance 139, La Gaceta 196 del 16/10/2026',
    estado: 'Vigente desde el 16/10/2026; SINALEVI versión 1 de 1. La AT tiene hasta el 16/01/2027 (3 meses) para adecuar el RUT y emitir la resolución general, que al 7/11/2026 no se ha publicado; los inscritos tendrán 12 meses desde la vigencia de esa resolución.',
    disposiciones: 'Registrar en el RUT los números de teléfono vinculados a SINPE Móvil usados como medio de pago; incumplimiento: sanción del art. 83 CNPT.',
    implementacion: 'Registro de números SINPE del emisor; advertencia al cobrar con medio 06 sin números registrados; reporte por medio de pago.',
    url: `${S}param1=108088&param2=152737&param3=1`,
  },
  {
    norma: 'Ley N.° 4755 – Código de Normas y Procedimientos Tributarios',
    datos: '3/05/1971 · La Gaceta 117 del 4/06/1971',
    estado: 'Vigente; SINALEVI versión 22 de 22 (13/11/2025).',
    disposiciones: 'Art. 83 incumplimiento en el suministro de información (2 % de ingresos brutos, mín. 3 y máx. 100 salarios base); 85 no emisión o entrega de comprobantes (2 salarios base); 85 bis no aceptación de medios alternativos de pago; 86 cierre por reincidencia (5 días naturales); 109 conservación por 5 años.',
    implementacion: 'Mensajes de advertencia y documentación; conservación y descarga de documentos.',
    url: `${S}param1=6530&param2=148766&param3=1`,
  },
  {
    norma: 'Ley N.° 6826 – Ley del Impuesto al Valor Agregado (reformada por el Título I de la Ley 9635)',
    datos: '8/11/1982',
    estado: 'Vigente; SINALEVI versión 31 de 31 (7/04/2026).',
    disposiciones: 'Art. 10 tarifa general 13 %; art. 11 tarifas reducidas (4 %, 2 %, 1 % y 0,5 %); art. 20 el crédito fiscal requiere comprobantes autorizados; art. 27 pago diferido del IVA de las ventas a crédito, a más tardar a los 90 días de la factura electrónica, solo para trabajadores independientes, profesionales, MiPyMEs y productores inscritos en el MEIC o el MAG; excluye a los Grandes Contribuyentes Nacionales y a la actividad financiera lucrativa (base del REP).',
    implementacion: 'Tarifas de la nota 8.1, condición de venta 10/11 y Recibo Electrónico de Pago; advertencias de la condición 10; IVA diferido en el libro diario y en Reportes (core/ivaDiferido.ts).',
    url: `${S}param1=32526&param2=150649&param3=1`,
  },
  {
    norma: 'Ley N.° 9635 – Fortalecimiento de las finanzas públicas',
    datos: '3/12/2018 · Alcance 202, La Gaceta 225 del 4/12/2018',
    estado: 'Vigente; SINALEVI versión 28 de 28 (7/04/2026).',
    disposiciones: 'Reforma integral de la LIVA (Título I). El Anexo exige el tipo de cambio de referencia del BCCR para USD «conforme lo establece la Ley 9635».',
    implementacion: 'Tipo de cambio desde el API público de Hacienda (indicadores/tc/dolar).',
    url: `${S}param1=87720&param2=150648&param3=1`,
  },
  {
    norma: 'Ley N.° 3284 – Código de Comercio',
    datos: '30/04/1964 · La Gaceta 119 del 27/05/1964',
    estado: 'Vigente; SINALEVI versión 30 de 30 (3/06/2026).',
    disposiciones: 'Art. 460: la factura electrónica es título ejecutivo si cuenta con firma digital del comprador; 460 bis: endoso y aceptación mediante comprobantes o mensajes de confirmación firmados; 460 ter: aceptación conforme al procedimiento de la DGT.',
    implementacion: 'Mensaje de confirmación del receptor; el Anexo prevé firmas del receptor y de endoso (no implementadas en simulación).',
    url: `${S}param1=6239&param2=151293&param3=1`,
  },
  {
    norma: 'Decreto N.° 38277-H – Reglamento de Procedimiento Tributario',
    datos: '7/03/2014 · Alcance 10, La Gaceta 65 del 2/04/2014',
    estado: 'Vigente; SINALEVI versión 10 de 10 (29/09/2026), ya incorpora el inciso 3 del art. 22. La reforma del Decreto 45500-H (La Gaceta 37 del 24/02/2026) no toca el art. 22.',
    disposiciones: 'Art. 22 obligación de inscripción, correo para notificaciones y (inc. 3) números SINPE Móvil.',
    implementacion: 'Datos del emisor: actividades, correos, números SINPE.',
    url: `${S}param1=76926&param2=152753&param3=1`,
  },
  {
    norma: 'Decreto N.° 41779-H – Reglamento de la Ley del IVA',
    datos: '7/06/2019 · Alcance 129, La Gaceta 108 del 11/06/2019',
    estado: 'Vigente; SINALEVI versión 16 de 16 (27/10/2025). Sus últimas reformas (Decretos 45236-H y 45306-H, 2025) no cambian lo que cita la app.',
    disposiciones: 'Citado en la RES-0027 (arts. 25, 29, 54 y 60 inc. 4) como fundamento de la obligación de comprobantes. El Anexo remite al art. 32 num. 1 (tarifa 0 % con crédito) y art. 11 (servicios complementarios a la exportación). Art. 40 bis (Decreto 44392-H): quién puede diferir el IVA, plazo de 90 días naturales desde la emisión y tres operaciones en cada declaración (rebajar lo no cobrado, sumar lo cobrado de periodos anteriores y sumar lo vencido).',
    implementacion: 'Tarifa 01 (0 % art. 32), exoneración 09; tarjeta «IVA diferido» en Reportes y traslado automático del IVA por devengar a los 90 días.',
    url: `${S}param1=88953&param2=148633&param3=1`,
  },
  {
    norma: 'Ley N.° 7092 – Impuesto sobre la Renta y Decreto 43198-H (Reglamento)',
    datos: 'Ley 21/04/1988 (La Gaceta 96 del 19/05/1988) · Reglamento 22/07/2021 (Alcance 257, La Gaceta 243 del 17/12/2021)',
    estado: 'Vigentes; SINALEVI versiones 83 de 83 (13/11/2025) y 5 de 5 (15/11/2023).',
    disposiciones: 'Citados por la RES-0027 y el Decreto 44739-H como fundamento de la aceptación de comprobantes como respaldo de gastos deducibles. Ley art. 9 inc. f): no se deduce lo pagado por propiedad intelectual e intangibles similares. Reglamento art. 17 inc. g): solo deudas manifiestamente incobrables y justificadas; Anexo 1, punto 1.1: activo de costo unitario hasta el 25 % del salario base como gasto; Anexo 2: vida útil.',
    implementacion: 'Confirmación del receptor (gasto aplicable, condición del IVA). Cierre: estimación por incobrables no deducible; amortización de intangibles y gastos sobre el 25 % del salario base marcados para revisión; vida útil sugerida igual al Anexo 2.',
    url: `${S}param1=10969&param2=148972&param3=1`,
  },
  {
    norma: 'Norma de Contabilidad NIIF para las PYMES, tercera edición (IASB, febrero de 2025)',
    datos: 'Emitida en febrero de 2025 por el Consejo de Normas Internacionales de Contabilidad (IFRS Foundation); traducción oficial al español',
    estado: 'Obligatoria para los periodos que comienzan a partir del 1/01/2027; se permite y se revela la aplicación anticipada (Apéndice A). Es el único marco que aplica el módulo contable. En seguimiento: excepción de consolidación anunciada por el IASB en octubre de 2026, no emitida al 7/11/2026 (no afecta a la app).',
    disposiciones: 'Sección 1 alcance (excluye a las entidades con obligación pública de rendir cuentas); 3 a 8 presentación y notas; 10 políticas, estimaciones y errores; 11 instrumentos financieros (pérdida incurrida, 11.21-11.26); 12 medición del valor razonable; 13 inventarios; 17 propiedades, planta y equipo; 23 ingresos con el modelo de cinco pasos; 29 impuesto a las ganancias.',
    implementacion: 'core/cuentas.ts (SECCIONES_NIIF, seccionNiif), fundamentos de cada asiento, ajustes y cierre, estados financieros y Notas 2 y 3.',
  },
  {
    norma: 'Guía de implementación NIIF para las PYMES y micropymes en todas las jurisdicciones (AIC y CILEA)',
    datos: 'Asociación Interamericana de Contabilidad y Comité de Integración Latino Europa-América, octubre de 2026',
    estado: 'Guía profesional, no normativa: no sustituye a la Norma. Revisada contra el texto oficial; sus diferencias constan en docs/REVISION_GUIA_NIIF_PYMES.md.',
    disposiciones: 'Metodología de seis fases, formularios de diagnóstico (clasificación, matriz de brechas, exenciones), primera adopción (Sección 35) y caso práctico con conciliaciones.',
    implementacion: 'Página «Transición NIIF PYMES» (core/transicion.ts): camino de primera adopción (35.9, 35.10, 35.13) o de cambio de edición (Apéndice A), matriz de brechas por sección y conciliación del patrimonio.',
  },
  {
    norma: 'Resolución DGT-R-029-2018 – Criterios interpretativos sobre la aplicación de las NIIF respecto a la normativa tributaria',
    datos: '15/06/2018',
    estado: 'Vigente hasta el 31/12/2026: la deroga la MH-DGT-RES-0015-2026 (art. 39) desde el 1/01/2027.',
    disposiciones: 'Desarrolla el art. 128 del CNPT: los registros se llevan con las NIIF adoptadas por el Colegio de Contadores Públicos, siempre que no se opongan a las leyes tributarias; regula las diferencias entre la base contable y la fiscal.',
    implementacion: 'Nota 2 de los estados financieros de periodos que inician antes de 2027 (criterioFiscalNiif); marca de gasto no deducible en los asientos.',
  },
  {
    norma: 'Resolución MH-DGT-RES-0015-2026 – Criterios interpretativos sobre la aplicación de las NIIF respecto a la normativa tributaria',
    datos: '8/04/2026 · Alcance 45, La Gaceta 78 del 29/04/2026',
    estado: 'Rige desde el 1/01/2027; SINALEVI versión 1 de 1. Deroga la DGT-R-029-2018 desde esa fecha.',
    disposiciones: 'Art. 2: Grandes Contribuyentes notificados → NIIF completas; los demás eligen NIIF para las PYMES o NIIF; no aplica al Régimen Simplificado ni al Agropecuario. Art. 25: no se acepta el valor neto realizable ni el de mercado como base fiscal. Art. 27: ajustes de conciliación fiscal respaldados (Sección 29). Art. 28.6: intangibles de propiedad intelectual no deducibles. Art. 30: depreciación fiscal solo en línea recta o suma de dígitos con la vida útil del Anexo 2; deterioro y revaluación no deducibles; gasto si el costo es menor al 25 % del salario base. Art. 37 c): hecho generador del IVA = emisión del comprobante, entrega o lo que ocurra primero.',
    implementacion: 'Nota 2 desde 2027; aviso de Grandes Contribuyentes; fundamentos fiscales de la depreciación, la estimación por incobrables y la amortización de intangibles.',
    url: `${S}param1=106985&param2=150940&param3=1`,
  },
  {
    norma: 'Oficio MH-DGT-OF-0201-2025 y comunicado DE-0028-2025 del Colegio de Contadores Públicos de Costa Rica',
    datos: 'Comunicado del 2/06/2025',
    estado: 'Criterio vigente de la DGT; desde el 1/01/2027 lo recoge la RES-0015-2026, art. 2.',
    disposiciones: 'Los Grandes Contribuyentes Nacionales deben fundamentar sus registros contables en las NIIF completas, no en la NIIF para las PYMES.',
    implementacion: 'Política «Gran Contribuyente Nacional» del catálogo: cada asiento lleva la alerta MARCO_NIIF_COMPLETAS y requiere revisión; aviso en los estados financieros.',
  },
  {
    norma: 'Resoluciones MH-DGT-RES-0055-2025 y MH-DGT-RES-0010-2026 y oficio MH-DGT-OF-0306-2026 – Declaración informativa D-270',
    datos: 'RES-0055: 9/10/2025, Alcance 140, La Gaceta 206 (3/11/2025) · RES-0010: Alcance 30, La Gaceta 55 (20/03/2026); comunicado CP-14-2026',
    estado: 'Vigentes. Periodo 2025 anual (junio 2026); 2026 mensual con plazo hasta enero 2027; desde 2027, dentro de los 25 días naturales del mes siguiente.',
    disposiciones: 'Resumen mensual de clientes, proveedores y gastos específicos que no estén amparados en un comprobante electrónico. El oficio 0306-2026 (15/05/2026) aclara que no se reportan cargas sociales, tributos, timbres ni patentes; que la D-270 es eventual (no se presenta en cero) y que el Régimen Especial Agropecuario no está excluido.',
    implementacion: 'Fuera del alcance: el módulo contable solo registra operaciones amparadas en comprobante electrónico; las demás se declaran en la D-270.',
  },
  {
    norma: 'Resolución MH-DGT-RES-0043-2025 – Modificaciones por TRIBU-CR',
    datos: '27/08/2025 · Alcance 114, La Gaceta 166 del 5/09/2025',
    estado: 'Vigente desde el 5/09/2025; SINALEVI versión 1 de 1.',
    disposiciones: 'Art. 21 reforma el Transitorio I de la RES-0027 (prórroga excepcional hasta el 6/10/2025, habilitación de TRIBU-CR y Tico Factura); el facturador gratuito ATV v4.3 funcionó hasta el 5/10/2025.',
    implementacion: 'Actividades económicas en formato CIIU 4 de TRIBU-CR.',
    url: `${S}param1=105219&param2=147508&param3=1`,
  },
  {
    norma: 'Salario base (Ley 7337, art. 2)',
    datos: 'Consejo Superior del Poder Judicial, Circular 246-2025',
    estado: '₡462 200 para 2026 (igual que en 2025).',
    disposiciones: 'Unidad de las multas del CNPT (arts. 83, 85 y 85 bis) y del tope de gasto para activos menores (25 %: ₡115 550; Anexo 1 del Reglamento de Renta).',
    implementacion: 'SALARIO_BASE en core/contabilidad.ts; editable por periodo en «Catálogo de cuentas».',
  },
  {
    norma: 'Catálogo de Bienes y Servicios (CAByS) 2025 – BCCR (comunicado CP-BCCR-015-2025)',
    datos: 'Publicado el 1/04/2025',
    estado: 'Catálogo vigente utilizado por el validador del MH (nota 17).',
    disposiciones: 'Código de 13 dígitos obligatorio por línea; la columna «Impuesto» orienta la tarifa del IVA.',
    implementacion: 'Los 20 506 códigos del catálogo se usan en la búsqueda y en la validación de nivel 3.',
  },
  {
    norma: 'División Territorial Administrativa 2022 – Registro Nacional / Instituto Geográfico Nacional',
    datos: 'Tabla por provincia, cantón y distrito (v3), incluida en la bibliografía',
    estado: 'Referencia oficial; sustituye a «Codificacionubicacion_V4.4» (nota 14), no disponible.',
    disposiciones: '7 provincias, 83 cantones y 488 distritos.',
    implementacion: 'Listas dependientes provincia → cantón → distrito; advertencia si la ubicación no está en el catálogo.',
  },
  {
    norma: 'Catálogo de formas farmacéuticas – Ministerio de Salud (CodeSystem FHIR drugs-presentation-code)',
    datos: 'Versión 1.1.0-ballot, estado borrador',
    estado: 'Borrador publicado en la guía FHIR de receta electrónica.',
    disposiciones: '91 formas farmacéuticas con códigos SNOMED CT.',
    implementacion: 'Referencia en productos, líneas y PDF; el campo FormaFarmaceutica del XML (3 caracteres, nota 19) se llena con el código de Hacienda.',
    url: 'https://www.ministeriodesalud.go.cr/fhir/receta/CodeSystem-drugs-presentation-code.html',
  },
  {
    norma: 'API pública del Ministerio de Hacienda (api.hacienda.go.cr/docs)',
    datos: 'Consultado el 23/10/2026',
    estado: 'Servicio público de consulta, sin autenticación, con límites de 20 solicitudes/s en ráfaga y 10/s sostenidas.',
    disposiciones: '/fe/ae (actividades), /fe/ex (exoneraciones), /fe/cabys, /indicadores/tc/dolar (tipo de cambio).',
    implementacion: 'Consulta de actividades del emisor y tipo de cambio (solo lectura). No es el API de recepción de comprobantes.',
    url: 'https://api.hacienda.go.cr/docs',
  },
];

export const CONTRADICCIONES: { tema: string; detalle: string; decision: string }[] = [
  { tema: 'Entrada en vigor de la v4.4', detalle: 'El control de cambios del Anexo indica «rige a partir del 01 de junio del 2025», pero el Transitorio I de la RES-0027 (reformado por RES-0001-2025 y RES-0043-2025) fija nueve meses desde el 1/12/2024 (1/09/2025), con prórroga excepcional hasta el 6/10/2025.', decision: 'Prevalece la resolución publicada en La Gaceta (art. 1 RES-0027 y art. 12 del Decreto 44739-H). El Decreto 45953-H confirma el 1/09/2025.' },
  { tema: 'Fecha del Decreto 44739-H', detalle: 'La RES-0027 citaba «8 de noviembre de 2024»; la fe de erratas (La Gaceta 226) la corrige a «2 de octubre de 2024». La DGT cita el 8/11/2024 como fecha de la norma.', decision: 'Se cita como dado el 2/10/2024 y publicado el 8/11/2024.' },
  { tema: 'Nota 6: «Recaudado por terceros»', detalle: 'La tabla asigna 05 a «Recaudado por terceros» y 06 a «SINPE MÓVIL», pero la nota al pie 26 habla del «código 06, Recaudado por terceros».', decision: 'Se sigue la tabla (05 tercero, 06 SINPE), coincidente con la presentación de setiembre de 2025.' },
  { tema: 'Etiqueta de exoneración', detalle: 'La bitácora del Anexo dice que «TipoDocumento» pasa a «TipoDocumentoEX», mientras la tabla de estructura muestra «TipoDocumentoEX1».', decision: 'Se usa la etiqueta de la tabla (TipoDocumentoEX1); debe confirmarse con el XSD oficial antes de cualquier uso real.' },
  { tema: 'Impuesto en el Recibo Electrónico de Pago', detalle: 'El REP solo admite condiciones 09 y 11, pero el nodo Impuesto se declara obligatorio «cuando la condición de la venta sea 08 y 10».', decision: 'Se interpreta como la condición de la factura original (08 o 10) y se incluye siempre el impuesto en el REP.' },
  { tema: 'Referencia 08 en el REP', detalle: 'El Anexo de nov. 2024 permitía en el REP los tipos 01, 02, 03, 04 y 08 descritos como «…Factura Electrónica de Compras», pero en la nota 10 el 08 es «Comprobante emitido en contingencia».', decision: 'Resuelto por el Anexo actualizado (22/04/2026): el REP admite 01, 04, 07, 08, 10 y 20, con el 08 como «Comprobante emitido en contingencia». Advertencia antes del 1/11/2026 y error desde esa fecha.' },
  { tema: 'Total del REP', detalle: 'La regla dice que en el REP el TotalComprobante «se obtiene de la suma de los campos Total de la venta», sin sumar el impuesto.', decision: 'Se aplica la regla literal y se señala como punto a verificar.' },
  { tema: 'Códigos nuevos de las notas 9 y 10', detalle: 'El comunicado de actualización agrega los códigos 13-17 (nota 9) y 19-20 (nota 10), obligatorios desde el 1.º de noviembre de 2026 y de uso voluntario antes, y ajusta el 12, pero no transcribe las descripciones de la nota 9.', decision: 'Resuelto con el Anexo actualizado de la OVi (bitácora al 22/04/2026), que trae las descripciones literalmente y coincide con KPMG, FACBOX, Factura Profesional y Delfino. Que el 13 sea exclusivo de la NC y que 15/16 no vayan en notas se deriva del Decreto 44739-H (arts. 10, 19 y 20) y la RES-0027 (art. 9); el art. 12 del Decreto permite comunicar por aviso estos cambios. Antes del 1/11/2026 lo nuevo que se exige genera advertencia; desde esa fecha, error o rechazo.' },
  { tema: 'Datos de la nota frente al comprobante referenciado', detalle: 'El Anexo actualizado indica que «se verificará que los datos informativos incluidos correspondan al comprobante de referencia (por ejemplo, encabezado, tipo de cambio, CAByS, entre otros)», sin decir si su incumplimiento causa rechazo.', decision: 'El simulador compara moneda, tipo de cambio y CAByS de las NC/ND con el comprobante referenciado y lo informa como advertencia.' },
  { tema: 'Formato del código de actividad', detalle: 'El campo CodigoActividadEmisor es String(6); TRIBU-CR publica códigos CIIU 4 con punto (p. ej. «6920.0», 6 caracteres) y ATV usaba 6 dígitos.', decision: 'Se usa el código tal como lo devuelve el API público; debe validarse contra el XSD vigente.' },
  { tema: 'Forma farmacéutica (nota 19)', detalle: 'El XML admite 3 caracteres según la tabla de Hacienda; el catálogo del Ministerio de Salud usa códigos SNOMED de hasta 14 dígitos y está en borrador.', decision: 'Resuelto con la tabla oficial de Hacienda (229 códigos): el XML solo acepta códigos de esa tabla y el PDF imprime su descripción. El catálogo de Salud queda como referencia opcional.' },
  { tema: 'Codificación de ubicación', detalle: 'La nota 14 remite a un archivo de Hacienda no incluido; la DTA 2022 convertida termina en el distrito 70603 (Pocora).', decision: 'Se usa la DTA 2022; una ubicación fuera del catálogo genera advertencia, no rechazo.' },
  { tema: 'Material de terceros', detalle: 'El resumen «Análisis RES-0027» (ACC Contadores) habla de «código CAByS de la actividad económica del receptor».', decision: 'Es impreciso: el Anexo exige el código de actividad económica, no un CAByS. Se descarta.' },
  { tema: 'Dos criterios NIIF–tributarios', detalle: 'La DGT-R-029-2018 sigue vigente en 2026 y la MH-DGT-RES-0015-2026, ya publicada, rige desde el 1/01/2027 (la misma fecha de vigencia obligatoria de la NIIF para las PYMES 2025).', decision: 'Se aplica según el inicio del periodo: antes de 2027, la 029-2018; desde 2027, la 0015-2026 (criterioFiscalNiif).' },
  { tema: 'Umbral contable frente al tope fiscal', detalle: 'La política de capitalización (₡250 000 por omisión) supera el 25 % del salario base (₡115 550), único monto que el Reglamento de Renta permite llevar a gasto de inmediato.', decision: 'El umbral se mantiene como política NIIF; los gastos entre ambos montos quedan con deducibilidad «revisar» para la conciliación fiscal.' },
  { tema: 'Licencias de programas de cómputo', detalle: 'El art. 9 inc. f) de la Ley 7092 excluye lo pagado por derechos de propiedad intelectual e intangibles similares, sin mencionar el software.', decision: 'La amortización de intangibles se marca para revisión, sin rechazar la deducción.' },
  { tema: 'Plazo del IVA diferido', detalle: 'La ley habla de «noventa días posteriores a la emisión de la factura electrónica»; el reglamento, de «noventa días naturales, contados a partir de la emisión».', decision: 'Vence el día 90 contado desde el día siguiente a la emisión; el cobro de ese día todavía está en plazo.' },
  { tema: 'Video de referencia', detalle: 'Charla del Colegio de Contadores Privados (CCPCR, 22/10/2026). No fue posible obtener su transcripción.', decision: 'Se cita solo como referencia; ningún requisito de la app depende de su contenido.' },
];
