import { CODIGO_TIPO_DOCUMENTO, type TipoComprobante, type TipoMensajeReceptor } from './catalogos';
import { partesCostaRica } from './fechas';
import type { Identificacion } from './tipos';

/**
 * Numeración consecutiva de 20 dígitos (Nota 3 del Anexo 1 v4.4):
 * sucursal (3) + terminal (5) + tipo de comprobante (2) + número (10).
 */
export function generarConsecutivo(
  sucursal: string,
  terminal: string,
  tipo: TipoComprobante | TipoMensajeReceptor,
  numero: number,
): string {
  if (!/^\d{1,3}$/.test(sucursal)) throw new Error('La sucursal debe tener hasta 3 dígitos.');
  if (!/^\d{1,5}$/.test(terminal)) throw new Error('La terminal debe tener hasta 5 dígitos.');
  if (!Number.isInteger(numero) || numero < 1 || numero > 9_999_999_999) {
    throw new Error('El número consecutivo debe estar entre 1 y 9999999999.');
  }
  return sucursal.padStart(3, '0') + terminal.padStart(5, '0') + CODIGO_TIPO_DOCUMENTO[tipo] + String(numero).padStart(10, '0');
}

/** Siguiente número; al llegar al tope se reinicia en 1 (Nota 3). */
export function siguienteNumero(ultimo: number): number {
  return ultimo >= 9_999_999_999 ? 1 : ultimo + 1;
}

/**
 * Clave de 50 posiciones. La actualización v4.4 admite letras en la identificación (cédulas
 * jurídicas alfanuméricas del Registro Nacional), por lo que la clave puede contenerlas.
 */
export const REGEX_CLAVE = /^[0-9A-Z]{50}$/;

/**
 * Identificación de 12 posiciones para la clave (Nota 4.1): se completa con ceros a la izquierda
 * (3 ceros cédula física, 2 jurídica y NITE, 1 DIMEX de 11 dígitos).
 */
export function identificacionParaClave(id: Identificacion): string {
  const limpio = id.numero.toUpperCase().replace(/[^0-9A-Z]/g, '');
  if (limpio.length === 0 || limpio.length > 12) {
    throw new Error('La identificación del emisor no puede representarse en 12 posiciones para la clave.');
  }
  return limpio.padStart(12, '0');
}

/** Código de seguridad de 8 dígitos generado por el sistema del obligado tributario. */
export function generarCodigoSeguridad(): string {
  const bytes = new Uint32Array(1);
  globalThis.crypto.getRandomValues(bytes);
  return String(bytes[0] % 100_000_000).padStart(8, '0');
}

export interface PartesClave {
  pais: string;
  dia: string;
  mes: string;
  anio: string;
  identificacion: string;
  consecutivo: string;
  situacion: string;
  codigoSeguridad: string;
}

/**
 * Clave numérica de 50 dígitos (art. 3 MH-DGT-RES-0027-2024; Nota 3 del Anexo):
 * 506 + día(2) + mes(2) + año(2) + identificación(12) + consecutivo(20) + situación(1) + seguridad(8).
 */
export function generarClave(params: {
  fecha: Date;
  identificacion: Identificacion;
  consecutivo: string;
  situacion: '1' | '2' | '3';
  codigoSeguridad: string;
}): string {
  const { fecha, identificacion, consecutivo, situacion, codigoSeguridad } = params;
  if (!/^\d{20}$/.test(consecutivo)) throw new Error('El consecutivo debe tener 20 dígitos.');
  if (!/^\d{8}$/.test(codigoSeguridad)) throw new Error('El código de seguridad debe tener 8 dígitos.');
  const p = partesCostaRica(fecha);
  const clave =
    '506' +
    String(p.dia).padStart(2, '0') +
    String(p.mes).padStart(2, '0') +
    String(p.anio % 100).padStart(2, '0') +
    identificacionParaClave(identificacion) +
    consecutivo +
    situacion +
    codigoSeguridad;
  if (!REGEX_CLAVE.test(clave)) throw new Error(`Clave inválida (${clave.length} posiciones).`);
  return clave;
}

export function descomponerClave(clave: string): PartesClave | null {
  if (!REGEX_CLAVE.test(clave)) return null;
  return {
    pais: clave.slice(0, 3),
    dia: clave.slice(3, 5),
    mes: clave.slice(5, 7),
    anio: clave.slice(7, 9),
    identificacion: clave.slice(9, 21),
    consecutivo: clave.slice(21, 41),
    situacion: clave.slice(41, 42),
    codigoSeguridad: clave.slice(42, 50),
  };
}

export function descomponerConsecutivo(consecutivo: string) {
  if (!/^\d{20}$/.test(consecutivo)) return null;
  return {
    sucursal: consecutivo.slice(0, 3),
    terminal: consecutivo.slice(3, 8),
    tipoDocumento: consecutivo.slice(8, 10),
    numero: Number(consecutivo.slice(10)),
  };
}

/** Verifica estructura y coherencia interna de la clave (notas 1, 3 y 4.1). */
export function validarClave(clave: string, esperado?: { fechaEmision?: string; consecutivo?: string }): string[] {
  const errores: string[] = [];
  const p = descomponerClave(clave);
  if (!p) return ['La clave debe tener exactamente 50 posiciones (dígitos, o letras de una cédula jurídica alfanumérica).'];
  if (p.pais !== '506') errores.push('Los tres primeros dígitos de la clave deben ser 506.');
  const dia = Number(p.dia);
  const mes = Number(p.mes);
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) errores.push('La fecha contenida en la clave no es válida.');
  if (!['1', '2', '3'].includes(p.situacion)) errores.push('La situación del comprobante (posición 42) debe ser 1, 2 o 3.');
  if (!descomponerConsecutivo(p.consecutivo)) errores.push('El consecutivo contenido en la clave no es válido.');
  if (esperado?.consecutivo && esperado.consecutivo !== p.consecutivo) {
    errores.push('El consecutivo de la clave no coincide con NumeroConsecutivo.');
  }
  if (esperado?.fechaEmision) {
    const [a, m, d] = esperado.fechaEmision.slice(0, 10).split('-');
    if (a.slice(2) !== p.anio || m !== p.mes || d !== p.dia) {
      errores.push('La fecha de la clave no coincide con FechaEmision.');
    }
  }
  return errores;
}
