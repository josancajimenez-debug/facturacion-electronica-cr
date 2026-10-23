/**
 * Codificación de provincia, cantón y distrito (nota 14 del Anexo 1 v4.4).
 *
 * La nota 14 remite a "Codificacionubicacion_V4.4" (no incluido en la bibliografía). Se usa la
 * División Territorial Administrativa 2022 del Registro Nacional – IGN, de la que se derivan los
 * códigos del XML: Provincia (1 dígito), Canton (2 últimos dígitos del código de cantón) y
 * Distrito (2 últimos dígitos del código de distrito). Datos generados por scripts/extraer-catalogos.mjs.
 */
import dta from './datos/division-territorial.json';
import type { Ubicacion } from './tipos';

export interface Distrito {
  codigo: string;
  nombre: string;
}
export interface Canton {
  codigo: string;
  nombre: string;
  distritos: Distrito[];
}
export interface Provincia {
  codigo: string;
  nombre: string;
  cantones: Canton[];
}

export const DIVISION_TERRITORIAL: { fuente: string; provincias: Provincia[] } = dta;

export function cantonesDe(provincia: string | undefined): Canton[] {
  return DIVISION_TERRITORIAL.provincias.find((p) => p.codigo === provincia)?.cantones ?? [];
}

export function distritosDe(provincia: string | undefined, canton: string | undefined): Distrito[] {
  return cantonesDe(provincia).find((c) => c.codigo === canton)?.distritos ?? [];
}

/** Nombre legible "Distrito, Cantón, Provincia" (o los códigos si no están en el catálogo). */
export function nombreUbicacion(u: Ubicacion): string {
  const p = DIVISION_TERRITORIAL.provincias.find((x) => x.codigo === u.provincia);
  const c = p?.cantones.find((x) => x.codigo === u.canton);
  const d = c?.distritos.find((x) => x.codigo === u.distrito);
  return [d?.nombre ?? `distrito ${u.distrito}`, c?.nombre ?? `cantón ${u.canton}`, p?.nombre ?? `provincia ${u.provincia}`].join(', ');
}

/** Devuelve un mensaje si la combinación no existe en la DTA 2022 (se trata como advertencia). */
export function verificarUbicacion(u: Ubicacion): string | null {
  if (!/^[1-7]$/.test(u.provincia)) return 'La provincia debe ser un dígito de 1 a 7.';
  if (!/^\d{2}$/.test(u.canton) || !/^\d{2}$/.test(u.distrito)) return 'Cantón y distrito deben tener 2 dígitos.';
  if (!distritosDe(u.provincia, u.canton).some((d) => d.codigo === u.distrito)) {
    return `La ubicación ${u.provincia}-${u.canton}-${u.distrito} no figura en la División Territorial Administrativa 2022.`;
  }
  return null;
}
