/**
 * Balance de apertura (saldos iniciales) del libro de inventarios y balances (Código de Comercio,
 * art. 255): la entidad que ya operaba antes de usar la app carga los saldos de cierre de su último
 * balance, cuenta por cuenta, y opcionalmente el detalle del inventario para el costo promedio.
 */
import Decimal from 'decimal.js';
import type { Asiento } from './contabilidad';
import { CATALOGO_CUENTAS, cuenta } from './cuentas';

const D = (v: number | Decimal) => new Decimal(v);
const redondear = (v: Decimal) => v.toDecimalPlaces(2).toNumber();

export interface SaldoApertura {
  cuenta: string;
  debe: number;
  haber: number;
}

/** Existencia del inventario de mercadería al abrir: entra al kárdex con su costo total. */
export interface ExistenciaInicial {
  cabys: string;
  detalle: string;
  cantidad: number;
  costo: number;
}

export interface AperturaContable {
  fecha: string;
  /** Inicio de operaciones: aporte de capital en efectivo (Bancos contra Capital social). */
  capital?: number;
  /** Entidad en marcha: saldos de las cuentas de balance a la fecha de apertura. */
  saldos?: SaldoApertura[];
  existencias?: ExistenciaInicial[];
  /** Nombre del archivo del que se cargaron los saldos (referencia para el usuario). */
  archivo?: string;
}

/** Solo las subcuentas de activo, pasivo y patrimonio llevan saldo de apertura. */
export const CUENTAS_BALANCE = CATALOGO_CUENTAS.filter((c) => c.imputable && ['activo', 'pasivo', 'patrimonio'].includes(c.tipo));
const ES_BALANCE = new Set(CUENTAS_BALANCE.map((c) => c.codigo));

const INVENTARIO = '1.1.03.01';

const total = <T>(l: T[], f: (x: T) => number) => l.reduce((t, x) => t.plus(f(x) || 0), D(0));

export function totalesApertura(saldos: SaldoApertura[]): { debe: number; haber: number; cuadra: boolean } {
  const debe = redondear(total(saldos, (s) => s.debe));
  const haber = redondear(total(saldos, (s) => s.haber));
  return { debe, haber, cuadra: debe === haber };
}

/** Errores que impiden registrar el balance de apertura. */
export function validarApertura(a: AperturaContable): string[] {
  const errores: string[] = [];
  if (!a.fecha) errores.push('Indique la fecha del balance de apertura.');
  const saldos = a.saldos ?? [];
  for (const s of saldos) {
    if (!ES_BALANCE.has(s.cuenta)) errores.push(`La cuenta ${s.cuenta || '(vacía)'} no es una subcuenta de activo, pasivo o patrimonio del catálogo.`);
    if (s.debe < 0 || s.haber < 0) errores.push(`${s.cuenta}: los montos no pueden ser negativos.`);
    if (s.debe && s.haber) errores.push(`${s.cuenta}: el saldo va al debe o al haber, no a ambos.`);
  }
  const repetidas = saldos.map((s) => s.cuenta).filter((c, i, l) => c && l.indexOf(c) !== i);
  if (repetidas.length) errores.push(`Cuentas repetidas: ${[...new Set(repetidas)].join(', ')}.`);
  const t = totalesApertura(saldos);
  if (saldos.length && !t.cuadra) errores.push(`El balance no cuadra: debe ₡${t.debe.toFixed(2)} y haber ₡${t.haber.toFixed(2)} (diferencia ₡${(t.debe - t.haber).toFixed(2)}).`);
  for (const e of a.existencias ?? []) {
    if (!/^\d{13}$/.test(e.cabys)) errores.push(`Inventario inicial: el CAByS «${e.cabys}» debe tener 13 dígitos.`);
    if (!(e.cantidad > 0) || !(e.costo > 0)) errores.push(`Inventario inicial ${e.cabys}: indique cantidad y costo mayores que cero.`);
  }
  if (a.existencias?.length) {
    const inventario = saldos.find((s) => s.cuenta === INVENTARIO);
    const enLibro = redondear(D(inventario?.debe ?? 0).minus(inventario?.haber ?? 0));
    const enKardex = redondear(total(a.existencias, (e) => e.costo));
    if (enLibro !== enKardex) errores.push(`El detalle del inventario suma ₡${enKardex.toFixed(2)} y el saldo de ${INVENTARIO} es ₡${enLibro.toFixed(2)}: deben coincidir.`);
  }
  return errores;
}

