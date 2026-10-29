/**
 * Actividades económicas de TRIBU-CR (CIIU 4). El API público de Hacienda (/fe/ae) solo devuelve las
 * actividades de un contribuyente ya inscrito; para quien aún no lo está, la búsqueda usa el «Listado
 * de actividades económicas» que publica el Ministerio (correspondencia ATV CIIU 3 – TRIBU-CR CIIU 4).
 * Además del nombre oficial, se busca por los nombres de la actividad en ATV y por las especialidades
 * de TRIBU-CR, que son como la gente suele describir lo que hace («repuestos», «panadería», «taxi»).
 *
 * Se importa desde «@fe-cr/core/actividades» y no desde el índice del paquete: así el listado (unos
 * 95 KB) solo viaja con la página que lo usa y no con cada pantalla ni con la función Edge.
 */
import listado from './datos/actividades-ciiu4.json';

export interface ActividadCiiu4 {
  codigo: string;
  descripcion: string;
  /** Especialidades de TRIBU-CR dentro de la subclase. */
  especialidades?: string[];
  /** Nombres de las actividades de ATV (CIIU 3) que pasan a esta subclase. */
  atv?: string[];
}

export const ACTIVIDADES_CIIU4: ActividadCiiu4[] = listado.codigos;

/** Formato del código de actividad en TRIBU-CR: cuatro dígitos, punto y un dígito (p. ej. 6920.0). */
export const REGEX_ACTIVIDAD_CIIU4 = /^\d{4}\.\d$/;

const normalizar = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const INDICE = ACTIVIDADES_CIIU4.map((a) => ({
  actividad: a,
  nombre: normalizar(a.descripcion),
  otros: [...(a.especialidades ?? []), ...(a.atv ?? [])].map((t) => ({ texto: t, busqueda: normalizar(t) })),
}));
const POR_CODIGO = new Map(ACTIVIDADES_CIIU4.map((a) => [a.codigo, a]));

export function actividadCiiu4(codigo: string): ActividadCiiu4 | undefined {
  return POR_CODIGO.get(codigo.trim());
}

export interface ResultadoActividad extends ActividadCiiu4 {
  /** Especialidad o nombre ATV en que coincidió la búsqueda, si no fue en el nombre oficial. */
  coincidencia?: string;
}

/**
 * Busca por código («4530», «45») o por palabras («repuestos autos»): todas las palabras deben estar
 * en el nombre oficial o en uno de los nombres alternativos. Primero van las coincidencias en el
 * código, luego en el nombre oficial y al final en las especialidades o nombres de ATV.
 */
export function buscarActividades(texto: string, limite = 30): ResultadoActividad[] {
  const q = normalizar(texto.trim());
  if (/^\d[\d.]*$/.test(q)) return ACTIVIDADES_CIIU4.filter((a) => a.codigo.startsWith(q)).slice(0, limite);
  if (q.length < 3) return [];
  // Las palabras cortas («de», «la») no ayudan a distinguir y harían coincidir casi todo.
  const terminos = q.split(/\s+/).filter((t) => t.length > 2);
  if (!terminos.length) return [];
  const contiene = (s: string) => terminos.every((t) => s.includes(t));
  const enNombre: ResultadoActividad[] = [];
  const enOtros: ResultadoActividad[] = [];
  for (const { actividad, nombre, otros } of INDICE) {
    if (contiene(nombre)) enNombre.push(actividad);
    else {
      const otro = otros.find((o) => contiene(o.busqueda));
      if (otro) enOtros.push({ ...actividad, coincidencia: otro.texto });
    }
  }
  return [...enNombre, ...enOtros].slice(0, limite);
}
