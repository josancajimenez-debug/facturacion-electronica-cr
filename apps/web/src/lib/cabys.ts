import { codigoTarifaDesdeCabys } from '@fe-cr/core';

export interface ItemCabys {
  codigo: string;
  descripcion: string;
  impuesto: string;
  codigoTarifaIva?: string;
}

interface Catalogo {
  fuente: string;
  total: number;
  porCodigo: Map<string, ItemCabys>;
  items: (ItemCabys & { busqueda: string })[];
}

let promesa: Promise<Catalogo> | null = null;

const normalizar = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

/** Carga diferida del Catálogo de Bienes y Servicios 2025 (generado por scripts/extraer-cabys.mjs). */
export function cargarCabys(): Promise<Catalogo> {
  if (!promesa) {
    promesa = fetch('/data/cabys-2025.json')
      .then((r) => {
        if (!r.ok) throw new Error('No se pudo cargar el catálogo CAByS.');
        return r.json() as Promise<{ fuente: string; total: number; codigos: [string, string, string][] }>;
      })
      .then((d) => {
        const items = d.codigos.map(([codigo, descripcion, impuesto]) => ({
          codigo,
          descripcion,
          impuesto,
          codigoTarifaIva: codigoTarifaDesdeCabys(impuesto),
          busqueda: normalizar(`${codigo} ${descripcion}`),
        }));
        return { fuente: d.fuente, total: d.total, items, porCodigo: new Map(items.map((i) => [i.codigo, i])) };
      })
      .catch((e) => {
        promesa = null;
        throw e;
      });
  }
  return promesa;
}

export async function buscarCabys(texto: string, limite = 30): Promise<ItemCabys[]> {
  const cat = await cargarCabys();
  const q = normalizar(texto.trim());
  if (q.length < 3) return [];
  const terminos = q.split(/\s+/);
  const res: ItemCabys[] = [];
  for (const item of cat.items) {
    if (terminos.every((t) => item.busqueda.includes(t))) {
      res.push(item);
      if (res.length >= limite) break;
    }
  }
  return res;
}

export async function cabysValido(codigo: string): Promise<boolean> {
  return (await cargarCabys()).porCodigo.has(codigo);
}

/** Verificador síncrono para el simulador, una vez cargado el catálogo. */
export async function verificadorCabys(): Promise<(codigo: string) => boolean> {
  const cat = await cargarCabys();
  return (codigo) => cat.porCodigo.has(codigo);
}
