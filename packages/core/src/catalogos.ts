/**
 * Catálogos de codificación tomados del Anexo 1 de "Anexos y Estructuras para la
 * Emisión de Comprobantes Electrónicos", versión 4.4 (DGT, noviembre 2024),
 * adoptado por la resolución MH-DGT-RES-0027-2024 (versión vigente 3 de 3 en SINALEVI).
 *
 * Cada catálogo indica la nota del Anexo de la que proviene. Los códigos marcados
 * `soloAjustes` están inhabilitados para comprobantes nuevos y solo se admiten en
 * notas de crédito/débito que ajustan comprobantes previos, según las notas al pie del Anexo.
 */

import formasMinsa from './datos/formas-farmaceuticas-minsa.json';

export interface Codigo {
  codigo: string;
  descripcion: string;
  /** Solo para notas de crédito y débito (código inhabilitado para documentos nuevos). */
  soloAjustes?: boolean;
  nota?: string;
}

export type TipoComprobante = 'FE' | 'ND' | 'NC' | 'TE' | 'FEC' | 'FEE' | 'REP';
export type TipoMensajeReceptor = 'CCE' | 'CPCE' | 'RCE';

/** Nota 3 – código de tipo de comprobante dentro del consecutivo (posiciones 9-10). */
export const CODIGO_TIPO_DOCUMENTO: Record<TipoComprobante | TipoMensajeReceptor, string> = {
  FE: '01',
  ND: '02',
  NC: '03',
  TE: '04',
  CCE: '05', // Confirmación de aceptación
  CPCE: '06', // Confirmación de aceptación parcial
  RCE: '07', // Confirmación de rechazo
  FEC: '08',
  FEE: '09',
  REP: '10',
};

export const NOMBRE_COMPROBANTE: Record<TipoComprobante, string> = {
  FE: 'Factura Electrónica',
  ND: 'Nota de Débito Electrónica',
  NC: 'Nota de Crédito Electrónica',
  TE: 'Tiquete Electrónico',
  FEC: 'Factura Electrónica de Compra',
  FEE: 'Factura Electrónica de Exportación',
  REP: 'Recibo Electrónico de Pago',
};

/** Nota 2 – etiqueta raíz y espacio de nombres (XML Schema) de cada comprobante v4.4. */
export const ESQUEMA_XML: Record<TipoComprobante, { raiz: string; ns: string }> = {
  FE: { raiz: 'FacturaElectronica', ns: 'https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/facturaElectronica' },
  ND: { raiz: 'NotaDebitoElectronica', ns: 'https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/notaDebitoElectronica' },
  NC: { raiz: 'NotaCreditoElectronica', ns: 'https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/notaCreditoElectronica' },
  TE: { raiz: 'TiqueteElectronico', ns: 'https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/tiqueteElectronico' },
  FEC: { raiz: 'FacturaElectronicaCompra', ns: 'https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/facturaElectronicaCompra' },
  FEE: { raiz: 'FacturaElectronicaExportacion', ns: 'https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/facturaElectronicaExportacion' },
  REP: { raiz: 'ReciboElectronicoPago', ns: 'https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/reciboElectronicoPago' },
};

/**
 * Espacios de nombres de los mensajes. La Nota 2 del Anexo no los enumera; se usa el
 * mismo patrón de URL del CDN. Debe verificarse contra MensajeReceptor_V4.4.xsd y
 * MensajeHacienda_V4.4.xsd antes de cualquier uso real (ver docs/MATRIZ_NORMATIVA.md).
 */
export const NS_MENSAJE_RECEPTOR = 'https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/mensajeReceptor';
export const NS_MENSAJE_HACIENDA = 'https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/mensajeHacienda';

/** Nota 3 – situación del comprobante (posición 42 de la clave). */
export const SITUACION: Codigo[] = [
  { codigo: '1', descripcion: 'Normal' },
  { codigo: '2', descripcion: 'Contingencia' },
  { codigo: '3', descripcion: 'Sin internet' },
];

