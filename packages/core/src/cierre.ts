/**
 * Asientos de ajuste y de cierre del periodo fiscal (enero a diciembre, Ley 7092 art. 4).
 * - Ajustes automáticos: depreciación y amortización (Secciones 17 y 18), estimación para pérdidas
 *   crediticias (Sección 11) e impuesto sobre la renta corriente (Sección 29).
 * - Ajustes manuales: cualquier otro devengo o reclasificación, cuenta por cuenta.
 * - Cierre: saldar ingresos, costos y gastos contra utilidades acumuladas y asignar la reserva legal
 *   (Código de Comercio, art. 143).
 */
import Decimal from 'decimal.js';
import type { Asiento, LibroDiario } from './contabilidad';
import { CATALOGO_CUENTAS, cuenta, seccionNiif } from './cuentas';
import { compararCodigos, estadosFinancieros } from './libros';

const D = (v: number | Decimal) => new Decimal(v);
const redondear = (v: Decimal) => v.toDecimalPlaces(2).toNumber();

export interface ParametrosAjuste {
  /** Vida útil en años de cada subcuenta de propiedades, planta y equipo o intangibles. */
  vidaUtil: Record<string, number>;
  /** Porcentaje de la cartera de clientes con evidencia objetiva de deterioro al cierre (evaluación en grupo, Sección 11). */
  porcentajeIncobrables: number;
  /** Tasa del impuesto sobre la renta (%) sobre la utilidad antes de impuesto. */
  tasaRenta: number;
  /** Asignar el 5 % de la utilidad neta a la reserva legal (sociedades). */
  reservaLegal: boolean;
}

/** Valores sugeridos; cada entidad los fija en su política contable (Anexo 2 del Reglamento de la Ley 7092 como referencia fiscal). */
export const VIDA_UTIL_SUGERIDA: Record<string, number> = {
  '1.2.01.01': 10,
  '1.2.01.02': 5,
  '1.2.01.03': 10,
  '1.2.01.04': 10,
  '1.2.01.05': 50,
  '1.2.03.01': 3,
};

/** Las sociedades (cédula jurídica) llevan reserva legal y tributan a la tarifa general del 30 %. */
export function parametrosPredeterminados(tipoIdentificacion: string): ParametrosAjuste {
  const juridica = tipoIdentificacion === '02';
  return { vidaUtil: { ...VIDA_UTIL_SUGERIDA }, porcentajeIncobrables: 0, tasaRenta: juridica ? 30 : 0, reservaLegal: juridica };
}

export interface LineaManual {
  cuenta: string;
  debe: number;
  haber: number;
}

export interface AjusteManual {
  id: string;
  fecha: string;
  glosa: string;
  lineas: LineaManual[];
}

export interface ConfigCierre {
  /** Registrar en el libro diario los ajustes automáticos propuestos. */
  ajustesAutomaticos: boolean;
  parametros: ParametrosAjuste;
  manuales: AjusteManual[];
  /** Registrar los asientos de cierre al 31 de diciembre. */
  cerrado: boolean;
}

/** Arma un asiento: agrupa por cuenta, redondea, quita líneas en cero y pone el debe primero. */
function armar(fecha: string, glosa: string, documento: 'ajuste' | 'cierre', lineas: LineaManual[], fundamento: string[], alertas: string[] = []): Asiento {
  const porCuenta = new Map<string, { debe: Decimal; haber: Decimal }>();
  for (const l of lineas) {
    const x = porCuenta.get(l.cuenta) ?? { debe: D(0), haber: D(0) };
    porCuenta.set(l.cuenta, { debe: x.debe.plus(l.debe || 0), haber: x.haber.plus(l.haber || 0) });
  }
  const finales = [...porCuenta.entries()]
    .map(([codigo, x]) => {
      const neto = x.debe.minus(x.haber);
      return { cuenta: codigo, nombre: cuenta(codigo).nombre, debe: neto.greaterThan(0) ? redondear(neto) : 0, haber: neto.lessThan(0) ? redondear(neto.negated()) : 0 };
    })
    .filter((l) => l.debe || l.haber)
    .sort((a, b) => Number(b.debe > 0) - Number(a.debe > 0) || compararCodigos(a.cuenta, b.cuenta));
  const totalDebe = redondear(finales.reduce((t, l) => t.plus(l.debe), D(0)));
  const totalHaber = redondear(finales.reduce((t, l) => t.plus(l.haber), D(0)));
  return {
    numero: 0,
    fecha,
    periodoTributario: fecha.slice(0, 7),
    glosa,
    origen: { documento },
    lineas: finales,
    totalDebe,
    totalHaber,
    cuadrado: totalDebe === totalHaber,
    alertas,
    requiereRevision: totalDebe !== totalHaber,
    deducibleRenta: true,
    fundamento,
    estado: 'borrador',
  };
}

