import type { TipoComprobante } from './catalogos';

export type Ambiente = 'simulacion' | 'produccion';

export interface Identificacion {
  /** Nota 4: 01 física, 02 jurídica, 03 DIMEX, 04 NITE, 05 extranjero no domiciliado, 06 no contribuyente. */
  tipo: string;
  numero: string;
}

export interface Ubicacion {
  provincia: string;
  canton: string;
  distrito: string;
  barrio?: string;
  otrasSenas: string;
}

export interface Telefono {
  codigoPais: string;
  numero: string;
}

export interface ActividadEconomica {
  /** Código de actividad tal como lo devuelve el RUT/TRIBU-CR (p. ej. "6810.0"). */
  codigo: string;
  descripcion: string;
  principal?: boolean;
}

export interface Sucursal {
  /** Tres dígitos: 001 casa matriz, 002+ sucursales (Nota 3). */
  codigo: string;
  nombre: string;
  /** Cinco dígitos cada una; "00001" si solo hay una terminal o servidor centralizado. */
  terminales: string[];
}

export type CondicionEmisor = 'emisor-receptor' | 'no-confirmante' | 'receptor-no-emisor';

export interface Emisor {
  id: string;
  nombre: string;
  nombreComercial?: string;
  identificacion: Identificacion;
  ubicacion: Ubicacion;
  /** Teléfono principal: el único que va en el nodo <Emisor> del XML. */
  telefono?: Telefono;
  /** Otros teléfonos de contacto (no van al XML; pueden marcarse como SINPE Móvil). */
  telefonosAdicionales?: Telefono[];
  /** De 1 a 4 direcciones (Anexo v4.4, campo CorreoElectronico del emisor). */
  correos: string[];
  actividades: ActividadEconomica[];
  sucursales: Sucursal[];
  /** Identificación del proveedor de sistemas (campo ProveedorSistemas). */
  proveedorSistemas: string;
  registroFiscal8707?: string;
  /** Números SINPE Móvil usados en la actividad (art. 22 inc. 3 RPT, adicionado por Decreto 45953-H). */
  telefonosSinpe: string[];
  condicion: CondicionEmisor;
  propietarioUid?: string;
  miembros?: string[];
  creadoEn?: string;
}

export interface Exoneracion {
  tipoDocumento: string;
  tipoDocumentoOtro?: string;
  numeroDocumento: string;
  articulo?: number;
  inciso?: number;
  institucion: string;
  institucionOtro?: string;
  /** Fecha y hora RFC 3339. */
  fechaEmision: string;
  /** Puntos porcentuales exonerados (p. ej. 13). */
  tarifaExonerada: number;
}

export interface Receptor {
  id: string;
  nombre: string;
  nombreComercial?: string;
  identificacion?: Identificacion;
  ubicacion?: Ubicacion;
  otrasSenasExtranjero?: string;
  telefono?: Telefono;
  correo?: string;
  actividadEconomica?: string;
  exoneracion?: Exoneracion;
  notas?: string;
}

export interface ImpuestoAdicional {
  /** Códigos de la nota 8 calculados por tarifa: 02 (selectivo), 12 (cemento), 99 (otros). */
  codigo: '02' | '12' | '99';
  tarifa: number;
  codigoOtro?: string;
}

export interface Producto {
  id: string;
  codigoCabys: string;
  descripcion: string;
  unidadMedida: string;
  unidadMedidaComercial?: string;
  precioUnitario: number;
  moneda: string;
  codigoTarifaIva: string;
  codigoComercial?: { tipo: string; codigo: string };
  partidaArancelaria?: string;
  registroMedicamento?: string;
  formaFarmaceutica?: string;
  /** Forma farmacéutica según el catálogo del Ministerio de Salud (referencia; no va al XML). */
  formaFarmaceuticaMinsa?: string;
  /** Servicio de salud (relevante para TotalIVADevuelto cuando se paga con tarjeta). */
  servicioSalud?: boolean;
  impuestosAdicionales?: ImpuestoAdicional[];
  activo: boolean;
}

export interface DescuentoBorrador {
  codigo: string;
  /** Monto absoluto; si se omite se calcula a partir de `porcentaje`. */
  monto?: number;
  porcentaje?: number;
  codigoOtro?: string;
  naturaleza?: string;
}

export interface LineaBorrador {
  codigoCabys: string;
  detalle: string;
  cantidad: number;
  unidadMedida: string;
  unidadMedidaComercial?: string;
  precioUnitario: number;
  descuentos: DescuentoBorrador[];
  codigoTarifaIva: string;
  impuestosAdicionales?: ImpuestoAdicional[];
  exoneracion?: Exoneracion;
  codigoComercial?: { tipo: string; codigo: string };
  tipoTransaccion?: string;
  partidaArancelaria?: string;
  numeroVinSerie?: string[];
  registroMedicamento?: string;
  formaFarmaceutica?: string;
  /** Forma farmacéutica según el catálogo del Ministerio de Salud (referencia; no va al XML). */
  formaFarmaceuticaMinsa?: string;
  servicioSalud?: boolean;
  montoExportacion?: number;
}

export interface OtroCargo {
  tipoDocumento: string;
  tipoDocumentoOtro?: string;
  tercero?: { identificacion: Identificacion; nombre: string };
  detalle: string;
  porcentaje?: number;
  monto: number;
}

export interface MedioPago {
  tipo: string;
  otros?: string;
  monto?: number;
}

