/**
 * Indicadores financieros (KPI) calculados sobre el juego de estados financieros, con la fórmula, la
 * lectura y el análisis del resultado de cada uno. Las definiciones siguen la bibliografía de finanzas
 * del curso: Ross, Westerfield y Jordan (cap. 3, análisis de razones), Amat (caps. 8 a 10, ratios),
 * Berk, DeMarzo y Harford (cap. 2 y cap. 26, ciclo de conversión del efectivo), Brealey, Myers y Allen
 * (cap. 13, valor económico agregado; cap. 24, calificación Z), Court (cap. 2, fondo de maniobra) y
 * Soriano y Amat (EBITDA).
 *
 * Los rangos de referencia son orientativos: la propia bibliografía insiste en que cada razón se
 * compara con la historia de la empresa y con su sector, y en documentar cómo se calculó (Ross, 3.3).
 */
import type { EstadosFinancieros, RenglonEstado } from './libros';

export type CategoriaIndicador = 'liquidez' | 'actividad' | 'endeudamiento' | 'rentabilidad' | 'valor';
export type NivelIndicador = 'favorable' | 'vigilar' | 'desfavorable' | 'sin-datos';
export type UnidadIndicador = 'veces' | 'porcentaje' | 'dias' | 'colones' | 'puntos';

export const NOMBRE_NIVEL_INDICADOR: Record<NivelIndicador, string> = { favorable: 'Favorable', vigilar: 'Vigilar', desfavorable: 'Desfavorable', 'sin-datos': 'Sin datos' };
export const NOMBRE_UNIDAD_INDICADOR: Record<UnidadIndicador, string> = { veces: 'veces', porcentaje: 'fracción (×100 = %)', dias: 'días', colones: 'colones', puntos: 'puntos' };

export const CATEGORIAS_INDICADORES: Record<CategoriaIndicador, { nombre: string; pregunta: string }> = {
  liquidez: { nombre: 'Liquidez', pregunta: '¿Puede la empresa pagar sus deudas de corto plazo con sus activos corrientes?' },
  actividad: { nombre: 'Actividad y eficiencia', pregunta: '¿Con qué rapidez convierte inventarios y cuentas por cobrar en efectivo?' },
  endeudamiento: { nombre: 'Endeudamiento y solvencia', pregunta: '¿Cómo se financia la empresa y puede sostener su deuda?' },
  rentabilidad: { nombre: 'Rentabilidad', pregunta: '¿Cuánto gana por cada colón vendido, invertido en activos o aportado por los dueños?' },
  valor: { nombre: 'Efectivo y creación de valor', pregunta: '¿Las utilidades se convierten en efectivo y superan el costo del capital?' },
};

export const FUENTES_INDICADORES = {
  ross: 'Ross, Westerfield y Jordan, Fundamentos de finanzas corporativas, 9.ª ed., cap. 3',
  amat: 'Amat, Contabilidad y finanzas para Dummies, cap. 8 (Estudio de los ratios)',
  amatRentabilidad: 'Amat, Contabilidad y finanzas para Dummies, cap. 10 (Análisis de la rentabilidad)',
  berk: 'Berk, DeMarzo y Harford, Finanzas corporativas, cap. 2',
  berkCapital: 'Berk, DeMarzo y Harford, Finanzas corporativas, cap. 26 (Administración del capital de trabajo)',
  brealeyEva: 'Brealey, Myers y Allen, Principios de finanzas corporativas, 9.ª ed., cap. 13 (EVA)',
  brealeyZ: 'Brealey, Myers y Allen, Principios de finanzas corporativas, 9.ª ed., cap. 24; Altman, Corporate Financial Distress and Bankruptcy (2005)',
  court: 'Court, Aplicaciones para finanzas empresariales, cap. 2 (Fondo de maniobra)',
  soriano: 'Soriano y Amat, Introducción a la contabilidad y las finanzas (resultado operativo, EBITDA)',
} as const;

/** Cifras de los estados financieros que usan los indicadores. Los flujos son del periodo; los saldos, al corte. */
export interface BaseIndicadores {
  /** Días del periodo del estado de resultados (para anualizar rotaciones y rentabilidades). */
  dias: number;
  efectivo: number;
  cuentasPorCobrar: number;
  inventarios: number;
  pagosAnticipados: number;
  activoCorriente: number;
  activoNoCorriente: number;
  activoTotal: number;
  pasivoCorriente: number;
  proveedores: number;
  deudaFinanciera: number;
  pasivoTotal: number;
  capitalSocial: number;
  patrimonio: number;
  /** Reservas, resultados acumulados y resultado del periodo. */
  utilidadesRetenidas: number;
  ventas: number;
  costoVentas: number;
  utilidadBruta: number;
  gastosOperacion: number;
  depreciacion: number;
  gastosFinancieros: number;
  /** Utilidad antes de intereses e impuestos. */
  uaii: number;
  ebitda: number;
  utilidadAntesImpuesto: number;
  impuestoRenta: number;
  utilidadNeta: number;
  flujoOperacion: number;
}

const monto = (filas: RenglonEstado[], codigo: string) => filas.find((r) => r.codigo === codigo)?.monto ?? 0;

const diasEntre = (desde: string, hasta: string) => Math.round((Date.parse(`${hasta}T12:00:00Z`) - Date.parse(`${desde}T12:00:00Z`)) / 86_400_000) + 1;

export function baseIndicadores(ef: EstadosFinancieros): BaseIndicadores {
  const { situacion: s, resultados: r, flujos: f } = ef;
  const ventas = monto(r.ingresos, '4.1');
  const costoVentas = r.totalCostos;
  const gastosFinancieros = monto(r.gastos, '6.2');
  const depreciacion = monto(r.gastos, '6.1.01.11');
  const uaii = r.utilidadAntesImpuesto + gastosFinancieros;
  const capitalSocial = monto(s.patrimonio, '3.1');
  return {
    dias: Math.max(1, diasEntre(ef.desde, ef.hasta)),
    efectivo: monto(s.activo, '1.1.01'),
    cuentasPorCobrar: monto(s.activo, '1.1.02'),
    inventarios: monto(s.activo, '1.1.03'),
    pagosAnticipados: monto(s.activo, '1.1.05'),
    activoCorriente: monto(s.activo, '1.1'),
    activoNoCorriente: monto(s.activo, '1.2'),
    activoTotal: s.totalActivo,
    pasivoCorriente: monto(s.pasivo, '2.1'),
    proveedores: monto(s.pasivo, '2.1.01'),
    deudaFinanciera: monto(s.pasivo, '2.2.01'),
    pasivoTotal: s.totalPasivo,
    capitalSocial,
    patrimonio: s.totalPatrimonio,
    utilidadesRetenidas: s.totalPatrimonio - capitalSocial,
    ventas,
    costoVentas,
    utilidadBruta: ventas - costoVentas,
    gastosOperacion: monto(r.gastos, '6.1'),
    depreciacion,
    gastosFinancieros,
    uaii,
    ebitda: uaii + depreciacion,
    utilidadAntesImpuesto: r.utilidadAntesImpuesto,
    impuestoRenta: r.impuestoRenta,
    utilidadNeta: r.resultado,
    flujoOperacion: f.totalOperacion,
  };
}

export interface ParametrosIndicadores {
  /** Rendimiento mínimo que exigen los dueños y los acreedores, como fracción anual (0,12 = 12 %). */
  costoCapital: number;
}

export const PARAMETROS_INDICADORES: ParametrosIndicadores = { costoCapital: 0.12 };

export interface Indicador {
  id: string;
  categoria: CategoriaIndicador;
  nombre: string;
  unidad: UnidadIndicador;
  /** `null` cuando no se puede calcular (divisor cero o sin datos); `motivo` explica por qué. */
  valor: number | null;
  nivel: NivelIndicador;
  formula: string;
  /** La fórmula con las cifras de la empresa. */
  calculo: string;
  mide: string;
  interpretacion: string;
  referencia: string;
  /** Lectura del resultado obtenido. */
  analisis: string;
  /** Qué hacer cuando el resultado no es favorable. */
  accion?: string;
  fuente: string;
  /** Si un valor mayor es mejor; `null` cuando no hay una dirección única. */
  mejorSiSube: boolean | null;
  motivo?: string;
  /** Valor al mismo corte del año anterior, si hay datos. */
  anterior?: number | null;
  tendencia?: 'mejora' | 'empeora' | 'igual';
}

// --- Formato (los textos se leen en pantalla y en el CSV) ---
const num = (v: number, d = 2) => new Intl.NumberFormat('es-CR', { minimumFractionDigits: d, maximumFractionDigits: d }).format(Number(v.toFixed(d)) || 0);
const col = (v: number) => `₡${num(v)}`;
const pct = (v: number) => `${num(v * 100, 1)} %`;
const vec = (v: number) => `${num(v)} veces`;
const dia = (v: number) => `${num(v, 0)} días`;

export function formatearIndicador(valor: number | null | undefined, unidad: UnidadIndicador): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return 'N/A';
  return { veces: vec, porcentaje: pct, dias: dia, colones: col, puntos: (v: number) => num(v) }[unidad](valor);
}