const mes = (fecha: string) => Number(fecha.slice(0, 4)) * 12 + Number(fecha.slice(5, 7)) - 1;

/** Saldo de una cuenta (debe − haber) con los asientos hasta la fecha. */
const saldoDeudor = (asientos: Asiento[], codigo: string, hasta: string) =>
  asientos.filter((a) => a.fecha <= hasta).flatMap((a) => a.lineas).filter((l) => l.cuenta === codigo).reduce((t, l) => t.plus(l.debe).minus(l.haber), D(0));

/**
 * Depreciación por línea recta sobre el costo de cada compra capitalizada, desde el mes de adquisición
 * y sin exceder la vida útil. Supone que los periodos anteriores ya se ajustaron.
 */
function depreciacion(asientos: Asiento[], anio: number, vidaUtil: Record<string, number>): Asiento | null {
  const desde = `${anio}-01-01`;
  const hasta = `${anio}-12-31`;
  const lineas: LineaManual[] = [];
  const alertas: string[] = [];
  for (const [codigo, anios] of Object.entries(vidaUtil)) {
    if (!(anios > 0)) continue;
    let total = D(0);
    for (const a of asientos) {
      if (a.fecha > hasta) continue;
      for (const l of a.lineas) {
        if (l.cuenta !== codigo) continue;
        if (l.haber > 0) { alertas.push(`${cuenta(codigo).nombre}: hay bajas registradas; revise la depreciación con un ajuste manual.`); continue; }
        const vidaMeses = anios * 12;
        const previos = Math.max(0, mes(desde) - mes(a.fecha));
        const enPeriodo = mes(hasta) - Math.max(mes(a.fecha), mes(desde)) + 1;
        const meses = Math.max(0, Math.min(enPeriodo, vidaMeses - previos));
        total = total.plus(D(l.debe).times(meses).dividedBy(vidaMeses));
      }
    }
    if (total.isZero()) continue;
    const contra = codigo.startsWith('1.2.03.') ? '1.2.03.02' : '1.2.02.01';
    lineas.push({ cuenta: '6.1.01.11', debe: total.toNumber(), haber: 0 }, { cuenta: contra, debe: 0, haber: total.toNumber() });
  }
  if (!lineas.length) return null;
  return armar(hasta, `Ajuste — depreciación y amortización del periodo ${anio}`, 'ajuste', lineas,
    [`${seccionNiif(17)} y Sección 18: línea recta sobre el costo, desde el mes de adquisición`], [...new Set(alertas)]);
}

/**
 * Lleva la estimación por deterioro al porcentaje de la cartera de clientes que, evaluada en grupo, tiene
 * evidencia objetiva de deterioro (Sección 11, párrafos 11.21 a 11.26; modelo de pérdida incurrida).
 */