export interface Referencia {
  tipoDoc: string;
  tipoDocOtro?: string;
  numero?: string;
  fechaEmision: string;
  codigo?: string;
  codigoOtro?: string;
  razon?: string;
}

/** Datos del sujeto que aparece en el nodo <Receptor> (o en <Emisor> cuando se trata de una FEC). */
export interface Contraparte {
  nombre: string;
  nombreComercial?: string;
  identificacion?: Identificacion;
  ubicacion?: Ubicacion;
  otrasSenasExtranjero?: string;
  telefono?: Telefono;
  correo?: string;
}

export interface BorradorComprobante {
  tipo: TipoComprobante;
  emisorId: string;
  sucursal: string;
  terminal: string;
  /** Nota 3: 1 normal, 2 contingencia, 3 sin internet. */
  situacion: '1' | '2' | '3';
  codigoActividadEmisor?: string;
  codigoActividadReceptor?: string;
  receptorId?: string;
  /**
   * Contraparte de la transacción. En FE/TE/NC/ND/FEE/REP es el receptor (cliente);
   * en la FEC es el vendedor, que se consigna en el nodo <Emisor>.
   */
  contraparte?: Contraparte;
  condicionVenta: string;
  condicionVentaOtros?: string;
  plazoCredito?: number;
  moneda: string;
  tipoCambio: number;
  lineas: LineaBorrador[];
  otrosCargos: OtroCargo[];
  mediosPago: MedioPago[];
  referencias: Referencia[];
  otrosTextos?: string[];
}

export interface ImpuestoCalculado {
  codigo: string;
  codigoOtro?: string;
  codigoTarifaIva?: string;
  tarifa: number;
  monto: number;
  montoExportacion?: number;
  exoneracion?: Exoneracion & { montoExoneracion: number };
}

export interface DescuentoCalculado {
  codigo: string;
  monto: number;
  codigoOtro?: string;
  naturaleza?: string;
}

export interface LineaCalculada {
  numeroLinea: number;
  codigoCabys: string;
  codigoComercial?: { tipo: string; codigo: string };
  cantidad: number;
  unidadMedida: string;
  unidadMedidaComercial?: string;
  tipoTransaccion?: string;
  detalle: string;
  partidaArancelaria?: string;
  numeroVinSerie?: string[];
  registroMedicamento?: string;
  formaFarmaceutica?: string;
  /** Forma farmacéutica según el catálogo del Ministerio de Salud (referencia; no va al XML). */
  formaFarmaceuticaMinsa?: string;
  precioUnitario: number;
  montoTotal: number;
  descuentos: DescuentoCalculado[];
  subTotal: number;
  baseImponible: number;
  impuestos: ImpuestoCalculado[];
  impuestoAsumidoEmisorFabrica: number;
  impuestoNeto: number;
  montoTotalLinea: number;
  /** Clasificación derivada: servicio si el CAByS inicia con 5-9; mercancía si inicia con 0-4. */
  esServicio: boolean;
  clase: 'gravado' | 'exento' | 'nosujeto';
  servicioSalud?: boolean;
}

export interface DesgloseImpuesto {
  codigo: string;
  codigoTarifaIva?: string;
  totalMontoImpuesto: number;
}

export interface Resumen {
  codigoMoneda: string;
  tipoCambio: number;
  totalServGravados: number;
  totalServExentos: number;
  totalServExonerado: number;
  totalServNoSujeto: number;
  totalMercanciasGravadas: number;
  totalMercanciasExentas: number;
  totalMercExonerada: number;
  totalMercNoSujeta: number;
  totalGravado: number;
  totalExento: number;
  totalExonerado: number;
  totalNoSujeto: number;
  totalVenta: number;
  totalDescuentos: number;
  totalVentaNeta: number;
  totalDesgloseImpuesto: DesgloseImpuesto[];
  totalImpuesto: number;
  totalImpAsumEmisorFabrica: number;
  totalIVADevuelto: number;
  totalOtrosCargos: number;
  mediosPago: MedioPago[];
  totalComprobante: number;
}

export type EstadoComprobante =
  | 'generado'
  | 'enviado'
  | 'recibido'
  | 'procesando'
  | 'aceptado'
  | 'rechazado'
  | 'error';

export interface EventoEstado {
  estado: EstadoComprobante | 'confirmado-receptor' | 'nota-credito' | 'sustituido';
  fecha: string;
  detalle?: string;
  usuario?: string;
}

export interface MensajeHaciendaResultado {
  mensaje: '1' | '3';
  estado: 'aceptado' | 'rechazado';
  detalle: string[];
  advertencias: string[];
  nivelFallido?: 1 | 2 | 3;
  fecha: string;
  xml: string;
}

export interface Comprobante {
  id: string;
  clave: string;
  consecutivo: string;
  tipo: TipoComprobante;
  ambiente: Ambiente;
  emisorId: string;
  fechaEmision: string;
  situacion: '1' | '2' | '3';
  codigoSeguridad: string;
  emisor: Emisor;
  contraparte?: Contraparte;
  borrador: BorradorComprobante;
  lineas: LineaCalculada[];
  resumen: Resumen;
  xml: string;
  estado: EstadoComprobante;
  historial: EventoEstado[];
  respuestaHacienda?: MensajeHaciendaResultado;
  creadoPor?: string;
}

export interface Validacion {
  campo: string;
  mensaje: string;
  nivel: 'error' | 'advertencia';
  fuente?: string;
}