/** Nota 4 – tipo de identificación. */
export const TIPO_IDENTIFICACION: Codigo[] = [
  { codigo: '01', descripcion: 'Cédula Física' },
  { codigo: '02', descripcion: 'Cédula Jurídica' },
  { codigo: '03', descripcion: 'DIMEX' },
  { codigo: '04', descripcion: 'NITE' },
  { codigo: '05', descripcion: 'Extranjero No Domiciliado', nota: 'Uso restringido: FEC (emisor), FE con condición 12, FEE y TE (receptor).' },
  { codigo: '06', descripcion: 'No Contribuyente', nota: 'Solo emisor de FEC con condición de venta 13.' },
];

/** Nota 5 – condiciones de la venta. */
export const CONDICION_VENTA: Codigo[] = [
  { codigo: '01', descripcion: 'Contado' },
  { codigo: '02', descripcion: 'Crédito' },
  { codigo: '03', descripcion: 'Consignación' },
  { codigo: '04', descripcion: 'Apartado' },
  { codigo: '05', descripcion: 'Arrendamiento con opción de compra' },
  { codigo: '06', descripcion: 'Arrendamiento en función financiera' },
  { codigo: '07', descripcion: 'Cobro a favor de un tercero' },
  { codigo: '08', descripcion: 'Servicios prestados al Estado' },
  { codigo: '09', descripcion: 'Pago de servicios prestado al Estado', nota: 'Solo en Recibo Electrónico de Pago.' },
  { codigo: '10', descripcion: 'Venta a crédito en IVA hasta 90 días (Artículo 27, LIVA)' },
  { codigo: '11', descripcion: 'Pago de venta a crédito en IVA hasta 90 días (Artículo 27, LIVA)', nota: 'Solo en Recibo Electrónico de Pago.' },
  { codigo: '12', descripcion: 'Venta Mercancía No Nacionalizada', nota: 'Solo en Factura Electrónica.' },
  { codigo: '13', descripcion: 'Venta Bienes Usados No Contribuyente', nota: 'Solo en Factura Electrónica de Compra.' },
  { codigo: '14', descripcion: 'Arrendamiento Operativo' },
  { codigo: '15', descripcion: 'Arrendamiento Financiero' },
  { codigo: '99', descripcion: 'Otros' },
];

/** Nota 6 – medios de pago (incluye SINPE Móvil, código 06, incorporado en v4.4). */
export const MEDIO_PAGO: Codigo[] = [
  { codigo: '01', descripcion: 'Efectivo' },
  { codigo: '02', descripcion: 'Tarjeta' },
  { codigo: '03', descripcion: 'Cheque' },
  { codigo: '04', descripcion: 'Transferencia – depósito bancario' },
  { codigo: '05', descripcion: 'Recaudado por terceros' },
  { codigo: '06', descripcion: 'SINPE MÓVIL' },
  { codigo: '07', descripcion: 'Plataforma Digital' },
  { codigo: '99', descripcion: 'Otros' },
];

/** Nota 8 – códigos de impuesto. */
export const CODIGO_IMPUESTO: Codigo[] = [
  { codigo: '01', descripcion: 'Impuesto al Valor Agregado' },
  { codigo: '02', descripcion: 'Impuesto Selectivo de Consumo' },
  { codigo: '03', descripcion: 'Impuesto Único a los Combustibles' },
  { codigo: '04', descripcion: 'Impuesto específico de Bebidas Alcohólicas' },
  { codigo: '05', descripcion: 'Impuesto Específico sobre las bebidas envasadas sin contenido alcohólico y jabones de tocador' },
  { codigo: '06', descripcion: 'Impuesto a los Productos de Tabaco' },
  { codigo: '07', descripcion: 'IVA (cálculo especial)' },
  { codigo: '08', descripcion: 'IVA Régimen de Bienes Usados (Factor)' },
  { codigo: '12', descripcion: 'Impuesto Específico al Cemento' },
  { codigo: '99', descripcion: 'Otros' },
];

