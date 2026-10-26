/**
 * Actualización de los Anexos y Estructuras v4.4 («4.4 v2»): comunicado DGT "Actualización de los
 * Anexos y Estructuras versión 4.4 y validación de comprobantes electrónicos" (2026). Disponible en
 * STAG y producción desde el 22/04/2026 con uso voluntario; obligatoria desde el 1/11/2026.
 *
 * Criterio del simulador: lo que la actualización PERMITE (códigos nuevos, cédula jurídica
 * alfanumérica, teléfonos cortos) se acepta desde ya; lo que EXIGE genera advertencia antes de la
 * vigencia y error (o rechazo del simulador) desde el 1/11/2026, hora de Costa Rica.
 */
import { VIGENCIA_CODIGOS_ACTUALIZACION, type TipoComprobante } from './catalogos';
import { diaCR } from './fechas';
import type { Comprobante, Referencia } from './tipos';

export const FUENTE_COMUNICADO = 'Comunicado DGT de actualización de Anexos y Estructuras v4.4 (2026)';
/** Reglas que el comunicado no transcribe; se toman del resumen técnico publicado por FACBOX (2026). */
export const FUENTE_V2 = 'Anexos y Estructuras v4.4 actualizado, según resumen técnico de FACBOX (2026); verificar con el Anexo oficial';

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

/** Códigos de la nota 9 cuyo efecto contable se refleja en el período del comprobante modificado. */
export const CODIGOS_PERIODO_ORIGINAL = ['13', '14'];

/** Referencia de una NC/ND por error material (códigos 13 o 14), si la tiene. */
export function referenciaErrorMaterial(c: { tipo: TipoComprobante; borrador: { referencias: Referencia[] } }): Referencia | undefined {
  if (c.tipo !== 'NC' && c.tipo !== 'ND') return undefined;
  return c.borrador.referencias.find((r) => CODIGOS_PERIODO_ORIGINAL.includes(r.codigo ?? '') && !!r.fechaEmision);
}

/**
 * Período (YYYY-MM) en que se refleja el comprobante. Las NC/ND con los códigos 13 o 14 «deben
 * reflejar su efecto contable en el mismo periodo del comprobante que modifican»; el resto, en el
 * mes de su emisión.
 */
export function periodoContable(c: { tipo: TipoComprobante; fechaEmision: string; borrador: { referencias: Referencia[] } }): string {
  return (referenciaErrorMaterial(c)?.fechaEmision ?? c.fechaEmision).slice(0, 7);
}

/** Datos mínimos de un comprobante aceptado para validar el saldo de las notas de crédito. */
export interface DocumentoResumen {
  clave: string;
  tipo: TipoComprobante;
  /** TotalComprobante en colones. */
  totalCRC: number;
  referencias: string[];
}

export function resumenDocumento(c: Pick<Comprobante, 'clave' | 'tipo' | 'resumen' | 'borrador'>): DocumentoResumen {
  return {
    clave: c.clave,
    tipo: c.tipo,
    totalCRC: c.resumen.totalComprobante * (c.resumen.tipoCambio || 1),
    referencias: c.borrador.referencias.map((r) => r.numero ?? '').filter(Boolean),
  };
}

/**
 * Una nota de crédito no puede superar el monto acumulado del documento que referencia más las
 * notas de débito aplicadas a él. Devuelve los documentos que quedarían sobregirados.
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
