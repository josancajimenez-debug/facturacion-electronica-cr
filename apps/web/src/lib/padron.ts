import type { ActividadEconomica } from '@fe-cr/core';

/** Situación de un contribuyente según la consulta pública del Ministerio de Hacienda (GET /fe/ae). */
export type Padron =
  | { inscrito: true; numero: string; nombre: string; tipoIdentificacion?: string; regimen?: string; estado: string; administracion?: string; actividades: ActividadEconomica[] }
  | { inscrito: false; numero: string };

interface RespuestaAe {
  nombre: string;
  tipoIdentificacion?: string;
  regimen?: { descripcion?: string };
  situacion?: { estado?: string; administracionTributaria?: string };
  actividades?: { estado: string; codigo: string; descripcion: string; tipo: string }[];
}

/**
 * Tipo de identificación que corresponde a la cantidad de caracteres, para que baste con escribir el
 * número: 9 dígitos es cédula física; 11 o 12, DIMEX; 10 se deja como jurídica salvo que se haya
 * elegido NITE. El tipo definitivo lo confirma Hacienda en la consulta.
 */
export function tipoSegunNumero(numero: string, actual: string): string {
  if (/^\d{9}$/.test(numero)) return '01';
  if (/^\d{11,12}$/.test(numero)) return '03';
  if (numero.length === 10) return actual === '04' && /^\d+$/.test(numero) ? '04' : '02';
  return actual;
}

/** Números con la forma de una identificación que puede figurar en el padrón (9 a 12 caracteres). */
export const consultable = (numero: string) => /^[0-9A-Z]{9,12}$/.test(numero);

/** Registro de productores agropecuarios del MAG (GET /fe/agropecuario): respaldo del régimen especial agropecuario. */
export interface RegistroMag {
  activo: boolean;
  /** Registro activo, o el más reciente si ninguno lo está. */
  nombre?: string;
  fuente?: string;
  vence?: string;
}

export async function consultarRegistroMag(numero: string, señal?: AbortSignal): Promise<RegistroMag | null> {
  const r = await fetch(`https://api.hacienda.go.cr/fe/agropecuario?identificacion=${encodeURIComponent(numero)}`, { signal: señal });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`El API de Hacienda (registro agropecuario) respondió ${r.status}.`);
  // Si no hay registro, el API responde 200 con un cuerpo de error y sin «listaDatosMAG».
  const j = (await r.json()) as { listaDatosMAG?: { nombreMAG: string; indicadorActivoMAG: boolean; fechaBajaMAG?: string; fuenteMAG?: string }[] };
  const lista = j.listaDatosMAG ?? [];
  if (!lista.length) return null;
  const vigente = lista.find((x) => x.indicadorActivoMAG) ?? lista[lista.length - 1];
  return { activo: !!vigente.indicadorActivoMAG, nombre: vigente.nombreMAG, fuente: vigente.fuenteMAG, vence: vigente.fechaBajaMAG };
}

export async function consultarPadron(numero: string, señal?: AbortSignal): Promise<Padron> {
  let r: Response;
  try {
    r = await fetch(`https://api.hacienda.go.cr/fe/ae?identificacion=${encodeURIComponent(numero)}`, { signal: señal });
  } catch (e) {
    if (señal?.aborted) throw e;
    // El 404 («no inscrito») llega sin encabezados CORS y el navegador lo reporta como error de red.
    // Si el API responde a otra consulta, el error fue ese 404; si no, de verdad no hay conexión.
    const enLinea = await fetch('https://api.hacienda.go.cr/indicadores/tc/dolar', { signal: señal }).then((p) => p.ok, () => false);
    if (enLinea) return { inscrito: false, numero };
    throw new Error('No se pudo conectar con el API de Hacienda. Revise la conexión e intente de nuevo.');
  }
  if (r.status === 404) return { inscrito: false, numero };
  if (r.status === 429) throw new Error('Límite de consultas del API de Hacienda excedido; intente en unos minutos.');
  if (!r.ok) throw new Error(`El API de Hacienda respondió ${r.status}.`);
  const j = (await r.json()) as RespuestaAe;
  const activas = (j.actividades ?? []).filter((a) => a.estado === 'A');
  // Si Hacienda no marca ninguna como principal, la primera hace de principal.
  const hayPrincipal = activas.some((a) => a.tipo === 'P');
  return {
    inscrito: true,
    numero,
    nombre: j.nombre.trim(),
    tipoIdentificacion: j.tipoIdentificacion,
    regimen: j.regimen?.descripcion,
    estado: j.situacion?.estado ?? 'Inscrito',
    administracion: j.situacion?.administracionTributaria,
    actividades: activas.map((a, i) => ({ codigo: a.codigo, descripcion: a.descripcion.replace(/\s+,/g, ',').trim(), principal: hayPrincipal ? a.tipo === 'P' : i === 0 })),
  };
}