/** Asiento de apertura: aporte de capital o, si se cargaron saldos, el balance de apertura completo. */
export function asientoAperturaBalance(a: AperturaContable): Asiento | null {
  const saldos = (a.saldos ?? []).filter((s) => s.debe || s.haber);
  if (!saldos.length) {
    if (!(a.capital && a.capital > 0)) return null;
    saldos.push({ cuenta: '1.1.01.02', debe: a.capital, haber: 0 }, { cuenta: '3.1.01.01', debe: 0, haber: a.capital });
  }
  const balance = !!a.saldos?.some((s) => s.debe || s.haber);
  const lineas = saldos
    .map((s) => ({ cuenta: s.cuenta, nombre: ES_BALANCE.has(s.cuenta) ? cuenta(s.cuenta).nombre : s.cuenta, debe: redondear(D(s.debe || 0)), haber: redondear(D(s.haber || 0)) }))
    .sort((x, y) => Number(y.debe > 0) - Number(x.debe > 0));
  const t = totalesApertura(lineas);
  const sinInventario = balance && lineas.some((l) => l.cuenta === INVENTARIO && l.debe) && !a.existencias?.length;
  return {
    numero: 0,
    fecha: a.fecha,
    periodoTributario: a.fecha.slice(0, 7),
    glosa: balance ? `Asiento de apertura — saldos iniciales del balance${a.archivo ? ` (${a.archivo})` : ''}` : 'Asiento de apertura — aporte de capital en efectivo',
    origen: { documento: 'apertura' },
    lineas,
    totalDebe: t.debe,
    totalHaber: t.haber,
    cuadrado: t.cuadra,
    alertas: sinInventario ? ['El inventario inicial no tiene detalle por artículo: el costo de ventas de esa mercadería no se podrá calcular al promedio.'] : [],
    requiereRevision: !t.cuadra,
    deducibleRenta: true,
    fundamento: ['Código de Comercio (Ley 3284), art. 255 — libro de inventarios y balances'],
    estado: 'borrador',
    ...(balance ? { saldoInicial: true } : {}),
  };
}

/** Monto en formato «1.234.567,89», «1,234,567.89», «1234567.89» o «(1 500)» (negativo). */
export function leerMonto(texto: string): number {
  let t = texto.trim().replace(/[₡$\s ]/g, '');
  if (!t || t === '-') return 0;
  const negativo = /^\(.*\)$/.test(t) || t.startsWith('-');
  t = t.replace(/[()-]/g, '');
  const coma = t.lastIndexOf(',');
  const punto = t.lastIndexOf('.');
  let pos = Math.max(coma, punto);
  // Con ambos separadores, el último es el decimal. Con uno solo, es decimal si aparece una vez y le siguen 1 o 2 dígitos.
  if (pos >= 0 && (coma < 0 || punto < 0) && (t.split(t[pos]).length > 2 || t.length - pos - 1 > 2)) pos = -1;
  t = pos >= 0 ? `${t.slice(0, pos).replace(/[.,]/g, '')}.${t.slice(pos + 1)}` : t.replace(/[.,]/g, '');
  const n = Number(t);
  if (!t || !Number.isFinite(n)) throw new Error(`«${texto}» no es un monto válido.`);
  return negativo ? -n : n;
}

function separarCampos(linea: string, sep: string): string[] {
  const campos: string[] = [];
  let actual = '';
  let comillas = false;
  for (let i = 0; i < linea.length; i++) {
    const ch = linea[i];
    if (ch === '"') {
      if (comillas && linea[i + 1] === '"') { actual += '"'; i++; } else comillas = !comillas;
    } else if (ch === sep && !comillas) {
      campos.push(actual);
      actual = '';
    } else actual += ch;
  }
  campos.push(actual);
  return campos.map((c) => c.trim());
}

/**
 * Lee un balance en CSV (coma, punto y coma o tabulador; también lo copiado de Excel). Columnas:
 * código de la cuenta, nombre (opcional) y debe y haber, o un único saldo (positivo deudor, negativo
 * acreedor). Se omiten encabezados, cuentas de mayor (no imputables) y líneas en cero.
 */
export function leerBalanceCsv(texto: string): { saldos: SaldoApertura[]; errores: string[] } {
  const lineas = texto.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
  const primera = lineas[0] ?? '';
  const sep = ['\t', ';', ','].find((s) => primera.includes(s)) ?? ',';
  const saldos: SaldoApertura[] = [];
  const errores: string[] = [];
  lineas.forEach((linea, i) => {
    const campos = separarCampos(linea, sep);
    const codigo = campos[0]?.replace(/\s/g, '') ?? '';
    if (!/^\d+(\.\d+)*$/.test(codigo)) return; // encabezado, título o total
    const c = CATALOGO_CUENTAS.find((x) => x.codigo === codigo);
    if (!c) return void errores.push(`Línea ${i + 1}: la cuenta ${codigo} no existe en el catálogo.`);
    if (!c.imputable) return; // subtotal de grupo
    // Después del código puede venir el nombre; los demás campos son montos (vacío = 0).
    const montos = campos.slice(1).filter((x, j) => !(j === 0 && /[a-záéíóúñ]/i.test(x)));
    try {
      let debe = 0;
      let haber = 0;
      if (montos.length >= 2) [debe, haber] = montos.slice(-2).map(leerMonto);
      else if (montos.length === 1) {
        const saldo = leerMonto(montos[0]);
        debe = Math.max(saldo, 0);
        haber = Math.max(-saldo, 0);
      }
      if (debe < 0) { haber += -debe; debe = 0; }
      if (haber < 0) { debe += -haber; haber = 0; }
      const neto = D(debe).minus(haber);
      if (neto.isZero()) return;
      if (!ES_BALANCE.has(codigo)) return void errores.push(`Línea ${i + 1}: ${codigo} ${c.nombre} es una cuenta de resultados; el balance de apertura solo lleva activo, pasivo y patrimonio (traslade el resultado a utilidades acumuladas).`);
      saldos.push({ cuenta: codigo, debe: neto.greaterThan(0) ? redondear(neto) : 0, haber: neto.lessThan(0) ? redondear(neto.negated()) : 0 });
    } catch (err) {
      errores.push(`Línea ${i + 1}: ${(err as Error).message}`);
    }
  });
  if (!saldos.length && !errores.length) errores.push('No se encontraron saldos: la primera columna debe ser el código de la cuenta del catálogo (p. ej. 1.1.01.02).');
  return { saldos, errores };
}
