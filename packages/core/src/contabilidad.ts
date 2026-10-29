/**
 * Motor contable: convierte cada comprobante electrónico aceptado en un asiento de partida doble
 * bajo la NIIF para las PYMES, con su tratamiento del IVA. Es determinístico: el mismo comprobante
 * con el mismo contexto produce siempre el mismo asiento (prompt del motor contable v2.1, regla 7.5).
 *
 * Los asientos son una propuesta técnica: quedan en borrador hasta la aprobación del CPI.
 */
import Decimal from 'decimal.js';
import { asientoAperturaBalance, type AperturaContable } from './apertura';
import { ESQUEMA_XML, NOMBRE_COMPROBANTE, type TipoComprobante } from './catalogos';
import { esCabysServicio } from './calculos';
import { cuenta, edicionNiifPara, seccionNiif } from './cuentas';
import { desescaparXml, type ComprobanteRecibido } from './recepcion';
import type { Comprobante, Emisor } from './tipos';

const D = (v: number | string | Decimal) => new Decimal(v);

/** Impuestos de la nota 8 que son IVA: 01 general, 07 cálculo especial, 08 bienes usados. */
const CODIGOS_IVA = ['01', '07', '08'];

export interface LineaContable {
  cabys: string;
  detalle: string;
  cantidad: number;
  subTotal: number;
  /** IVA neto de exoneración. */
  iva: number;
  /** Impuestos distintos del IVA (selectivo, específicos y otros). */
  otrosImpuestos: number;
  /** Impuesto que asume el emisor en regalías o bonificaciones. */
  asumido: number;
  /** SubTotal + ImpuestoNeto: lo que paga el cliente por la línea. */
  totalLinea: number;
  esServicio: boolean;
}

export interface ReferenciaContable {
  tipoDoc: string;
  numero?: string;
  codigo?: string;
  fechaEmision?: string;
}

/** Datos de un comprobante que necesita el motor, sin importar si se emitió o se recibió. */
export interface DocumentoContable {
  origen: 'emitido' | 'recibido';
  clave: string;
  consecutivo?: string;
  tipo: TipoComprobante;
  fecha: string;
  sentido: 'venta' | 'compra';
  contraparte: string;
  condicionVenta: string;
  moneda: string;
  tipoCambio: number;
  lineas: LineaContable[];
  otrosCargos: { tipo: string; monto: number }[];
  mediosPago: { tipo: string; monto?: number }[];
  ivaDevuelto: number;
  totalComprobante: number;
  referencias: ReferenciaContable[];
  /** Versión del esquema según el espacio de nombres del XML. */
  version?: string;
  /** Mensaje receptor de la empresa (solo compras recibidas). */
  confirmacion?: { mensaje: string; condicionImpuesto?: string; montoImpuestoAcreditar?: number };
}

export interface PoliticasContables {
  /** Costo unitario en colones desde el que el equipo y las obras se capitalizan (Sección 17). */
  umbralCapitalizacion: number;
  /** Aplicar la tercera edición (2025) antes del 1/01/2027, con revelación. */
  adopcionAnticipadaNiif2025: boolean;
  /** Prefijos CAByS adicionales que se tratan como mercadería para la venta. */
  prefijosInventario: string[];
}

/** El umbral es una política de cada entidad; el valor es solo un punto de partida. */
export const POLITICAS_PREDETERMINADAS: PoliticasContables = {
  umbralCapitalizacion: 250000,
  adopcionAnticipadaNiif2025: false,
  prefijosInventario: [],
};

export interface LineaAsiento {
  cuenta: string;
  nombre: string;
  debe: number;
  haber: number;
}

export interface Asiento {
  /** Número correlativo en el libro diario (0 hasta que se numera). */
  numero: number;
  /** Fecha del asiento (AAAA-MM-DD): la de emisión del comprobante. */
  fecha: string;
  /** Período de la declaración (AAAA-MM). Las NC/ND con código 13 o 14 usan el del comprobante modificado. */
  periodoTributario: string;
  glosa: string;
  origen: {
    documento: 'emitido' | 'recibido' | 'apertura' | 'ajuste' | 'cierre';
    tipo?: TipoComprobante;
    clave?: string;
    consecutivo?: string;
    contraparte?: string;
    moneda?: string;
    tipoCambio?: number;
  };
  lineas: LineaAsiento[];
  totalDebe: number;
  totalHaber: number;
  cuadrado: boolean;
  alertas: string[];
  requiereRevision: boolean;
  deducibleRenta: boolean | 'revisar';
  fundamento: string[];
  estado: 'borrador';
  /** Balance de apertura de una entidad en marcha: se presenta como saldo inicial, no como movimiento del periodo. */
  saldoInicial?: boolean;
}

// ---------------------------------------------------------------------------------------------
// Lectura del documento
// ---------------------------------------------------------------------------------------------

