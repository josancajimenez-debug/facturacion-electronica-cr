/**
 * Libros contables derivados del libro diario: mayor, balance de comprobación y el juego completo de
 * estados financieros (Código de Comercio, arts. 251-263; NIIF para las PYMES, Secciones 3 a 8).
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
    /** Utilidad antes del impuesto sobre la renta (Sección 29). */
    utilidadAntesImpuesto: number;
    impuestoRenta: number;
    resultado: number;
  };
  /** Sección 6: una columna por componente del patrimonio. */
  cambiosPatrimonio: {
    filas: FilaPatrimonio[];
    cuadra: boolean;
  };
  /** Sección 7, método indirecto. */
  flujos: {
    operacion: RenglonFlujo[];
    inversion: RenglonFlujo[];
    financiamiento: RenglonFlujo[];
    totalOperacion: number;
    totalInversion: number;
    totalFinanciamiento: number;
    variacion: number;
    efectivoInicial: number;
    efectivoFinal: number;
    cuadra: boolean;
  };
}

export interface FilaPatrimonio {
  concepto: string;
  capital: number;
  reservas: number;
  acumulados: number;
  resultado: number;
  total: number;
  /** Saldo de apertura o de cierre (se resalta). */
  saldo?: boolean;
}

export interface RenglonFlujo {
  codigo: string;
  concepto: string;
  monto: number;
}

/** Asiento que salda las cuentas de ingresos, costos y gastos contra el patrimonio. */
export const esCierreDeResultados = (a: Asiento): boolean => a.origen.documento === 'cierre' && a.lineas.some((l) => /^[456]\./.test(l.cuenta));

/** Suma de los saldos de las cuentas cuyo código empieza con `prefijo`. */
const suma = (s: Map<string, Decimal>, prefijo: string) =>
  [...s.entries()].filter(([k]) => k.startsWith(prefijo)).reduce((t, [, v]) => t.plus(v), D(0));

/** Cuentas de valuación del activo no corriente: su variación es un ajuste que no mueve efectivo. */
const esDepreciacion = (codigo: string) => codigo.startsWith('1.2.02.') || codigo === '1.2.03.02';

type Actividad = 'operacion' | 'inversion' | 'financiamiento';

/**
 * Flujos de efectivo por el método indirecto: cada variación de una cuenta de balance distinta del
 * efectivo se asigna a una actividad, de modo que el total concilia siempre con la variación del efectivo.
 */
function flujosEfectivo(delPeriodo: Map<string, Decimal>, resultado: Decimal) {
  const grupos: Record<Actividad, Map<string, { concepto: string; monto: Decimal }>> = { operacion: new Map(), inversion: new Map(), financiamiento: new Map() };
  const anotar = (actividad: Actividad, codigo: string, concepto: string, monto: Decimal) => {
    const g = grupos[actividad].get(codigo);
    grupos[actividad].set(codigo, { concepto, monto: (g?.monto ?? D(0)).plus(monto) });
  };
  for (const [codigo, variacion] of [...delPeriodo.entries()].sort(([a], [b]) => compararCodigos(a, b))) {
    const c = cuenta(codigo);
    if (!['activo', 'pasivo', 'patrimonio'].includes(c.tipo) || codigo.startsWith('1.1.01.') || variacion.isZero()) continue;
    // Un aumento del activo consume efectivo; un aumento del pasivo o del patrimonio lo aporta.
    const efecto = c.tipo === 'activo' ? variacion.negated() : variacion;
    const grupo = codigo.split('.').slice(0, 3).join('.');
    const nombre = cuenta(grupo).nombre.toLowerCase();
    if (esDepreciacion(codigo)) anotar('operacion', codigo, `Depreciación y amortización (${c.nombre.toLowerCase()})`, efecto);
    else if (c.tipo === 'activo' && c.corriente) anotar('operacion', grupo, `(Aumento) disminución en ${nombre}`, efecto);
    else if (c.tipo === 'activo') anotar('inversion', grupo, `(Adquisición) venta de ${nombre}`, efecto);
    else if (c.tipo === 'pasivo' && c.corriente) anotar('operacion', grupo, `Aumento (disminución) en ${nombre}`, efecto);
    else if (c.tipo === 'pasivo') anotar('financiamiento', grupo, `Préstamos recibidos (pagados): ${nombre}`, efecto);
    else if (codigo.startsWith('3.1.')) anotar('financiamiento', '3.1', 'Aportes (reembolsos) de capital', efecto);
    else anotar('financiamiento', '3.9', 'Dividendos y otros movimientos patrimoniales', efecto);
  }
  const lista = (m: Map<string, { concepto: string; monto: Decimal }>): RenglonFlujo[] =>
    [...m.entries()].filter(([, g]) => !g.monto.isZero()).map(([codigo, g]) => ({ codigo, concepto: g.concepto, monto: g.monto.toNumber() }));
  const total = (l: RenglonFlujo[]) => l.reduce((t, r) => t.plus(r.monto), D(0));
  const operacion = [{ codigo: '', concepto: 'Resultado del periodo', monto: resultado.toNumber() }, ...lista(grupos.operacion)];
  const inversion = lista(grupos.inversion);
  const financiamiento = lista(grupos.financiamiento);
  return { operacion, inversion, financiamiento, totalOperacion: total(operacion), totalInversion: total(inversion), totalFinanciamiento: total(financiamiento) };
}