interface Resultado {
  valor: number | null;
  calculo: string;
  motivo?: string;
  /** Nivel impuesto cuando no hay valor (p. ej. sin deuda: la cobertura no aplica, y eso es bueno). */
  nivelSinValor?: NivelIndicador;
}

interface Definicion extends Pick<Indicador, 'id' | 'categoria' | 'nombre' | 'unidad' | 'formula' | 'mide' | 'interpretacion' | 'referencia' | 'fuente' | 'mejorSiSube'> {
  calcular(b: BaseIndicadores, p: ParametrosIndicadores): Resultado;
  evaluar(v: number, b: BaseIndicadores, p: ParametrosIndicadores): NivelIndicador;
  analizar(v: number | null, nivel: NivelIndicador, b: BaseIndicadores, p: ParametrosIndicadores, motivo?: string): { analisis: string; accion?: string };
}

/** Factor para llevar a un año las cifras de un periodo más corto (enero a la fecha de corte). */
const anual = (b: BaseIndicadores) => 365 / b.dias;
const notaAnual = (b: BaseIndicadores) => (b.dias < 360 ? ` × (365 ÷ ${b.dias} días)` : '');
const rango = (v: number, favorableDesde: number, vigilarDesde: number): NivelIndicador => (v >= favorableDesde ? 'favorable' : v >= vigilarDesde ? 'vigilar' : 'desfavorable');
const rangoInverso = (v: number, favorableHasta: number, vigilarHasta: number): NivelIndicador => (v <= favorableHasta ? 'favorable' : v <= vigilarHasta ? 'vigilar' : 'desfavorable');
const costosDiarios = (b: BaseIndicadores) => (b.costoVentas + b.gastosOperacion - b.depreciacion) / b.dias;