export function documentoDesdeComprobante(c: Comprobante): DocumentoContable {
  return {
    origen: 'emitido',
    clave: c.clave,
    consecutivo: c.consecutivo,
    tipo: c.tipo,
    fecha: c.fechaEmision,
    sentido: c.tipo === 'FEC' ? 'compra' : 'venta',
    contraparte: c.contraparte?.nombre ?? 'Consumidor final',
    condicionVenta: c.borrador.condicionVenta,
    moneda: c.resumen.codigoMoneda,
    tipoCambio: c.resumen.tipoCambio || 1,
    lineas: c.lineas.map((l) => {
      const ivas = l.impuestos.filter((i) => CODIGOS_IVA.includes(i.codigo));
      return {
        cabys: l.codigoCabys,
        detalle: l.detalle,
        cantidad: l.cantidad,
        subTotal: l.subTotal,
        iva: ivas.reduce((s, i) => s.plus(i.monto).minus(i.exoneracion?.montoExoneracion ?? 0), D(0)).toNumber(),
        otrosImpuestos: l.impuestos.filter((i) => !CODIGOS_IVA.includes(i.codigo)).reduce((s, i) => s.plus(i.monto), D(0)).toNumber(),
        asumido: l.impuestoAsumidoEmisorFabrica,
        totalLinea: l.montoTotalLinea,
        esServicio: l.esServicio,
      };
    }),
    otrosCargos: c.borrador.otrosCargos.map((o) => ({ tipo: o.tipoDocumento, monto: o.monto })),
    mediosPago: c.resumen.mediosPago.map((m) => ({ tipo: m.tipo, monto: m.monto })),
    ivaDevuelto: c.resumen.totalIVADevuelto,
    totalComprobante: c.resumen.totalComprobante,
    referencias: c.borrador.referencias.map((r) => ({ tipoDoc: r.tipoDoc, numero: r.numero, codigo: r.codigo, fechaEmision: r.fechaEmision })),
    version: '4.4',
  };
}

function tag(xml: string, nombre: string): string | undefined {
  const m = new RegExp(`<${nombre}>([^<]*)</${nombre}>`).exec(xml);
  return m ? desescaparXml(m[1].trim()) : undefined;
}

function num(xml: string, nombre: string): number {
  const n = Number(tag(xml, nombre) ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function bloques(xml: string, nombre: string): string[] {
  return [...xml.matchAll(new RegExp(`<${nombre}>([\\s\\S]*?)</${nombre}>`, 'g'))].map((m) => m[1]);
}

const TIPO_POR_RAIZ = new Map(Object.entries(ESQUEMA_XML).map(([tipo, e]) => [e.raiz, tipo as TipoComprobante]));

/** Lee un comprobante recibido desde su XML (lectura tolerante, sin validar el esquema). */
export function documentoDesdeXml(xml: string, origen: DocumentoContable['origen'] = 'recibido'): DocumentoContable {
  const raiz = /<([A-Za-z]+)\s+xmlns="([^"]+)"/.exec(xml);
  const tipo = raiz ? TIPO_POR_RAIZ.get(raiz[1]) : undefined;
  if (!tipo) throw new Error(`Tipo de comprobante no reconocido (${raiz?.[1] ?? 'sin raíz'}).`);
  const posEmisor = xml.indexOf('<Emisor>');
  const resumen = bloques(xml, 'ResumenFactura')[0] ?? '';
  return {
    origen,
    clave: tag(xml, 'Clave') ?? '',
    consecutivo: tag(xml, 'NumeroConsecutivo'),
    tipo,
    fecha: tag(xml, 'FechaEmision') ?? '',
    sentido: origen === 'recibido' || tipo === 'FEC' ? 'compra' : 'venta',
    contraparte: posEmisor >= 0 ? tag(xml.slice(posEmisor), 'Nombre') ?? '' : '',
    condicionVenta: tag(xml, 'CondicionVenta') ?? '01',
    moneda: tag(resumen, 'CodigoMoneda') ?? 'CRC',
    tipoCambio: num(resumen, 'TipoCambio') || 1,
    lineas: bloques(xml, 'LineaDetalle').map((l) => {
      const impuestos = bloques(l, 'Impuesto').map((i) => ({
        codigo: tag(i, 'Codigo') ?? '',
        monto: num(i, 'Monto') - num(i, 'MontoExoneracion'),
      }));
      const cabys = tag(l, 'CodigoCABYS') ?? '';
      return {
        cabys,
        detalle: tag(l, 'Detalle') ?? '',
        cantidad: num(l, 'Cantidad'),
        subTotal: num(l, 'SubTotal'),
        iva: impuestos.filter((i) => CODIGOS_IVA.includes(i.codigo)).reduce((s, i) => s + i.monto, 0),
        otrosImpuestos: impuestos.filter((i) => !CODIGOS_IVA.includes(i.codigo)).reduce((s, i) => s + i.monto, 0),
        asumido: num(l, 'ImpuestoAsumidoEmisorFabrica'),
        totalLinea: num(l, 'MontoTotalLinea'),
        esServicio: esCabysServicio(cabys),
      };
    }),
    otrosCargos: bloques(xml, 'OtrosCargos').map((o) => ({ tipo: tag(o, 'TipoDocumentoOC') ?? '99', monto: num(o, 'MontoCargo') })),
    mediosPago: bloques(xml, 'MedioPago').map((m) => ({ tipo: tag(m, 'TipoMedioPago') ?? '99', monto: tag(m, 'TotalMedioPago') ? num(m, 'TotalMedioPago') : undefined })),
    ivaDevuelto: num(resumen, 'TotalIVADevuelto'),
    totalComprobante: num(resumen, 'TotalComprobante'),
    referencias: bloques(xml, 'InformacionReferencia').map((r) => ({
      tipoDoc: tag(r, 'TipoDocIR') ?? '',
      numero: tag(r, 'Numero'),
      codigo: tag(r, 'Codigo'),
      fechaEmision: tag(r, 'FechaEmisionIR'),
    })),
    version: /\/v(4\.\d)\//.exec(raiz![2])?.[1],
  };
}