export interface TarifaIva extends Codigo {
  tarifa: number;
  /** Clasificación para el resumen: gravado, exento o no sujeto (campos TotalServ… y TotalMerc…). */
  clase: 'gravado' | 'exento' | 'nosujeto';
}

/** Nota 8.1 – tarifas del IVA. Clasificación según las reglas de cálculo del resumen (pp. 50-52). */
export const TARIFA_IVA: TarifaIva[] = [
  { codigo: '01', descripcion: 'Tarifa 0% (Artículo 32, num 1, RLIVA)', tarifa: 0, clase: 'nosujeto' },
  { codigo: '02', descripcion: 'Tarifa reducida 1%', tarifa: 1, clase: 'gravado' },
  { codigo: '03', descripcion: 'Tarifa reducida 2%', tarifa: 2, clase: 'gravado' },
  { codigo: '04', descripcion: 'Tarifa reducida 4%', tarifa: 4, clase: 'gravado' },
  { codigo: '05', descripcion: 'Transitorio 0%', tarifa: 0, clase: 'gravado', soloAjustes: true },
  { codigo: '06', descripcion: 'Transitorio 4%', tarifa: 4, clase: 'gravado', soloAjustes: true },
  { codigo: '07', descripcion: 'Tarifa transitoria 8%', tarifa: 8, clase: 'gravado', soloAjustes: true },
  { codigo: '08', descripcion: 'Tarifa general 13%', tarifa: 13, clase: 'gravado' },
  { codigo: '09', descripcion: 'Tarifa reducida 0.5%', tarifa: 0.5, clase: 'gravado' },
  { codigo: '10', descripcion: 'Tarifa Exenta', tarifa: 0, clase: 'exento' },
  { codigo: '11', descripcion: 'Tarifa 0% sin derecho a crédito', tarifa: 0, clase: 'nosujeto' },
];

/**
 * Nota 9 – códigos de referencia (Anexo v4.4, nov. 2024).
 * El comunicado DGT "Actualización de los Anexos y Estructuras versión 4.4" agrega los
 * códigos 13 a 17, pero la copia analizada no transcribe sus descripciones; por eso no se
 * incluyen aquí hasta contar con el Anexo actualizado (ver docs/MATRIZ_NORMATIVA.md).
 */
export const CODIGO_REFERENCIA: Codigo[] = [
  { codigo: '01', descripcion: 'Anula Documento de Referencia' },
  { codigo: '02', descripcion: 'Corrige monto' },
  { codigo: '04', descripcion: 'Referencia a otro documento' },
  { codigo: '05', descripcion: 'Sustituye comprobante provisional por contingencia' },
  { codigo: '06', descripcion: 'Devolución de mercancía' },
  { codigo: '07', descripcion: 'Sustituye comprobante electrónico' },
  { codigo: '08', descripcion: 'Factura Endosada' },
  { codigo: '09', descripcion: 'Nota de crédito financiera' },
  { codigo: '10', descripcion: 'Nota de débito financiera' },
  { codigo: '11', descripcion: 'Proveedor No Domiciliado' },
  { codigo: '12', descripcion: 'Crédito por exoneración posterior a la facturación' },
  { codigo: '99', descripcion: 'Otros' },
];

