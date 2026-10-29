import {
  POLITICAS_PREDETERMINADAS,
  completarLibro,
  esCabysServicio,
  generarLibroDiario,
  type ConfigCierre,
  type DetalleCierre,
  type LibroDiario,
  type PoliticasContables,
} from '@fe-cr/core';
import { useCallback, useMemo, useState } from 'react';
import { useApp } from '../estado';

export interface ConfigContable {
  politicas: PoliticasContables;
  apertura?: { fecha: string; capital: number };
  /** Asientos de ajuste y de cierre por año (AAAA). */
  cierres?: Record<string, ConfigCierre>;
}

const clave = (emisorId: string) => `fe-cr:contabilidad:${emisorId}`;

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
  guardarConfig: (c: ConfigContable) => void;
} {
  const { emisor, comprobantes, recibidos, productos } = useApp();
  const [config, setConfig] = useState(() => leer(emisor?.id));
  const guardarConfig = useCallback(
    (c: ConfigContable) => {
      setConfig(c);
      try {
        if (emisor) localStorage.setItem(clave(emisor.id), JSON.stringify(c));
      } catch {
        /* sin almacenamiento */
      }
    },
    [emisor],
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