/** Datos del mensaje receptor que determinan el crédito fiscal (nota 18 y campo MontoTotalImpuestoAcreditar). */
export function leerConfirmacion(xml: string): DocumentoContable['confirmacion'] {
  const acreditar = tag(xml, 'MontoTotalImpuestoAcreditar');
  return {
    mensaje: tag(xml, 'Mensaje') ?? '',
    condicionImpuesto: tag(xml, 'CondicionImpuesto'),
    montoImpuestoAcreditar: acreditar === undefined ? undefined : Number(acreditar),
  };
}

// ---------------------------------------------------------------------------------------------
// Inventario permanente al costo promedio ponderado (Sección 13)
// ---------------------------------------------------------------------------------------------

export interface MovimientoKardex {
  fecha: string;
  clave: string;
  cabys: string;
  detalle: string;
  tipo: 'entrada' | 'salida' | 'ajuste';
  cantidad: number;
  costo: number;
  saldoCantidad: number;
  saldoCosto: number;
}

export interface Existencia {
  cabys: string;
  detalle: string;
  cantidad: number;
  costo: number;
  costoPromedio: number;
}

export class Kardex {
  private items = new Map<string, { detalle: string; cantidad: Decimal; costo: Decimal }>();
  readonly movimientos: MovimientoKardex[] = [];

  /** Registra una entrada (o un ajuste de valor si la cantidad es 0). */
  entrada(fecha: string, clave: string, cabys: string, detalle: string, cantidad: number, costo: Decimal): void {
    const it = this.items.get(cabys) ?? { detalle, cantidad: D(0), costo: D(0) };
    it.cantidad = it.cantidad.plus(cantidad);
    it.costo = it.costo.plus(costo);
    this.items.set(cabys, it);
    this.anotar(fecha, clave, cabys, it.detalle, cantidad === 0 ? 'ajuste' : 'entrada', cantidad, costo, it);
  }

  /** Costo de la salida al promedio vigente; null si no hay existencias del artículo. */
  salida(fecha: string, clave: string, cabys: string, detalle: string, cantidad: number): { costo: Decimal; faltante: number } | null {
    const it = this.items.get(cabys);
    if (!it || it.cantidad.lessThanOrEqualTo(0)) return null;
    const sale = Decimal.min(it.cantidad, cantidad);
    const costo = it.costo.dividedBy(it.cantidad).times(sale).toDecimalPlaces(2);
    it.cantidad = it.cantidad.minus(sale);
    it.costo = it.cantidad.isZero() ? D(0) : it.costo.minus(costo);
    this.anotar(fecha, clave, cabys, detalle, 'salida', -sale.toNumber(), costo.negated(), it);
    return { costo, faltante: D(cantidad).minus(sale).toNumber() };
  }

  costoPromedio(cabys: string): Decimal | null {
    const it = this.items.get(cabys);
    return it && it.cantidad.greaterThan(0) ? it.costo.dividedBy(it.cantidad) : null;
  }

  existencias(): Existencia[] {
    return [...this.items.entries()]
      .filter(([, it]) => !it.cantidad.isZero() || !it.costo.isZero())
      .map(([cabys, it]) => ({
        cabys,
        detalle: it.detalle,
        cantidad: it.cantidad.toNumber(),
        costo: it.costo.toDecimalPlaces(2).toNumber(),
        costoPromedio: it.cantidad.isZero() ? 0 : it.costo.dividedBy(it.cantidad).toDecimalPlaces(2).toNumber(),
      }))
      .sort((a, b) => a.cabys.localeCompare(b.cabys));
  }

  private anotar(fecha: string, clave: string, cabys: string, detalle: string, tipo: MovimientoKardex['tipo'], cantidad: number, costo: Decimal, it: { cantidad: Decimal; costo: Decimal }) {
    this.movimientos.push({
      fecha, clave, cabys, detalle, tipo, cantidad,
      costo: costo.toDecimalPlaces(2).toNumber(),
      saldoCantidad: it.cantidad.toNumber(),
      saldoCosto: it.costo.toDecimalPlaces(2).toNumber(),
    });
  }
}

// ---------------------------------------------------------------------------------------------
// Clasificación de las compras por CAByS
// ---------------------------------------------------------------------------------------------

interface ReglaCompra {
  prefijo: string;
  cuenta: string;
  /** Cuenta de gasto cuando el costo unitario no alcanza el umbral de capitalización. */
  bajoUmbral?: string;
}

/**
 * El CAByS sigue la Clasificación Central de Productos (CPC): las secciones 0-4 son bienes y 5-9
 * servicios. Se aplica el prefijo más largo que coincida.
 */