const DEFINICIONES: Definicion[] = [
  // ---------------- Liquidez ----------------
  {
    id: 'razon-corriente',
    categoria: 'liquidez',
    nombre: 'Razón corriente (liquidez)',
    unidad: 'veces',
    formula: 'Activo corriente ÷ Pasivo corriente',
    mide: 'Cuántos colones de activo corriente (efectivo, cuentas por cobrar, inventarios) tiene la empresa por cada colón de deuda que vence en los próximos 12 meses.',
    interpretacion: 'Por encima de 1, los activos que se convertirán en efectivo durante el año cubren las deudas del año. Un valor muy alto tampoco es ideal: puede indicar efectivo o inventarios ociosos que no generan rendimiento.',
    referencia: 'Entre 1 y 2; idealmente 1,5 o más, aunque muchas empresas funcionan bien entre 1,2 y 1,4 (Amat). Por encima de 3, revisar recursos ociosos.',
    fuente: `${FUENTES_INDICADORES.ross} (ec. 3.1); ${FUENTES_INDICADORES.amat}`,
    mejorSiSube: true,
    calcular: (b) => b.pasivoCorriente <= 0
      ? { valor: null, calculo: `${col(b.activoCorriente)} ÷ ${col(b.pasivoCorriente)}`, motivo: 'No hay pasivo corriente.', nivelSinValor: b.activoCorriente > 0 ? 'favorable' : 'sin-datos' }
      : { valor: b.activoCorriente / b.pasivoCorriente, calculo: `${col(b.activoCorriente)} ÷ ${col(b.pasivoCorriente)}` },
    evaluar: (v) => (v < 1 ? 'desfavorable' : v < 1.2 || v > 3 ? 'vigilar' : 'favorable'),
    analizar: (v, nivel, b, _p, motivo) => {
      if (v === null) return { analisis: motivo && b.activoCorriente > 0 ? 'La empresa no tiene deudas de corto plazo: toda su liquidez está disponible.' : 'Sin activos ni pasivos corrientes al corte.' };
      const base = `La empresa tiene ${col(v)} de activo corriente por cada colón de pasivo corriente.`;
      if (nivel === 'desfavorable') return { analisis: `${base} El activo corriente no alcanza para cubrir las deudas de corto plazo: hay riesgo de atrasos en los pagos.`, accion: 'Renegociar plazos con proveedores, convertir deuda de corto a largo plazo, acelerar cobros o aportar capital.' };
      if (v > 3) return { analisis: `${base} La holgura es muy amplia: parte del activo corriente puede estar ocioso (efectivo sin invertir o inventario de lenta rotación).`, accion: 'Evaluar invertir el excedente de efectivo o reducir inventarios; la liquidez excesiva sacrifica rentabilidad (Ross, disyuntiva de la liquidez).' };
      if (nivel === 'vigilar') return { analisis: `${base} Cubre sus deudas inmediatas, pero con poco margen: un retraso en los cobros podría generar tensión de tesorería.`, accion: 'Reducir el pasivo corriente o reforzar el activo corriente para ganar holgura (Amat).' };
      return { analisis: `${base} Cubre con holgura sus obligaciones de corto plazo.` };
    },
  },
  {
    id: 'prueba-acida',
    categoria: 'liquidez',
    nombre: 'Prueba ácida (razón rápida)',
    unidad: 'veces',
    formula: '(Activo corriente − Inventarios − Gastos pagados por anticipado) ÷ Pasivo corriente',
    mide: 'La capacidad de pagar las deudas de corto plazo sin depender de vender el inventario, que es el activo corriente menos líquido.',
    interpretacion: 'Si es mucho menor que la razón corriente, la liquidez depende del inventario. En comercios con mucho inventario es normal que sea menor que 1, pero entonces la rotación del inventario se vuelve crítica.',
    referencia: 'Cerca de 1 o más es holgada; entre 0,5 y 1 depende de la rotación del inventario; menos de 0,5 es estrecha.',
    fuente: `${FUENTES_INDICADORES.ross} (ec. 3.2); ${FUENTES_INDICADORES.court}`,
    mejorSiSube: true,
    calcular: (b) => {
      const rapido = b.activoCorriente - b.inventarios - b.pagosAnticipados;
      return b.pasivoCorriente <= 0
        ? { valor: null, calculo: `${col(rapido)} ÷ ${col(b.pasivoCorriente)}`, motivo: 'No hay pasivo corriente.', nivelSinValor: rapido > 0 ? 'favorable' : 'sin-datos' }
        : { valor: rapido / b.pasivoCorriente, calculo: `(${col(b.activoCorriente)} − ${col(b.inventarios)} − ${col(b.pagosAnticipados)}) ÷ ${col(b.pasivoCorriente)}` };
    },
    evaluar: (v) => rango(v, 1, 0.5),
    analizar: (v, nivel, b) => {
      if (v === null) return { analisis: 'Sin deudas de corto plazo: la prueba ácida no aplica.' };
      const peso = b.activoCorriente ? b.inventarios / b.activoCorriente : 0;
      const base = `Sin contar el inventario, hay ${col(v)} de activos líquidos por cada colón de pasivo corriente${peso > 0.4 ? `; el inventario representa ${pct(peso)} del activo corriente` : ''}.`;
      if (nivel === 'favorable') return { analisis: `${base} La empresa puede pagar sus deudas inmediatas aunque no venda inventario.` };
      if (nivel === 'vigilar') return { analisis: `${base} Para pagar todas sus deudas de corto plazo necesita vender parte del inventario.`, accion: 'Vigilar la rotación del inventario y evitar compras que no se vendan pronto.' };
      return { analisis: `${base} La liquidez depende casi por completo de vender el inventario: si las ventas bajan, habría problemas para pagar.`, accion: 'Reducir inventario lento, acelerar cobros y no financiar compras de inventario con deuda de muy corto plazo.' };
    },
  },
  {
    id: 'razon-efectivo',
    categoria: 'liquidez',
    nombre: 'Razón de efectivo',
    unidad: 'veces',
    formula: 'Efectivo y equivalentes ÷ Pasivo corriente',
    mide: 'La parte de las deudas de corto plazo que podría pagarse hoy mismo con el efectivo disponible.',
    interpretacion: 'Es la medida de liquidez más estricta. No hay un rango universal: se compara con la propia historia y con el calendario de pagos de la empresa.',
    referencia: 'Orientativa: 0,2 o más da margen para imprevistos; menos de 0,1 deja a la empresa dependiendo de los cobros diarios.',
    fuente: `${FUENTES_INDICADORES.ross} (ec. 3.3)`,
    mejorSiSube: true,
    calcular: (b) => b.pasivoCorriente <= 0
      ? { valor: null, calculo: `${col(b.efectivo)} ÷ ${col(b.pasivoCorriente)}`, motivo: 'No hay pasivo corriente.', nivelSinValor: b.efectivo > 0 ? 'favorable' : 'sin-datos' }
      : { valor: b.efectivo / b.pasivoCorriente, calculo: `${col(b.efectivo)} ÷ ${col(b.pasivoCorriente)}` },
    evaluar: (v) => rango(v, 0.2, 0.1),
    analizar: (v, nivel) => {
      if (v === null) return { analisis: 'Sin deudas de corto plazo: todo el efectivo está libre.' };
      const base = v >= 1
        ? `El efectivo alcanza para pagar todas las deudas de corto plazo (lo cubre ${vec(v)}).`
        : `Con el efectivo actual se podría pagar el ${pct(v)} de las deudas de corto plazo.`;
      if (nivel === 'desfavorable') return { analisis: `${base} El colchón de efectivo es mínimo: cualquier pago imprevisto obliga a esperar cobros o a endeudarse.`, accion: 'Preparar un flujo de caja semanal y mantener una reserva mínima de efectivo.' };
      if (nivel === 'vigilar') return { analisis: `${base} El margen de efectivo es justo.` };
      return { analisis: `${base} Hay un colchón de efectivo razonable para imprevistos.` };
    },
  },
  {
    id: 'capital-trabajo',
    categoria: 'liquidez',
    nombre: 'Capital de trabajo neto (fondo de maniobra)',
    unidad: 'colones',
    formula: 'Activo corriente − Pasivo corriente',
    mide: 'Los recursos de corto plazo que quedan libres después de pagar las deudas de corto plazo; la parte del activo corriente financiada con recursos de largo plazo.',
    interpretacion: 'Debe ser positivo: el activo corriente tiene que alcanzar para atender el pasivo corriente. Las inversiones de largo plazo deben financiarse con patrimonio o deuda de largo plazo, nunca con deuda de corto plazo (Amat).',
    referencia: 'Positivo. Negativo solo es sostenible si el inventario y los cobros giran muy rápido (por ejemplo, supermercados).',
    fuente: `${FUENTES_INDICADORES.court}; Amat, cap. 21 (fondo de maniobra); ${FUENTES_INDICADORES.ross} (cap. 2)`,
    mejorSiSube: true,
    calcular: (b) => ({ valor: b.activoCorriente - b.pasivoCorriente, calculo: `${col(b.activoCorriente)} − ${col(b.pasivoCorriente)}` }),
    evaluar: (v, b) => (v > 0 ? 'favorable' : v === 0 && b.activoCorriente === 0 ? 'sin-datos' : v === 0 ? 'vigilar' : 'desfavorable'),
    analizar: (v, nivel, b) => {
      const peso = v !== null && b.activoTotal ? ` (${pct(v / b.activoTotal)} del activo total)` : '';
      if (nivel === 'favorable') return { analisis: `Después de cubrir todas las deudas de corto plazo quedan ${col(v ?? 0)}${peso} para operar.` };
      if (nivel === 'desfavorable') return { analisis: `El pasivo corriente supera al activo corriente en ${col(Math.abs(v ?? 0))}: parte de las deudas de corto plazo financia activos de largo plazo o pérdidas.`, accion: 'Reestructurar deuda de corto a largo plazo o capitalizar la empresa; revisar si se compraron activos fijos con crédito de proveedores.' };
      return { analisis: 'El activo corriente apenas iguala al pasivo corriente: no hay margen para imprevistos.' };
    },
  },
  {
    id: 'intervalo',
    categoria: 'liquidez',
    nombre: 'Días de autonomía (medida del intervalo)',
    unidad: 'dias',
    formula: 'Activo corriente ÷ Costos de operación diarios (costo de ventas + gastos de operación − depreciación) ÷ días',
    mide: 'Cuántos días podría seguir operando la empresa con sus activos corrientes si dejara de recibir ingresos.',
    interpretacion: 'Útil sobre todo en empresas nuevas o con ingresos irregulares: indica cuánto tiempo pueden sostenerse antes de necesitar más financiamiento. Excluye la depreciación porque no es una salida de efectivo.',
    referencia: 'Orientativa: 60 días o más da tranquilidad; menos de 30 días es una autonomía corta.',
    fuente: `${FUENTES_INDICADORES.ross} (ec. 3.5)`,
    mejorSiSube: true,
    calcular: (b) => {
      const diario = costosDiarios(b);
      return diario <= 0
        ? { valor: null, calculo: `${col(b.activoCorriente)} ÷ ₡0,00 diarios`, motivo: 'No hay costos de operación en el periodo.' }
        : { valor: b.activoCorriente / diario, calculo: `${col(b.activoCorriente)} ÷ (${col(b.costoVentas + b.gastosOperacion - b.depreciacion)} ÷ ${b.dias} días = ${col(diario)} diarios)` };
    },
    evaluar: (v) => rango(v, 60, 30),
    analizar: (v, nivel) => {
      if (v === null) return { analisis: 'Sin costos de operación en el periodo no se puede estimar la autonomía.' };
      const base = `Con su activo corriente, la empresa cubriría unos ${dia(v)} de costos de operación sin ingresos nuevos.`;
      if (nivel === 'desfavorable') return { analisis: `${base} Es una autonomía corta: depende de vender y cobrar todos los días.`, accion: 'Asegurar una línea de crédito de respaldo y controlar los gastos fijos.' };
      if (nivel === 'vigilar') return { analisis: `${base} La autonomía es moderada.` };
      return { analisis: `${base} Es una autonomía holgada.` };
    },
  },

  // ---------------- Actividad ----------------
  {
    id: 'dias-inventario',
    categoria: 'actividad',
    nombre: 'Días de inventario (y rotación)',
    unidad: 'dias',
    formula: 'Inventarios ÷ (Costo de ventas ÷ días del periodo); rotación anual = 365 ÷ días de inventario',
    mide: 'Cuántos días tarda en promedio en venderse el inventario.',
    interpretacion: 'Mientras no se agoten las existencias y se pierdan ventas, cuanto menos días (más rotación), más eficiente es la administración del inventario. Un inventario alto puede indicar compras excesivas o mercadería obsoleta.',
    referencia: 'Depende del giro. Orientativa para comercio: hasta 60 días es ágil; más de 120 días es lento.',
    fuente: `${FUENTES_INDICADORES.ross} (ec. 3.12 y 3.13)`,
    mejorSiSube: false,
    calcular: (b) => (b.costoVentas <= 0
      ? { valor: null, calculo: `${col(b.inventarios)} ÷ ₡0,00`, motivo: b.inventarios > 0 ? 'Hay inventario pero no hubo costo de ventas en el periodo.' : 'La empresa no vende inventario (servicios).', nivelSinValor: b.inventarios > 0 ? 'desfavorable' : 'sin-datos' }
      : { valor: b.inventarios / (b.costoVentas / b.dias), calculo: `${col(b.inventarios)} ÷ (${col(b.costoVentas)} ÷ ${b.dias} días)` }),
    evaluar: (v) => rangoInverso(v, 60, 120),
    analizar: (v, nivel, _b, _p, motivo) => {
      if (v === null) return { analisis: motivo ?? 'Sin inventario.', ...(motivo?.startsWith('Hay') ? { accion: 'Revisar si el inventario está obsoleto o si las ventas no están rebajando existencias.' } : {}) };
      const base = `El inventario se vende en unos ${dia(v)}, es decir, rota ${vec(v > 0 ? 365 / v : 0)} al año.`;
      if (nivel === 'desfavorable') return { analisis: `${base} Es una rotación lenta: hay capital inmovilizado y riesgo de obsolescencia.`, accion: 'Liquidar artículos de baja rotación, comprar en lotes más pequeños y revisar el deterioro (Sección 13, valor neto realizable).' };
      if (nivel === 'vigilar') return { analisis: `${base} Rotación moderada; conviene compararla con el sector.` };
      return { analisis: `${base} Rotación ágil.` };
    },
  },
  {
    id: 'dias-cobro',
    categoria: 'actividad',
    nombre: 'Periodo medio de cobro',
    unidad: 'dias',
    formula: 'Cuentas por cobrar ÷ (Ventas ÷ días del periodo)',
    mide: 'Cuántos días tarda en promedio la empresa en cobrar a sus clientes.',
    interpretacion: 'Cuanto menor, mejor: la empresa recupera antes su dinero. Debe compararse con el plazo de crédito que se otorga. Las cuentas por cobrar incluyen el IVA facturado y las ventas no, por lo que el resultado tiende a ser algo mayor que el plazo real.',
    referencia: 'Orientativa: hasta 30 días es ágil; más de 60 días indica cobro lento o morosidad.',
    fuente: `${FUENTES_INDICADORES.amat}; ${FUENTES_INDICADORES.ross} (ec. 3.14 y 3.15)`,
    mejorSiSube: false,
    calcular: (b) => (b.ventas <= 0
      ? { valor: null, calculo: `${col(b.cuentasPorCobrar)} ÷ ₡0,00`, motivo: 'No hubo ventas en el periodo.' }
      : { valor: b.cuentasPorCobrar / (b.ventas / b.dias), calculo: `${col(b.cuentasPorCobrar)} ÷ (${col(b.ventas)} ÷ ${b.dias} días)` }),
    evaluar: (v) => rangoInverso(v, 30, 60),
    analizar: (v, nivel) => {
      if (v === null) return { analisis: 'Sin ventas en el periodo.' };
      const base = v < 1 ? 'Prácticamente todas las ventas se cobraron al contado.' : `La empresa cobra a sus clientes en unos ${dia(v)}.`;
      if (nivel === 'desfavorable') return { analisis: `${base} Es un plazo largo: la empresa financia a sus clientes y crece el riesgo de incobrables.`, accion: 'Revisar la antigüedad de saldos, endurecer la política de crédito y reconocer el deterioro cuando haya evidencia objetiva (Sección 11).' };
      if (nivel === 'vigilar') return { analisis: `${base} Plazo moderado; verificar que coincide con el crédito pactado.` };
      return { analisis: `${base} Cobro ágil.` };
    },
  },
  {
    id: 'dias-pago',
    categoria: 'actividad',
    nombre: 'Periodo medio de pago a proveedores',
    unidad: 'dias',
    formula: 'Cuentas por pagar comerciales ÷ (Costo de ventas ÷ días del periodo)',
    mide: 'Cuántos días tarda en promedio la empresa en pagar a sus proveedores.',
    interpretacion: 'En principio, un plazo mayor es mejor porque el proveedor financia sin costo, siempre que la empresa pague en la fecha convenida. Un plazo excesivo puede reflejar atrasos y dañar la relación con los proveedores.',
    referencia: 'Orientativa: entre 15 y 90 días; idealmente mayor que el periodo de cobro.',
    fuente: `${FUENTES_INDICADORES.amat}; ${FUENTES_INDICADORES.berkCapital}`,
    mejorSiSube: null,
    calcular: (b) => (b.costoVentas <= 0
      ? { valor: null, calculo: `${col(b.proveedores)} ÷ ₡0,00`, motivo: 'No hubo costo de ventas en el periodo.' }
      : { valor: b.proveedores / (b.costoVentas / b.dias), calculo: `${col(b.proveedores)} ÷ (${col(b.costoVentas)} ÷ ${b.dias} días)` }),
    evaluar: (v) => (v >= 15 && v <= 90 ? 'favorable' : 'vigilar'),
    analizar: (v) => {
      if (v === null) return { analisis: 'Sin costo de ventas no se puede estimar el plazo de pago.' };
      const base = `La empresa paga a sus proveedores en unos ${dia(v)}.`;
      if (v > 90) return { analisis: `${base} Es un plazo muy largo: podría haber atrasos en los pagos.`, accion: 'Confirmar que se pagan a tiempo; los atrasos encarecen las compras y dañan la relación con los proveedores.' };
      if (v < 15) return { analisis: `${base} Paga muy rápido o de contado: no aprovecha el crédito de los proveedores.`, accion: 'Negociar plazos de crédito con los proveedores para liberar efectivo.' };
      return { analisis: `${base} Aprovecha el crédito comercial dentro de plazos razonables.` };
    },
  },
  {
    id: 'ciclo-efectivo',
    categoria: 'actividad',
    nombre: 'Ciclo de conversión del efectivo',
    unidad: 'dias',
    formula: 'Días de inventario + Periodo medio de cobro − Periodo medio de pago',
    mide: 'El tiempo que pasa entre que la empresa paga su inventario y cobra la venta de ese inventario: los días que debe financiar su operación con recursos propios o deuda.',
    interpretacion: 'Cuanto más corto, menos capital de trabajo necesita la empresa. Si es negativo, los proveedores financian la operación (cobra antes de pagar).',
    referencia: 'Orientativa: hasta 45 días es eficiente; más de 90 días exige mucho capital de trabajo.',
    fuente: FUENTES_INDICADORES.berkCapital,
    mejorSiSube: false,
    calcular: (b) => {
      if (b.ventas <= 0) return { valor: null, calculo: '—', motivo: 'No hubo ventas en el periodo.' };
      const dInv = b.costoVentas > 0 ? b.inventarios / (b.costoVentas / b.dias) : 0;
      const dCob = b.cuentasPorCobrar / (b.ventas / b.dias);
      const dPag = b.costoVentas > 0 ? b.proveedores / (b.costoVentas / b.dias) : 0;
      return { valor: dInv + dCob - dPag, calculo: `${dia(dInv)} + ${dia(dCob)} − ${dia(dPag)}` };
    },
    evaluar: (v) => rangoInverso(v, 45, 90),
    analizar: (v, nivel) => {
      if (v === null) return { analisis: 'Sin ventas no hay ciclo que medir.' };
      if (v < 0) return { analisis: `El ciclo es negativo (${dia(v)}): la empresa cobra a sus clientes antes de pagar a sus proveedores, que financian su operación.` };
      const base = `Desde que paga la mercadería hasta que cobra la venta pasan unos ${dia(v)}, que la empresa debe financiar.`;
      if (nivel === 'desfavorable') return { analisis: `${base} Es un ciclo largo: inmoviliza mucho efectivo.`, accion: 'Acortar el ciclo actuando sobre sus tres palancas: vender el inventario antes, cobrar antes y negociar más plazo con los proveedores.' };
      if (nivel === 'vigilar') return { analisis: `${base} Ciclo moderado.` };
      return { analisis: `${base} Ciclo eficiente.` };
    },
  },
  {
    id: 'rotacion-activos',
    categoria: 'actividad',
    nombre: 'Rotación de activos totales',
    unidad: 'veces',
    formula: 'Ventas anualizadas ÷ Activo total',
    mide: 'Cuántos colones de ventas genera cada colón invertido en activos en un año.',
    interpretacion: 'Mide la eficiencia en el uso de los activos y es uno de los tres factores del ROE en la identidad Du Pont. Varía mucho según el sector: los comercios rotan más que las industrias intensivas en maquinaria.',
    referencia: 'Orientativa: 1 vez o más en comercio y servicios; menos de 0,5 indica activos subutilizados.',
    fuente: `${FUENTES_INDICADORES.ross} (ec. 3.18 e identidad Du Pont)`,
    mejorSiSube: true,
    calcular: (b) => (b.activoTotal <= 0
      ? { valor: null, calculo: '—', motivo: 'No hay activos al corte.' }
      : { valor: (b.ventas * anual(b)) / b.activoTotal, calculo: `(${col(b.ventas)}${notaAnual(b)}) ÷ ${col(b.activoTotal)}` }),
    evaluar: (v) => rango(v, 1, 0.5),
    analizar: (v, nivel) => {
      if (v === null) return { analisis: 'Sin activos no se puede medir la rotación.' };
      const base = `Cada colón invertido en activos genera ${col(v)} de ventas al año.`;
      if (nivel === 'desfavorable') return { analisis: `${base} Los activos están subutilizados para el nivel de ventas.`, accion: 'Aumentar ventas con la capacidad instalada o desprenderse de activos que no generan ingresos.' };
      if (nivel === 'vigilar') return { analisis: `${base} Uso moderado de los activos.` };
      return { analisis: `${base} Uso eficiente de los activos.` };
    },
  },

  // ---------------- Endeudamiento ----------------
  {
    id: 'razon-deuda',
    categoria: 'endeudamiento',
    nombre: 'Razón de endeudamiento',
    unidad: 'porcentaje',
    formula: 'Pasivo total ÷ Activo total',
    mide: 'Qué parte de los activos está financiada por terceros (acreedores, proveedores, Hacienda).',
    interpretacion: 'Mayor que 0,6 indica exceso de deudas; entre 0,5 y 0,6 la situación es correcta; menor que 0,5 la empresa está capitalizada (Amat). Hay que considerar las características de la empresa: algunas funcionan bien con más deuda.',
    referencia: 'Hasta 60 % (Amat).',
    fuente: `${FUENTES_INDICADORES.amat}; ${FUENTES_INDICADORES.ross} (ec. 3.6)`,
    mejorSiSube: false,
    calcular: (b) => (b.activoTotal <= 0
      ? { valor: null, calculo: '—', motivo: 'No hay activos al corte.' }
      : { valor: b.pasivoTotal / b.activoTotal, calculo: `${col(b.pasivoTotal)} ÷ ${col(b.activoTotal)}` }),
    evaluar: (v) => rangoInverso(v, 0.6, 0.7),
    analizar: (v, nivel, b) => {
      if (v === null) return { analisis: 'Sin activos no se puede medir el endeudamiento.' };
      const base = `El ${pct(v)} de los activos está financiado con deuda y el ${pct(1 - v)} con patrimonio.`;
      if (b.patrimonio < 0) return { analisis: `${base} El patrimonio es negativo: las deudas superan a los activos.`, accion: 'Capitalizar la empresa de inmediato; evaluar la hipótesis de negocio en marcha (Sección 3).' };
      if (nivel === 'desfavorable') return { analisis: `${base} Hay exceso de deudas: la empresa depende de sus acreedores y su margen para endeudarse más es escaso.`, accion: 'Reducir deuda con utilidades retenidas o aportes de capital antes de asumir nuevos créditos.' };
      if (nivel === 'vigilar') return { analisis: `${base} El endeudamiento está algo por encima de lo recomendable.` };
      return { analisis: `${base} ${v < 0.4 ? 'La empresa está bien capitalizada y tiene capacidad para endeudarse si lo necesita.' : 'El nivel de deuda es correcto.'}` };
    },
  },
  {
    id: 'deuda-patrimonio',
    categoria: 'endeudamiento',
    nombre: 'Razón deuda a patrimonio',
    unidad: 'veces',
    formula: 'Pasivo total ÷ Patrimonio',
    mide: 'Cuántos colones aportan los acreedores por cada colón aportado por los dueños.',
    interpretacion: 'Los acreedores prefieren que sea lo más baja posible: cuanto mayor, más riesgo asumen frente a los dueños. Equivale a la razón de endeudamiento vista desde el patrimonio (0,6 de endeudamiento = 1,5 veces).',
    referencia: 'Hasta 1,5 veces (equivalente al 60 % de endeudamiento).',
    fuente: `${FUENTES_INDICADORES.court}; ${FUENTES_INDICADORES.ross} (ec. 3.7)`,
    mejorSiSube: false,
    calcular: (b) => (b.patrimonio <= 0
      ? { valor: null, calculo: `${col(b.pasivoTotal)} ÷ ${col(b.patrimonio)}`, motivo: b.patrimonio < 0 ? 'El patrimonio es negativo.' : 'No hay patrimonio.', nivelSinValor: b.patrimonio < 0 ? 'desfavorable' : 'sin-datos' }
      : { valor: b.pasivoTotal / b.patrimonio, calculo: `${col(b.pasivoTotal)} ÷ ${col(b.patrimonio)}` }),
    evaluar: (v) => rangoInverso(v, 1.5, 2.33),
    analizar: (v, nivel, _b, _p, motivo) => {
      if (v === null) return { analisis: motivo === 'El patrimonio es negativo.' ? 'Con patrimonio negativo, los acreedores financian todo el activo y además las pérdidas.' : 'Sin patrimonio no se puede calcular.', ...(motivo === 'El patrimonio es negativo.' ? { accion: 'Aportar capital o capitalizar deudas.' } : {}) };
      const base = `Por cada colón de los dueños hay ${col(v)} de deuda.`;
      if (nivel === 'desfavorable') return { analisis: `${base} Los acreedores financian bastante más que los dueños.`, accion: 'Fortalecer el patrimonio antes de nuevos créditos.' };
      if (nivel === 'vigilar') return { analisis: `${base} La deuda supera lo recomendable frente al patrimonio.` };
      return { analisis: `${base} Estructura de financiamiento equilibrada.` };
    },
  },
  {
    id: 'multiplicador',
    categoria: 'endeudamiento',
    nombre: 'Multiplicador del capital (apalancamiento)',
    unidad: 'veces',
    formula: 'Activo total ÷ Patrimonio',
    mide: 'Cuántos colones de activos controla la empresa por cada colón de patrimonio; es el factor de apalancamiento financiero de la identidad Du Pont.',
    interpretacion: 'El apalancamiento eleva el ROE cuando los activos rinden más que el costo de la deuda, pero también aumenta el gasto financiero y el riesgo; por eso el ROE puede subir o bajar al endeudarse (Ross).',
    referencia: 'Hasta 2,5 veces (equivalente al 60 % de endeudamiento).',
    fuente: `${FUENTES_INDICADORES.ross} (ec. 3.8 e identidad Du Pont)`,
    mejorSiSube: false,
    calcular: (b) => (b.patrimonio <= 0
      ? { valor: null, calculo: `${col(b.activoTotal)} ÷ ${col(b.patrimonio)}`, motivo: 'El patrimonio no es positivo.', nivelSinValor: b.patrimonio < 0 ? 'desfavorable' : 'sin-datos' }
      : { valor: b.activoTotal / b.patrimonio, calculo: `${col(b.activoTotal)} ÷ ${col(b.patrimonio)}` }),
    evaluar: (v) => rangoInverso(v, 2.5, 3.33),
    analizar: (v, nivel) => {
      if (v === null) return { analisis: 'Con patrimonio nulo o negativo el apalancamiento no tiene sentido económico.' };
      const base = `La empresa controla ${col(v)} de activos por cada colón de patrimonio.`;
      if (nivel === 'favorable') return { analisis: `${base} Apalancamiento moderado.` };
      return { analisis: `${base} El apalancamiento es alto: amplifica tanto las ganancias como las pérdidas.`, accion: 'Verificar que el rendimiento de los activos supere el costo de la deuda.' };
    },
  },
  {
    id: 'calidad-deuda',
    categoria: 'endeudamiento',
    nombre: 'Calidad de la deuda',
    unidad: 'porcentaje',
    formula: 'Pasivo corriente ÷ Pasivo total',
    mide: 'Qué parte de la deuda vence en el corto plazo.',
    interpretacion: 'Cuanto menor, mejor calidad: la deuda de largo plazo da tiempo para que las inversiones generen el efectivo con que se paga. Si el 75 % de la deuda es de corto plazo, la mayor parte es de baja calidad (Amat).',
    referencia: 'Hasta 50 %; por encima de 80 % la deuda es de baja calidad, salvo que el endeudamiento total sea bajo.',
    fuente: FUENTES_INDICADORES.amat,
    mejorSiSube: false,
    calcular: (b) => (b.pasivoTotal <= 0
      ? { valor: null, calculo: '—', motivo: 'La empresa no tiene deudas.', nivelSinValor: 'favorable' }
      : { valor: b.pasivoCorriente / b.pasivoTotal, calculo: `${col(b.pasivoCorriente)} ÷ ${col(b.pasivoTotal)}` }),
    evaluar: (v, b) => {
      const nivel = rangoInverso(v, 0.5, 0.8);
      // Con poca deuda total, que toda sea de corto plazo (proveedores, IVA) no es preocupante.
      return nivel === 'desfavorable' && b.activoTotal > 0 && b.pasivoTotal / b.activoTotal <= 0.3 ? 'vigilar' : nivel;
    },
    analizar: (v, nivel, b) => {
      if (v === null) return { analisis: 'Sin deudas: no hay vencimientos que atender.' };
      const base = `El ${pct(v)} de la deuda vence en los próximos 12 meses.`;
      if (nivel === 'desfavorable') return { analisis: `${base} Casi toda la deuda es de corto plazo: presiona la tesorería.`, accion: 'Sustituir deuda de corto plazo por financiamiento de largo plazo, sobre todo si financió activos fijos.' };
      if (nivel === 'vigilar') return { analisis: `${base} ${b.activoTotal > 0 && b.pasivoTotal / b.activoTotal <= 0.3 ? 'Es deuda operativa (proveedores e impuestos) y el endeudamiento total es bajo, así que el riesgo es limitado.' : 'Predomina la deuda de corto plazo.'}` };
      return { analisis: `${base} Buena calidad de la deuda.` };
    },
  },
  {
    id: 'cobertura-intereses',
    categoria: 'endeudamiento',
    nombre: 'Cobertura de gastos financieros',
    unidad: 'veces',
    formula: 'Utilidad antes de intereses e impuestos (UAII) ÷ Gastos financieros',
    mide: 'Cuántas veces cubre la utilidad operativa el costo financiero de la deuda.',
    interpretacion: 'Indica la capacidad de la empresa para pagar los intereses con lo que genera su operación. En este catálogo los gastos financieros incluyen comisiones bancarias y diferencias de cambio.',
    referencia: 'Orientativa: 3 veces o más es cómoda; menos de 1,5 deja poco margen ante una caída de ventas.',
    fuente: `${FUENTES_INDICADORES.ross} (ec. 3.10); ${FUENTES_INDICADORES.court}`,
    mejorSiSube: true,
    calcular: (b) => (b.gastosFinancieros <= 0
      ? { valor: null, calculo: `${col(b.uaii)} ÷ ₡0,00`, motivo: 'No hay gastos financieros en el periodo.', nivelSinValor: 'favorable' }
      : { valor: b.uaii / b.gastosFinancieros, calculo: `${col(b.uaii)} ÷ ${col(b.gastosFinancieros)}` }),
    evaluar: (v) => rango(v, 3, 1.5),
    analizar: (v, nivel) => {
      if (v === null) return { analisis: 'No hubo gastos financieros: la operación no tiene carga financiera que cubrir.' };
      const base = `La utilidad operativa cubre ${vec(v)} los gastos financieros.`;
      if (nivel === 'desfavorable') return { analisis: `${base} ${v < 1 ? 'La operación no alcanza a pagar el costo de la deuda.' : 'El margen es estrecho.'}`, accion: 'Renegociar tasas o plazos y evitar nueva deuda hasta mejorar la utilidad operativa.' };
      if (nivel === 'vigilar') return { analisis: `${base} Cobertura aceptable pero ajustada.` };
      return { analisis: `${base} Cobertura holgada.` };
    },
  },

  // ---------------- Rentabilidad ----------------
  {
    id: 'margen-bruto',
    categoria: 'rentabilidad',
    nombre: 'Margen bruto',
    unidad: 'porcentaje',
    formula: '(Ventas − Costo de ventas) ÷ Ventas',
    mide: 'Qué parte de cada colón vendido queda después de cubrir el costo de la mercadería o del servicio.',
    interpretacion: 'Refleja la política de precios y el costo de compra. El margen bruto debe alcanzar para cubrir los gastos de operación; si no, la empresa pierde dinero aunque venda más.',
    referencia: 'Debe ser mayor que el peso de los gastos de operación sobre las ventas.',
    fuente: `${FUENTES_INDICADORES.ross} (estados de resultados porcentuales); Amat, cap. 9 (Análisis de la cuenta de resultados)`,
    mejorSiSube: true,
    calcular: (b) => (b.ventas <= 0
      ? { valor: null, calculo: '—', motivo: 'No hubo ventas en el periodo.' }
      : { valor: b.utilidadBruta / b.ventas, calculo: `(${col(b.ventas)} − ${col(b.costoVentas)}) ÷ ${col(b.ventas)}` }),
    evaluar: (v, b) => (v <= 0 ? 'desfavorable' : v > b.gastosOperacion / b.ventas ? 'favorable' : 'vigilar'),
    analizar: (v, nivel, b) => {
      if (v === null) return { analisis: 'Sin ventas en el periodo.' };
      const gastos = b.ventas ? b.gastosOperacion / b.ventas : 0;
      const base = `De cada ₡100 vendidos quedan ${col(v * 100)} después del costo de ventas; los gastos de operación consumen ${col(gastos * 100)}.`;
      if (nivel === 'desfavorable') return { analisis: `${base} Se vende por debajo del costo.`, accion: 'Revisar precios y costos de compra de inmediato.' };
      if (nivel === 'vigilar') return { analisis: `${base} El margen bruto no alcanza para cubrir los gastos de operación.`, accion: 'Subir precios, negociar mejores costos de compra o reducir gastos fijos.' };
      return { analisis: `${base} El margen cubre los gastos de operación.` };
    },
  },
  {
    id: 'margen-ebitda',
    categoria: 'rentabilidad',
    nombre: 'Margen EBITDA',
    unidad: 'porcentaje',
    formula: '(UAII + Depreciación y amortización) ÷ Ventas',
    mide: 'El resultado operativo antes de intereses, impuestos, depreciación y amortización por cada colón vendido: una aproximación al efectivo que genera la operación.',
    interpretacion: 'Permite comparar la operación sin el efecto de cómo se financia la empresa (intereses), de los impuestos ni de las políticas de depreciación. No sustituye al flujo de efectivo: no considera inversiones ni cambios en el capital de trabajo.',
    referencia: 'Orientativa: 10 % o más; negativo indica que la operación consume efectivo.',
    fuente: `${FUENTES_INDICADORES.soriano}; ${FUENTES_INDICADORES.berk}`,
    mejorSiSube: true,
    calcular: (b) => (b.ventas <= 0
      ? { valor: null, calculo: '—', motivo: 'No hubo ventas en el periodo.' }
      : { valor: b.ebitda / b.ventas, calculo: `(${col(b.uaii)} + ${col(b.depreciacion)}) ÷ ${col(b.ventas)}` }),
    evaluar: (v) => rango(v, 0.1, 0),
    analizar: (v, nivel) => {
      if (v === null) return { analisis: 'Sin ventas en el periodo.' };
      const base = `La operación genera ${col(v * 100)} de EBITDA por cada ₡100 vendidos.`;
      if (nivel === 'desfavorable') return { analisis: `${base} La operación no genera recursos.`, accion: 'Revisar la estructura de costos y gastos.' };
      if (nivel === 'vigilar') return { analisis: `${base} Margen operativo positivo pero bajo.` };
      return { analisis: `${base} Buena generación operativa.` };
    },
  },
  {
    id: 'margen-operativo',
    categoria: 'rentabilidad',
    nombre: 'Margen operativo',
    unidad: 'porcentaje',
    formula: 'Utilidad antes de intereses e impuestos (UAII) ÷ Ventas',
    mide: 'La utilidad que deja la operación por cada colón vendido, después de costos, gastos y depreciación, pero antes de los gastos financieros y del impuesto sobre la renta.',
    interpretacion: 'Mide la eficiencia operativa sin la influencia del financiamiento. Si es positivo pero el margen neto no, el problema está en la carga financiera o en los impuestos.',
    referencia: 'Orientativa: 10 % o más es sólido; entre 0 y 10 %, ajustado.',
    fuente: `${FUENTES_INDICADORES.ross}; ${FUENTES_INDICADORES.amatRentabilidad}`,
    mejorSiSube: true,
    calcular: (b) => (b.ventas <= 0
      ? { valor: null, calculo: '—', motivo: 'No hubo ventas en el periodo.' }
      : { valor: b.uaii / b.ventas, calculo: `${col(b.uaii)} ÷ ${col(b.ventas)}` }),
    evaluar: (v) => rango(v, 0.1, 0),
    analizar: (v, nivel) => {
      if (v === null) return { analisis: 'Sin ventas en el periodo.' };
      const base = `La operación deja ${col(v * 100)} de utilidad por cada ₡100 vendidos, antes de gastos financieros e impuestos.`;
      if (nivel === 'desfavorable') return { analisis: `${base} La operación pierde dinero.`, accion: 'Identificar las líneas de producto o los gastos que generan la pérdida.' };
      if (nivel === 'vigilar') return { analisis: `${base} Margen ajustado: una baja en ventas lo eliminaría.` };
      return { analisis: `${base} Margen operativo sólido.` };
    },
  },
  {
    id: 'margen-neto',
    categoria: 'rentabilidad',
    nombre: 'Margen neto (margen de utilidad)',
    unidad: 'porcentaje',
    formula: 'Utilidad neta ÷ Ventas',
    mide: 'Cuánto queda de utilidad final por cada colón vendido, después de todos los costos, gastos e impuestos.',
    interpretacion: 'Es el primer factor de la identidad Du Pont (eficiencia operativa). Un margen bajo puede compensarse con alta rotación de activos, como en los supermercados.',
    referencia: 'Orientativa: 5 % o más; negativo es pérdida.',
    fuente: `${FUENTES_INDICADORES.ross} (ec. 3.19)`,
    mejorSiSube: true,
    calcular: (b) => (b.ventas <= 0
      ? { valor: null, calculo: '—', motivo: 'No hubo ventas en el periodo.' }
      : { valor: b.utilidadNeta / b.ventas, calculo: `${col(b.utilidadNeta)} ÷ ${col(b.ventas)}` }),
    evaluar: (v) => rango(v, 0.05, 0),
    analizar: (v, nivel, b) => {
      if (v === null) return { analisis: 'Sin ventas en el periodo.' };
      const base = `De cada ₡100 vendidos quedan ${col(v * 100)} de utilidad neta${b.impuestoRenta === 0 && b.utilidadAntesImpuesto > 0 ? ' (aún sin registrar el impuesto sobre la renta)' : ''}.`;
      if (nivel === 'desfavorable') return { analisis: `${base} El periodo cierra con pérdida.`, accion: 'Revisar los márgenes bruto y operativo para ubicar dónde se pierde.' };
      if (nivel === 'vigilar') return { analisis: `${base} Rentabilidad sobre ventas baja.` };
      return { analisis: `${base} Buena rentabilidad sobre ventas.` };
    },
  },
  {
    id: 'roa',
    categoria: 'rentabilidad',
    nombre: 'Rendimiento sobre activos (ROA)',
    unidad: 'porcentaje',
    formula: 'Utilidad neta anualizada ÷ Activo total',
    mide: 'Cuánto gana la empresa en un año por cada colón invertido en activos, sin importar cómo se financiaron.',
    interpretacion: 'Es un rendimiento contable (sobre activos en libros), no una tasa de mercado. Combina el margen neto y la rotación de activos: ROA = margen neto × rotación de activos.',
    referencia: 'Orientativa: 5 % anual o más.',
    fuente: `${FUENTES_INDICADORES.ross} (ec. 3.20); ${FUENTES_INDICADORES.amatRentabilidad}`,
    mejorSiSube: true,
    calcular: (b) => (b.activoTotal <= 0
      ? { valor: null, calculo: '—', motivo: 'No hay activos al corte.' }
      : { valor: (b.utilidadNeta * anual(b)) / b.activoTotal, calculo: `(${col(b.utilidadNeta)}${notaAnual(b)}) ÷ ${col(b.activoTotal)}` }),
    evaluar: (v) => rango(v, 0.05, 0),
    analizar: (v, nivel) => {
      if (v === null) return { analisis: 'Sin activos no se puede calcular.' };
      const base = `Los activos rinden ${pct(v)} al año.`;
      if (nivel === 'desfavorable') return { analisis: `${base} Los activos no generan utilidad.`, accion: 'Mejorar el margen o la rotación de activos (Du Pont).' };
      if (nivel === 'vigilar') return { analisis: `${base} Rendimiento bajo de los activos.` };
      return { analisis: `${base} Buen rendimiento de los activos.` };
    },
  },
  {
    id: 'roe',
    categoria: 'rentabilidad',
    nombre: 'Rendimiento sobre el patrimonio (ROE)',
    unidad: 'porcentaje',
    formula: 'Utilidad neta anualizada ÷ Patrimonio  =  Margen neto × Rotación de activos × Multiplicador del capital',
    mide: 'Cuánto ganan los dueños en un año por cada colón que tienen invertido en la empresa (rentabilidad financiera).',
    interpretacion: 'Lo ideal es que supere la rentabilidad mínima que desean los dueños, es decir, su costo de oportunidad (Amat). La identidad Du Pont muestra si el ROE viene de la eficiencia operativa, del uso de los activos o del apalancamiento.',
    referencia: 'Mayor que el costo de capital definido para los dueños.',
    fuente: `${FUENTES_INDICADORES.ross} (ec. 3.21 e identidad Du Pont); ${FUENTES_INDICADORES.amatRentabilidad}`,
    mejorSiSube: true,
    calcular: (b) => (b.patrimonio <= 0
      ? { valor: null, calculo: `${col(b.utilidadNeta)} ÷ ${col(b.patrimonio)}`, motivo: 'El patrimonio no es positivo.', nivelSinValor: b.patrimonio < 0 ? 'desfavorable' : 'sin-datos' }
      : { valor: (b.utilidadNeta * anual(b)) / b.patrimonio, calculo: `(${col(b.utilidadNeta)}${notaAnual(b)}) ÷ ${col(b.patrimonio)}` }),
    evaluar: (v, _b, p) => (v < 0 ? 'desfavorable' : v >= p.costoCapital ? 'favorable' : 'vigilar'),
    analizar: (v, nivel, b, p) => {
      if (v === null) return { analisis: 'Con patrimonio nulo o negativo el ROE no tiene sentido económico.' };
      const base = `Los dueños ganan ${pct(v)} al año sobre su inversión, frente a un costo de oportunidad de ${pct(p.costoCapital)}.`;
      const dp = descomposicionDuPont(b);
      const motor = dp ? ` El factor que más pesa es ${dp.motor}.` : '';
      if (nivel === 'desfavorable') return { analisis: `${base} El periodo destruye patrimonio.${motor}`, accion: 'Atacar el factor Du Pont más débil: margen, rotación o estructura de financiamiento.' };
      if (nivel === 'vigilar') return { analisis: `${base} La empresa gana, pero menos de lo que los dueños podrían obtener en otra inversión de riesgo similar.${motor}`, accion: 'Mejorar el margen o la rotación antes de recurrir a más deuda para elevar el ROE.' };
      return { analisis: `${base} La empresa remunera bien a sus dueños.${motor}` };
    },
  },

  // ---------------- Efectivo y valor ----------------
  {
    id: 'calidad-utilidad',
    categoria: 'valor',
    nombre: 'Conversión de la utilidad en efectivo',
    unidad: 'veces',
    formula: 'Flujo de efectivo de operación ÷ Utilidad neta',
    mide: 'Cuántos colones de efectivo operativo produjo cada colón de utilidad contable.',
    interpretacion: 'La utilidad contable no es efectivo: incluye ventas no cobradas y gastos no pagados, y excluye la depreciación como salida de dinero (Ross, cap. 2). Si se mantiene por debajo de 1, las utilidades se están quedando en cuentas por cobrar o inventarios.',
    referencia: '1 o más; por debajo de 0,5 la utilidad se convierte poco en efectivo.',
    fuente: `${FUENTES_INDICADORES.ross} (cap. 2, flujo de efectivo y utilidad contable)`,
    mejorSiSube: true,
    calcular: (b) => (b.utilidadNeta <= 0
      ? { valor: null, calculo: `${col(b.flujoOperacion)} ÷ ${col(b.utilidadNeta)}`, motivo: 'No hay utilidad en el periodo.', nivelSinValor: b.flujoOperacion > 0 ? 'vigilar' : b.utilidadNeta < 0 ? 'desfavorable' : 'sin-datos' }
      : { valor: b.flujoOperacion / b.utilidadNeta, calculo: `${col(b.flujoOperacion)} ÷ ${col(b.utilidadNeta)}` }),
    evaluar: (v) => rango(v, 1, 0.5),
    analizar: (v, nivel, b) => {
      if (v === null) {
        if (b.utilidadNeta < 0 && b.flujoOperacion <= 0) return { analisis: `Hay pérdida y la operación consumió ${col(Math.abs(b.flujoOperacion))} de efectivo.`, accion: 'Priorizar la generación de efectivo: cobros, inventario y control de gastos.' };
        if (b.flujoOperacion > 0) return { analisis: `Aunque no hay utilidad, la operación generó ${col(b.flujoOperacion)} de efectivo (por cobros, depreciación o crédito de proveedores). No es sostenible sin volver a ganar.` };
        return { analisis: 'Sin utilidad ni flujo operativo en el periodo.' };
      }
      const base = `Cada colón de utilidad se convirtió en ${col(v)} de efectivo operativo.`;
      if (nivel === 'desfavorable') return { analisis: `${base} La utilidad se queda en cuentas por cobrar o inventarios.`, accion: 'Revisar el capital de trabajo: el crecimiento de cuentas por cobrar o inventarios absorbe el efectivo.' };
      if (nivel === 'vigilar') return { analisis: `${base} Parte de la utilidad todavía no se ha cobrado.` };
      return { analisis: `${base} Las utilidades se respaldan con efectivo.` };
    },
  },
  {
    id: 'eva',
    categoria: 'valor',
    nombre: 'Valor económico agregado (EVA)',
    unidad: 'colones',
    formula: 'UAII × (1 − tasa de impuesto) − Costo de capital × (Patrimonio + Deuda financiera) × días ÷ 365',
    mide: 'La utilidad que queda después de remunerar todo el capital invertido, propio y prestado: si la empresa crea o destruye valor.',
    interpretacion: 'Una empresa en equilibrio contable en realidad tiene pérdidas, porque no cubre el costo del capital (Brealey y Myers). El EVA positivo indica que la operación rinde más de lo que cuesta el capital que usa.',
    referencia: 'Positivo.',
    fuente: FUENTES_INDICADORES.brealeyEva,
    mejorSiSube: true,
    calcular: (b, p) => {
      const capital = b.patrimonio + b.deudaFinanciera;
      if (capital <= 0) return { valor: null, calculo: '—', motivo: 'El capital invertido no es positivo.', nivelSinValor: b.patrimonio < 0 ? 'desfavorable' : 'sin-datos' };
      const tasa = b.utilidadAntesImpuesto > 0 ? Math.min(1, Math.max(0, b.impuestoRenta / b.utilidadAntesImpuesto)) : 0;
      const nopat = b.uaii * (1 - tasa);
      const cargo = p.costoCapital * capital * (b.dias / 365);
      return { valor: nopat - cargo, calculo: `${col(b.uaii)} × (1 − ${pct(tasa)}) − ${pct(p.costoCapital)} × ${col(capital)} × ${b.dias} ÷ 365 = ${col(nopat)} − ${col(cargo)}` };
    },
    evaluar: (v, b) => {
      const capital = b.patrimonio + b.deudaFinanciera;
      return Math.abs(v) < capital * 0.005 ? 'vigilar' : v > 0 ? 'favorable' : 'desfavorable';
    },
    analizar: (v, nivel, _b, p) => {
      if (v === null) return { analisis: 'Sin capital invertido positivo no se puede medir el valor agregado.' };
      if (nivel === 'favorable') return { analisis: `La operación crea ${col(v)} de valor en el periodo por encima del ${pct(p.costoCapital)} que cuesta el capital.` };
      if (nivel === 'desfavorable') return { analisis: `La operación destruye ${col(Math.abs(v))} de valor: la utilidad operativa no alcanza a remunerar el capital invertido al ${pct(p.costoCapital)}.`, accion: 'Mejorar la utilidad operativa o reducir el capital inmovilizado (inventarios, cuentas por cobrar o activos ociosos).' };
      return { analisis: 'La operación apenas cubre el costo del capital.' };
    },
  },
  {
    id: 'z-altman',
    categoria: 'valor',
    nombre: 'Calificación Z″ de Altman (riesgo de insolvencia)',
    unidad: 'puntos',
    formula: 'Z″ = 6,56·X1 + 3,26·X2 + 6,72·X3 + 1,05·X4; X1 = capital de trabajo ÷ activo; X2 = utilidades retenidas ÷ activo; X3 = UAII anualizada ÷ activo; X4 = patrimonio ÷ pasivo',
    mide: 'Combina liquidez, utilidades acumuladas, rentabilidad operativa y solvencia en un solo puntaje que discrimina entre empresas sanas y en riesgo de insolvencia. La versión Z″ es la que Altman propone para empresas no manufactureras y de mercados emergentes.',
    interpretacion: 'Es un modelo estadístico de calificación de crédito: útil como alerta temprana, pero no reemplaza el análisis de cada razón. Brealey y Myers advierten que estos índices deben usarse con cautela.',
    referencia: 'Más de 2,6: zona segura; entre 1,1 y 2,6: zona gris; menos de 1,1: zona de riesgo.',
    fuente: FUENTES_INDICADORES.brealeyZ,
    mejorSiSube: true,
    calcular: (b) => {
      if (b.activoTotal <= 0) return { valor: null, calculo: '—', motivo: 'No hay activos al corte.' };
      if (b.pasivoTotal <= 0) return { valor: null, calculo: '—', motivo: 'La empresa no tiene pasivos.', nivelSinValor: 'favorable' };
      const x = [(b.activoCorriente - b.pasivoCorriente) / b.activoTotal, b.utilidadesRetenidas / b.activoTotal, (b.uaii * anual(b)) / b.activoTotal, b.patrimonio / b.pasivoTotal];
      const z = 6.56 * x[0] + 3.26 * x[1] + 6.72 * x[2] + 1.05 * x[3];
      return { valor: z, calculo: `6,56 × ${num(x[0], 3)} + 3,26 × ${num(x[1], 3)} + 6,72 × ${num(x[2], 3)} + 1,05 × ${num(x[3], 3)}` };
    },
    evaluar: (v) => rango(v, 2.6, 1.1),
    analizar: (v, nivel) => {
      if (v === null) return { analisis: 'Sin pasivos no hay riesgo de impago que medir.' };
      if (nivel === 'favorable') return { analisis: `Con ${num(v)} puntos, la empresa está en la zona segura.` };
      if (nivel === 'vigilar') return { analisis: `Con ${num(v)} puntos, la empresa está en la zona gris: no hay señal clara de solidez ni de insolvencia.`, accion: 'Fortalecer el capital de trabajo y las utilidades retenidas.' };
      return { analisis: `Con ${num(v)} puntos, la empresa está en la zona de riesgo de insolvencia.`, accion: 'Elaborar un plan de saneamiento: capitalización, reestructuración de deudas y mejora de márgenes.' };
    },
  },
];

