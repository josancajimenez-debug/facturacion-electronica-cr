import { ESQUEMA_XML, NS_MENSAJE_HACIENDA, NS_MENSAJE_RECEPTOR, type TipoComprobante } from './catalogos';
import type { Comprobante, Contraparte, Emisor, LineaCalculada, MedioPago } from './tipos';

/**
 * Condición de cada campo por tipo de comprobante, en el orden de columnas del Anexo 1 v4.4:
 * FE, FEE, FEC, TE, NC, ND, REP. 1 = obligatorio, 2 = condicional, 3 = opcional, 4 = inexistente.
 */
const ORDEN_TIPOS: TipoComprobante[] = ['FE', 'FEE', 'FEC', 'TE', 'NC', 'ND', 'REP'];

function condicion(matriz: string, tipo: TipoComprobante): '1' | '2' | '3' | '4' {
  return matriz[ORDEN_TIPOS.indexOf(tipo)] as '1' | '2' | '3' | '4';
}

export function escaparXml(valor: string): string {
  return valor
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const monto = (n: number) => n.toFixed(5);
const cantidad = (n: number) => n.toFixed(3);
const porcentaje = (n: number) => String(Number(n.toFixed(2)));

class Escritor {
  private lineas: string[] = [];
  private nivel = 0;
  constructor(private tipo: TipoComprobante) {}

  /** Agrega un elemento simple si tiene valor y su condición no es "inexistente". */
  campo(tag: string, valor: string | number | undefined | null, matriz = '1111111'): void {
    if (valor === undefined || valor === null || valor === '') return;
    if (condicion(matriz, this.tipo) === '4') return;
    this.lineas.push(`${'  '.repeat(this.nivel)}<${tag}>${escaparXml(String(valor))}</${tag}>`);
  }

  /** Agrega un nodo complejo; se omite si la condición es 4 o si queda vacío. */
  nodo(tag: string, contenido: () => void, matriz = '1111111'): void {
    if (condicion(matriz, this.tipo) === '4') return;
    const inicio = this.lineas.length;
    this.lineas.push(`${'  '.repeat(this.nivel)}<${tag}>`);
    this.nivel++;
    contenido();
    this.nivel--;
    if (this.lineas.length === inicio + 1) {
      this.lineas.pop();
      return;
    }
    this.lineas.push(`${'  '.repeat(this.nivel)}</${tag}>`);
  }

  crudo(texto: string): void {
    this.lineas.push(`${'  '.repeat(this.nivel)}${texto}`);
  }

  toString(): string {
    return this.lineas.join('\n');
  }
}

function escribirPersona(
  w: Escritor,
  p: Contraparte & { registroFiscal8707?: string; correos?: string[] },
  rol: 'Emisor' | 'Receptor',
): void {
  const esEmisor = rol === 'Emisor';
  w.campo('Nombre', p.nombre);
  if (p.identificacion) {
    w.nodo('Identificacion', () => {
      w.campo('Tipo', p.identificacion!.tipo);
      w.campo('Numero', p.identificacion!.numero);
    });
  }
  if (esEmisor) w.campo('Registrofiscal8707', p.registroFiscal8707, '2222224');
  w.campo('NombreComercial', p.nombreComercial, '3333334');
  if (p.ubicacion && !(rol === 'Receptor' && p.identificacion?.tipo === '05')) {
    w.nodo(
      'Ubicacion',
      () => {
        w.campo('Provincia', p.ubicacion!.provincia);
        w.campo('Canton', p.ubicacion!.canton.padStart(2, '0'));
        w.campo('Distrito', p.ubicacion!.distrito.padStart(2, '0'));
        w.campo('Barrio', p.ubicacion!.barrio);
        w.campo('OtrasSenas', p.ubicacion!.otrasSenas);
      },
      esEmisor ? '1121224' : '2423224',
    );
  }
  w.campo('OtrasSenasExtranjero', p.otrasSenasExtranjero, esEmisor ? '4424444' : '2243224');
  if (p.telefono) {
    w.nodo(
      'Telefono',
      () => {
        w.campo('CodigoPais', p.telefono!.codigoPais);
        w.campo('NumTelefono', p.telefono!.numero);
      },
      '3333334',
    );
  }
  const correos = p.correos ?? (p.correo ? [p.correo] : []);
  correos.slice(0, esEmisor ? 4 : 1).forEach((c) => w.campo('CorreoElectronico', c));
}

function datosEmisorPropio(e: Emisor): Contraparte & { registroFiscal8707?: string; correos: string[] } {
  return {
    nombre: e.nombre,
    nombreComercial: e.nombreComercial,
    identificacion: e.identificacion,
    ubicacion: e.ubicacion,
    telefono: e.telefono,
    correos: e.correos,
    registroFiscal8707: e.registroFiscal8707,
  };
}

function escribirLinea(w: Escritor, l: LineaCalculada, tipo: TipoComprobante): void {
  w.nodo('LineaDetalle', () => {
    w.campo('NumeroLinea', l.numeroLinea);
    w.campo('PartidaArancelaria', l.partidaArancelaria, '4244224');
    w.campo('CodigoCABYS', l.codigoCabys, '1111224');
    if (l.codigoComercial) {
      w.nodo(
        'CodigoComercial',
        () => {
          w.campo('Tipo', l.codigoComercial!.tipo);
          w.campo('Codigo', l.codigoComercial!.codigo);
        },
        '2222224',
      );
    }
    w.campo('Cantidad', cantidad(l.cantidad), '1111114');
    w.campo('UnidadMedida', l.unidadMedida, '1111114');
    w.campo('TipoTransaccion', l.tipoTransaccion, '2224224');
    w.campo('UnidadMedidaComercial', l.unidadMedidaComercial, '3333334');
    w.campo('Detalle', l.detalle);
    (l.numeroVinSerie ?? []).forEach((vin) => w.campo('NumeroVINoSerie', vin, '2222224'));
    w.campo('RegistroMedicamento', l.registroMedicamento, '2222224');
    w.campo('FormaFarmaceutica', l.formaFarmaceutica, '2222224');
    w.campo('PrecioUnitario', monto(l.precioUnitario), '1111114');
    w.campo('MontoTotal', monto(l.montoTotal));
    l.descuentos.forEach((d) =>
      w.nodo(
        'Descuento',
        () => {
          w.campo('MontoDescuento', monto(d.monto));
          w.campo('CodigoDescuento', d.codigo);
          w.campo('CodigoDescuentoOTRO', d.codigoOtro);
          w.campo('NaturalezaDescuento', d.naturaleza);
        },
        '3333224',
      ),
    );
    w.campo('SubTotal', monto(l.subTotal));
    if (l.clase === 'gravado' || l.impuestos.some((i) => i.monto > 0)) {
      w.campo('BaseImponible', monto(l.baseImponible), '1411114');
    }
    for (const imp of l.impuestos) {
      w.nodo(
        'Impuesto',
        () => {
          w.campo('Codigo', imp.codigo);
          w.campo('CodigoImpuestoOTRO', imp.codigoOtro);
          w.campo('CodigoTarifaIVA', imp.codigoTarifaIva);
          w.campo('Tarifa', porcentaje(imp.tarifa));
          w.campo('Monto', monto(imp.monto));
          w.campo('MontoExportacion', imp.montoExportacion !== undefined ? monto(imp.montoExportacion) : undefined, '4244224');
          if (imp.exoneracion) {
            const ex = imp.exoneracion;
            w.nodo(
              'Exoneracion',
              () => {
                // Etiqueta según la tabla de estructura del Anexo (p. 44); la bitácora la nombra "TipoDocumentoEX".
                w.campo('TipoDocumentoEX1', ex.tipoDocumento);
                w.campo('TipoDocumentoOTRO', ex.tipoDocumentoOtro);
                w.campo('NumeroDocumento', ex.numeroDocumento);
                w.campo('Articulo', ex.articulo);
                w.campo('Inciso', ex.inciso);
                w.campo('NombreInstitucion', ex.institucion);
                w.campo('NombreInstitucionOtros', ex.institucionOtro);
                w.campo('FechaEmisionEX', ex.fechaEmision);
                w.campo('TarifaExonerada', porcentaje(ex.tarifaExonerada));
                w.campo('MontoExoneracion', monto(ex.montoExoneracion));
              },
              '2422224',
            );
          }
        },
        '1111112',
      );
    }
    const condAsumido = condicion('1441224', tipo);
    if (condAsumido === '1' || (condAsumido === '2' && l.impuestoAsumidoEmisorFabrica > 0)) {
      w.campo('ImpuestoAsumidoEmisorFabrica', monto(l.impuestoAsumidoEmisorFabrica), '1441224');
    }
    w.campo('ImpuestoNeto', monto(l.impuestoNeto), '1411111');
    w.campo('MontoTotalLinea', monto(l.montoTotalLinea));
  });
}

function escribirMediosPago(w: Escritor, medios: MedioPago[]): void {
  medios.forEach((m) =>
    w.nodo(
      'MedioPago',
      () => {
        w.campo('TipoMedioPago', m.tipo);
        w.campo('MedioPagoOtros', m.otros);
        w.campo('TotalMedioPago', m.monto !== undefined ? monto(m.monto) : undefined);
      },
      '2222221',
    ),
  );
}

/**
 * Genera el XML del comprobante según el orden de campos del Anexo 1 v4.4.
 * En simulación no se incorpora la firma XAdES-EPES: se deja un comentario explícito.
 */
export function generarXmlComprobante(c: Comprobante): string {
  const { raiz, ns } = ESQUEMA_XML[c.tipo];
  const b = c.borrador;
  const r = c.resumen;
  const w = new Escritor(c.tipo);
  const pos = (v: number) => (v > 0 ? monto(v) : undefined);

  w.campo('Clave', c.clave);
  w.campo('ProveedorSistemas', c.emisor.proveedorSistemas);
  w.campo('CodigoActividadEmisor', b.codigoActividadEmisor, '1131224');
  w.campo('CodigoActividadReceptor', b.codigoActividadReceptor, '2414224');
  w.campo('NumeroConsecutivo', c.consecutivo);
  w.campo('FechaEmision', c.fechaEmision);

  // En la FEC el vendedor va en <Emisor> y el obligado tributario que la emite va en <Receptor>.
  const propio = datosEmisorPropio(c.emisor);
  const nodoEmisor = c.tipo === 'FEC' ? c.contraparte : propio;
  const nodoReceptor = c.tipo === 'FEC' ? propio : c.contraparte;
  if (nodoEmisor) w.nodo('Emisor', () => escribirPersona(w, nodoEmisor, 'Emisor'));
  if (nodoReceptor) w.nodo('Receptor', () => escribirPersona(w, nodoReceptor, 'Receptor'), '1212221');

  w.campo('CondicionVenta', b.condicionVenta);
  w.campo('CondicionVentaOtros', b.condicionVentaOtros, '2222224');
  w.campo('PlazoCredito', b.plazoCredito, '2222224');

  if (c.lineas.length > 0) {
    w.nodo('DetalleServicio', () => c.lineas.forEach((l) => escribirLinea(w, l, c.tipo)));
  }

  b.otrosCargos.forEach((o) =>
    w.nodo(
      'OtrosCargos',
      () => {
        w.campo('TipoDocumentoOC', o.tipoDocumento);
        w.campo('TipoDocumentoOTROS', o.tipoDocumentoOtro);
        if (o.tercero) {
          w.nodo('IdentificacionTercero', () => {
            w.campo('Tipo', o.tercero!.identificacion.tipo);
            w.campo('Numero', o.tercero!.identificacion.numero);
          });
          w.campo('NombreTercero', o.tercero.nombre);
        }
        w.campo('Detalle', o.detalle);
        w.campo('PorcentajeOC', o.porcentaje !== undefined ? porcentaje(o.porcentaje) : undefined);
        w.campo('MontoCargo', monto(o.monto));
      },
      '2222224',
    ),
  );

  w.nodo('ResumenFactura', () => {
    w.nodo('CodigoTipoMoneda', () => {
      w.campo('CodigoMoneda', r.codigoMoneda);
      w.campo('TipoCambio', monto(r.tipoCambio));
    });
    w.campo('TotalServGravados', pos(r.totalServGravados), '2222224');
    w.campo('TotalServExentos', pos(r.totalServExentos), '2222224');
    w.campo('TotalServExonerado', pos(r.totalServExonerado), '2422224');
    w.campo('TotalServNoSujeto', pos(r.totalServNoSujeto), '2422224');
    w.campo('TotalMercanciasGravadas', pos(r.totalMercanciasGravadas), '2222224');
    w.campo('TotalMercanciasExentas', pos(r.totalMercanciasExentas), '2222224');
    w.campo('TotalMercExonerada', pos(r.totalMercExonerada), '2422224');
    w.campo('TotalMercNoSujeta', pos(r.totalMercNoSujeta), '2422224');
    w.campo('TotalGravado', pos(r.totalGravado), '2222224');
    w.campo('TotalExento', pos(r.totalExento), '2222224');
    w.campo('TotalExonerado', pos(r.totalExonerado), '2422224');
    w.campo('TotalNoSujeto', pos(r.totalNoSujeto), '2422224');
    w.campo('TotalVenta', monto(r.totalVenta));
    w.campo('TotalDescuentos', pos(r.totalDescuentos), '2222224');
    w.campo('TotalVentaNeta', monto(r.totalVentaNeta));
    r.totalDesgloseImpuesto.forEach((d) =>
      w.nodo(
        'TotalDesgloseImpuesto',
        () => {
          w.campo('Codigo', d.codigo);
          w.campo('CodigoTarifaIVA', d.codigoTarifaIva);
          w.campo('TotalMontoImpuesto', monto(d.totalMontoImpuesto));
        },
        '2222222',
      ),
    );
    if (r.totalDesgloseImpuesto.length > 0) w.campo('TotalImpuesto', monto(r.totalImpuesto), '2222222');
    w.campo('TotalImpAsumEmisorFabrica', pos(r.totalImpAsumEmisorFabrica), '2222224');
    w.campo('TotalIVADevuelto', pos(r.totalIVADevuelto), '2442224');
    w.campo('TotalOtrosCargos', pos(r.totalOtrosCargos), '2222224');
    escribirMediosPago(w, r.mediosPago);
    w.campo('TotalComprobante', monto(r.totalComprobante));
  });

  b.referencias.forEach((ref) =>
    w.nodo('InformacionReferencia', () => {
      w.campo('TipoDocIR', ref.tipoDoc);
      w.campo('TipoDocRefOTRO', ref.tipoDocOtro);
      w.campo('Numero', ref.numero);
      w.campo('FechaEmisionIR', ref.fechaEmision);
      w.campo('Codigo', ref.codigo);
      w.campo('CodigoReferenciaOTRO', ref.codigoOtro);
      w.campo('Razon', ref.razon);
    }),
  );

  if (b.otrosTextos && b.otrosTextos.length > 0) {
    w.nodo('Otros', () => b.otrosTextos!.forEach((t) => w.campo('OtroTexto', t)), '3333334');
  }

  w.crudo(comentarioFirma(c.ambiente));

  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    `<${raiz} xmlns="${ns}" xmlns:ds="http://www.w3.org/2000/09/xmldsig#" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">`,
    indentar(w.toString()),
    `</${raiz}>`,
  ].join('\n');
}

