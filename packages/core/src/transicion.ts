/**
 * Transición a la NIIF para las PYMES, tercera edición (febrero de 2025). Hay dos caminos y no se mezclan:
 *
 * - Primera adopción (Sección 35): la entidad viene de otro marco (PCGA locales, base fiscal, caja). Prepara
 *   el estado de situación financiera de apertura en la fecha de transición, con las excepciones
 *   obligatorias del párrafo 35.9 y las exenciones optativas del 35.10, y concilia el patrimonio y el
 *   resultado (35.13).
 * - Cambio de edición (Apéndice A): la entidad ya aplicaba la segunda edición (2015). Aplica la tercera
 *   retroactivamente según la Sección 10, salvo los tratamientos de los párrafos A3 a A49 (varios
 *   prospectivos). No usa la Sección 35.
 *
 * Los contenidos se tomaron del texto oficial en español de la tercera edición; la guía AIC-CILEA de
 * implementación (octubre de 2026) se usa como referencia metodológica, corregida donde difiere de la Norma.
 */
import Decimal from 'decimal.js';
import { VIGENCIA_NIIF_2025 } from './cuentas';

export type ModoTransicion = 'primera-adopcion' | 'cambio-edicion';

export interface ItemTransicion {
  codigo: string;
  titulo: string;
  parrafo: string;
  detalle: string;
}

/** Párrafo 35.9: lo que el adoptante por primera vez NO puede cambiar retroactivamente. */
export const EXCEPCIONES_35_9: ItemTransicion[] = [
  { codigo: 'a', titulo: 'Baja en cuentas de activos y pasivos financieros', parrafo: '35.9(a)', detalle: 'Lo dado de baja según el marco anterior antes de la fecha de transición no se vuelve a reconocer. Si la Norma lo habría dado de baja y el marco anterior no, se puede darlo de baja al adoptar o mantenerlo hasta su disposición o liquidación.' },
  { codigo: 'b', titulo: 'Contabilidad de coberturas', parrafo: '35.9(b)', detalle: 'No se cambia la contabilidad de coberturas de relaciones que ya no existen; las vigentes siguen la Parte II de la Sección 11.' },
  { codigo: 'c', titulo: 'Estimaciones contables', parrafo: '35.9(c)', detalle: 'Las estimaciones en la fecha de transición son coherentes con las del marco anterior (vidas útiles, valores residuales, porcentajes de incobrables), salvo evidencia objetiva de error. No se rehacen con información posterior.' },
  { codigo: 'd', titulo: 'Operaciones discontinuadas', parrafo: '35.9(d)', detalle: 'No se reclasifican retroactivamente.' },
  { codigo: 'e', titulo: 'Medición de participaciones no controladoras', parrafo: '35.9(e)', detalle: 'La distribución del resultado entre controladora y no controladoras (párrafo 5.6) se aplica de forma prospectiva desde la fecha de transición.' },
  { codigo: 'f', titulo: 'Préstamos del gobierno', parrafo: '35.9(f)', detalle: 'Las Secciones 11 y 24 se aplican de forma prospectiva: se usa el importe en libros anterior y no se reconoce como subvención el beneficio de una tasa inferior a la de mercado.' },
  { codigo: 'g', titulo: 'Contratos completados con clientes', parrafo: '35.9(g)', detalle: 'Los contratos en los que ya se transfirieron todos los bienes o servicios antes de la fecha de transición no se reexpresan (excepción nueva de la tercera edición).' },
];

