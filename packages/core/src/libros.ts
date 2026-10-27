/**
 * Libros contables derivados del libro diario: mayor, balance de comprobación y los estados del
 * libro de inventarios y balances (Código de Comercio, arts. 251-263; NIIF para las PYMES, Secciones 3 a 5).
 */
import Decimal from 'decimal.js';
import type { Asiento } from './contabilidad';
import { CATALOGO_CUENTAS, cuenta, nivelCuenta, type Cuenta, type TipoCuenta } from './cuentas';

const D = (v: number | Decimal) => new Decimal(v);

/** Saldo con el signo de la naturaleza de la cuenta. */
const saldoNatural = (c: Cuenta, debe: Decimal, haber: Decimal) => (c.naturaleza === 'deudora' ? debe.minus(haber) : haber.minus(debe));

/** Saldo con el signo de su clase: positivo aumenta el activo, pasivo, patrimonio, ingreso, costo o gasto. */
const POR_DEBE: TipoCuenta[] = ['activo', 'costo', 'gasto'];
const saldoPorTipo = (tipo: TipoCuenta, debe: Decimal, haber: Decimal) => (POR_DEBE.includes(tipo) ? debe.minus(haber) : haber.minus(debe));

export interface MovimientoMayor {
  numero: number;
  fecha: string;
  glosa: string;
  clave?: string;
  debe: number;
  haber: number;
  saldo: number;
}

export interface CuentaMayor {
  cuenta: Cuenta;
  saldoInicial: number;
  debe: number;
  haber: number;
  saldoFinal: number;
  movimientos: MovimientoMayor[];
}

/** Libro mayor de las cuentas con saldo o movimiento entre `desde` y `hasta` (AAAA-MM-DD, inclusive). */
export function libroMayor(asientos: Asiento[], desde = '0000-01-01', hasta = '9999-12-31'): CuentaMayor[] {
  const acc = new Map<string, { inicialD: Decimal; inicialH: Decimal; debe: Decimal; haber: Decimal; movs: Omit<MovimientoMayor, 'saldo'>[] }>();
  for (const a of asientos) {
    if (a.fecha > hasta) continue;
    for (const l of a.lineas) {
      const x = acc.get(l.cuenta) ?? { inicialD: D(0), inicialH: D(0), debe: D(0), haber: D(0), movs: [] };
      if (a.fecha < desde) {
        x.inicialD = x.inicialD.plus(l.debe);
        x.inicialH = x.inicialH.plus(l.haber);
      } else {
        x.debe = x.debe.plus(l.debe);
        x.haber = x.haber.plus(l.haber);
        x.movs.push({ numero: a.numero, fecha: a.fecha, glosa: a.glosa, clave: a.origen.clave, debe: l.debe, haber: l.haber });
      }
      acc.set(l.cuenta, x);
    }
  }
  return [...acc.entries()]
    .sort(([a], [b]) => compararCodigos(a, b))
    .map(([codigo, x]) => {
      const c = cuenta(codigo);
      let saldo = saldoNatural(c, x.inicialD, x.inicialH);
      const saldoInicial = saldo.toNumber();
      const movimientos = x.movs.map((m) => {
        saldo = saldo.plus(saldoNatural(c, D(m.debe), D(m.haber)));
        return { ...m, saldo: saldo.toNumber() };
      });
      return { cuenta: c, saldoInicial, debe: x.debe.toNumber(), haber: x.haber.toNumber(), saldoFinal: saldo.toNumber(), movimientos };
    });
}

/** Orden numérico por segmentos («1.1.10» después de «1.1.9»). */
export function compararCodigos(a: string, b: string): number {
  const x = a.split('.').map(Number);
  const y = b.split('.').map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    if ((x[i] ?? -1) !== (y[i] ?? -1)) return (x[i] ?? -1) - (y[i] ?? -1);
  }
  return 0;
}

export interface FilaComprobacion {
  cuenta: Cuenta;
  debe: number;
  haber: number;
  saldoDeudor: number;
  saldoAcreedor: number;
}

/** Balance de comprobación de sumas y saldos a una fecha de corte. */
export function balanceComprobacion(asientos: Asiento[], hasta = '9999-12-31') {
  const filas: FilaComprobacion[] = libroMayor(asientos, '0000-01-01', hasta).map((m) => {
    const neto = D(m.debe).minus(m.haber);
    return {
      cuenta: m.cuenta,
      debe: m.debe,
      haber: m.haber,
      saldoDeudor: neto.greaterThan(0) ? neto.toNumber() : 0,
      saldoAcreedor: neto.lessThan(0) ? neto.negated().toNumber() : 0,
    };
  });
  const total = (f: (x: FilaComprobacion) => number) => filas.reduce((s, x) => s.plus(f(x)), D(0)).toNumber();
  const totales = { debe: total((f) => f.debe), haber: total((f) => f.haber), saldoDeudor: total((f) => f.saldoDeudor), saldoAcreedor: total((f) => f.saldoAcreedor) };
  return { filas, totales, cuadra: totales.debe === totales.haber && totales.saldoDeudor === totales.saldoAcreedor };
}