/** ROE = margen neto × rotación de activos × multiplicador del capital (identidad Du Pont, Ross cap. 3). */
export function descomposicionDuPont(b: BaseIndicadores): { margen: number; rotacion: number; multiplicador: number; roe: number; motor: string } | null {
  if (b.ventas <= 0 || b.activoTotal <= 0 || b.patrimonio <= 0) return null;
  const margen = b.utilidadNeta / b.ventas;
  const rotacion = (b.ventas * anual(b)) / b.activoTotal;
  const multiplicador = b.activoTotal / b.patrimonio;
  // El factor que más se aleja de un punto de referencia neutro (5 % de margen, 1 vez de rotación, 1,67 de apalancamiento).
  const pesos = [
    { motor: 'el margen neto (eficiencia operativa)', r: Math.abs(margen) / 0.05 },
    { motor: 'la rotación de activos (uso de los activos)', r: rotacion / 1 },
    { motor: 'el apalancamiento financiero', r: multiplicador / 1.67 },
  ];
  const motor = pesos.reduce((a, x) => (x.r > a.r ? x : a)).motor;
  return { margen, rotacion, multiplicador, roe: margen * rotacion * multiplicador, motor };
}

/** Calcula todos los indicadores; con `anterior` (mismo corte del año previo) añade la tendencia. */
export function indicadoresFinancieros(ef: EstadosFinancieros, opciones: { parametros?: Partial<ParametrosIndicadores>; anterior?: EstadosFinancieros } = {}): Indicador[] {
  const p = { ...PARAMETROS_INDICADORES, ...opciones.parametros };
  const b = baseIndicadores(ef);
  const previa = opciones.anterior && opciones.anterior.situacion.totalActivo !== 0 ? baseIndicadores(opciones.anterior) : null;
  // Sin saldos ni operaciones, «no hay deuda» o «no hay gastos financieros» no son señales favorables.
  const vacia = b.activoTotal === 0 && b.pasivoTotal === 0 && b.ventas === 0 && b.costoVentas === 0 && b.gastosOperacion === 0;
  return DEFINICIONES.map((d) => {
    const r = d.calcular(b, p);
    const nivel = r.valor === null || !Number.isFinite(r.valor) ? (vacia ? 'sin-datos' : r.nivelSinValor ?? 'sin-datos') : d.evaluar(r.valor, b, p);
    const valor = r.valor !== null && Number.isFinite(r.valor) ? r.valor : null;
    const { analisis, accion } = vacia ? { analisis: 'Sin saldos ni operaciones al corte.', accion: undefined } : d.analizar(valor, nivel, b, p, r.motivo);
    const indicador: Indicador = {
      id: d.id, categoria: d.categoria, nombre: d.nombre, unidad: d.unidad, valor, nivel,
      formula: d.formula, calculo: valor === null ? r.calculo : `${r.calculo} = ${formatearIndicador(valor, d.unidad)}`,
      mide: d.mide, interpretacion: d.interpretacion, referencia: d.referencia, analisis, fuente: d.fuente, mejorSiSube: d.mejorSiSube,
      ...(accion && nivel !== 'favorable' ? { accion } : {}),
      ...(r.motivo && valor === null ? { motivo: r.motivo } : {}),
    };
    if (previa) {
      const ant = d.calcular(previa, p).valor;
      indicador.anterior = ant !== null && Number.isFinite(ant) ? ant : null;
      if (valor !== null && indicador.anterior !== null && d.mejorSiSube !== null) {
        const cambio = valor - indicador.anterior;
        const umbral = Math.max(Math.abs(indicador.anterior) * 0.02, d.unidad === 'porcentaje' ? 0.001 : 0.01);
        indicador.tendencia = Math.abs(cambio) < umbral ? 'igual' : (cambio > 0) === d.mejorSiSube ? 'mejora' : 'empeora';
      }
    }
    return indicador;
  });
}