const REGLAS_COMPRA: ReglaCompra[] = [
  { prefijo: '452', cuenta: '1.2.01.02', bajoUmbral: '6.1.01.04' },
  { prefijo: '45', cuenta: '1.2.01.01', bajoUmbral: '6.1.01.04' },
  { prefijo: '381', cuenta: '1.2.01.01', bajoUmbral: '6.1.01.04' },
  { prefijo: '491', cuenta: '1.2.01.03', bajoUmbral: '6.1.01.04' },
  ...['43', '44', '46', '47', '48'].map((prefijo) => ({ prefijo, cuenta: '1.2.01.04', bajoUmbral: '6.1.01.04' })),
  { prefijo: '333', cuenta: '6.1.01.05' },
  { prefijo: '7212', cuenta: '1.2.01.05', bajoUmbral: '6.1.01.99' },
  { prefijo: '53', cuenta: '1.2.01.05', bajoUmbral: '6.1.01.06' },
  { prefijo: '54', cuenta: '1.2.01.05', bajoUmbral: '6.1.01.06' },
  { prefijo: '7211', cuenta: '6.1.01.02' },
  { prefijo: '73', cuenta: '6.1.01.02' },
  { prefijo: '69', cuenta: '6.1.01.03' },
  { prefijo: '84', cuenta: '6.1.01.03' },
  ...['81', '82', '83'].map((prefijo) => ({ prefijo, cuenta: '6.1.01.01' })),
  { prefijo: '87', cuenta: '6.1.01.06' },
  ...['64', '65', '66', '67', '68'].map((prefijo) => ({ prefijo, cuenta: '6.1.01.07' })),
  { prefijo: '63', cuenta: '6.1.01.08' },
  { prefijo: '71', cuenta: '6.2.01.01' },
  { prefijo: '92', cuenta: '6.1.01.09' },
].sort((a, b) => b.prefijo.length - a.prefijo.length);

export interface Clasificacion {
  cuenta: string;
  inventario: boolean;
  nota?: string;
}

export function clasificarCompra(l: Pick<LineaContable, 'cabys' | 'cantidad' | 'subTotal' | 'esServicio'>, tipoCambio: number, ctx: { esInventario: (cabys: string) => boolean; politicas: PoliticasContables }): Clasificacion {
  if (!l.esServicio && ctx.esInventario(l.cabys)) return { cuenta: '1.1.03.01', inventario: true };
  const regla = REGLAS_COMPRA.find((r) => l.cabys.startsWith(r.prefijo));
  if (!regla) return { cuenta: l.esServicio ? '6.1.01.99' : '6.1.01.04', inventario: false };
  if (regla.bajoUmbral) {
    const unitario = (l.subTotal / (l.cantidad || 1)) * tipoCambio;
    if (unitario < ctx.politicas.umbralCapitalizacion) {
      return { cuenta: regla.bajoUmbral, inventario: false, nota: `costo unitario bajo el umbral de capitalización (₡${ctx.politicas.umbralCapitalizacion.toLocaleString('es-CR')})` };
    }
  }
  return { cuenta: regla.cuenta, inventario: false };
}

// ---------------------------------------------------------------------------------------------
// Generación del asiento
// ---------------------------------------------------------------------------------------------

export interface ContextoContable {
  politicas: PoliticasContables;
  esInventario: (cabys: string) => boolean;
  kardex: Kardex;
  /** Fracción de IVA acreditable de cada compra contabilizada (para sus NC/ND y REP). */
  fraccionAcreditable: Map<string, number>;
}

/** Acumula importes por cuenta en colones; positivo = debe, negativo = haber. */
class Partidas {
  private saldos = new Map<string, Decimal>();
  constructor(private tipoCambio: number) {}

  /** Importe en la moneda del comprobante. */
  add(codigo: string, monto: number | Decimal): void {
    this.crc(codigo, D(monto).times(this.tipoCambio));
  }

  crc(codigo: string, monto: Decimal): void {
    if (monto.isZero()) return;
    cuenta(codigo);
    this.saldos.set(codigo, (this.saldos.get(codigo) ?? D(0)).plus(monto));
  }

  /** Redondea a 2 decimales y lleva la diferencia de redondeo (≤ ₡1) a la línea de mayor monto. */
  cerrar(): { lineas: LineaAsiento[]; diferencia: number } {
    const filas = [...this.saldos.entries()].map(([c, v]) => ({ c, v: v.toDecimalPlaces(2) })).filter((f) => !f.v.isZero());
    let dif = filas.reduce((s, f) => s.plus(f.v), D(0));
    if (!dif.isZero() && dif.abs().lessThanOrEqualTo(1) && filas.length > 0) {
      const mayor = filas.reduce((a, b) => (b.v.abs().greaterThan(a.v.abs()) ? b : a));
      mayor.v = mayor.v.minus(dif);
      dif = D(0);
    }
    const lineas = filas
      .sort((a, b) => Number(b.v.greaterThan(0)) - Number(a.v.greaterThan(0)) || a.c.localeCompare(b.c))
      .map((f) => ({ cuenta: f.c, nombre: cuenta(f.c).nombre, debe: f.v.greaterThan(0) ? f.v.toNumber() : 0, haber: f.v.lessThan(0) ? f.v.negated().toNumber() : 0 }));
    return { lineas, diferencia: dif.toNumber() };
  }
}

const suma = <T>(xs: T[], f: (x: T) => number): Decimal => xs.reduce((s, x) => s.plus(f(x)), D(0));