function comentarioFirma(ambiente: string): string {
  return ambiente === 'simulacion'
    ? '<!-- ds:Signature (XAdES-EPES v1.3.2) omitida: documento generado en ENTORNO DE SIMULACIÓN, sin validez tributaria. -->'
    : '<!-- ds:Signature pendiente: debe incorporarse la firma XAdES-EPES antes del envío (Anexo 2). -->';
}

function indentar(texto: string): string {
  return texto
    .split('\n')
    .map((l) => `  ${l}`)
    .join('\n');
}

export interface DatosMensajeReceptor {
  clave: string;
  numeroCedulaEmisor: string;
  fechaEmisionDoc: string;
  mensaje: '1' | '2' | '3';
  detalleMensaje?: string;
  montoTotalImpuesto?: number;
  codigoActividad?: string;
  condicionImpuesto?: string;
  montoTotalImpuestoAcreditar?: number;
  montoTotalDeGastoAplicable?: number;
  totalFactura: number;
  numeroCedulaReceptor: string;
  numConsecutivoReceptor: string;
}

/** Mensaje de confirmación del receptor (Anexo 1 v4.4, sección III, pp. 60-61). */
export function generarXmlMensajeReceptor(m: DatosMensajeReceptor, ambiente = 'simulacion'): string {
  const w = new Escritor('FE');
  w.campo('Clave', m.clave);
  w.campo('NumeroCedulaEmisor', m.numeroCedulaEmisor);
  w.campo('FechaEmisionDoc', m.fechaEmisionDoc);
  w.campo('Mensaje', m.mensaje);
  w.campo('DetalleMensaje', m.detalleMensaje);
  w.campo('MontoTotalImpuesto', m.montoTotalImpuesto !== undefined ? monto(m.montoTotalImpuesto) : undefined);
  w.campo('CodigoActividad', m.codigoActividad);
  w.campo('CondicionImpuesto', m.condicionImpuesto);
  w.campo('MontoTotalImpuestoAcreditar', m.montoTotalImpuestoAcreditar !== undefined ? monto(m.montoTotalImpuestoAcreditar) : undefined);
  w.campo('MontoTotalDeGastoAplicable', m.montoTotalDeGastoAplicable !== undefined ? monto(m.montoTotalDeGastoAplicable) : undefined);
  w.campo('TotalFactura', monto(m.totalFactura));
  w.campo('NumeroCedulaReceptor', m.numeroCedulaReceptor);
  w.campo('NumConsecutivoReceptor', m.numConsecutivoReceptor);
  w.crudo(comentarioFirma(ambiente));
  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    `<MensajeReceptor xmlns="${NS_MENSAJE_RECEPTOR}" xmlns:ds="http://www.w3.org/2000/09/xmldsig#">`,
    indentar(w.toString()),
    '</MensajeReceptor>',
  ].join('\n');
}

