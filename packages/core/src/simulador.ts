/**
 * SIMULADOR del proceso de recepción y validación del Ministerio de Hacienda.
 *
 * Reproduce el orden de validación descrito en el Anexo 1 v4.4 (p. 17):
 *   Nivel 1 – cumplimiento de la estructura vigente;
 *   Nivel 2 – formato de los campos;
 *   Nivel 3 – validación contra bases de datos (aquí, un padrón y catálogos locales ficticios).
 * Y el formato de respuesta del API de recepción descrito en el Anexo 3 (callback/GET por clave).
 *
 * No se conecta con el Ministerio de Hacienda ni pretende replicar todas sus reglas.
 */
import { actualizacionVigente, diferenciasConReferencia, excesosNotaCredito, resumenDocumento, type DocumentoResumen } from './actualizacion';
import { calcularComprobante } from './calculos';
import { CODIGO_TIPO_DOCUMENTO, ESQUEMA_XML } from './catalogos';
import { descomponerConsecutivo, validarClave } from './clave';
import { REGEX_FECHA_RFC3339, fechaEmisionCR } from './fechas';
import type { Comprobante, MensajeHaciendaResultado } from './tipos';
import { validarBorrador, validarIdentificacion } from './validaciones';
import { generarXmlMensajeHacienda } from './xml';

export interface ContribuyenteSimulado {
  nombre: string;
  estado: 'Inscrito' | 'Desinscrito';
  actividades: string[];
}

export interface ContextoSimulador {
  /** Padrón ficticio indexado por número de identificación. */
  padron?: Record<string, ContribuyenteSimulado>;
  /** Función de verificación del catálogo CAByS vigente. */
  cabysValido?: (codigo: string) => boolean;
  /** Autorizaciones de exoneración ficticias (códigos 04 y 11 de la nota 10.1). */
  exoneraciones?: Record<string, { tarifaMaxima: number; vigente: boolean }>;
  /** Claves ya recibidas, para detectar duplicados. */
  clavesRecibidas?: Set<string>;
  /** Comprobantes del emisor ya aceptados, para verificar el saldo de las notas de crédito. */
  documentosAceptados?: DocumentoResumen[];
  /** Escenario de prueba: fuerza un rechazo con el motivo indicado. */
  forzarRechazo?: string;
  ahora?: Date;
}

const TAGS_OBLIGATORIOS = ['Clave', 'ProveedorSistemas', 'NumeroConsecutivo', 'FechaEmision', 'Emisor', 'CondicionVenta', 'ResumenFactura', 'TotalVentaNeta', 'TotalComprobante'];

function contieneTag(xml: string, tag: string): boolean {
  return new RegExp(`<${tag}>`).test(xml);
}