/** Cuenta de efectivo para un medio de pago (nota 6). */
function cuentaMedio(medio: string, sentido: 'venta' | 'compra', moneda: string): string {
  if (medio === '01' || medio === '99') return '1.1.01.01';
  if (medio === '02' && sentido === 'venta') return '1.1.01.04';
  return moneda === 'CRC' ? '1.1.01.02' : '1.1.01.03';
}

export function generarAsiento(doc: DocumentoContable, ctx: ContextoContable): Asiento {
  const alertas: string[] = [];
  const fundamento = new Set<string>();
  let revisar = false;
  let deducible: boolean | 'revisar' = true;
  const fecha = doc.fecha.slice(0, 10);
  const edicion = edicionNiifPara(fecha, ctx.politicas.adopcionAnticipadaNiif2025);
  const niif = (n: number) => fundamento.add(seccionNiif(n, edicion));
  const alerta = (codigo: string, detalle: string, exigeRevision = true) => {
    alertas.push(`${codigo}: ${detalle}`);
    if (exigeRevision) revisar = true;
  };
  const P = new Partidas(doc.tipoCambio || 1);

  // Paso 1 — validación del documento.
  if (doc.version && doc.version !== '4.4' && doc.tipo !== 'NC' && doc.tipo !== 'ND') {
    alerta(fecha >= '2025-10-06' ? 'VERSION_NO_VIGENTE' : 'VERSION_PRORROGA_EXCEPCIONAL', `XML v${doc.version}; desde el 1/09/2025 solo se admite la v4.4 (Anexos y Estructuras v4.4; RES-0043-2025 art. 21).`);
  }
  if (doc.tipo !== 'REP') {
    const esperado = suma(doc.lineas, (l) => l.totalLinea).plus(suma(doc.otrosCargos, (o) => o.monto)).minus(doc.ivaDevuelto);
    if (esperado.minus(doc.totalComprobante).abs().times(doc.tipoCambio || 1).greaterThan(1)) {
      alerta('DESCUADRE_ARITMETICO', `Σ líneas + otros cargos − IVA devuelto = ${esperado.toFixed(2)} y TotalComprobante = ${doc.totalComprobante.toFixed(2)}.`);
    }
  }
  if (doc.moneda !== 'CRC') niif(30);

  const ref = doc.referencias.find((r) => r.numero) ?? doc.referencias[0];
  const codigosRef = doc.referencias.map((r) => r.codigo);
  const errorMaterial = (doc.tipo === 'NC' || doc.tipo === 'ND') ? doc.referencias.find((r) => (r.codigo === '13' || r.codigo === '14') && r.fechaEmision) : undefined;
  if ((doc.tipo === 'NC' || doc.tipo === 'ND') && !ref) alerta('SIN_REFERENCIA', 'La nota no trae InformacionReferencia.');
  if (errorMaterial) {
    alerta('AJUSTE_ERROR_MATERIAL', `Código ${errorMaterial.codigo}: el efecto tributario se imputa a ${errorMaterial.fechaEmision!.slice(0, 7)}; el asiento se registra en la fecha de la nota (Código de Comercio, art. 254).`, false);
  }
  const devolucion = codigosRef.includes('06');

  /** Contrapartida en efectivo o en cuentas por cobrar/pagar. */
  const contrapartida = (monto: Decimal, forzarContado = false) => {
    if (monto.isZero()) return;
    const contado = forzarContado || doc.condicionVenta === '01';
    if (!contado) {
      P.add(doc.sentido === 'venta' ? '1.1.02.01' : '2.1.01.01', monto);
      niif(11);
      return;
    }
    const medios = doc.mediosPago.length ? doc.mediosPago : [{ tipo: '04' }];
    if (!doc.mediosPago.length) alerta('SIN_MEDIO_PAGO', 'Comprobante de contado sin medio de pago; se usa Bancos.', false);
    if (medios.some((m) => m.tipo === '99')) alerta('MEDIO_PAGO_OTROS', 'Medio de pago 99 (otros): verifique la cuenta de efectivo.', false);
    const conMonto = medios.every((m) => m.monto !== undefined) ? suma(medios, (m) => m.monto!) : D(0);
    medios.forEach((m, i) => {
      const parte = conMonto.greaterThan(0) ? monto.times(m.monto!).dividedBy(conMonto) : i === 0 ? monto : D(0);
      P.add(cuentaMedio(m.tipo, doc.sentido, doc.moneda), parte);
    });
  };

  if (doc.tipo === 'REP') {
    // Recibo Electrónico de Pago: cobro o pago de una operación a crédito; el IVA se devenga al pagar.
    const pagado = suma(doc.lineas, (l) => l.totalLinea);
    const iva = suma(doc.lineas, (l) => l.iva);
    if (doc.sentido === 'venta') {
      contrapartida(pagado, true);
      P.add('1.1.02.01', pagado.negated());
      P.add('2.1.02.02', iva);
      P.add('2.1.02.01', iva.negated());
    } else {
      P.add('2.1.01.01', pagado);
      contrapartida(pagado.negated(), true);
      const fraccion = ref?.numero ? ctx.fraccionAcreditable.get(ref.numero) : undefined;
      if (fraccion === undefined) alerta('REFERENCIA_NO_CONTABILIZADA', 'No se encontró la compra que paga este recibo; se asume IVA acreditable total.');
      P.add('1.1.04.01', iva.times(fraccion ?? 1));
      P.add('1.1.04.02', iva.times(fraccion ?? 1).negated());
    }
    if (doc.condicionVenta === '09') alerta('VERIFICAR_NORMA', 'Pago de servicios prestados al Estado (condición 09): verifique el devengo del IVA.');
    niif(11);
    fundamento.add('Ley del IVA (Ley 6826), art. 27 — pago diferido del impuesto');
  } else if (doc.sentido === 'venta') {
    const s = doc.tipo === 'NC' ? -1 : 1;
    const ivaDiferido = doc.condicionVenta === '10' || doc.condicionVenta === '08';
    for (const l of doc.lineas) {
      const ingreso = doc.tipo === 'NC' ? '4.1.01.04' : doc.tipo === 'FEE' ? '4.1.01.03' : l.esServicio ? '4.1.01.02' : '4.1.01.01';
      P.add(ingreso, -s * l.subTotal);
      P.add(ivaDiferido ? '2.1.02.02' : '2.1.02.01', -s * l.iva);
      P.add('2.1.02.03', -s * l.otrosImpuestos);
      P.add('6.1.01.10', s * l.asumido);
      if (!l.esServicio && doc.tipo !== 'ND' && ctx.esInventario(l.cabys)) {
        if (doc.tipo === 'NC') {
          const promedio = devolucion ? ctx.kardex.costoPromedio(l.cabys) : null;
          if (promedio) {
            const costo = promedio.times(l.cantidad).toDecimalPlaces(2);
            ctx.kardex.entrada(doc.fecha, doc.clave, l.cabys, l.detalle, l.cantidad, costo);
            P.crc('1.1.03.01', costo);
            P.crc('5.1.01.01', costo.negated());
          } else if (devolucion) {
            alerta('DEVOLUCION_SIN_COSTO', `${l.detalle}: devolución sin costo promedio disponible; registre la entrada al inventario.`);
          }
        } else {
          const salida = ctx.kardex.salida(doc.fecha, doc.clave, l.cabys, l.detalle, l.cantidad);
          if (!salida) {
            alerta('SIN_EXISTENCIAS', `${l.detalle} (${l.cabys}): no hay existencias registradas; el costo de venta queda pendiente.`);
          } else {
            P.crc('5.1.01.01', salida.costo);
            P.crc('1.1.03.01', salida.costo.negated());
            if (salida.faltante > 0) alerta('EXISTENCIAS_INSUFICIENTES', `${l.detalle}: faltan ${salida.faltante} unidades sin costo.`);
          }
          niif(13);
        }
      }
    }
    for (const o of doc.otrosCargos) P.add(o.tipo === '09' || o.tipo === '10' ? '4.2.01.01' : '2.1.03.01', -s * o.monto);
    if (doc.ivaDevuelto > 0) {
      P.add('1.1.04.03', s * doc.ivaDevuelto);
      alerta('VERIFICAR_NORMA', 'IVA devuelto en servicios de salud pagados con tarjeta: verifique su recuperación.');
    }
    contrapartida(D(s * doc.totalComprobante));
    niif(23);
    if (ivaDiferido) fundamento.add('Ley del IVA (Ley 6826), art. 27 — pago diferido del impuesto');
    if (doc.condicionVenta === '08') alerta('VERIFICAR_NORMA', 'Servicios prestados al Estado (condición 08): verifique el devengo del IVA.');
    if (doc.tipo === 'TE') fundamento.add('Tiquete electrónico: venta a consumidor final');
  } else {
    // Compras: recibidas de proveedores o documentadas por la empresa con una FEC.
    const s = doc.tipo === 'NC' ? -1 : 1;
    let fraccion = 1;
    if (doc.tipo === 'TE') {
      fraccion = 0;
      deducible = 'revisar';
      alerta('TIQUETE_SIN_CREDITO', 'El tiquete no otorga crédito fiscal; el IVA se suma al costo o gasto.');
    } else if (doc.origen === 'emitido') {
      alerta('VERIFICAR_AUTOLIQUIDACION', 'Factura electrónica de compra: verifique la autoliquidación del IVA y su acreditación.');
    } else {
      const heredada = (doc.tipo === 'NC' || doc.tipo === 'ND') && ref?.numero ? ctx.fraccionAcreditable.get(ref.numero) : undefined;
      const cond = doc.confirmacion?.condicionImpuesto;
      const ivaTotal = suma(doc.lineas, (l) => (l.asumido > 0 ? 0 : l.iva)).minus(doc.ivaDevuelto);
      if (doc.confirmacion?.mensaje === '2') alerta('ACEPTACION_PARCIAL', 'Aceptación parcial: revise qué líneas se contabilizan.');
      if (cond === '01' || cond === '03') fraccion = 1;
      else if (cond === '04') fraccion = 0;
      else if (cond === '02' || cond === '05') {
        const acreditar = doc.confirmacion?.montoImpuestoAcreditar;
        if (acreditar === undefined || ivaTotal.lessThanOrEqualTo(0)) {
          fraccion = 0;
          alerta('SIN_MONTO_ACREDITABLE', `Condición ${cond} sin MontoTotalImpuestoAcreditar; el IVA se trata como no acreditable.`);
        } else {
          fraccion = Decimal.min(1, D(acreditar).dividedBy(ivaTotal)).toNumber();
        }
      } else if (heredada !== undefined) {
        fraccion = heredada;
      } else {
        alerta('SIN_CONDICION_IMPUESTO', 'El mensaje receptor no indica la condición del impuesto; se asume crédito total.');
      }
    }

    const tc = doc.tipoCambio || 1;
    const clasif = doc.lineas.map((l) => clasificarCompra(l, tc, ctx));
    const ivaPagado = Decimal.max(0, suma(doc.lineas, (l) => (l.asumido > 0 ? 0 : l.iva)).minus(doc.ivaDevuelto));
    const acreditable = ivaPagado.times(fraccion);
    // IVA no acreditable e impuestos distintos del IVA: mayor costo de cada línea (Secciones 13 y 17).
    const alCosto = ivaPagado.minus(acreditable).plus(suma(doc.lineas, (l) => (l.asumido > 0 ? 0 : l.otrosImpuestos)));
    const base = suma(doc.lineas, (l) => l.subTotal);
    doc.lineas.forEach((l, i) => {
      const parte = base.greaterThan(0) ? alCosto.times(l.subTotal).dividedBy(base) : i === 0 ? alCosto : D(0);
      const costo = D(l.subTotal).plus(parte);
      const c = clasif[i];
      P.add(c.cuenta, costo.times(s));
      if (c.nota) alerta('CLASIFICACION', `${l.detalle}: ${c.nota}; se registra como gasto.`, false);
      if (c.inventario) {
        const crc = costo.times(tc).toDecimalPlaces(2);
        const cantidad = doc.tipo === 'ND' || (doc.tipo === 'NC' && !devolucion) ? 0 : l.cantidad;
        ctx.kardex.entrada(doc.fecha, doc.clave, l.cabys, l.detalle, s * cantidad, crc.times(s));
        niif(13);
      } else if (c.cuenta.startsWith('1.2.01')) {
        niif(17);
        alerta('ACTIVO_CAPITALIZADO', `${l.detalle}: se capitaliza en ${cuenta(c.cuenta).nombre}; inicie la depreciación cuando esté disponible para su uso.`, false);
      }
      if (c.cuenta === '6.1.01.02') niif(20);
      if (c.cuenta === '6.1.01.08') deducible = 'revisar';
    });
    P.add(doc.condicionVenta === '10' ? '1.1.04.02' : '1.1.04.01', acreditable.times(s));
    P.add('6.1.01.99', suma(doc.otrosCargos, (o) => o.monto).times(s));
    contrapartida(D(-s * doc.totalComprobante));
    ctx.fraccionAcreditable.set(doc.clave, fraccion);
    if (doc.condicionVenta === '14' || doc.condicionVenta === '15') {
      niif(20);
      alerta('ARRENDAMIENTO', `Condición de venta ${doc.condicionVenta} (${doc.condicionVenta === '15' ? 'arrendamiento financiero' : 'arrendamiento operativo'}): verifique el tratamiento de la Sección 20.`, doc.condicionVenta === '15');
    }
    fundamento.add('Ley del IVA (Ley 6826) y mensaje receptor (nota 18): crédito fiscal según la condición del impuesto');
  }

  const { lineas, diferencia } = P.cerrar();
  if (diferencia !== 0) alerta('ASIENTO_DESCUADRADO', `Diferencia de ₡${diferencia.toFixed(2)} entre debe y haber.`);
  const totalDebe = suma(lineas, (l) => l.debe).toNumber();
  const totalHaber = suma(lineas, (l) => l.haber).toNumber();
  const contraparte = doc.contraparte || 'Sin nombre';
  return {
    numero: 0,
    fecha,
    periodoTributario: (errorMaterial?.fechaEmision ?? doc.fecha).slice(0, 7),
    glosa: `${NOMBRE_COMPROBANTE[doc.tipo]} ${doc.consecutivo ?? doc.clave.slice(21, 41)} — ${doc.sentido === 'venta' ? 'cliente' : 'proveedor'} ${contraparte}${ref?.numero ? ` — ref. ${ref.numero.length === 50 ? ref.numero.slice(21, 41) : ref.numero}` : ''}`,
    origen: { documento: doc.origen, tipo: doc.tipo, clave: doc.clave, consecutivo: doc.consecutivo, contraparte, moneda: doc.moneda, tipoCambio: doc.tipoCambio },
    lineas,
    totalDebe,
    totalHaber,
    cuadrado: totalDebe === totalHaber,
    alertas,
    requiereRevision: revisar,
    deducibleRenta: deducible,
    fundamento: [...fundamento],
    estado: 'borrador',
  };
}