export interface DatosMensajeHacienda {
  clave: string;
  nombreEmisor: string;
  tipoIdentificacionEmisor: string;
  numeroCedulaEmisor: string;
  nombreReceptor?: string;
  tipoIdentificacionReceptor?: string;
  numeroCedulaReceptor?: string;
  mensaje: '1' | '2' | '3';
  estadoMensaje: string;
  detalleMensaje: string;
  montoTotalImpuesto?: number;
  totalFactura: number;
}

/**
 * Mensaje de respuesta del Ministerio de Hacienda (pp. 62-63). En este proyecto solo lo produce
 * el SIMULADOR: el XML lleva la marca de simulación y no tiene firma del Ministerio.
 */
export function generarXmlMensajeHacienda(m: DatosMensajeHacienda): string {
  const w = new Escritor('FE');
  w.campo('Clave', m.clave);
  w.campo('NombreEmisor', m.nombreEmisor);
  w.campo('TipoIdentificacionEmisor', m.tipoIdentificacionEmisor);
  w.campo('NumeroCedulaEmisor', m.numeroCedulaEmisor);
  w.campo('NombreReceptor', m.nombreReceptor);
  w.campo('TipoIdentificacionReceptor', m.tipoIdentificacionReceptor);
  w.campo('NumeroCedulaReceptor', m.numeroCedulaReceptor);
  w.campo('Mensaje', m.mensaje);
  w.campo('EstadoMensaje', m.estadoMensaje);
  w.campo('DetalleMensaje', m.detalleMensaje);
  w.campo('MontoTotalImpuesto', m.montoTotalImpuesto !== undefined ? monto(m.montoTotalImpuesto) : undefined);
  w.campo('TotalFactura', monto(m.totalFactura));
  w.crudo('<!-- Respuesta generada por el SIMULADOR local. No proviene del Ministerio de Hacienda. -->');
  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    `<MensajeHacienda xmlns="${NS_MENSAJE_HACIENDA}" xmlns:ds="http://www.w3.org/2000/09/xmldsig#">`,
    indentar(w.toString()),
    '</MensajeHacienda>',
  ].join('\n');
}

/** Nombres de archivo exigidos por la Nota 3 del Anexo. */
export const nombresArchivo = {
  xml: (clave: string) => `${clave}.xml`,
  respuesta: (clave: string) => `${clave}_respuesta.xml`,
  pdf: (clave: string) => `${clave}.pdf`,
  confirmacion: (clave: string, consecutivo: string) => `${clave}-${consecutivo}.xml`,
  confirmacionRespuesta: (clave: string, consecutivo: string) => `${clave}-${consecutivo}_respuesta.xml`,
};