/** Nota 10 – tipo de documento de referencia. */
export const TIPO_DOC_REFERENCIA: Codigo[] = [
  { codigo: '01', descripcion: 'Factura electrónica' },
  { codigo: '02', descripcion: 'Nota de débito electrónica' },
  { codigo: '03', descripcion: 'Nota de crédito electrónica' },
  { codigo: '04', descripcion: 'Tiquete electrónico' },
  { codigo: '05', descripcion: 'Nota de despacho' },
  { codigo: '06', descripcion: 'Contrato' },
  { codigo: '07', descripcion: 'Procedimiento' },
  { codigo: '08', descripcion: 'Comprobante emitido en contingencia' },
  { codigo: '09', descripcion: 'Devolución mercadería', soloAjustes: true },
  { codigo: '10', descripcion: 'Comprobante electrónico rechazado por el Ministerio de Hacienda' },
  { codigo: '11', descripcion: 'Sustituye factura rechazada por el Receptor del comprobante' },
  { codigo: '12', descripcion: 'Sustituye Factura de exportación' },
  { codigo: '13', descripcion: 'Facturación mes vencido' },
  { codigo: '14', descripcion: 'Comprobante aportado por contribuyente de Régimen Especial' },
  { codigo: '15', descripcion: 'Sustituye una Factura electrónica de Compra' },
  { codigo: '16', descripcion: 'Comprobante de Proveedor No Domiciliado', nota: 'Solo en Factura Electrónica de Compra.' },
  { codigo: '17', descripcion: 'Nota de Crédito a Factura Electrónica de Compra' },
  { codigo: '18', descripcion: 'Nota de Débito a Factura Electrónica de Compra' },
  // Códigos 19 y 20: comunicado DGT de actualización v4.4 (referencias a FEE y REP).
  { codigo: '19', descripcion: 'Factura Electrónica de Exportación' },
  { codigo: '20', descripcion: 'Recibo Electrónico de Pago' },
  { codigo: '99', descripcion: 'Otros' },
];

/** Nota 10.1 – tipo de documento de exoneración o autorización. */
export const TIPO_EXONERACION: Codigo[] = [
  { codigo: '01', descripcion: 'Compras autorizadas por la Dirección General de Tributación', soloAjustes: true },
  { codigo: '02', descripcion: 'Ventas exentas a diplomáticos' },
  { codigo: '03', descripcion: 'Autorizado por Ley especial' },
  { codigo: '04', descripcion: 'Exenciones Dirección General de Hacienda Autorización Local Genérica' },
  { codigo: '05', descripcion: 'Exenciones DGH Transitorio V (servicios de ingeniería, arquitectura, topografía obra civil)', soloAjustes: true },
  { codigo: '06', descripcion: 'Servicios turísticos inscritos ante el Instituto Costarricense de Turismo (ICT)', soloAjustes: true },
  { codigo: '07', descripcion: 'Transitorio XVII (Recolección, Clasificación, almacenamiento de Reciclaje y reutilizable)', soloAjustes: true },
  { codigo: '08', descripcion: 'Exoneración a Zona Franca' },
  { codigo: '09', descripcion: 'Exoneración de servicios complementarios para la exportación articulo 11 RLIVA' },
  { codigo: '10', descripcion: 'Órgano de las corporaciones municipales' },
  { codigo: '11', descripcion: 'Exenciones DGH Autorización de Impuesto Local Concreta' },
  { codigo: '99', descripcion: 'Otros' },
];

/** Nota 11 – mensaje de confirmación. */
export const MENSAJE: Codigo[] = [
  { codigo: '1', descripcion: 'Aceptado' },
  { codigo: '2', descripcion: 'Aceptación parcial' },
  { codigo: '3', descripcion: 'Rechazado' },
];

/** Nota 12 – tipo de código de producto/servicio (código comercial). */
export const TIPO_CODIGO_COMERCIAL: Codigo[] = [
  { codigo: '01', descripcion: 'Código del producto del vendedor' },
  { codigo: '02', descripcion: 'Código del producto del comprador' },
  { codigo: '03', descripcion: 'Código del producto asignado por el fabricante – industriales o importadores' },
  { codigo: '04', descripcion: 'Código uso interno' },
  { codigo: '99', descripcion: 'Otros' },
];