/** Párrafo 35.10: exenciones que el adoptante por primera vez puede elegir, partida por partida. */
export const EXENCIONES_35_10: ItemTransicion[] = [
  { codigo: 'a', titulo: 'Combinaciones de negocios', parrafo: '35.10(a)', detalle: 'No aplicar la Sección 19 a combinaciones anteriores a la fecha de transición. Si se reexpresa una, se reexpresan todas las posteriores.' },
  { codigo: 'b', titulo: 'Pagos basados en acciones', parrafo: '35.10(b)', detalle: 'No aplicar la Sección 26 a instrumentos concedidos o pasivos liquidados antes de la fecha de transición.' },
  { codigo: 'c', titulo: 'Valor razonable como costo atribuido', parrafo: '35.10(c)', detalle: 'Medir una partida de propiedades, planta y equipo, propiedad de inversión o intangible a su valor razonable en la fecha de transición y usarlo como costo atribuido.' },
  { codigo: 'd', titulo: 'Revaluación como costo atribuido', parrafo: '35.10(d)', detalle: 'Usar una revaluación del marco anterior, en la fecha de transición o antes, como costo atribuido (también mediciones a valor razonable derivadas de un suceso).' },
  { codigo: 'e', titulo: 'Diferencias de conversión acumuladas', parrafo: '35.10(e)', detalle: 'Considerar nulas las diferencias de conversión de todos los negocios en el extranjero en la fecha de transición.' },
  { codigo: 'f', titulo: 'Estados financieros separados', parrafo: '35.10(f)', detalle: 'Medir al costo las inversiones en subsidiarias, asociadas y entidades controladas conjuntamente: costo de la Sección 9 o costo atribuido (valor razonable o importe en libros anterior).' },
  { codigo: 'g', titulo: 'Instrumentos financieros compuestos', parrafo: '35.10(g)', detalle: 'No separar pasivo y patrimonio si el componente de pasivo ya no existe en la fecha de transición.' },
  { codigo: 'h', titulo: 'Impuestos diferidos', parrafo: '35.10(h)', detalle: 'Aplicar la Sección 29 de forma prospectiva desde la fecha de transición, aplicando retroactivamente la excepción del párrafo 29.3A.' },
  { codigo: 'i', titulo: 'Acuerdos de concesión de servicios', parrafo: '35.10(i)', detalle: 'No aplicar los párrafos 34.12 a 34.16 a acuerdos anteriores a la fecha de transición.' },
  { codigo: 'j', titulo: 'Actividades de extracción', parrafo: '35.10(j)', detalle: 'Con contabilidad de costo completo, medir los activos de petróleo y gas por el importe anterior y probar su deterioro.' },
  { codigo: 'k', titulo: 'Acuerdos que contienen un arrendamiento', parrafo: '35.10(k)', detalle: 'Evaluar si un acuerdo vigente contiene un arrendamiento con los hechos de la fecha de transición.' },
  { codigo: 'l', titulo: 'Pasivos por desmantelamiento en el costo de PPE', parrafo: '35.10(l)', detalle: 'Medir ese componente del costo en la fecha de transición, no cuando surgió la obligación.' },
  { codigo: 'm', titulo: 'Operaciones sujetas a regulación de tarifas', parrafo: '35.10(m)', detalle: 'Usar el importe en libros anterior de PPE o intangibles como costo atribuido y probar su deterioro.' },
  { codigo: 'n', titulo: 'Hiperinflación grave', parrafo: '35.10(n)', detalle: 'Medir activos y pasivos a valor razonable como costo atribuido cuando la moneda funcional estuvo sujeta a hiperinflación grave.' },
  { codigo: 'o', titulo: 'Ingresos de actividades ordinarias', parrafo: '35.10(o)', detalle: 'Aplicar la Sección 23 de forma retroactiva o prospectiva, según el párrafo A27, tomando como fecha de aplicación inicial la fecha de transición.' },
];

export type TratamientoApendiceA = 'retroactivo' | 'prospectivo' | 'a elección';

export interface AlivioApendiceA {
  seccion: number;
  tema: string;
  tratamiento: TratamientoApendiceA;
  detalle: string;
}

