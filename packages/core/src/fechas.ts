/** Costa Rica usa UTC-06:00 sin horario de verano. */
const OFFSET_MIN = -6 * 60;

function pad(n: number, len = 2): string {
  return String(n).padStart(len, '0');
}

/** Partes de calendario de la fecha en hora de Costa Rica. */
export function partesCostaRica(fecha: Date) {
  const local = new Date(fecha.getTime() + OFFSET_MIN * 60_000);
  return {
    anio: local.getUTCFullYear(),
    mes: local.getUTCMonth() + 1,
    dia: local.getUTCDate(),
    hora: local.getUTCHours(),
    minuto: local.getUTCMinutes(),
    segundo: local.getUTCSeconds(),
  };
}

/** Formato RFC 3339 exigido en FechaEmision: YYYY-MM-DDThh:mm:ss-06:00. */
export function fechaEmisionCR(fecha: Date = new Date()): string {
  const p = partesCostaRica(fecha);
  return `${p.anio}-${pad(p.mes)}-${pad(p.dia)}T${pad(p.hora)}:${pad(p.minuto)}:${pad(p.segundo)}-06:00`;
}

export const REGEX_FECHA_RFC3339 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

/** Fecha de calendario (YYYY-MM-DD) en Costa Rica. */
export function diaCR(fecha: Date): string {
  const p = partesCostaRica(fecha);
  return `${p.anio}-${pad(p.mes)}-${pad(p.dia)}`;
}

function esHabil(fecha: Date, feriados: Set<string>): boolean {
  const dow = fecha.getUTCDay();
  if (dow === 0 || dow === 6) return false;
  return !feriados.has(fecha.toISOString().slice(0, 10));
}

/**
 * Último día del plazo de confirmación del receptor (art. 10, MH-DGT-RES-0027-2024):
 * 8 días hábiles contados a partir del primer día del mes siguiente a la transacción.
 * Excluye sábados, domingos y los feriados que se indiquen (YYYY-MM-DD); la lista de
 * feriados es configurable porque la bibliografía analizada no la fija.
 */
export function limiteConfirmacionReceptor(fechaTransaccion: Date, feriados: string[] = [], dias = 8): string {
  const p = partesCostaRica(fechaTransaccion);
  const cursor = new Date(Date.UTC(p.anio, p.mes, 1)); // mes siguiente (getUTCMonth es 0-based)
  const set = new Set(feriados);
  let contados = 0;
  for (;;) {
    if (esHabil(cursor, set)) {
      contados++;
      if (contados === dias) return cursor.toISOString().slice(0, 10);
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
}

/**
 * Fecha límite para enviar un comprobante generado "sin internet" (situación 3):
 * a más tardar dos días hábiles después de su generación (art. 21, Decreto 44739-H).
 */
export function limiteEnvioSinInternet(fechaGeneracion: Date, feriados: string[] = []): string {
  const p = partesCostaRica(fechaGeneracion);
  const cursor = new Date(Date.UTC(p.anio, p.mes - 1, p.dia));
  const set = new Set(feriados);
  let contados = 0;
  while (contados < 2) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    if (esHabil(cursor, set)) contados++;
  }
  return cursor.toISOString().slice(0, 10);
}