function estimacionIncobrables(asientos: Asiento[], anio: number, porcentaje: number): Asiento | null {
  if (!(porcentaje > 0)) return null;
  const hasta = `${anio}-12-31`;
  const clientes = saldoDeudor(asientos, '1.1.02.01', hasta);
  const actual = saldoDeudor(asientos, '1.1.02.02', hasta).negated();
  const meta = Decimal.max(clientes, 0).times(porcentaje).dividedBy(100);
  const ajuste = meta.minus(actual).toDecimalPlaces(2);
  if (ajuste.isZero()) return null;
  return armar(hasta, `Ajuste — deterioro de cuentas por cobrar (${porcentaje} % de la cartera con evidencia objetiva de deterioro)`, 'ajuste',
    [{ cuenta: '6.1.01.12', debe: ajuste.toNumber(), haber: 0 }, { cuenta: '1.1.02.02', debe: 0, haber: ajuste.toNumber() }],
    [`${seccionNiif(11)}, párrafos 11.21 a 11.26: deterioro por evidencia objetiva (pérdidas incurridas), evaluado en grupo por características similares de riesgo crediticio; no se reconocen pérdidas crediticias esperadas futuras`]);
}

/** Provisión del impuesto sobre la renta corriente sobre la utilidad antes de impuesto (menos lo ya registrado). */
function impuestoRenta(asientos: Asiento[], anio: number, tasa: number): Asiento | null {
  if (!(tasa > 0)) return null;
  const r = estadosFinancieros(asientos, `${anio}-01-01`, `${anio}-12-31`).resultados;
  if (r.utilidadAntesImpuesto <= 0) return null;
  const monto = D(r.utilidadAntesImpuesto).times(tasa).dividedBy(100).minus(r.impuestoRenta).toDecimalPlaces(2);
  if (monto.lessThanOrEqualTo(0)) return null;
  return armar(`${anio}-12-31`, `Ajuste — impuesto sobre la renta del periodo ${anio} (${tasa} %)`, 'ajuste',
    [{ cuenta: '6.3.01.01', debe: monto.toNumber(), haber: 0 }, { cuenta: '2.1.02.04', debe: 0, haber: monto.toNumber() }],
    [`Ley del Impuesto sobre la Renta (Ley 7092); ${seccionNiif(29)}`],
    ['Base simplificada: utilidad contable antes de impuesto. Las diferencias por gastos no deducibles o ingresos no gravables se ajustan manualmente.']);
}

/** Ajustes automáticos en orden: la renta se calcula después de los demás ajustes. */
export function ajustesAutomaticos(asientos: Asiento[], anio: number, p: ParametrosAjuste): Asiento[] {
  const previos = [depreciacion(asientos, anio, p.vidaUtil), estimacionIncobrables(asientos, anio, p.porcentajeIncobrables)].filter((a): a is Asiento => !!a);
  const renta = impuestoRenta([...asientos, ...previos], anio, p.tasaRenta);
  return renta ? [...previos, renta] : previos;
}

export function asientoManual(a: AjusteManual): Asiento {
  return armar(a.fecha, `Ajuste — ${a.glosa}`, 'ajuste', a.lineas.filter((l) => l.cuenta), ['Asiento de ajuste registrado por el usuario']);
}