const PUNTOS: Record<NivelIndicador, number | null> = { favorable: 2, vigilar: 1, desfavorable: 0, 'sin-datos': null };

export interface DiagnosticoFinanciero {
  conteo: Record<NivelIndicador, number>;
  categorias: Record<CategoriaIndicador, { nivel: NivelIndicador; texto: string }>;
  resumen: string;
  fortalezas: string[];
  alertas: string[];
  acciones: string[];
}

/** Síntesis del análisis: nivel por categoría, fortalezas, alertas y acciones prioritarias. */
export function diagnosticoFinanciero(indicadores: Indicador[]): DiagnosticoFinanciero {
  const conteo: Record<NivelIndicador, number> = { favorable: 0, vigilar: 0, desfavorable: 0, 'sin-datos': 0 };
  for (const i of indicadores) conteo[i.nivel]++;
  const categorias = {} as DiagnosticoFinanciero['categorias'];
  for (const c of Object.keys(CATEGORIAS_INDICADORES) as CategoriaIndicador[]) {
    const lista = indicadores.filter((i) => i.categoria === c);
    const puntos = lista.map((i) => PUNTOS[i.nivel]).filter((x): x is number => x !== null);
    const promedio = puntos.length ? puntos.reduce((a, x) => a + x, 0) / puntos.length : null;
    const nivel: NivelIndicador = promedio === null ? 'sin-datos' : promedio >= 1.5 ? 'favorable' : promedio >= 0.8 ? 'vigilar' : 'desfavorable';
    const debiles = lista.filter((i) => i.nivel === 'desfavorable').map((i) => i.nombre.toLowerCase());
    const atentos = lista.filter((i) => i.nivel === 'vigilar').map((i) => i.nombre.toLowerCase());
    const texto = nivel === 'sin-datos' ? 'Sin datos suficientes.'
      : debiles.length ? `Puntos débiles: ${debiles.join(', ')}.`
      : atentos.length ? `Sólida en general; vigilar ${atentos.join(', ')}.`
      : 'Todos los indicadores son favorables.';
    categorias[c] = { nivel, texto };
  }
  const evaluados = conteo.favorable + conteo.vigilar + conteo.desfavorable;
  const nombres = (n: NivelIndicador) => (Object.keys(categorias) as CategoriaIndicador[]).filter((c) => categorias[c].nivel === n).map((c) => CATEGORIAS_INDICADORES[c].nombre.toLowerCase());
  const fuertes = nombres('favorable');
  const debiles = nombres('desfavorable');
  const resumen = evaluados === 0
    ? 'Aún no hay movimientos suficientes para calcular los indicadores: registre el balance de apertura y emita o reciba comprobantes.'
    : `De ${evaluados} indicadores evaluados, ${conteo.favorable} son favorables, ${conteo.vigilar} requieren vigilancia y ${conteo.desfavorable} son desfavorables.`
      + (fuertes.length ? ` La empresa muestra fortaleza en ${fuertes.join(' y ')}.` : '')
      + (debiles.length ? ` Las áreas críticas son ${debiles.join(' y ')}.` : conteo.desfavorable ? '' : ' No hay áreas críticas.');
  return {
    conteo,
    categorias,
    resumen,
    fortalezas: indicadores.filter((i) => i.nivel === 'favorable' && i.valor !== null).map((i) => `${i.nombre}: ${formatearIndicador(i.valor, i.unidad)}`),
    alertas: indicadores.filter((i) => i.nivel === 'desfavorable').map((i) => `${i.nombre}: ${i.valor === null ? i.motivo ?? 'N/A' : formatearIndicador(i.valor, i.unidad)}`),
    acciones: indicadores.filter((i) => i.accion && i.nivel === 'desfavorable').concat(indicadores.filter((i) => i.accion && i.nivel === 'vigilar')).map((i) => i.accion as string).filter((a, k, todas) => todas.indexOf(a) === k).slice(0, 6),
  };
}
