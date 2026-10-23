/**
 * Matriz normativa verificada el 23/10/2026 contra SINALEVI (fichas y versión vigente de cada norma)
 * y la bibliografía adjunta. Ver docs/MATRIZ_NORMATIVA.md para el detalle y las citas APA.
 */
export const FECHA_CONSULTA = '23 de octubre de 2026';

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
    estado: 'Vigente desde 19/11/2024; SINALEVI versión 3 de 3 (27/08/2025). Reformada por RES-0001-2025 y RES-0043-2025 (Transitorio I).',
    disposiciones: 'Art. 1 formatos (Anexos y Estructuras); 2 consecutivo; 3 clave de 50 dígitos; 4-5 QR y representación gráfica PDF; 6 bitácoras; 7 proveedores; 9 NC/ND y rechazos; 10 confirmación del receptor en 8 días hábiles; 11 validación MH en máx. 3 horas; 12 deroga DGT-R-12-2018, DGT-R-39-2018 y DGT-R-033-2019; Transitorio I v4.4 obligatoria tras 9 meses desde 1/12/2024 (voluntaria desde 1/4/2025; prórroga máx. 6/10/2025); Transitorio III QR suspendido.',
    implementacion: 'core/clave.ts, core/xml.ts, core/simulador.ts, lib/pdf.ts (QR opcional y apagado), bitácora, Recepción (plazo 8 días hábiles).',
    url: `${S}param1=103276&param2=143300&param3=3&param4=20`,
  },
  {
    norma: 'Anexos y Estructuras para la Emisión de Comprobantes Electrónicos v4.4 (DGT, nov. 2024) y comunicado de actualización',
    datos: 'Anexo 1 (estructuras y notas 1-23), Anexo 2 (firma XAdES-EPES), Anexo 3 (API de recepción)',
    estado: 'Obligatoria desde 1/09/2025 según el Transitorio I reformado (confirmado en el considerando IV del Decreto 45953-H).',
    disposiciones: 'Tipos FE, FEE, FEC, TE, NC, ND, REP; condición de campos 1-4; validación en 3 niveles; reglas de cálculo; SINPE Móvil (06) y Plataforma digital (07) en nota 6; MedioPago dentro del resumen; nuevas notas 20-23.',
    implementacion: 'core/catalogos.ts (todas las notas), core/calculos.ts, core/validaciones.ts, core/xml.ts (matriz de condición por tipo).',
  },
  {
    norma: 'Decreto Ejecutivo N.° 44739-H – Reglamento de comprobantes electrónicos para efectos tributarios',
    datos: 'Dado el 2/10/2024; publicado el 8/11/2024 (según presentación DGT, marzo 2025)',
    estado: 'Vigente; derogó el Decreto 41820-H.',
    disposiciones: 'Art. 2 definiciones (incl. REP y FEC); 4 obligaciones; 5-7 proveedores y excepciones; 9 comprobantes autorizados; 10 anulación por NC/ND; 13 requisitos; 14 requisitos del sistema (consulta por criterios); 18-21 entrega, rechazo, confirmación y envío (sin internet: 2 días hábiles); 22 conservación 5 años; 23 contingencia; 24 sanciones (arts. 83, 85 y 86 CNPT).',
    implementacion: 'Flujos de emisión, sustitución de rechazados, contingencia/sin internet, filtros de consulta, descarga de XML/PDF.',
  },
  {
    norma: 'Decreto Ejecutivo N.° 45953-H – Adición al art. 22 del Reglamento de Procedimiento Tributario (SINPE Móvil en el RUT)',
    datos: '29/09/2026 · Alcance 139, La Gaceta 196 del 16/10/2026',
    estado: 'Vigente desde su publicación. La AT tiene 3 meses para adecuar el RUT y emitir la resolución general; los inscritos tendrán 12 meses desde la vigencia de esa resolución.',
    disposiciones: 'Registrar en el RUT los números de teléfono vinculados a SINPE Móvil usados como medio de pago; incumplimiento: sanción del art. 83 CNPT.',
    implementacion: 'Registro de números SINPE del emisor; advertencia al cobrar con medio 06 sin números registrados; reporte por medio de pago.',
    url: `${S}param1=76926&param2=152753&param3=1`,
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
    disposiciones: 'Art. 10 tarifa general 13 %; art. 11 tarifas reducidas (4 %, 2 %, 1 %…); art. 20 el crédito fiscal requiere comprobantes autorizados; art. 27 liquidación y pago diferido hasta 90 días para ventas a crédito de MiPyMEs y otros (base del REP).',
    implementacion: 'Tarifas de la nota 8.1, condición de venta 10/11 y Recibo Electrónico de Pago.',
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
    estado: 'Vigente; SINALEVI versión 10 de 10 (29/09/2026), ya incorpora el inciso 3 del art. 22.',
    disposiciones: 'Art. 22 obligación de inscripción, correo para notificaciones y (inc. 3) números SINPE Móvil.',
    implementacion: 'Datos del emisor: actividades, correos, números SINPE.',
    url: `${S}param1=76926&param2=152753&param3=1`,
  },
  {
    norma: 'Decreto N.° 41779-H – Reglamento de la Ley del IVA',
    datos: '7/06/2019 · Alcance 129, La Gaceta 108 del 11/06/2019',
    estado: 'Vigente; SINALEVI versión 16 de 16 (27/10/2025).',
    disposiciones: 'Citado en la RES-0027 (arts. 25, 29, 54 y 60 inc. 4) como fundamento de la obligación de comprobantes. El Anexo remite al art. 32 num. 1 (tarifa 0 % con crédito) y art. 11 (servicios complementarios a la exportación).',
    implementacion: 'Tarifa 01 (0 % art. 32), exoneración 09.',
    url: `${S}param1=88953&param2=148633&param3=1`,
  },
  {
    norma: 'Ley N.° 7092 – Impuesto sobre la Renta y Decreto 43198-H (Reglamento)',
    datos: 'Ley 21/04/1988 (La Gaceta 96 del 19/05/1988) · Reglamento 22/07/2021 (Alcance 257, La Gaceta 243 del 17/12/2021)',
    estado: 'Vigentes; SINALEVI versiones 83 de 83 (13/11/2025) y 5 de 5 (15/11/2023).',
    disposiciones: 'Citados por la RES-0027 y el Decreto 44739-H como fundamento de la aceptación de comprobantes como respaldo de gastos deducibles.',
    implementacion: 'Confirmación del receptor (gasto aplicable, condición del IVA).',
    url: `${S}param1=10969&param2=148972&param3=1`,
  },
  {
    norma: 'Resolución MH-DGT-RES-0043-2025 – Modificaciones por TRIBU-CR',
    datos: '27/08/2025 · Alcance 114, La Gaceta 166 del 5/09/2025',
    estado: 'Vigente.',
    disposiciones: 'Art. 21 reforma el Transitorio I de la RES-0027 (prórroga excepcional hasta el 6/10/2025, habilitación de TRIBU-CR y Tico Factura); el facturador gratuito ATV v4.3 funcionó hasta el 5/10/2025.',
    implementacion: 'Actividades económicas en formato CIIU 4 de TRIBU-CR.',
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
  { tema: 'Referencia 08 en el REP', detalle: 'Para el REP se permiten los tipos de referencia 01, 02, 03, 04 y 08 descritos como «…Factura Electrónica de Compras», pero en la nota 10 el código 08 es «Comprobante emitido en contingencia».', decision: 'Se permite el código 08 en el REP y se muestra con la descripción de la nota 10; pendiente de aclaración oficial.' },
  { tema: 'Total del REP', detalle: 'La regla dice que en el REP el TotalComprobante «se obtiene de la suma de los campos Total de la venta», sin sumar el impuesto.', decision: 'Se aplica la regla literal y se señala como punto a verificar.' },
  { tema: 'Códigos nuevos de las notas 9 y 10', detalle: 'El comunicado de actualización agrega los códigos 13-17 (nota 9) y 19-20 (nota 10) desde el 1.º de noviembre, pero la copia analizada no transcribe las descripciones de la nota 9.', decision: 'Se incorporan 19 (FEE) y 20 (REP) de la nota 10; los 13-17 de la nota 9 quedan pendientes del Anexo actualizado.' },
  { tema: 'Formato del código de actividad', detalle: 'El campo CodigoActividadEmisor es String(6); TRIBU-CR publica códigos CIIU 4 con punto (p. ej. «6920.0», 6 caracteres) y ATV usaba 6 dígitos.', decision: 'Se usa el código tal como lo devuelve el API público; debe validarse contra el XSD vigente.' },
  { tema: 'Forma farmacéutica (nota 19)', detalle: 'El XML admite 3 caracteres según la tabla de Hacienda; el catálogo del Ministerio de Salud usa códigos SNOMED de hasta 14 dígitos y está en borrador.', decision: 'El catálogo de Salud se usa como referencia descriptiva; en el XML solo se acepta un código de hasta 3 caracteres.' },
  { tema: 'Codificación de ubicación', detalle: 'La nota 14 remite a un archivo de Hacienda no incluido; la DTA 2022 convertida termina en el distrito 70603 (Pocora).', decision: 'Se usa la DTA 2022; una ubicación fuera del catálogo genera advertencia, no rechazo.' },
  { tema: 'Material de terceros', detalle: 'El resumen «Análisis RES-0027» (ACC Contadores) habla de «código CAByS de la actividad económica del receptor».', decision: 'Es impreciso: el Anexo exige el código de actividad económica, no un CAByS. Se descarta.' },
  { tema: 'Video de referencia', detalle: 'Charla del Colegio de Contadores Privados (CCPCR, 22/10/2026). No fue posible obtener su transcripción.', decision: 'Se cita solo como referencia; ningún requisito de la app depende de su contenido.' },
];
