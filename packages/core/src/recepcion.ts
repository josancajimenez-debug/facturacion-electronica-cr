import { CONDICION_IMPUESTO, type TipoMensajeReceptor } from './catalogos';
import { REGEX_CLAVE, generarConsecutivo } from './clave';
import { REGEX_FECHA_RFC3339, diaCR, fechaEmisionCR, limiteConfirmacionReceptor } from './fechas';
import type { Emisor, Validacion } from './tipos';
import { generarXmlMensajeReceptor } from './xml';

/** Datos mínimos de un comprobante recibido de un proveedor. */
export interface ComprobanteRecibido {
  clave: string;
  tipoDocumento: string;
  fechaEmision: string;
  nombreEmisor: string;
  identificacionEmisor: { tipo: string; numero: string };
  identificacionReceptor?: { tipo: string; numero: string };
  totalImpuesto: number;
  totalComprobante: number;
  moneda?: string;
  /** Tipo de cambio del comprobante respecto al colón (1 en colones). */
  tipoCambio?: number;
  xml?: string;
}

const ENTIDADES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

/** Revierte el escapado XML (entidades predefinidas y referencias numéricas). */
function desescapar(texto: string): string {
  return texto.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, e: string) =>
    e[0] === '#' ? String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : ENTIDADES[e.toLowerCase()],
  );
}

function valorTag(xml: string, tag: string, desde = 0): string | undefined {
  const m = new RegExp(`<${tag}>([^<]*)</${tag}>`).exec(xml.slice(desde));
  return m ? desescapar(m[1].trim()) : undefined;
}

function montoTag(xml: string, tag: string): number {
  const n = Number(valorTag(xml, tag) ?? 0);
  if (!Number.isFinite(n) || n < 0) throw new Error(`El campo ${tag} del XML no es un monto válido.`);
  return n;
}

/** Extrae los datos básicos de un XML de comprobante recibido (lectura tolerante, sin validar esquema). */
export function extraerDatosComprobante(xml: string): ComprobanteRecibido {
  const raiz = /<([A-Za-z]+)\s+xmlns="[^"]+"/.exec(xml)?.[1] ?? 'Desconocido';
  const posEmisor = xml.indexOf('<Emisor>');
  const posReceptor = xml.indexOf('<Receptor>');
  const clave = valorTag(xml, 'Clave');
  if (!clave || !REGEX_CLAVE.test(clave)) throw new Error('El XML no contiene una clave válida de 50 posiciones.');
  // La fecha determina el plazo de confirmación: sin ella no se puede registrar el comprobante.
  const fechaEmision = valorTag(xml, 'FechaEmision') ?? '';
  if (!REGEX_FECHA_RFC3339.test(fechaEmision) || Number.isNaN(new Date(fechaEmision).getTime())) {
    throw new Error('El XML no contiene una FechaEmision válida (formato RFC 3339).');
  }
  return {
    clave,
    tipoDocumento: raiz,
    fechaEmision,
    nombreEmisor: posEmisor >= 0 ? valorTag(xml, 'Nombre', posEmisor) ?? '' : '',
    identificacionEmisor: {
      tipo: posEmisor >= 0 ? valorTag(xml, 'Tipo', posEmisor) ?? '' : '',
      numero: posEmisor >= 0 ? valorTag(xml, 'Numero', posEmisor) ?? '' : '',
    },
    identificacionReceptor:
      posReceptor >= 0
        ? { tipo: valorTag(xml, 'Tipo', posReceptor) ?? '', numero: valorTag(xml, 'Numero', posReceptor) ?? '' }
        : undefined,
    totalImpuesto: montoTag(xml, 'TotalImpuesto'),
    totalComprobante: montoTag(xml, 'TotalComprobante'),
    moneda: valorTag(xml, 'CodigoMoneda'),
    tipoCambio: valorTag(xml, 'TipoCambio') === undefined ? undefined : montoTag(xml, 'TipoCambio'),
    xml,
  };
}

/**
 * Monto de un comprobante recibido expresado en colones. Devuelve null si está en otra moneda y no
 * trae tipo de cambio (registros anteriores a que se leyera ese campo): sumarlo como colones sería un error.
 */
export function montoRecibidoEnColones(r: Pick<ComprobanteRecibido, 'moneda' | 'tipoCambio'>, monto: number): number | null {
  if (!r.moneda || r.moneda === 'CRC') return monto;
  return r.tipoCambio && r.tipoCambio > 0 ? monto * r.tipoCambio : null;
}

export interface SolicitudConfirmacion {
  recibido: ComprobanteRecibido;
  receptor: Emisor;
  /** 1 aceptado, 2 aceptación parcial, 3 rechazado (nota 11). */
  mensaje: '1' | '2' | '3';
  detalleMensaje?: string;
  codigoActividad?: string;
  condicionImpuesto?: string;
  montoTotalImpuestoAcreditar?: number;
  montoTotalDeGastoAplicable?: number;
  sucursal: string;
  terminal: string;
  numero: number;
  fecha?: Date;
  feriados?: string[];
}