export function validarComoHacienda(c: Comprobante, ctx: ContextoSimulador = {}): MensajeHaciendaResultado {
  const ahora = ctx.ahora ?? new Date();
  const detalle: string[] = [];
  const advertencias: string[] = [];
  let nivelFallido: 1 | 2 | 3 | undefined;

  // ---------- Nivel 1: estructura ----------
  const { raiz, ns } = ESQUEMA_XML[c.tipo];
  if (!c.xml.includes(`<${raiz} xmlns="${ns}"`)) detalle.push(`Nivel 1: la etiqueta raíz o el espacio de nombres no corresponde a ${raiz} v4.4.`);
  for (const tag of TAGS_OBLIGATORIOS) {
    if (!contieneTag(c.xml, tag)) detalle.push(`Nivel 1: falta el nodo obligatorio <${tag}>.`);
  }
  if (['FE', 'FEE', 'FEC', 'REP'].includes(c.tipo) && !contieneTag(c.xml, 'Receptor')) detalle.push('Nivel 1: falta el nodo <Receptor>.');
  if (detalle.length) nivelFallido = 1;

  // ---------- Nivel 2: formato ----------
  if (!nivelFallido) {
    validarClave(c.clave, { fechaEmision: c.fechaEmision, consecutivo: c.consecutivo }).forEach((e) => detalle.push(`Nivel 2: ${e}`));
    const cons = descomponerConsecutivo(c.consecutivo);
    if (cons && cons.tipoDocumento !== CODIGO_TIPO_DOCUMENTO[c.tipo]) detalle.push('Nivel 2: el tipo de documento del consecutivo no corresponde al comprobante.');
    if (!REGEX_FECHA_RFC3339.test(c.fechaEmision)) detalle.push('Nivel 2: FechaEmision no cumple RFC 3339.');
    const fecha = new Date(c.fechaEmision);
    const diffMin = (fecha.getTime() - ahora.getTime()) / 60000;
    if (diffMin > 5) detalle.push('Nivel 2: no se permiten fechas de emisión posteriores a la generación del comprobante.');
    if (c.situacion === '1' && diffMin < -60 * 24) {
      detalle.push('Nivel 2: fecha anterior a la validación; solo se admite en situación "sin internet" (nota 3).');
    }
    const idEmisor = c.tipo === 'FEC' ? c.contraparte?.identificacion : c.emisor.identificacion;
    const e = validarIdentificacion(idEmisor);
    if (e) detalle.push(`Nivel 2: identificación del emisor – ${e}`);
    validarBorrador(c.borrador, c.emisor, c.resumen, c.lineas)
      .filter((v) => v.nivel === 'error')
      .forEach((v) => detalle.push(`Nivel 2: ${v.mensaje}`));
    if (detalle.length) nivelFallido = 2;
  }

  // ---------- Nivel 3: bases de datos y cálculos ----------
  if (!nivelFallido) {
    if (ctx.clavesRecibidas?.has(c.clave)) detalle.push('Nivel 3: la clave ya fue recibida anteriormente (comprobante duplicado).');

    const obligado = c.emisor.identificacion.numero;
    const registro = ctx.padron?.[obligado];
    if (ctx.padron) {
      if (!registro || registro.estado !== 'Inscrito') detalle.push(`Nivel 3: el obligado tributario ${obligado} no está inscrito en el padrón (simulado).`);
      else {
        const act = c.tipo === 'FEC' ? c.borrador.codigoActividadReceptor : c.borrador.codigoActividadEmisor;
        if (act && !registro.actividades.includes(act)) advertencias.push(`La actividad ${act} difiere de las inscritas en el RUT (advertencia).`);
      }
      const prov = ctx.padron[c.emisor.proveedorSistemas];
      if (!prov) advertencias.push('El proveedor de sistemas no figura inscrito en el RUT (advertencia).');
      // FE, FEE y TE: la identificación del receptor debe existir en los padrones, salvo extranjero no domiciliado.
      const idRec = c.contraparte?.identificacion;
      if (idRec && ['FE', 'FEE', 'TE'].includes(c.tipo) && idRec.tipo !== '05' && !ctx.padron[idRec.numero]) {
        detalle.push(`Nivel 3: la identificación del receptor ${idRec.numero} no existe en el padrón (simulado).`);
      }
    }

    if (ctx.cabysValido) {
      c.lineas.forEach((l) => {
        if (c.tipo !== 'REP' && !ctx.cabysValido!(l.codigoCabys)) detalle.push(`Nivel 3: línea ${l.numeroLinea}, el código CAByS ${l.codigoCabys} no existe en el catálogo vigente.`);
      });
    }

    if (ctx.exoneraciones) {
      c.lineas.forEach((l) => {
        const ex = l.impuestos.find((i) => i.exoneracion)?.exoneracion;
        if (ex && ['04', '11'].includes(ex.tipoDocumento)) {
          const aut = ctx.exoneraciones![ex.numeroDocumento.toUpperCase()];
          if (!aut || !aut.vigente) detalle.push(`Nivel 3: la autorización de exoneración ${ex.numeroDocumento} no existe o no está vigente (simulado).`);
          else if (ex.tarifaExonerada > aut.tarifaMaxima) detalle.push(`Nivel 3: la tarifa exonerada supera la autorizada (${aut.tarifaMaxima}%).`);
        }
      });
    }

    // Validaciones aritméticas: los campos de cálculo deben cumplir la fórmula (validaciones generales, p. 17).
    const recalculo = calcularComprobante(c.borrador);
    if (Math.abs(recalculo.resumen.totalComprobante - c.resumen.totalComprobante) > 0.00001) {
      detalle.push('Nivel 3: el TotalComprobante no coincide con la fórmula de cálculo.');
    }
    recalculo.lineas.forEach((l, i) => {
      if (Math.abs(l.montoTotalLinea - (c.lineas[i]?.montoTotalLinea ?? NaN)) > 0.00001) {
        detalle.push(`Nivel 3: línea ${l.numeroLinea}, MontoTotalLinea no coincide con la fórmula.`);
      }
    });

    // Actualización v4.4 (información de referencia, campo Numero): la NC no puede superar lo
    // facturado más las ND aplicadas, y los datos de la nota deben corresponder al referenciado.
    if ((c.tipo === 'NC' || c.tipo === 'ND') && ctx.documentosAceptados) {
      const vigente = actualizacionVigente(ahora);
      const nota = resumenDocumento(c);
      for (const d of diferenciasConReferencia(nota, ctx.documentosAceptados)) {
        advertencias.push(`Datos de referencia: ${d} (advertencia; Hacienda verifica que correspondan al comprobante de referencia).`);
      }
      for (const e of excesosNotaCredito(nota, ctx.documentosAceptados)) {
        const texto = `la nota de crédito supera el saldo acreditable del documento ${e.clave} (disponible ₡${e.disponible.toFixed(2)}: monto facturado más notas de débito, menos notas de crédito previas)`;
        if (vigente) detalle.push(`Nivel 3: ${texto}.`);
        else advertencias.push(`${texto[0].toUpperCase()}${texto.slice(1)}. Desde el 1/11/2026 se rechaza (advertencia).`);
      }
    }

    if (ctx.forzarRechazo) detalle.push(`Nivel 3: ${ctx.forzarRechazo}`);
    if (detalle.length) nivelFallido = 3;
  }

  const aceptado = detalle.length === 0;
  const receptor = c.tipo === 'FEC' ? undefined : c.contraparte;
  const xml = generarXmlMensajeHacienda({
    clave: c.clave,
    nombreEmisor: c.tipo === 'FEC' ? c.contraparte?.nombre ?? '' : c.emisor.nombre,
    tipoIdentificacionEmisor: (c.tipo === 'FEC' ? c.contraparte?.identificacion?.tipo : c.emisor.identificacion.tipo) ?? '',
    numeroCedulaEmisor: (c.tipo === 'FEC' ? c.contraparte?.identificacion?.numero : c.emisor.identificacion.numero) ?? '',
    nombreReceptor: c.tipo === 'FEC' ? c.emisor.nombre : receptor?.nombre,
    tipoIdentificacionReceptor: c.tipo === 'FEC' ? c.emisor.identificacion.tipo : receptor?.identificacion?.tipo,
    numeroCedulaReceptor: c.tipo === 'FEC' ? c.emisor.identificacion.numero : receptor?.identificacion?.numero,
    mensaje: aceptado ? '1' : '3',
    estadoMensaje: aceptado ? 'Aceptado' : 'Rechazado',
    detalleMensaje: aceptado
      ? ['Comprobante aceptado (SIMULACIÓN).', ...advertencias].join('\n')
      : ['Comprobante rechazado (SIMULACIÓN).', ...detalle].join('\n'),
    montoTotalImpuesto: c.resumen.totalImpuesto,
    totalFactura: c.resumen.totalComprobante,
  });

  return {
    mensaje: aceptado ? '1' : '3',
    estado: aceptado ? 'aceptado' : 'rechazado',
    detalle,
    advertencias,
    nivelFallido,
    fecha: fechaEmisionCR(ahora),
    xml,
  };
}

/** Codifica texto UTF-8 en Base64 (navegador y Node). */
export function aBase64(texto: string): string {
  const bytes = new TextEncoder().encode(texto);
  let binario = '';
  bytes.forEach((b) => (binario += String.fromCharCode(b)));
  return globalThis.btoa(binario);
}

export function deBase64(b64: string): string {
  const binario = globalThis.atob(b64);
  return new TextDecoder().decode(Uint8Array.from(binario, (ch) => ch.charCodeAt(0)));
}

/**
 * Cuerpo JSON simulado de la respuesta del API (GET /recepcion/{clave} o callback), con los
 * campos del ejemplo del Anexo 3: clave, fecha, indEstado y respuestaXml (Base64).
 */
export function respuestaApiSimulada(clave: string, indEstado: string, respuestaXml?: string) {
  return {
    clave,
    fecha: fechaEmisionCR(new Date()),
    indEstado,
    ...(respuestaXml ? { respuestaXml: aBase64(respuestaXml) } : {}),
  };
}