export interface RenglonEstado {
  codigo: string;
  nombre: string;
  nivel: number;
  monto: number;
}

/** Saldos por cuenta imputable (con signo de su clase) de los asientos que cumplen el filtro. */
function saldos(asientos: Asiento[], filtro: (a: Asiento) => boolean): Map<string, Decimal> {
  const m = new Map<string, Decimal>();
  for (const a of asientos) {
    if (!filtro(a)) continue;
    for (const l of a.lineas) {
      const c = cuenta(l.cuenta);
      m.set(l.cuenta, (m.get(l.cuenta) ?? D(0)).plus(saldoPorTipo(c.tipo, D(l.debe), D(l.haber))));
    }
  }
  return m;
}

/** Renglones de los niveles 2 a 4 de una clase, con el total acumulado de sus subcuentas. */
function renglones(s: Map<string, Decimal>, clase: string): { renglones: RenglonEstado[]; total: Decimal } {
  const renglones: RenglonEstado[] = [];
  let total = D(0);
  for (const c of CATALOGO_CUENTAS) {
    if (!c.codigo.startsWith(`${clase}.`)) continue;
    const monto = [...s.entries()].filter(([k]) => k === c.codigo || k.startsWith(`${c.codigo}.`)).reduce((t, [, v]) => t.plus(v), D(0));
    if (monto.isZero()) continue;
    renglones.push({ codigo: c.codigo, nombre: c.nombre, nivel: nivelCuenta(c.codigo), monto: monto.toNumber() });
    if (c.imputable) total = total.plus(monto);
  }
  return { renglones, total };
}

export interface EstadosFinancieros {
  desde: string;
  hasta: string;
  situacion: {
    activo: RenglonEstado[];
    pasivo: RenglonEstado[];
    patrimonio: RenglonEstado[];
    totalActivo: number;
    totalPasivo: number;
    totalPatrimonio: number;
    cuadra: boolean;
  };
  resultados: {
    ingresos: RenglonEstado[];
    costos: RenglonEstado[];
    gastos: RenglonEstado[];
    totalIngresos: number;
    totalCostos: number;
    utilidadBruta: number;
    totalGastos: number;
    resultado: number;
  };
}

/**
 * Estado de situación financiera al `hasta` y estado de resultados del periodo `desde`-`hasta`.
 * Mientras no haya asientos de cierre, los resultados anteriores al periodo se presentan como
 * resultados acumulados y los del periodo como resultado del periodo.
 */
export function estadosFinancieros(asientos: Asiento[], desde: string, hasta: string): EstadosFinancieros {
  const alCorte = saldos(asientos, (a) => a.fecha <= hasta);
  const delPeriodo = saldos(asientos, (a) => a.fecha >= desde && a.fecha <= hasta);
  const anteriores = saldos(asientos, (a) => a.fecha < desde);

  const resultadoDe = (s: Map<string, Decimal>) => {
    const r = (clase: string) => renglones(s, clase).total;
    return r('4').minus(r('5')).minus(r('6'));
  };
  const activo = renglones(alCorte, '1');
  const pasivo = renglones(alCorte, '2');
  const patrimonio = renglones(alCorte, '3');
  const acumulado = resultadoDe(anteriores);
  const resultado = resultadoDe(delPeriodo);
  if (!acumulado.isZero()) patrimonio.renglones.push({ codigo: '', nombre: 'Resultados de periodos anteriores (sin asiento de cierre)', nivel: 2, monto: acumulado.toNumber() });
  if (!resultado.isZero()) patrimonio.renglones.push({ codigo: '', nombre: 'Resultado del periodo', nivel: 2, monto: resultado.toNumber() });
  const totalPatrimonio = patrimonio.total.plus(acumulado).plus(resultado);

  const ingresos = renglones(delPeriodo, '4');
  const costos = renglones(delPeriodo, '5');
  const gastos = renglones(delPeriodo, '6');
  return {
    desde,
    hasta,
    situacion: {
      activo: activo.renglones,
      pasivo: pasivo.renglones,
      patrimonio: patrimonio.renglones,
      totalActivo: activo.total.toNumber(),
      totalPasivo: pasivo.total.toNumber(),
      totalPatrimonio: totalPatrimonio.toNumber(),
      cuadra: activo.total.minus(pasivo.total).minus(totalPatrimonio).abs().lessThan(0.005),
    },
    resultados: {
      ingresos: ingresos.renglones,
      costos: costos.renglones,
      gastos: gastos.renglones,
      totalIngresos: ingresos.total.toNumber(),
      totalCostos: costos.total.toNumber(),
      utilidadBruta: ingresos.total.minus(costos.total).toNumber(),
      totalGastos: gastos.total.toNumber(),
      resultado: resultado.toNumber(),
    },
  };
}