const TIPO_POR_MENSAJE: Record<'1' | '2' | '3', TipoMensajeReceptor> = { '1': 'CCE', '2': 'CPCE', '3': 'RCE' };

export function validarConfirmacion(s: SolicitudConfirmacion): Validacion[] {
  const v: Validacion[] = [];
  const err = (campo: string, mensaje: string, fuente = 'Anexos y Estructuras v4.4 (sección III)') => v.push({ campo, mensaje, nivel: 'error', fuente });
  if (s.recibido.identificacionReceptor && s.recibido.identificacionReceptor.numero !== s.receptor.identificacion.numero) {
    err('receptor', 'La identificación del receptor no coincide con la del comprobante que se confirma.');
  }
  if (s.mensaje !== '1' && !(s.detalleMensaje && s.detalleMensaje.trim().length >= 5 && s.detalleMensaje.length <= 160)) {
    err('detalleMensaje', 'Para aceptación parcial o rechazo indique el motivo (5 a 160 caracteres).');
  }
  if (s.condicionImpuesto && !CONDICION_IMPUESTO.some((c) => c.codigo === s.condicionImpuesto)) err('condicionImpuesto', 'Condición del IVA no válida (nota 18).');
  if (s.condicionImpuesto === '05' && s.codigoActividad) err('codigoActividad', 'Con proporcionalidad (05) no se debe indicar la actividad económica.');
  if (s.mensaje === '3' && (s.montoTotalImpuestoAcreditar !== undefined || s.montoTotalDeGastoAplicable !== undefined)) {
    err('montos', 'En un rechazo no se indican montos a acreditar ni gasto aplicable.');
  }
  if (s.montoTotalImpuestoAcreditar !== undefined && !(s.montoTotalImpuestoAcreditar >= 0)) {
    err('montoTotalImpuestoAcreditar', 'El impuesto a acreditar no puede ser negativo.');
  } else if (s.montoTotalImpuestoAcreditar !== undefined && s.montoTotalImpuestoAcreditar > s.recibido.totalImpuesto) {
    err('montoTotalImpuestoAcreditar', 'El impuesto a acreditar no puede superar el impuesto del comprobante.');
  }
  if (s.montoTotalDeGastoAplicable !== undefined && !(s.montoTotalDeGastoAplicable >= 0)) {
    err('montoTotalDeGastoAplicable', 'El gasto aplicable no puede ser negativo.');
  } else if (s.montoTotalDeGastoAplicable !== undefined && s.montoTotalDeGastoAplicable > s.recibido.totalComprobante) {
    err('montoTotalDeGastoAplicable', 'El gasto aplicable no puede superar el total del comprobante.');
  }
  const limite = limiteConfirmacionReceptor(new Date(s.recibido.fechaEmision), s.feriados ?? []);
  // El plazo se cuenta en días de calendario de Costa Rica, no en UTC.
  const hoy = diaCR(s.fecha ?? new Date());
  if (hoy > limite) {
    v.push({
      campo: 'plazo',
      nivel: 'advertencia',
      mensaje: `El plazo de confirmación venció el ${limite}; se presume aceptado totalmente si no está cubierto por beneficio fiscal.`,
      fuente: 'MH-DGT-RES-0027-2024, art. 10',
    });
  }
  return v;
}

/** Genera el mensaje de confirmación del receptor (05, 06 o 07) con su consecutivo. */
export function generarConfirmacion(s: SolicitudConfirmacion, ambiente = 'simulacion') {
  const validaciones = validarConfirmacion(s);
  const consecutivo = generarConsecutivo(s.sucursal, s.terminal, TIPO_POR_MENSAJE[s.mensaje], s.numero);
  const xml = generarXmlMensajeReceptor(
    {
      clave: s.recibido.clave,
      numeroCedulaEmisor: s.recibido.identificacionEmisor.numero,
      fechaEmisionDoc: fechaEmisionCR(s.fecha ?? new Date()),
      mensaje: s.mensaje,
      detalleMensaje: s.detalleMensaje,
      montoTotalImpuesto: s.recibido.totalImpuesto > 0 ? s.recibido.totalImpuesto : undefined,
      codigoActividad: s.codigoActividad,
      condicionImpuesto: s.mensaje === '3' ? undefined : s.condicionImpuesto,
      montoTotalImpuestoAcreditar: s.mensaje === '3' ? undefined : s.montoTotalImpuestoAcreditar,
      montoTotalDeGastoAplicable: s.mensaje === '3' ? undefined : s.montoTotalDeGastoAplicable,
      totalFactura: s.recibido.totalComprobante,
      numeroCedulaReceptor: s.receptor.identificacion.numero,
      numConsecutivoReceptor: consecutivo,
    },
    ambiente,
  );
  return {
    consecutivo,
    xml,
    validaciones,
    tipo: TIPO_POR_MENSAJE[s.mensaje],
    limite: limiteConfirmacionReceptor(new Date(s.recibido.fechaEmision), s.feriados ?? []),
  };
}
