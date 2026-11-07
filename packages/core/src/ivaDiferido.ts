/**
 * Pago diferido del IVA en ventas a crédito (condición de venta 10).
 *
 * Ley del IVA (Ley 6826), art. 27, párrafo tercero, y su Reglamento (Decreto 41779-H), art. 40 bis
 * (adicionado por el Decreto 44392-H del 15/11/2023):
 * - el impuesto de la venta a crédito se paga cuando se cobra, «hasta un plazo máximo de noventa días
 *   naturales, contados a partir de la emisión de la factura electrónica» (inc. d);
 * - en cada declaración se rebaja el IVA de las ventas a crédito no canceladas en el período (op. 1),
 *   se suma el cobrado en el período de ventas de períodos anteriores (op. 2) y se suma el de las
 *   ventas que superaron los noventa días, se hayan cobrado o no (op. 3).
 * - Solo pueden acogerse trabajadores independientes, prestadores de servicios profesionales, MiPyMEs
 *   y productores registrados ante el MEIC o el MAG; quedan excluidos los Grandes Contribuyentes
 *   Nacionales y quien haga de la venta una actividad financiera lucrativa.
 */
import Decimal from 'decimal.js';
import { periodoContable } from './actualizacion';
import type { TipoComprobante } from './catalogos';
import type { Comprobante } from './tipos';

export const PLAZO_IVA_DIFERIDO_DIAS = 90;
export const FUENTE_IVA_DIFERIDO = 'Ley del IVA (Ley 6826), art. 27; Reglamento de la Ley del IVA (Decreto 41779-H), art. 40 bis';
export const SUJETOS_IVA_DIFERIDO =
  'Solo pueden acogerse al pago diferido del IVA los trabajadores independientes, los prestadores de servicios profesionales, las MiPyMEs y los productores registrados ante el MEIC o el MAG; quedan excluidos los Grandes Contribuyentes Nacionales y quien haga de la venta una actividad financiera lucrativa.';

/** Tipos de comprobante que originan IVA diferido cuando se emiten con la condición de venta 10. */
const ORIGINAN: TipoComprobante[] = ['FE', 'FEE', 'TE', 'ND'];

export function originaIvaDiferido(tipo: TipoComprobante, condicionVenta: string): boolean {
  return condicionVenta === '10' && ORIGINAN.includes(tipo);
}

/** Último día para pagar el IVA diferido (AAAA-MM-DD): emisión + 90 días naturales. */
export function venceIvaDiferido(fechaEmision: string): string {
  const [a, m, d] = fechaEmision.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d + PLAZO_IVA_DIFERIDO_DIAS)).toISOString().slice(0, 10);
}

export interface FacturaIvaDiferido {
  clave: string;
  fecha: string;
  vence: string;
  /** IVA diferido original en colones. */
  iva: Decimal;
  /** IVA todavía diferido (no cobrado, no vencido, no anulado). */
  pendiente: Decimal;
}

/** Saldo del IVA diferido de cada factura con condición 10, en colones. */
export class RegistroIvaDiferido {
  readonly facturas = new Map<string, FacturaIvaDiferido>();

  registrar(clave: string, fecha: string, iva: Decimal.Value): void {
    const monto = new Decimal(iva);
    if (monto.lessThanOrEqualTo(0)) return;
    this.facturas.set(clave, { clave, fecha: fecha.slice(0, 10), vence: venceIvaDiferido(fecha), iva: monto, pendiente: monto });
  }

  /** Aplica un cobro (REP) o una nota de crédito: devuelve la parte que seguía diferida. */
  aplicar(clave: string | undefined, monto: Decimal.Value): { diferido: Decimal; seguido: boolean } {
    const f = clave ? this.facturas.get(clave) : undefined;
    const m = Decimal.max(new Decimal(monto), 0);
    if (!f) return { diferido: m, seguido: false };
    const diferido = Decimal.min(m, f.pendiente);
    f.pendiente = f.pendiente.minus(diferido);
    return { diferido, seguido: true };
  }

  /** Facturas cuyo plazo venció antes de `fecha` (AAAA-MM-DD) con IVA pendiente: lo devenga y lo devuelve. */
  vencer(antesDe: string): { factura: FacturaIvaDiferido; monto: Decimal }[] {
    const out: { factura: FacturaIvaDiferido; monto: Decimal }[] = [];
    for (const f of [...this.facturas.values()].sort((a, b) => a.vence.localeCompare(b.vence) || a.clave.localeCompare(b.clave))) {
      if (f.vence < antesDe && f.pendiente.greaterThan(0)) {
        out.push({ factura: f, monto: f.pendiente });
        f.pendiente = new Decimal(0);
      }
    }
    return out;
  }
}

/** Códigos de impuesto de la nota 8 que son IVA (general, cobrado en fábrica y bienes usados). */
export const CODIGOS_IVA = ['01', '07', '08'];

/** IVA neto de exoneración del comprobante, en colones (mismo criterio que el libro diario). */
function ivaEnColones(c: Comprobante): Decimal {
  const tc = c.resumen.tipoCambio || 1;
  return c.lineas
    .reduce((s, l) => l.impuestos.filter((i) => CODIGOS_IVA.includes(i.codigo)).reduce((t, i) => t.plus(i.monto).minus(i.exoneracion?.montoExoneracion ?? 0), s), new Decimal(0))
    .times(tc);
}

const referida = (c: Comprobante) => c.borrador.referencias.find((r) => r.numero)?.numero;