/** Nota 15 – unidades de medida (lista completa del Anexo v4.4). */
export const UNIDAD_MEDIDA: Codigo[] = [
  ['Unid', 'Unidad'], ['Sp', 'Servicios Profesionales'], ['Spe', 'Servicios personales'], ['St', 'Servicios técnicos'],
  ['Os', 'Otro tipo de servicio'], ['Al', 'Alquiler de uso habitacional'], ['Alc', 'Alquiler de uso comercial'],
  ['Cm', 'Comisiones'], ['I', 'Intereses'], ['Acv', 'Activo Virtual'], ['h', 'hora'], ['D', 'día'], ['Min', 'minuto'],
  ['Kg', 'Kilogramo'], ['G', 'Gramo'], ['L', 'litro'], ['mL', 'mililitro'], ['Gal', 'Galón'], ['Oz', 'Onzas'],
  ['M', 'Metro'], ['cm', 'centímetro'], ['Mm', 'Milímetro'], ['Km', 'Kilometro'], ['Ln', 'pulgada'], ['m²', 'metro cuadrado'],
  ['m³', 'metro cúbico'], ['T', 'tonelada'], ['Qq', 'Quintal'], ['Kw', 'kilovatios'], ['kWh', 'Kilovatios por hora'],
  ['Cc', 'Cajuela de café'], ['Cu', 'cuartillos de café'], ['Fa', 'fanega de café'], ['Otros', 'Otros (indicar descripción)'],
  ['1', 'uno (índice de refracción)'], ['´', 'minuto (ángulo)'], ['´´', 'segundo (ángulo)'], ['°C', 'grado Celsius'],
  ['1/m', '1 por metro'], ['A', 'Ampere'], ['A/m', 'ampere por metro'], ['A/m²', 'ampere por metro cuadrado'], ['B', 'bel'],
  ['Bq', 'Becquerel'], ['C', 'coulomb'], ['C/kg', 'coulomb por kilogramo'], ['C/m²', 'coulomb por metro cuadrado'],
  ['C/m³', 'coulomb por metro cúbico'], ['Cd', 'Candela'], ['cd/m²', 'candela por metro cuadrado'], ['eV', 'electronvolt'],
  ['F', 'farad'], ['F/m', 'farad por metro'], ['Gy', 'gray'], ['Gy/s', 'gray por segundo'], ['H', 'henry'], ['H/m', 'henry por metro'],
  ['Hz', 'hertz'], ['J', 'Joule'], ['J/(kg·K)', 'joule por kilogramo kelvin'], ['J/(mol·K)', 'joule por mol kelvin'],
  ['J/K', 'joule por kelvin'], ['J/kg', 'joule por kilogramo'], ['J/m³', 'joule por metro cúbico'], ['J/mol', 'joule por mol'],
  ['K', 'Kelvin'], ['Kat', 'katal'], ['kat/m³', 'katal por metro cúbico'], ['kg/m³', 'kilogramo por metro cúbico'],
  ['Lm', 'lumen'], ['Lx', 'lux'], ['m/s', 'metro por segundo'], ['m/s²', 'metro por segundo cuadrado'], ['Mol', 'Mol'],
  ['mol/m³', 'mol por metro cúbico'], ['N', 'newton'], ['N/m', 'newton por metro'], ['N·m', 'newton metro'], ['Np', 'neper'],
  ['º', 'grado'], ['Pa', 'pascal'], ['Pa·s', 'pascal segundo'], ['Rad', 'radián'], ['rad/s', 'radián por segundo'],
  ['rad/s²', 'radián por segundo cuadrado'], ['S', 'Segundo'], ['s', 'siemens'], ['Sr', 'estereorradián'], ['Sv', 'sievert'],
  ['t', 'tesla'], ['U', 'unidad de masa atómica unificada'], ['Ua', 'unidad astronómica'], ['V', 'volt'], ['V/m', 'volt por metro'],
  ['W', 'Watt'], ['W/(m·K)', 'watt por metro kelvin'], ['W/(m²·sr)', 'watt por metro cuadrado estereorradián'],
  ['W/m²', 'watt por metro cuadrado'], ['W/sr', 'watt por estereorradián'], ['Wb', 'weber'], ['Ω', 'ohm'],
].map(([codigo, descripcion]) => ({ codigo, descripcion }));