/** Apéndice A, párrafos A3 a A49: cómo pasa de la segunda a la tercera edición quien ya aplicaba la Norma. */
export const APENDICE_A: AlivioApendiceA[] = [
  { seccion: 3, tema: 'Materialidad o importancia relativa', tratamiento: 'prospectivo', detalle: 'Párrafos 3.15A a 3.16 desde la fecha de aplicación inicial.' },
  { seccion: 9, tema: 'Modelo de control', tratamiento: 'retroactivo', detalle: 'Si cambia el perímetro de consolidación se ajusta el año inmediato anterior (con alivios si es impracticable). No se reexpresan pérdidas de control anteriores.' },
  { seccion: 11, tema: 'Entidades que aplicaban la NIC 39', tratamiento: 'retroactivo', detalle: 'Se elimina la opción de la NIC 39: clasificación según los hechos de la fecha de aplicación inicial; coberturas de forma prospectiva.' },
  { seccion: 12, tema: 'Medición del valor razonable', tratamiento: 'prospectivo', detalle: 'La nueva Sección 12 y el párrafo 2.89 se aplican desde la fecha de aplicación inicial; sus revelaciones no se exigen para comparativos.' },
  { seccion: 15, tema: 'Acuerdos conjuntos', tratamiento: 'retroactivo', detalle: 'Solo se revela el ajuste por partida del año inmediato anterior.' },
  { seccion: 16, tema: 'Propiedades de inversión', tratamiento: 'prospectivo', detalle: 'El párrafo 16.3A rige para adquisiciones desde la fecha de aplicación inicial; en esa fecha se reevalúa la clasificación por cambio de uso (16.9).' },
  { seccion: 17, tema: 'Depreciación', tratamiento: 'prospectivo', detalle: 'Párrafos 17.21 y 17.22 (método basado en ingresos no apropiado) desde la fecha de aplicación inicial.' },
  { seccion: 18, tema: 'Amortización de intangibles', tratamiento: 'prospectivo', detalle: 'Párrafo 18.22A desde la fecha de aplicación inicial.' },
  { seccion: 19, tema: 'Combinaciones de negocios', tratamiento: 'prospectivo', detalle: 'La Sección 19 revisada solo para adquisiciones desde la fecha de aplicación inicial; no se ajustan combinaciones anteriores.' },
  { seccion: 23, tema: 'Ingresos de contratos con clientes', tratamiento: 'a elección', detalle: 'Retroactivo según la Sección 10 con las exenciones del A28 (contratos completados, contraprestación variable, modificaciones) o prospectivo para contratos que comiencen después de la fecha de aplicación inicial.' },
  { seccion: 26, tema: 'Pagos basados en acciones', tratamiento: 'prospectivo', detalle: 'Alcance, valor razonable, condiciones de irrevocabilidad y liquidación neta por retenciones de forma prospectiva, con nueva medición de pasivos no consolidados.' },
  { seccion: 28, tema: 'Simplificación de beneficios definidos', tratamiento: 'retroactivo', detalle: 'Párrafo 28.19 retroactivo, sin ajustar activos de otras secciones que incluyeron esos costos.' },
  { seccion: 29, tema: 'Impuestos diferidos e incertidumbre fiscal', tratamiento: 'retroactivo', detalle: 'Pérdidas no realizadas (29.16A, 29.19A) y tratamientos inciertos (29.34A a 29.34D); si es impracticable, efecto acumulado en las ganancias acumuladas.' },
  { seccion: 30, tema: 'Ausencia de convertibilidad y anticipos', tratamiento: 'prospectivo', detalle: 'El 30.5A no se aplica retroactivamente; el 30.8A puede aplicarse prospectivamente.' },
  { seccion: 34, tema: 'Plantas productoras', tratamiento: 'a elección', detalle: 'Pueden medirse a valor razonable como costo atribuido al comienzo del primer periodo presentado.' },
];

export type NaturalezaCambio = 'sustancial' | 'aclaracion' | 'redaccion' | 'sin cambios';