/** Asiento de apertura del libro de inventarios y balances: aporte de capital en efectivo (Código de Comercio, art. 255). */
export function asientoApertura(fecha: string, capital: number): Asiento {
  const monto = D(capital).toDecimalPlaces(2).toNumber();
  return {
    numero: 0,
    fecha,
    periodoTributario: fecha.slice(0, 7),
    glosa: 'Asiento de apertura — aporte de capital en efectivo',
    origen: { documento: 'apertura' },
    lineas: [
      { cuenta: '1.1.01.02', nombre: cuenta('1.1.01.02').nombre, debe: monto, haber: 0 },
      { cuenta: '3.1.01.01', nombre: cuenta('3.1.01.01').nombre, debe: 0, haber: monto },
    ],
    totalDebe: monto,
    totalHaber: monto,
    cuadrado: true,
    alertas: [],
    requiereRevision: false,
    deducibleRenta: true,
    fundamento: ['Código de Comercio (Ley 3284), art. 255 — libro de inventarios y balances'],
    estado: 'borrador',
  };
}

// ---------------------------------------------------------------------------------------------
// Libro diario
// ---------------------------------------------------------------------------------------------

/** Comprobante recibido con su estado de confirmación y el XML del mensaje receptor. */
export interface RecibidoContable {
  recibido: ComprobanteRecibido;
  estado: string;
  xmlConfirmacion?: string;
}

