export function dinero(valor: number, moneda = 'CRC'): string {
  try {
    return new Intl.NumberFormat('es-CR', { style: 'currency', currency: moneda, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valor);
  } catch {
    return `${moneda} ${valor.toFixed(2)}`;
  }
}

export function numero(valor: number, decimales = 2): string {
  return new Intl.NumberFormat('es-CR', { minimumFractionDigits: decimales, maximumFractionDigits: decimales }).format(valor);
}

/** Muestra una fecha RFC 3339 en hora de Costa Rica. */
export function fechaHora(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('es-CR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Costa_Rica' }).format(d);
}

export function fecha(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00-06:00` : iso);
  return new Intl.DateTimeFormat('es-CR', { dateStyle: 'medium', timeZone: 'America/Costa_Rica' }).format(d);
}

export function descargar(nombre: string, contenido: string | Blob, tipo = 'application/xml'): void {
  const blob = typeof contenido === 'string' ? new Blob([contenido], { type: `${tipo};charset=utf-8` }) : contenido;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** CSV con separador ";" y BOM para que Excel en español lo abra correctamente. */
export function csv(filas: (string | number | undefined | null)[][]): string {
  const esc = (v: string | number | undefined | null) => {
    const s = v === undefined || v === null ? '' : String(v);
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '﻿' + filas.map((f) => f.map(esc).join(';')).join('\r\n');
}

export const ETIQUETA_ESTADO: Record<string, { texto: string; clase: string }> = {
  generado: { texto: 'Generado', clase: '' },
  enviado: { texto: 'Enviado', clase: 'info' },
  recibido: { texto: 'Recibido', clase: 'info' },
  procesando: { texto: 'Procesando', clase: 'warn' },
  aceptado: { texto: 'Aceptado', clase: 'ok' },
  rechazado: { texto: 'Rechazado', clase: 'err' },
  error: { texto: 'Error', clase: 'err' },
  pendiente: { texto: 'Pendiente', clase: 'warn' },
  'aceptado-parcial': { texto: 'Aceptado parcial', clase: 'info' },
};
