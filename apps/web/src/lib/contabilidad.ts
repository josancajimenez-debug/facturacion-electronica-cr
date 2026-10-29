import {
  POLITICAS_PREDETERMINADAS,
  completarLibro,
  esCabysServicio,
  generarLibroDiario,
  type AperturaContable,
  type ConfigCierre,
  type ConfigTransicion,
  type DetalleCierre,
  type LibroDiario,
  type PoliticasContables,
} from '@fe-cr/core';
import { useCallback, useMemo, useState } from 'react';
import { ERROR_ALMACENAMIENTO } from '../backend/local';
import { useApp } from '../estado';

export interface ConfigContable {
  politicas: PoliticasContables;
  apertura?: AperturaContable;
  /** Plan de transición a la tercera edición (Sección 35 o Apéndice A). */
  transicion?: ConfigTransicion;
  /** Asientos de ajuste y de cierre por año (AAAA). */
  cierres?: Record<string, ConfigCierre>;
  /** Costo de capital anual (fracción) para el ROE y el EVA de los indicadores financieros. */
  costoCapital?: number;
}

const PREFIJO = 'fe-cr:contabilidad:';
const clave = (emisorId: string) => `${PREFIJO}${emisorId}`;

/**
 * Borra la configuración contable guardada en este navegador para los emisores indicados (o para todos
 * si se omite la lista). Se usa al limpiar los datos de práctica para no dejar datos huérfanos.
 */
export function borrarConfigContable(emisorIds?: string[]): void {
  try {
    const claves = emisorIds ? emisorIds.map(clave) : Object.keys(localStorage).filter((k) => k.startsWith(PREFIJO));
    claves.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* sin almacenamiento */
  }
}

function leer(emisorId: string | undefined): ConfigContable {
  try {
    const guardado = emisorId ? JSON.parse(localStorage.getItem(clave(emisorId)) ?? '{}') : {};
    return { ...guardado, politicas: { ...POLITICAS_PREDETERMINADAS, ...guardado.politicas } };
  } catch {
    return { politicas: POLITICAS_PREDETERMINADAS };
  }
}

/**
 * Libro diario derivado de los comprobantes aceptados del emisor activo, más los asientos de ajuste y
 * de cierre registrados. Las políticas contables, la apertura, los ajustes y los cierres se guardan en
 * este navegador, por emisor.
 */
export function useContabilidad(): {
  libro: (LibroDiario & { cierres: Record<string, DetalleCierre> }) | null;
  config: ConfigContable;
  /** Devuelve false (y avisa) si no se pudo guardar en el navegador. */
  guardarConfig: (c: ConfigContable) => boolean;
} {
  const { emisor, comprobantes, recibidos, productos, avisar } = useApp();
  const [config, setConfig] = useState(() => leer(emisor?.id));
  const guardarConfig = useCallback(
    (c: ConfigContable) => {
      setConfig(c);
      try {
        if (emisor) localStorage.setItem(clave(emisor.id), JSON.stringify(c));
        return true;
      } catch {
        // Sin espacio o almacenamiento bloqueado: el cambio queda solo en esta pantalla.
        avisar(ERROR_ALMACENAMIENTO, 'err');
        return false;
      }
    },
    [emisor, avisar],
  );
  const base = useMemo(
    () =>
      emisor
        ? generarLibroDiario({
            emisor,
            emitidos: comprobantes,
            recibidos: recibidos.map((r) => ({ recibido: r, estado: r.estado, xmlConfirmacion: r.confirmacion?.xml })),
            cabysInventario: productos.filter((p) => !esCabysServicio(p.codigoCabys)).map((p) => p.codigoCabys),
            politicas: config.politicas,
            apertura: config.apertura,
          })
        : null,
    [emisor, comprobantes, recibidos, productos, config.politicas, config.apertura],
  );
  const libro = useMemo(() => (base ? completarLibro(base, config.cierres) : null), [base, config.cierres]);
  return { libro, config, guardarConfig };
}

/** Último día (AAAA-MM-DD) de un mes AAAA-MM. */
export function finDeMes(mes: string): string {
  const [a, m] = mes.split('-').map(Number);
  return `${mes}-${String(new Date(a, m, 0).getDate()).padStart(2, '0')}`;
}
