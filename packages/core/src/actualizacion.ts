/**
 * Actualización de los Anexos y Estructuras v4.4 («4.4 v2»): bitácora de ajustes al 22/04/2026 del
 * Anexo publicado en la OVi de TRIBU-CR y comunicado DGT "Actualización de los Anexos y Estructuras
 * versión 4.4 y validación de comprobantes electrónicos" (2026). Disponible en STAG y producción
 * desde el 22/04/2026 con uso voluntario; obligatoria desde el 1/11/2026.
 *
 * Criterio del simulador: lo que la actualización PERMITE (códigos nuevos, cédula jurídica
 * alfanumérica, teléfonos especiales) se acepta desde ya; lo que EXIGE genera advertencia antes de
 * la vigencia y error (o rechazo del simulador) desde el 1/11/2026, hora de Costa Rica.
 */
import { VIGENCIA_CODIGOS_ACTUALIZACION, type TipoComprobante } from './catalogos';
import { diaCR } from './fechas';
import type { Comprobante, Referencia } from './tipos';

export const FUENTE_COMUNICADO = 'Comunicado DGT de actualización de Anexos y Estructuras v4.4 (2026)';
/** Anexo 1 actualizado (bitácora de ajustes al 22/04/2026). */
export const FUENTE_V2 = 'Anexos y Estructuras v4.4, bitácora de ajustes al 22/04/2026';
export const FUENTE_V2_REFERENCIA = `${FUENTE_V2}; información de referencia (campos TipoDocIR y Numero)`;

/** ¿Ya rige la actualización? (día calendario de Costa Rica). */
export function actualizacionVigente(ahora: Date = new Date()): boolean {
  return diaCR(ahora) >= VIGENCIA_CODIGOS_ACTUALIZACION;
}

/** Tipos de documento (nota 10) que admite el REP antes y después de la actualización. */
export const REP_TIPOS_DOC_ANTES = ['01', '02', '03', '04', '08'];
export const REP_TIPOS_DOC_V2 = ['01', '04', '07', '08', '10', '20'];

/** Tipos de documento de referencia que se identifican con clave de 50 posiciones. */
export const TIPOS_DOC_CON_CLAVE = ['01', '02', '03', '04', '09', '11', '12', '15'];
/** La actualización agrega la clave obligatoria para los tipos 17 a 20. */
export const TIPOS_DOC_CON_CLAVE_V2 = ['17', '18', '19', '20'];

/**
 * Nota 9: los códigos 13 y 14 reflejan su efecto contable en el período del comprobante modificado;
 * 01, 02, 06 y 12, en el período en que se genera la nota.
 */
export const CODIGOS_PERIODO_ORIGINAL = ['13', '14'];

/** Código de referencia que debe llevar el comprobante nuevo que sustituye a uno anulado (nota 9). */
export const CODIGO_SUSTITUTO: Record<string, string> = { '01': '07', '13': '15' };

/** Referencia de una NC/ND por error material (códigos 13 o 14), si la tiene. */
export function referenciaErrorMaterial(c: { tipo: TipoComprobante; borrador: { referencias: Referencia[] } }): Referencia | undefined {
  if (c.tipo !== 'NC' && c.tipo !== 'ND') return undefined;
  return c.borrador.referencias.find((r) => CODIGOS_PERIODO_ORIGINAL.includes(r.codigo ?? '') && !!r.fechaEmision);
}

/**
 * Período (YYYY-MM) en que se refleja el comprobante. Las NC/ND con los códigos 13 o 14 «deben
 * reflejar su efecto contable en el mismo período del comprobante electrónico que se está
 * modificando»; el resto, en el mes de su emisión.
 */
export function periodoContable(c: { tipo: TipoComprobante; fechaEmision: string; borrador: { referencias: Referencia[] } }): string {
  return (referenciaErrorMaterial(c)?.fechaEmision ?? c.fechaEmision).slice(0, 7);
}

/** Datos mínimos de un comprobante aceptado para verificar las notas que lo referencian. */
export interface DocumentoResumen {
  clave: string;
  tipo: TipoComprobante;
  /** TotalComprobante en colones. */
  totalCRC: number;
  referencias: string[];
  moneda?: string;
  tipoCambio?: number;
  cabys?: string[];
}

export function resumenDocumento(c: Pick<Comprobante, 'clave' | 'tipo' | 'resumen' | 'borrador'>): DocumentoResumen {
  return {
    clave: c.clave,
    tipo: c.tipo,
    totalCRC: c.resumen.totalComprobante * (c.resumen.tipoCambio || 1),
    referencias: c.borrador.referencias.map((r) => r.numero ?? '').filter(Boolean),
    moneda: c.resumen.codigoMoneda,
    tipoCambio: c.resumen.tipoCambio,
    cabys: [...new Set(c.borrador.lineas.map((l) => l.codigoCabys))],
  };
}

/**
 * En las notas de crédito, «el monto del ajuste o la sumatoria de los ajustes, no podrán superar el
 * monto acumulado del comprobante al cual se hace referencia más la suma de las notas de débito que
 * se le hayan generado». Devuelve los documentos que quedarían sobregirados.
 */
export function excesosNotaCredito(nc: DocumentoResumen, aceptados: DocumentoResumen[]): { clave: string; disponible: number }[] {
  if (nc.tipo !== 'NC') return [];
  const excesos: { clave: string; disponible: number }[] = [];
  for (const ref of new Set(nc.referencias)) {
    const original = aceptados.find((d) => d.clave === ref);
    if (!original) continue; // documento externo o no aceptado: no se puede verificar
    const sobre = (tipo: string) => aceptados.filter((d) => d.tipo === tipo && d.clave !== nc.clave && d.referencias.includes(ref));
    const debitos = sobre('ND').reduce((s, d) => s + d.totalCRC, 0);
    const creditos = sobre('NC').reduce((s, d) => s + d.totalCRC, 0);
    const disponible = original.totalCRC + debitos - creditos;
    if (nc.totalCRC - disponible > 0.00001) excesos.push({ clave: ref, disponible: Math.max(0, disponible) });
  }
  return excesos;
}

/**
 * «Se verificará que los datos informativos incluidos correspondan al comprobante de referencia
 * (por ejemplo, encabezado, tipo de cambio, CAByS, entre otros)». El simulador compara la moneda, el
 * tipo de cambio y los CAByS de las notas de crédito y débito con el comprobante que ajustan.
 */
export function diferenciasConReferencia(nota: DocumentoResumen, aceptados: DocumentoResumen[]): string[] {
  if (nota.tipo !== 'NC' && nota.tipo !== 'ND') return [];
  const diferencias: string[] = [];
  for (const ref of new Set(nota.referencias)) {
    const o = aceptados.find((d) => d.clave === ref);
    if (!o) continue;
    if (o.moneda && nota.moneda && o.moneda !== nota.moneda) diferencias.push(`la moneda (${nota.moneda}) difiere de la del comprobante ${ref} (${o.moneda})`);
    else if (o.tipoCambio && nota.tipoCambio && Math.abs(o.tipoCambio - nota.tipoCambio) > 0.00001) {
      diferencias.push(`el tipo de cambio (${nota.tipoCambio}) difiere del comprobante ${ref} (${o.tipoCambio})`);
    }
    const ajenos = (nota.cabys ?? []).filter((c) => !(o.cabys ?? []).includes(c));
    if (ajenos.length && o.cabys?.length) diferencias.push(`los CAByS ${ajenos.join(', ')} no están en el comprobante ${ref}`);
  }
  return diferencias;
}