export interface DetalleIvaDiferido {
  clave: string;
  consecutivo: string;
  fecha: string;
  monto: number;
  vence?: string;
}

export interface IvaDiferidoDelPeriodo {
  /** Op. 1: IVA de las ventas a crédito del período que sigue diferido al cierre (se rebaja). */
  diferido: number;
  /** Op. 2: IVA cobrado con REP en el período de ventas de períodos anteriores (se suma). */
  recuperado: number;
  /** Op. 3: IVA de ventas que superaron los 90 días sin cobrarse (se suma). */
  vencido: number;
  /** NC del período sobre IVA que seguía diferido: el cuadro por tarifa ya la resta, pero ese IVA no se había declarado (se suma). */
  notasSobreDiferido: number;
  /** Ajuste neto sobre el IVA por tarifa del período: −diferido + recuperado + vencido + notas. */
  ajuste: number;
  detalle: { diferido: DetalleIvaDiferido[]; recuperado: DetalleIvaDiferido[]; vencido: DetalleIvaDiferido[]; notas: DetalleIvaDiferido[] };
  /** Ventas con condición 10 que vencen en el período y aún pueden cobrarse (informativo). */
  porVencer: DetalleIvaDiferido[];
}

/**
 * Operaciones del art. 40 bis del Reglamento del IVA para el período `mes` (AAAA-MM), con los
 * comprobantes emitidos y aceptados. `hoy` (AAAA-MM-DD) limita los vencimientos al día de consulta.
 */
export function ivaDiferidoDelPeriodo(comprobantes: Comprobante[], mes: string, hoy: string): IvaDiferidoDelPeriodo {
  const [a, m] = mes.split('-').map(Number);
  const finMes = new Date(Date.UTC(a, m, 1)).toISOString().slice(0, 10); // primer día del mes siguiente
  const corte = hoy < finMes ? hoy : finMes;
  const reg = new RegistroIvaDiferido();
  const r: IvaDiferidoDelPeriodo = { diferido: 0, recuperado: 0, vencido: 0, notasSobreDiferido: 0, ajuste: 0, detalle: { diferido: [], recuperado: [], vencido: [], notas: [] }, porVencer: [] };
  const consecutivo = new Map<string, string>();
  const enMes = (f: string) => f.startsWith(mes);
  const fila = (clave: string, fecha: string, monto: Decimal, vence?: string): DetalleIvaDiferido =>
    ({ clave, consecutivo: consecutivo.get(clave) ?? clave.slice(21, 41), fecha: fecha.slice(0, 10), monto: monto.toDecimalPlaces(2).toNumber(), vence });

  const vencerHasta = (fecha: string) => {
    for (const { factura, monto } of reg.vencer(fecha)) {
      if (enMes(factura.vence)) { r.vencido += monto.toNumber(); r.detalle.vencido.push(fila(factura.clave, factura.fecha, monto, factura.vence)); }
    }
  };

  const docs = comprobantes
    .filter((c) => c.estado === 'aceptado' && c.fechaEmision.slice(0, 10) < corte)
    .sort((x, y) => x.fechaEmision.localeCompare(y.fechaEmision) || x.clave.localeCompare(y.clave));
  for (const c of docs) {
    consecutivo.set(c.clave, c.consecutivo);
    vencerHasta(c.fechaEmision.slice(0, 10));
    const iva = ivaEnColones(c);
    if (originaIvaDiferido(c.tipo, c.borrador.condicionVenta)) reg.registrar(c.clave, c.fechaEmision, iva);
    else if (c.tipo === 'REP') {
      const ref = referida(c);
      const f = ref ? reg.facturas.get(ref) : undefined;
      const { diferido } = reg.aplicar(ref, iva);
      if (f && enMes(c.fechaEmision) && !enMes(f.fecha) && diferido.greaterThan(0)) {
        r.recuperado += diferido.toNumber();
        r.detalle.recuperado.push(fila(c.clave, c.fechaEmision, diferido));
      }
    } else if (c.tipo === 'NC') {
      const ref = referida(c);
      const f = ref ? reg.facturas.get(ref) : undefined;
      const { diferido } = reg.aplicar(ref, iva);
      // Solo las NC imputadas a este período (códigos 13/14 van al del comprobante modificado).
      if (f && periodoContable(c) === mes && !enMes(f.fecha) && diferido.greaterThan(0)) {
        r.notasSobreDiferido += diferido.toNumber();
        r.detalle.notas.push(fila(c.clave, c.fechaEmision, diferido));
      }
    }
  }
  vencerHasta(corte);
  for (const f of reg.facturas.values()) {
    if (enMes(f.fecha) && f.pendiente.greaterThan(0)) { r.diferido += f.pendiente.toNumber(); r.detalle.diferido.push(fila(f.clave, f.fecha, f.pendiente, f.vence)); }
    if (enMes(f.vence) && f.pendiente.greaterThan(0)) r.porVencer.push(fila(f.clave, f.fecha, f.pendiente, f.vence));
  }
  const dos = (n: number) => new Decimal(n).toDecimalPlaces(2).toNumber();
  r.diferido = dos(r.diferido);
  r.recuperado = dos(r.recuperado);
  r.vencido = dos(r.vencido);
  r.notasSobreDiferido = dos(r.notasSobreDiferido);
  r.ajuste = dos(-r.diferido + r.recuperado + r.vencido + r.notasSobreDiferido);
  return r;
}