/** Resumen oficial de modificaciones de la tercera edición por sección («Principales cambios», 1 a 105). */
export const CAMBIOS_TERCERA_EDICION: Record<number, { naturaleza: NaturalezaCambio; resumen: string }> = {
  1: { naturaleza: 'aclaracion', resumen: 'Aclara la definición de «obligación pública de rendir cuentas» (1.3(b)).' },
  2: { naturaleza: 'sustancial', resumen: 'Revisada para alinearse con el Marco Conceptual de 2018 (definiciones de activo y pasivo).' },
  3: { naturaleza: 'aclaracion', resumen: 'Materialidad, orden de notas, subtotales y desagregación; información material sobre políticas contables.' },
  4: { naturaleza: 'aclaracion', resumen: 'Desglose de partidas cuando sea relevante; elimina el desglose de ingresos devengados no facturados.' },
  5: { naturaleza: 'redaccion', resumen: 'Solo modificaciones de redacción.' },
  6: { naturaleza: 'aclaracion', resumen: 'Revelar dividendos propuestos o declarados no reconocidos.' },
  7: { naturaleza: 'sustancial', resumen: 'Conciliación de pasivos por actividades de financiación (7.19A) y acuerdos de financiación de proveedores (7.19B-C).' },
  8: { naturaleza: 'aclaracion', resumen: 'Información material sobre políticas contables y ejemplos de juicios significativos.' },
  9: { naturaleza: 'sustancial', resumen: 'Nueva definición de control (NIIF 10), pérdida de control con medición a valor razonable de la participación retenida.' },
  10: { naturaleza: 'aclaracion', resumen: 'Definición de «estimación contable» para distinguirla de las políticas contables.' },
  11: { naturaleza: 'sustancial', resumen: 'Une las antiguas Secciones 11 y 12; elimina la opción de la NIC 39; principio complementario de flujos contractuales (11.9ZA); revelar antigüedad de activos y vencimientos de pasivos financieros. Mantiene el modelo de pérdida incurrida.' },
  12: { naturaleza: 'sustancial', resumen: 'Sección nueva: medición del valor razonable con jerarquía de tres niveles.' },
  13: { naturaleza: 'aclaracion', resumen: 'Modificaciones consiguientes de la Sección 23 revisada.' },
  14: { naturaleza: 'aclaracion', resumen: 'Participaciones a largo plazo que forman parte de la inversión neta en la asociada.' },
  15: { naturaleza: 'sustancial', resumen: 'Pasa a «Acuerdos conjuntos»; control conjunto alineado con la Sección 9; quien no tiene control conjunto contabiliza según el tipo de acuerdo.' },
  16: { naturaleza: 'aclaracion', resumen: 'Aplicación separada de las Secciones 16 y 19; transferencias solo con evidencia de cambio de uso; revelaciones de valor razonable a la Sección 12.' },
  17: { naturaleza: 'aclaracion', resumen: 'Plantas productoras dentro del alcance; depreciación basada en ingresos no es apropiada; factores de vida útil.' },
  18: { naturaleza: 'aclaracion', resumen: 'Presunción refutable de que la amortización basada en ingresos no es apropiada.' },
  19: { naturaleza: 'sustancial', resumen: 'Alineada con la NIIF 3 (2008) y la definición de negocio (2018): método de la adquisición.' },
  20: { naturaleza: 'redaccion', resumen: 'Solo modificaciones de redacción: se mantiene el modelo operativo/financiero (no se alinea con la NIIF 16).' },
  21: { naturaleza: 'aclaracion', resumen: 'Definición de pasivo; garantías financieras gratuitas dentro del grupo; costos de reestructuración.' },
  22: { naturaleza: 'aclaracion', resumen: 'Contraprestación contingente y exención de presentar el importe por cobrar como menor patrimonio.' },
  23: { naturaleza: 'sustancial', resumen: 'Reescrita conforme a la NIIF 15: modelo de cinco pasos para contratos con clientes.' },
  24: { naturaleza: 'redaccion', resumen: 'Solo modificaciones de redacción.' },
  25: { naturaleza: 'redaccion', resumen: 'Solo modificaciones de redacción.' },
  26: { naturaleza: 'sustancial', resumen: 'Alcance, condiciones de rendimiento y de servicio, pagos en efectivo y liquidación neta por retenciones.' },
  27: { naturaleza: 'aclaracion', resumen: 'Modificaciones consiguientes de las Secciones 12 y 23.' },
  28: { naturaleza: 'aclaracion', resumen: 'Mercado de bonos por moneda, simplificación de medición, beneficios por terminación y revelaciones más detalladas.' },
  29: { naturaleza: 'sustancial', resumen: 'Incertidumbre frente a tratamientos impositivos (29.34A a 29.34D), activos diferidos por pérdidas no realizadas y compensación.' },
  30: { naturaleza: 'sustancial', resumen: 'Ausencia de convertibilidad entre monedas y tasa para anticipos en moneda extranjera.' },
  31: { naturaleza: 'redaccion', resumen: 'Solo modificaciones de redacción.' },
  32: { naturaleza: 'sin cambios', resumen: 'No modificada.' },
  33: { naturaleza: 'aclaracion', resumen: 'Servicios de gestión clave por entidad separada, compromisos y entidades relacionadas con el gobierno.' },
  34: { naturaleza: 'aclaracion', resumen: 'Plantas productoras, activos de exploración como clase separada; valor razonable remite a la Sección 12.' },
  35: { naturaleza: 'sustancial', resumen: 'Nueva excepción para contratos completados (35.9(g)) y opción retroactiva o prospectiva para la Sección 23 (35.10(o)).' },
};

export interface FechasTransicion {
  modo: ModoTransicion;
  /** Primera adopción: comienzo del primer periodo comparativo. Cambio de edición: fecha de aplicación inicial. */
  fechaClave: string;
  inicioComparativo: string;
  cierrePrimerEjercicio: string;
  anticipada: boolean;
}

/** Fechas de la transición para ejercicios anuales de enero a diciembre, con un año comparativo (3.14). */
export function fechasTransicion(modo: ModoTransicion, primerEjercicio: number): FechasTransicion {
  const inicio = `${primerEjercicio}-01-01`;
  const comparativo = `${primerEjercicio - 1}-01-01`;
  return {
    modo,
    fechaClave: modo === 'primera-adopcion' ? comparativo : inicio,
    inicioComparativo: comparativo,
    cierrePrimerEjercicio: `${primerEjercicio}-12-31`,
    anticipada: inicio < VIGENCIA_NIIF_2025,
  };
}