export interface EntradaLibroDiario {
  emisor: Pick<Emisor, 'identificacion'>;
  emitidos: Comprobante[];
  recibidos: RecibidoContable[];
  /** CAByS de los productos que la entidad vende: sus compras van a inventario. */
  cabysInventario: string[];
  politicas?: PoliticasContables;
  apertura?: AperturaContable;
}

export interface LibroDiario {
  asientos: Asiento[];
  kardex: Kardex;
  /** Comprobantes que no generan asiento y por qué. */
  omitidos: { clave: string; documento: string; motivo: string }[];
}

export function generarLibroDiario(e: EntradaLibroDiario): LibroDiario {
  const politicas = e.politicas ?? POLITICAS_PREDETERMINADAS;
  const inventario = new Set(e.cabysInventario);
  const ctx: ContextoContable = {
    politicas,
    esInventario: (cabys) => inventario.has(cabys) || politicas.prefijosInventario.some((p) => p && cabys.startsWith(p)),
    kardex: new Kardex(),
    fraccionAcreditable: new Map(),
  };
  const omitidos: LibroDiario['omitidos'] = [];
  const docs: DocumentoContable[] = [];
  const vistos = new Set<string>();
  const agregar = (d: DocumentoContable) => {
    if (vistos.has(d.clave)) {
      omitidos.push({ clave: d.clave, documento: NOMBRE_COMPROBANTE[d.tipo], motivo: 'Duplicado: la clave ya está contabilizada.' });
      return;
    }
    vistos.add(d.clave);
    docs.push(d);
  };

  for (const c of e.emitidos) {
    if (c.estado === 'aceptado') agregar(documentoDesdeComprobante(c));
    else if (c.estado === 'rechazado') omitidos.push({ clave: c.clave, documento: NOMBRE_COMPROBANTE[c.tipo], motivo: 'Rechazado por Hacienda: no se contabiliza.' });
  }
  for (const r of e.recibidos) {
    const etiqueta = `${r.recibido.tipoDocumento} de ${r.recibido.nombreEmisor}`;
    if (r.estado === 'pendiente') { omitidos.push({ clave: r.recibido.clave, documento: etiqueta, motivo: 'Pendiente de confirmar (mensaje receptor).' }); continue; }
    if (r.estado === 'rechazado') { omitidos.push({ clave: r.recibido.clave, documento: etiqueta, motivo: 'Rechazado por la empresa: no se contabiliza.' }); continue; }
    if (!r.recibido.xml) { omitidos.push({ clave: r.recibido.clave, documento: etiqueta, motivo: 'Sin XML del comprobante.' }); continue; }
    try {
      const d = documentoDesdeXml(r.recibido.xml);
      d.confirmacion = r.xmlConfirmacion ? leerConfirmacion(r.xmlConfirmacion) : undefined;
      if (r.recibido.identificacionReceptor?.numero && r.recibido.identificacionReceptor.numero !== e.emisor.identificacion.numero) {
        omitidos.push({ clave: d.clave, documento: etiqueta, motivo: 'El receptor del comprobante no es la empresa.' });
        continue;
      }
      agregar(d);
    } catch (err) {
      omitidos.push({ clave: r.recibido.clave, documento: etiqueta, motivo: (err as Error).message });
    }
  }

  // Orden cronológico (Código de Comercio, art. 254): el costo promedio depende del orden de las operaciones.
  // En el mismo instante, las compras (entradas al inventario) van antes que las ventas.
  docs.sort((a, b) =>
    new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
    || Number(a.sentido === 'venta') - Number(b.sentido === 'venta')
    || a.clave.localeCompare(b.clave));
  // El inventario inicial entra al kárdex antes de las operaciones para el costo promedio.
  for (const x of e.apertura?.existencias ?? []) ctx.kardex.entrada(e.apertura!.fecha, 'apertura', x.cabys, x.detalle, x.cantidad, D(x.costo));
  const asientos = docs.map((d) => generarAsiento(d, ctx));
  const apertura = e.apertura && asientoAperturaBalance(e.apertura);
  if (apertura) asientos.unshift(apertura);
  asientos.sort((a, b) => a.fecha.localeCompare(b.fecha) || Number(b.origen.documento === 'apertura') - Number(a.origen.documento === 'apertura'));
  asientos.forEach((a, i) => (a.numero = i + 1));
  return { asientos, kardex: ctx.kardex, omitidos };
}