/**
 * Estado de situación financiera al `hasta` y estado de resultados del periodo `desde`-`hasta`.
 * Mientras no haya asientos de cierre, los resultados anteriores al periodo se presentan como
 * resultados acumulados y los del periodo como resultado del periodo. Los asientos de cierre del
 * propio periodo se omiten: saldarían los ingresos y gastos que el estado de resultados presenta.
 */
export function estadosFinancieros(todos: Asiento[], desde: string, hasta: string): EstadosFinancieros {
  const asientos = todos.filter((a) => !(esCierreDeResultados(a) && a.fecha >= desde && a.fecha <= hasta));
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
  const gastosTotales = renglones(delPeriodo, '6');
  // El impuesto sobre la renta (6.3) se presenta aparte, después de la utilidad antes de impuesto.
  const impuestoRenta = suma(delPeriodo, '6.3.');
  const gastos = { renglones: gastosTotales.renglones.filter((x) => !x.codigo.startsWith('6.3')), total: gastosTotales.total.minus(impuestoRenta) };

  // Cambios en el patrimonio: los resultados anteriores sin asiento de cierre se suman a los acumulados.
  const cero = D(0);
  const fila = (concepto: string, [capital, reservas, acumulados]: Decimal[], resultadoPeriodo: Decimal, saldo?: boolean): FilaPatrimonio => ({
    concepto,
    capital: capital.toNumber(),
    reservas: reservas.toNumber(),
    acumulados: acumulados.toNumber(),
    resultado: resultadoPeriodo.toNumber(),
    total: capital.plus(reservas).plus(acumulados).plus(resultadoPeriodo).toNumber(),
    ...(saldo ? { saldo } : {}),
  });
  const inicial = [suma(anteriores, '3.1.'), suma(anteriores, '3.2.'), suma(anteriores, '3.3.').plus(acumulado)];
  const [aportes, reservas, otros] = [suma(delPeriodo, '3.1.'), suma(delPeriodo, '3.2.'), suma(delPeriodo, '3.3.')];
  const filasPatrimonio = [
    fila('Saldo al inicio del periodo', inicial, cero, true),
    ...(aportes.isZero() ? [] : [fila('Aportes (reembolsos) de capital', [aportes, cero, cero], cero)]),
    ...(reservas.isZero() ? [] : [fila('Traslado a reservas', [cero, reservas, cero], cero)]),
    ...(otros.isZero() ? [] : [fila('Dividendos y otros movimientos de resultados acumulados', [cero, cero, otros], cero)]),
    fila('Resultado integral del periodo', [cero, cero, cero], resultado),
    fila('Saldo al cierre del periodo', [inicial[0].plus(aportes), inicial[1].plus(reservas), inicial[2].plus(otros)], resultado, true),
  ];

  const flujos = flujosEfectivo(delPeriodo, resultado);
  const efectivoInicial = suma(anteriores, '1.1.01.');
  const efectivoFinal = suma(alCorte, '1.1.01.');
  const variacion = flujos.totalOperacion.plus(flujos.totalInversion).plus(flujos.totalFinanciamiento);
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
      utilidadAntesImpuesto: resultado.plus(impuestoRenta).toNumber(),
      impuestoRenta: impuestoRenta.toNumber(),
      resultado: resultado.toNumber(),
    },
    cambiosPatrimonio: {
      filas: filasPatrimonio,
      cuadra: Math.abs(filasPatrimonio[filasPatrimonio.length - 1].total - totalPatrimonio.toNumber()) < 0.005,
    },
    flujos: {
      ...flujos,
      totalOperacion: flujos.totalOperacion.toNumber(),
      totalInversion: flujos.totalInversion.toNumber(),
      totalFinanciamiento: flujos.totalFinanciamiento.toNumber(),
      variacion: variacion.toNumber(),
      efectivoInicial: efectivoInicial.toNumber(),
      efectivoFinal: efectivoFinal.toNumber(),
      cuadra: efectivoInicial.plus(variacion).minus(efectivoFinal).abs().lessThan(0.005),
    },
  };
}
