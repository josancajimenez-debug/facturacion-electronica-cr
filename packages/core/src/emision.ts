import { calcularComprobante } from './calculos';
import { generarClave, generarCodigoSeguridad, generarConsecutivo } from './clave';
import { fechaEmisionCR } from './fechas';
import type { Ambiente, BorradorComprobante, Comprobante, Emisor, Validacion } from './tipos';
import { hayErrores, validarBorrador } from './validaciones';
import { generarXmlComprobante } from './xml';

export class ErrorValidacion extends Error {
  constructor(public validaciones: Validacion[]) {
    super(validaciones.filter((v) => v.nivel === 'error').map((v) => v.mensaje).join(' | '));
    this.name = 'ErrorValidacion';
  }
}

export interface ParametrosEmision {
  borrador: BorradorComprobante;
  emisor: Emisor;
  /** Número consecutivo asignado de forma atómica por la capa de persistencia. */
  numero: number;
  fecha?: Date;
  codigoSeguridad?: string;
  ambiente: Ambiente;
  usuario?: string;
}

/** Previsualización sin consumir consecutivo: cálculos y validaciones. */
export function previsualizar(borrador: BorradorComprobante, emisor: Emisor) {
  try {
    const { lineas, resumen } = calcularComprobante(borrador);
    return { lineas, resumen, validaciones: validarBorrador(borrador, emisor, resumen, lineas) };
  } catch (e) {
    return {
      lineas: [],
      resumen: undefined,
      validaciones: [{ campo: 'general', mensaje: (e as Error).message, nivel: 'error' as const }],
    };
  }
}

/**
 * Construye el comprobante completo: cálculos, validaciones, consecutivo, clave numérica y XML.
 * Lanza ErrorValidacion si hay errores; en ese caso la capa de persistencia no debe consumir el consecutivo.
 */
export function construirComprobante(p: ParametrosEmision): Comprobante {
  const { borrador, emisor, numero, ambiente } = p;
  const fecha = p.fecha ?? new Date();
  const { lineas, resumen } = calcularComprobante(borrador);
  const validaciones = validarBorrador(borrador, emisor, resumen, lineas);
  if (hayErrores(validaciones)) throw new ErrorValidacion(validaciones);

  const consecutivo = generarConsecutivo(borrador.sucursal, borrador.terminal, borrador.tipo, numero);
  const codigoSeguridad = p.codigoSeguridad ?? generarCodigoSeguridad();
  // La clave usa la identificación del obligado tributario que genera el comprobante.
  const clave = generarClave({ fecha, identificacion: emisor.identificacion, consecutivo, situacion: borrador.situacion, codigoSeguridad });
  const fechaEmision = fechaEmisionCR(fecha);

  const comprobante: Comprobante = {
    id: clave,
    clave,
    consecutivo,
    tipo: borrador.tipo,
    ambiente,
    emisorId: emisor.id,
    fechaEmision,
    situacion: borrador.situacion,
    codigoSeguridad,
    emisor,
    contraparte: borrador.contraparte,
    borrador,
    lineas,
    resumen,
    xml: '',
    estado: 'generado',
    historial: [{ estado: 'generado', fecha: fechaEmision, usuario: p.usuario, detalle: `Consecutivo ${consecutivo}` }],
    creadoPor: p.usuario,
  };
  comprobante.xml = generarXmlComprobante(comprobante);
  return comprobante;
}

export function claveContador(emisorId: string, sucursal: string, terminal: string, tipo: string): string {
  return `${emisorId}_${sucursal}_${terminal}_${tipo}`;
}