/** Nota 16 – tipo de documento de otros cargos. */
export const TIPO_OTROS_CARGOS: Codigo[] = [
  { codigo: '01', descripcion: 'Contribución parafiscal' },
  { codigo: '02', descripcion: 'Timbre de la Cruz Roja' },
  { codigo: '03', descripcion: 'Timbre de Benemérito Cuerpo de Bomberos de Costa Rica' },
  { codigo: '04', descripcion: 'Cobro de un tercero' },
  { codigo: '05', descripcion: 'Costos de Exportación' },
  { codigo: '06', descripcion: 'Impuesto de servicio 10%' },
  { codigo: '07', descripcion: 'Timbre de Colegios Profesionales' },
  { codigo: '08', descripcion: 'Depósitos de Garantía' },
  { codigo: '09', descripcion: 'Multas o Penalizaciones' },
  { codigo: '10', descripcion: 'Intereses Moratorios' },
  { codigo: '99', descripcion: 'Otros Cargos' },
];

/** Nota 18 – condición del impuesto en el mensaje del receptor. */
export const CONDICION_IMPUESTO: Codigo[] = [
  { codigo: '01', descripcion: 'Genera crédito IVA' },
  { codigo: '02', descripcion: 'Genera Crédito parcial del IVA' },
  { codigo: '03', descripcion: 'Bienes de Capital' },
  { codigo: '04', descripcion: 'Gasto corriente no genera crédito' },
  { codigo: '05', descripcion: 'Proporcionalidad' },
];

/** Nota 20 – tipos de descuento. */
export const CODIGO_DESCUENTO: Codigo[] = [
  { codigo: '01', descripcion: 'Descuento por Regalía' },
  { codigo: '02', descripcion: 'Descuento por Regalía IVA Cobrado al Cliente' },
  { codigo: '03', descripcion: 'Descuento por Bonificación' },
  { codigo: '04', descripcion: 'Descuento por volumen' },
  { codigo: '05', descripcion: 'Descuento por Temporada (estacional)' },
  { codigo: '06', descripcion: 'Descuento promocional' },
  { codigo: '07', descripcion: 'Descuento Comercial' },
  { codigo: '08', descripcion: 'Descuento por frecuencia' },
  { codigo: '09', descripcion: 'Descuento sostenido' },
  { codigo: '99', descripcion: 'Otros descuentos' },
];

/** Nota 22 – tipo de transacción. */
export const TIPO_TRANSACCION: Codigo[] = [
  { codigo: '01', descripcion: 'Venta Normal de Bienes y Servicios (Transacción General)' },
  { codigo: '02', descripcion: 'Mercancía de Autoconsumo exento' },
  { codigo: '03', descripcion: 'Mercancía de Autoconsumo gravado' },
  { codigo: '04', descripcion: 'Servicio de Autoconsumo exento' },
  { codigo: '05', descripcion: 'Servicio de Autoconsumo gravado' },
  { codigo: '06', descripcion: 'Cuota de afiliación' },
  { codigo: '07', descripcion: 'Cuota de afiliación Exenta' },
  { codigo: '08', descripcion: 'Bienes de Capital para el emisor' },
  { codigo: '09', descripcion: 'Bienes de Capital para el receptor' },
  { codigo: '10', descripcion: 'Bienes de Capital para el emisor y el receptor' },
  { codigo: '11', descripcion: 'Bienes de capital de autoconsumo exento para el emisor' },
  { codigo: '12', descripcion: 'Bienes de capital sin contraprestación a terceros exento para el emisor' },
  { codigo: '13', descripcion: 'Sin contraprestación a terceros' },
];