/** Cierre de resultados contra utilidades acumuladas y, si procede, asignación de la reserva legal. */
export function asientosCierre(asientos: Asiento[], anio: number, reservaLegal: boolean): Asiento[] {
  const desde = `${anio}-01-01`;
  const hasta = `${anio}-12-31`;
  const saldos = new Map<string, Decimal>();
  for (const a of asientos) {
    if (a.fecha < desde || a.fecha > hasta) continue;
    for (const l of a.lineas) if (/^[456]\./.test(l.cuenta)) saldos.set(l.cuenta, (saldos.get(l.cuenta) ?? D(0)).plus(l.debe).minus(l.haber));
  }
  // Cada cuenta se salda con el movimiento contrario; la diferencia es el resultado del periodo.
  const lineas: LineaManual[] = [...saldos.entries()].map(([codigo, neto]) => ({ cuenta: codigo, debe: neto.lessThan(0) ? neto.negated().toNumber() : 0, haber: neto.greaterThan(0) ? neto.toNumber() : 0 }));
  const resultado = [...saldos.values()].reduce((t, v) => t.minus(v), D(0)).toDecimalPlaces(2);
  if (!lineas.some((l) => l.debe || l.haber)) return [];
  lineas.push({ cuenta: '3.3.01.01', debe: resultado.lessThan(0) ? resultado.negated().toNumber() : 0, haber: resultado.greaterThan(0) ? resultado.toNumber() : 0 });
  const cierre = armar(hasta, `Asiento de cierre ${anio} — traslado del ${resultado.greaterThanOrEqualTo(0) ? 'utilidad' : 'pérdida'} del periodo a utilidades acumuladas`, 'cierre', lineas,
    [`Código de Comercio (Ley 3284), art. 251: cierre del ejercicio; ${seccionNiif(6)}`]);
  const lista = [cierre];
  if (reservaLegal && resultado.greaterThan(0)) {
    // 5 % de la utilidad neta hasta que la reserva alcance el 20 % del capital social.
    const capital = saldoDeudor(asientos, '3.1.01.01', hasta).negated();
    const reserva = saldoDeudor(asientos, '3.2.01.01', hasta).negated();
    const monto = Decimal.min(resultado.times(0.05), Decimal.max(capital.times(0.2).minus(reserva), 0)).toDecimalPlaces(2);
    if (monto.greaterThan(0)) {
      lista.push(armar(hasta, `Asignación de la reserva legal ${anio} (5 % de la utilidad neta)`, 'cierre',
        [{ cuenta: '3.3.01.01', debe: monto.toNumber(), haber: 0 }, { cuenta: '3.2.01.01', debe: 0, haber: monto.toNumber() }],
        ['Código de Comercio (Ley 3284), art. 143: 5 % de las utilidades netas hasta el 20 % del capital social']));
    }
  }
  return lista;
}

export interface DetalleCierre {
  manuales: Asiento[];
  automaticos: Asiento[];
  cierre: Asiento[];
}

/** Orden en una misma fecha: apertura, operaciones, ajustes y por último el cierre. */
const RANGO: Record<Asiento['origen']['documento'], number> = { apertura: 0, emitido: 1, recibido: 1, ajuste: 2, cierre: 3 };

/**
 * Agrega al libro diario los ajustes y cierres de cada año configurado, en orden cronológico: los
 * ajustes de un año ven los cierres de los anteriores. Devuelve también lo propuesto para cada año
 * (aunque no se haya registrado) para mostrarlo antes de aplicarlo.
 */
export function completarLibro(libro: LibroDiario, cierres: Record<string, ConfigCierre> = {}): LibroDiario & { cierres: Record<string, DetalleCierre> } {
  let asientos = [...libro.asientos];
  const detalle: Record<string, DetalleCierre> = {};
  for (const anio of Object.keys(cierres).sort()) {
    const c = cierres[anio];
    const manuales = c.manuales.map(asientoManual);
    asientos = [...asientos, ...manuales];
    const automaticos = ajustesAutomaticos(asientos, Number(anio), c.parametros);
    if (c.ajustesAutomaticos) asientos = [...asientos, ...automaticos];
    const cierre = asientosCierre(asientos, Number(anio), c.parametros.reservaLegal);
    if (c.cerrado) asientos = [...asientos, ...cierre];
    detalle[anio] = { manuales, automaticos, cierre };
  }
  // Se numeran copias para no alterar el libro recibido; lo propuesto sin registrar queda con número 0.
  const numerados = new Map<Asiento, Asiento>();
  asientos = asientos
    .map((a, i) => ({ a, i }))
    .sort((x, y) => x.a.fecha.localeCompare(y.a.fecha) || RANGO[x.a.origen.documento] - RANGO[y.a.origen.documento] || x.i - y.i)
    .map(({ a }, i) => {
      const n = { ...a, numero: i + 1 };
      numerados.set(a, n);
      return n;
    });
  const numerar = (l: Asiento[]) => l.map((a) => numerados.get(a) ?? a);
  for (const d of Object.values(detalle)) Object.assign(d, { manuales: numerar(d.manuales), automaticos: numerar(d.automaticos), cierre: numerar(d.cierre) });
  return { ...libro, asientos, cierres: detalle };
}

/** Cuentas que admiten asientos manuales (solo las imputables). */
export const CUENTAS_IMPUTABLES = CATALOGO_CUENTAS.filter((c) => c.imputable);