export type NaturalezaAjuste = 'reconocimiento' | 'baja' | 'reclasificacion' | 'medicion';

export interface AjusteTransicion {
  ref: string;
  concepto: string;
  seccion: number;
  naturaleza: NaturalezaAjuste;
  /** Efecto en el patrimonio: positivo lo aumenta, negativo lo disminuye. */
  efecto: number;
  /** Cambia vidas útiles, valores residuales u otra estimación: choca con el 35.9(c) salvo error. */
  cambioEstimacion?: boolean;
}

export interface DecisionExencion {
  aplica: boolean;
  justificacion?: string;
}

export interface ConfigTransicion {
  modo: ModoTransicion;
  primerEjercicio: number;
  obligacionPublica?: boolean;
  granContribuyente?: boolean;
  /** Decisiones sobre las exenciones del 35.10, por letra. */
  exenciones?: Record<string, DecisionExencion>;
  /** Cambio de edición: la Sección 23 se aplica de forma retroactiva o prospectiva (A27). */
  seccion23?: 'retroactiva' | 'prospectiva';
  /** Matriz de brechas por sección (Formulario B de la guía). */
  brechas?: Record<number, { aplica?: boolean; brecha?: boolean; prioridad?: 'alta' | 'media' | 'baja' }>;
  patrimonioAnterior?: number;
  ajustes?: AjusteTransicion[];
}

export function conciliarPatrimonio(patrimonioAnterior: number, ajustes: AjusteTransicion[]): { totalAjustes: number; patrimonioNiif: number } {
  const total = ajustes.reduce((t, a) => t.plus(a.efecto || 0), new Decimal(0));
  return { totalAjustes: total.toDecimalPlaces(2).toNumber(), patrimonioNiif: total.plus(patrimonioAnterior || 0).toDecimalPlaces(2).toNumber() };
}

export interface AvisoTransicion {
  nivel: 'error' | 'advertencia';
  mensaje: string;
  fuente: string;
}

/** Revisión de coherencia de la transición: marco aplicable, camino correcto y uso de las exenciones. */
export function revisarTransicion(c: ConfigTransicion): AvisoTransicion[] {
  const avisos: AvisoTransicion[] = [];
  const err = (mensaje: string, fuente: string) => avisos.push({ nivel: 'error', mensaje, fuente });
  const adv = (mensaje: string, fuente: string) => avisos.push({ nivel: 'advertencia', mensaje, fuente });
  if (c.obligacionPublica) err('Una entidad con obligación pública de rendir cuentas no puede aplicar la NIIF para las PYMES: le corresponden las NIIF completas.', 'Sección 1, párrafos 1.2 y 1.3');
  if (c.granContribuyente) err('Los Grandes Contribuyentes Nacionales deben llevar registros conforme a las NIIF completas para efectos fiscales.', 'Oficio MH-DGT-OF-0201-2025; comunicado CCPCR DE-0028-2025');
  const exenciones = Object.entries(c.exenciones ?? {}).filter(([, d]) => d.aplica);
  if (c.modo === 'cambio-edicion' && exenciones.length) {
    err('Las exenciones del párrafo 35.10 son solo para quien adopta la Norma por primera vez. Quien ya aplicaba la segunda edición sigue el Apéndice A y la Sección 10.', 'Apéndice A, párrafos A1 a A49; Sección 35, párrafo 35.10');
  }
  for (const [codigo, d] of exenciones) {
    if (!d.justificacion?.trim()) adv(`Exención 35.10(${codigo}): documente la justificación y su efecto; la decisión es partida por partida.`, 'Sección 35, párrafo 35.10');
  }
  for (const a of c.ajustes ?? []) {
    if (!a.cambioEstimacion) continue;
    if (c.modo === 'primera-adopcion') {
      adv(`${a.ref || a.concepto}: la Norma no permite rehacer estimaciones en la fecha de transición (vidas útiles, valores residuales, porcentajes) salvo evidencia objetiva de error. Documente el error o use la exención de costo atribuido (35.10(c)).`, 'Sección 35, párrafo 35.9(c)');
    } else {
      adv(`${a.ref || a.concepto}: un cambio de estimación se aplica de forma prospectiva, no como ajuste de transición.`, 'Sección 10, párrafos 10.16 y 10.17');
    }
  }
  if (c.modo === 'primera-adopcion' && (c.ajustes?.length ?? 0) > 0 && c.patrimonioAnterior === undefined) {
    adv('Indique el patrimonio según el marco anterior para conciliarlo con el de la NIIF para las PYMES.', 'Sección 35, párrafo 35.13(b)');
  }
  return avisos;
}