/** Nota 23 – institución que emitió la exoneración. */
export const INSTITUCION_EXONERACION: Codigo[] = [
  { codigo: '01', descripcion: 'Ministerio de Hacienda' },
  { codigo: '02', descripcion: 'Ministerio de Relaciones Exteriores y Culto' },
  { codigo: '03', descripcion: 'Ministerio de Agricultura y Ganadería' },
  { codigo: '04', descripcion: 'Ministerio de Economía, Industria y Comercio' },
  { codigo: '05', descripcion: 'Cruz Roja Costarricense' },
  { codigo: '06', descripcion: 'Benemérito Cuerpo de Bomberos de Costa Rica' },
  { codigo: '07', descripcion: 'Asociación Obras del Espíritu Santo' },
  { codigo: '08', descripcion: 'Federación Cruzada Nacional de protección al Anciano (Fecrunapa)' },
  { codigo: '09', descripcion: 'Escuela de Agricultura de la Región Húmeda (EARTH)' },
  { codigo: '10', descripcion: 'Instituto Centroamericano de Administración de Empresas (INCAE)' },
  { codigo: '11', descripcion: 'Junta de Protección Social (JPS)' },
  { codigo: '12', descripcion: 'Autoridad Reguladora de los Servicios Públicos (Aresep)' },
  { codigo: '99', descripcion: 'Otros' },
];

/**
 * Nota 13.1 remite al documento "Codigodemoneda_V4.4", que no forma parte de la
 * bibliografía analizada. Se incluyen únicamente monedas ISO 4217 de uso frecuente.
 */
export const MONEDA: Codigo[] = [
  { codigo: 'CRC', descripcion: 'Colón costarricense' },
  { codigo: 'USD', descripcion: 'Dólar estadounidense' },
  { codigo: 'EUR', descripcion: 'Euro' },
];

/** Provincias (nota 14). Cantones y distritos: ver ubicacion.ts (División Territorial Administrativa 2022). */
export const PROVINCIA: Codigo[] = [
  { codigo: '1', descripcion: 'San José' },
  { codigo: '2', descripcion: 'Alajuela' },
  { codigo: '3', descripcion: 'Cartago' },
  { codigo: '4', descripcion: 'Heredia' },
  { codigo: '5', descripcion: 'Guanacaste' },
  { codigo: '6', descripcion: 'Puntarenas' },
  { codigo: '7', descripcion: 'Limón' },
];

export function descripcion(catalogo: Codigo[], codigo: string | undefined): string {
  if (!codigo) return '';
  return catalogo.find((c) => c.codigo === codigo)?.descripcion ?? codigo;
}

export function tarifaIva(codigo: string | undefined): TarifaIva | undefined {
  return TARIFA_IVA.find((t) => t.codigo === codigo);
}

/** Interpreta la columna "Impuesto" del catálogo CAByS (13%, 4%, 2%, 1%, Exento) como código de la nota 8.1. */
export function codigoTarifaDesdeCabys(impuesto: string): string | undefined {
  const mapa: Record<string, string> = { '13%': '08', '4%': '04', '2%': '03', '1%': '02', '0.5%': '09', Exento: '10' };
  return mapa[impuesto.trim()];
}

/**
 * Formas farmacéuticas del Ministerio de Salud (CodeSystem FHIR "drugs-presentation-code",
 * versión 1.1.0-ballot, estado borrador). Sus códigos son SNOMED CT de hasta 14 dígitos, por lo
 * que NO caben en el campo FormaFarmaceutica del XML (String 3, nota 19 de Hacienda): se usan como
 * catálogo de referencia del producto y se muestran en la representación gráfica.
 */
export const FORMAS_FARMACEUTICAS_MINSA: Codigo[] = formasMinsa.codigos;
export const FUENTE_FORMAS_FARMACEUTICAS = formasMinsa.fuente;
