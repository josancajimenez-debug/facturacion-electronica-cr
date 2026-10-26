import {
  CODIGO_DESCUENTO,
  CODIGO_REFERENCIA,
  CONDICION_VENTA,
  FORMA_FARMACEUTICA,
  INSTITUCION_EXONERACION,
  MEDIO_PAGO,
  MONEDA,
  TARIFA_IVA,
  TIPO_DOC_REFERENCIA,
  TIPO_EXONERACION,
  TIPO_OTROS_CARGOS,
  UNIDAD_MEDIDA,
  type Codigo,
} from './catalogos';
import {
  FUENTE_COMUNICADO,
  FUENTE_V2,
  FUENTE_V2_REFERENCIA,
  REP_TIPOS_DOC_ANTES,
  REP_TIPOS_DOC_V2,
  TIPOS_DOC_CON_CLAVE,
  TIPOS_DOC_CON_CLAVE_V2,
  actualizacionVigente,
} from './actualizacion';
import { REGEX_CLAVE } from './clave';
import { REGEX_FECHA_RFC3339 } from './fechas';
import { verificarUbicacion } from './ubicacion';
import type { BorradorComprobante, Emisor, Identificacion, LineaCalculada, Referencia, Resumen, Validacion } from './tipos';

const ANEXO = 'Anexos y Estructuras v4.4';
const FUENTE_DTA = 'División Territorial Administrativa 2022 (Registro Nacional – IGN); nota 14';

/** Expresión regular de correo electrónico publicada en el Anexo 1 v4.4 (campo CorreoElectronico). */
export const REGEX_CORREO =
  /^\s*(([^<>()[\]\.,;:\s@"]+(\.[^<>()[\]\.,;:\s@"]+)*)|(".+"))@(([^<>()[\]\.,;:\s@"]+\.)+[^<>()[\]\.,;:\s@"]{0,})\s*$/;

/** Formato del número de identificación según la nota 4 (pp. 20 y 23 del Anexo). */
export function validarIdentificacion(id: Identificacion | undefined): string | null {
  if (!id) return 'Identificación requerida.';
  const n = id.numero;
  switch (id.tipo) {
    case '01':
      return /^[1-9]\d{8}$/.test(n) ? null : 'La cédula física debe tener 9 dígitos, sin cero al inicio ni guiones.';
    case '02':
      // Actualización v4.4: el campo pasa de 10 dígitos a 10 caracteres para admitir las cédulas
      // jurídicas alfanuméricas que comunique el Registro Nacional.
      return /^[0-9A-Z]{10}$/.test(n) ? null : 'La cédula jurídica debe tener 10 caracteres (dígitos o letras mayúsculas), sin guiones.';
    case '03':
      return /^[1-9]\d{10,11}$/.test(n) ? null : 'El DIMEX debe tener 11 o 12 dígitos, sin cero al inicio ni guiones.';
    case '04':
      return /^\d{10}$/.test(n) ? null : 'El NITE debe tener 10 dígitos, sin guiones.';
    case '05':
    case '06':
      return /^[A-Za-z0-9]{1,20}$/.test(n) ? null : 'La identificación debe tener hasta 20 caracteres alfanuméricos.';
    default:
      return 'Tipo de identificación no válido (nota 4).';
  }
}

function enCatalogo(cat: Codigo[], codigo: string | undefined): Codigo | undefined {
  return cat.find((c) => c.codigo === codigo);
}

function largo(v: string | undefined, min: number, max: number): boolean {
  const len = (v ?? '').trim().length;
  return len >= min && len <= max;
}

const esAjuste = (tipo: string) => tipo === 'NC' || tipo === 'ND';

/**
 * Valida un borrador antes de emitirlo. No sustituye la validación del Ministerio de Hacienda;
 * reproduce las reglas de condicionalidad y formato documentadas en el Anexo 1 v4.4.
 */
export function validarBorrador(
  b: BorradorComprobante,
  emisor: Emisor,
  resumen?: Resumen,
  lineas?: LineaCalculada[],
  /** Fecha de referencia para la vigencia de la actualización y la antigüedad de las referencias. */
  ahora: Date = new Date(),
): Validacion[] {
  const v: Validacion[] = [];
  const err = (campo: string, mensaje: string, fuente = ANEXO) => v.push({ campo, mensaje, nivel: 'error', fuente });
  const adv = (campo: string, mensaje: string, fuente = ANEXO) => v.push({ campo, mensaje, nivel: 'advertencia', fuente });

  // ---- Emisor (obligado tributario) ----
  if (!largo(emisor.nombre, 5, 100)) err('emisor.nombre', 'El nombre del emisor debe tener entre 5 y 100 caracteres.');
  const errId = validarIdentificacion(emisor.identificacion);
  if (errId) err('emisor.identificacion', errId);
  if (['05', '06'].includes(emisor.identificacion.tipo)) err('emisor.identificacion', 'El obligado tributario emisor debe estar inscrito (tipos 01-04).');
  if (emisor.correos.length < 1 || emisor.correos.length > 4) err('emisor.correos', 'Debe registrar entre 1 y 4 correos electrónicos.');
  emisor.correos.forEach((c, i) => !REGEX_CORREO.test(c) && err(`emisor.correos.${i}`, `Correo inválido: ${c}`));
  if (!emisor.proveedorSistemas) err('proveedorSistemas', 'Indique la identificación del proveedor de sistemas (o la propia si es desarrollo propio).');
  const ubicEmisor = verificarUbicacion(emisor.ubicacion);
  if (ubicEmisor) adv('emisor.ubicacion', ubicEmisor, FUENTE_DTA);

  // ---- Actividad económica ----
  const requiereActEmisor = ['FE', 'FEE', 'TE'].includes(b.tipo) || (esAjuste(b.tipo) && !!b.codigoActividadEmisor);
  if (requiereActEmisor && !b.codigoActividadEmisor) err('codigoActividadEmisor', 'El código de actividad económica del emisor es obligatorio.');
  // En la FEC la actividad del obligado tributario que la emite se consigna en CodigoActividadReceptor.
  const campoPropio = b.tipo === 'FEC' ? 'codigoActividadReceptor' : 'codigoActividadEmisor';
  const actividadPropia = b[campoPropio];
  if (actividadPropia && !emisor.actividades.some((a) => a.codigo === actividadPropia)) {
    adv(campoPropio, 'La actividad indicada no coincide con las registradas para el obligado tributario (Hacienda emitirá advertencia).');
  }
  if (b.tipo === 'FEC' && !b.codigoActividadReceptor) err('codigoActividadReceptor', 'En la FEC la actividad económica del receptor (quien la emite) es obligatoria.');

  // ---- Contraparte ----
  const c = b.contraparte;
  const requiereContraparte = ['FE', 'FEC', 'FEE', 'REP'].includes(b.tipo);
  if (requiereContraparte && !c) err('contraparte', b.tipo === 'FEC' ? 'Debe indicar el vendedor (nodo Emisor de la FEC).' : 'Debe indicar el receptor.');
  if (c) {
    if (!largo(c.nombre, b.tipo === 'FEC' ? 5 : 3, 100)) err('contraparte.nombre', 'Nombre de la contraparte: entre 3 y 100 caracteres (5 en el nodo Emisor).');
    const tipoId = c.identificacion?.tipo;
    if (c.identificacion) {
      const e = validarIdentificacion(c.identificacion);
      if (e) err('contraparte.identificacion', e);
    } else if (['FE', 'FEC', 'FEE', 'REP'].includes(b.tipo)) {
      err('contraparte.identificacion', 'La identificación de la contraparte es obligatoria en este comprobante.');
    }
    if (tipoId === '05') {
      if (b.tipo === 'FE' && b.condicionVenta !== '12') err('contraparte.identificacion', 'En FE el tipo 05 solo se permite con condición de venta 12 (mercancía no nacionalizada).');
      if (b.tipo === 'REP') err('contraparte.identificacion', 'El tipo 05 no se permite en el Recibo Electrónico de Pago.');
      if (b.tipo === 'FEC' && !b.referencias.some((r) => r.tipoDoc === '16')) {
        err('referencias', 'Si el vendedor es extranjero no domiciliado, la FEC debe referenciar el tipo de documento 16.');
      }
    }
    if (tipoId === '06' && !(b.tipo === 'FEC' && b.condicionVenta === '13')) {
      err('contraparte.identificacion', 'El tipo 06 (No contribuyente) solo se permite en FEC con condición de venta 13.');
    }
    if (c.correo && !REGEX_CORREO.test(c.correo)) err('contraparte.correo', 'El correo de la contraparte no cumple el formato del Anexo.');
    if (b.tipo === 'FEC' && tipoId !== '05' && !c.ubicacion) err('contraparte.ubicacion', 'La ubicación del vendedor es obligatoria en la FEC salvo extranjero no domiciliado.');
    if (c.ubicacion) {
      const u = verificarUbicacion(c.ubicacion);
      if (u) adv('contraparte.ubicacion', u, FUENTE_DTA);
    }
  }

  // ---- Condición de venta ----
  const cond = enCatalogo(CONDICION_VENTA, b.condicionVenta);
  if (!cond) err('condicionVenta', 'Condición de venta no válida (nota 5).');
  if (b.condicionVenta === '12' && b.tipo !== 'FE') err('condicionVenta', 'El código 12 solo se permite en Factura Electrónica.');
  if (b.condicionVenta === '13' && b.tipo !== 'FEC') err('condicionVenta', 'El código 13 solo se permite en Factura Electrónica de Compra.');
  if (['09', '11'].includes(b.condicionVenta) !== (b.tipo === 'REP')) {
    err('condicionVenta', 'Los códigos 09 y 11 son exclusivos (y los únicos permitidos) del Recibo Electrónico de Pago.');
  }
  if (b.condicionVenta === '99' && !largo(b.condicionVentaOtros, 5, 100)) err('condicionVentaOtros', 'Describa la condición de venta "Otros" (5-100 caracteres).');
  if (['02', '10'].includes(b.condicionVenta) && !(b.plazoCredito && b.plazoCredito > 0 && b.plazoCredito <= 99999)) {
    err('plazoCredito', 'El plazo de crédito (en días, mayor que cero) es obligatorio para crédito.');
  }

  // ---- Moneda ----
  if (!enCatalogo(MONEDA, b.moneda)) err('moneda', 'El código de moneda no está en la tabla de Hacienda (nota 13.1, Codigodemoneda_V4.4).');
  if (b.moneda === 'CRC' && b.tipoCambio !== 1) err('tipoCambio', 'Para colones (CRC) el tipo de cambio debe ser 1.');
  if (!(b.tipoCambio > 0)) err('tipoCambio', 'El tipo de cambio debe ser mayor que cero.');
  if (b.moneda !== 'CRC') {
    adv('tipoCambio', 'Hacienda verifica que el tipo de cambio coincida con el de referencia de venta del BCCR del día; el simulador no puede consultarlo.', `${ANEXO}, campo TipoCambio (Ley 9635)`);
  }

  // ---- Líneas ----
  const soloCargosSinLineas = ['FE', 'TE', 'NC', 'ND'].includes(b.tipo) && b.otrosCargos.some((o) => ['04', '08', '09', '10'].includes(o.tipoDocumento));
  if (b.lineas.length === 0 && !soloCargosSinLineas) err('lineas', 'Debe incluir al menos una línea de detalle.');
  if (b.lineas.length > 1000) err('lineas', 'Máximo 1000 líneas de detalle.');
  b.lineas.forEach((l, i) => {
    const p = `lineas.${i}`;
    const n = i + 1;
    if (b.tipo !== 'REP') {
      if (!/^\d{13}$/.test(l.codigoCabys)) err(`${p}.codigoCabys`, `Línea ${n}: el código CAByS debe tener 13 dígitos.`);
      if (!(l.cantidad > 0)) err(`${p}.cantidad`, `Línea ${n}: la cantidad debe ser mayor que cero.`);
      if (!(l.precioUnitario > 0)) err(`${p}.precioUnitario`, `Línea ${n}: el precio unitario debe ser mayor que cero.`);
      if (!enCatalogo(UNIDAD_MEDIDA, l.unidadMedida)) err(`${p}.unidadMedida`, `Línea ${n}: unidad de medida no válida (nota 15).`);
    }
    if (!largo(l.detalle, 3, 200)) err(`${p}.detalle`, `Línea ${n}: el detalle debe tener entre 3 y 200 caracteres.`);
    if (l.descuentos.length > 5) err(`${p}.descuentos`, `Línea ${n}: máximo 5 descuentos.`);
    const montoTotal = l.cantidad * l.precioUnitario;
    l.descuentos.forEach((d, j) => {
      if (!enCatalogo(CODIGO_DESCUENTO, d.codigo)) err(`${p}.descuentos.${j}`, `Línea ${n}: código de descuento no válido (nota 20).`);
      if (d.monto !== undefined && (d.monto < 0 || d.monto > montoTotal)) err(`${p}.descuentos.${j}`, `Línea ${n}: el descuento no puede superar el monto total.`);
      if (d.porcentaje !== undefined && !(d.porcentaje >= 0 && d.porcentaje <= 100)) err(`${p}.descuentos.${j}`, `Línea ${n}: el porcentaje de descuento debe estar entre 0 y 100.`);
      if (d.codigo === '99') {
        if (!largo(d.codigoOtro, 5, 100)) err(`${p}.descuentos.${j}`, `Línea ${n}: describa el código de descuento OTRO (5-100).`);
        if (!largo(d.naturaleza, 3, 80)) err(`${p}.descuentos.${j}`, `Línea ${n}: indique la naturaleza del descuento (3-80).`);
      }
    });
    // SubTotal = MontoTotal − descuentos: la suma de varios descuentos tampoco puede superar el monto.
    if (lineas?.[i] && lineas[i].subTotal < 0) err(`${p}.descuentos`, `Línea ${n}: la suma de los descuentos supera el monto total de la línea.`);
    const tarifa = TARIFA_IVA.find((t) => t.codigo === l.codigoTarifaIva);
    if (!tarifa) err(`${p}.codigoTarifaIva`, `Línea ${n}: código de tarifa IVA no válido (nota 8.1).`);
    else if (tarifa.soloAjustes && !esAjuste(b.tipo)) err(`${p}.codigoTarifaIva`, `Línea ${n}: la tarifa "${tarifa.descripcion}" solo se usa en notas de crédito o débito.`);
    if (b.tipo === 'FEE' && /^[0-4]/.test(l.codigoCabys) && !/^\d{12,}$/.test(l.partidaArancelaria ?? '')) {
      err(`${p}.partidaArancelaria`, `Línea ${n}: la partida arancelaria (al menos 12 dígitos) es obligatoria para mercancías en FEE.`);
    }
    if (l.formaFarmaceutica && !enCatalogo(FORMA_FARMACEUTICA, l.formaFarmaceutica)) {
      err(`${p}.formaFarmaceutica`, `Línea ${n}: la forma farmacéutica ${l.formaFarmaceutica} no está en la tabla «Código de forma farmacéutica» de Hacienda (nota 19).`);
    }
    if (l.registroMedicamento && !l.formaFarmaceutica) {
      adv(`${p}.formaFarmaceutica`, `Línea ${n}: con registro de medicamento, la forma farmacéutica (nota 19) se vuelve obligatoria.`);
    }
    if (l.exoneracion) {
      const ex = l.exoneracion;
      if (b.tipo === 'FEE') err(`${p}.exoneracion`, `Línea ${n}: la FEE no admite exoneraciones.`);
      const tipoEx = enCatalogo(TIPO_EXONERACION, ex.tipoDocumento);
      if (!tipoEx) err(`${p}.exoneracion`, `Línea ${n}: tipo de documento de exoneración no válido (nota 10.1).`);
      else if (tipoEx.soloAjustes && !esAjuste(b.tipo)) err(`${p}.exoneracion`, `Línea ${n}: el tipo de exoneración ${ex.tipoDocumento} está inhabilitado salvo en NC/ND.`);
      if (ex.tipoDocumento === '99' && !largo(ex.tipoDocumentoOtro, 5, 100)) err(`${p}.exoneracion`, `Línea ${n}: describa el tipo de documento OTRO.`);
      if (!largo(ex.numeroDocumento, 3, 40)) err(`${p}.exoneracion`, `Línea ${n}: el número de documento debe tener entre 3 y 40 caracteres.`);
      if (['02', '03', '06', '07', '08'].includes(ex.tipoDocumento) && !ex.articulo) err(`${p}.exoneracion`, `Línea ${n}: indique el artículo de la ley que establece la exoneración.`);
      if (ex.tipoDocumento === '04' && !/^AL-\d{8}-\d{2}$/i.test(ex.numeroDocumento)) {
        adv(`${p}.exoneracion`, `Línea ${n}: las autorizaciones de Hacienda suelen tener el formato AL-XXXXXXXX-XX.`, 'API pública api.hacienda.go.cr (/fe/ex)');
      }
      if (!enCatalogo(INSTITUCION_EXONERACION, ex.institucion)) err(`${p}.exoneracion`, `Línea ${n}: institución no válida (nota 23).`);
      if (ex.institucion === '99' && !largo(ex.institucionOtro, 5, 160)) err(`${p}.exoneracion`, `Línea ${n}: indique el nombre de la institución OTRO.`);
      if (!REGEX_FECHA_RFC3339.test(ex.fechaEmision)) err(`${p}.exoneracion`, `Línea ${n}: fecha de emisión de la exoneración en formato RFC 3339.`);
      if (tarifa && ex.tarifaExonerada > tarifa.tarifa) err(`${p}.exoneracion`, `Línea ${n}: la tarifa exonerada no puede superar la tarifa del IVA.`);
      if (!(ex.tarifaExonerada > 0)) err(`${p}.exoneracion`, `Línea ${n}: la tarifa exonerada debe ser mayor que cero.`);
    }
  });

  // ---- Otros cargos ----
  if (b.otrosCargos.length > 15) err('otrosCargos', 'Máximo 15 otros cargos.');
  b.otrosCargos.forEach((o, i) => {
    if (!enCatalogo(TIPO_OTROS_CARGOS, o.tipoDocumento)) err(`otrosCargos.${i}`, 'Tipo de documento de otros cargos no válido (nota 16).');
    if (o.tipoDocumento === '99' && !largo(o.tipoDocumentoOtro, 5, 100)) err(`otrosCargos.${i}`, 'Describa el tipo de documento OTRO.');
    if (o.tipoDocumento === '04') {
      if (!o.tercero) err(`otrosCargos.${i}`, 'El cobro de un tercero requiere su identificación y nombre.');
      else {
        const e = validarIdentificacion(o.tercero.identificacion);
        if (e) err(`otrosCargos.${i}`, `Tercero: ${e}`);
        if (!largo(o.tercero.nombre, 5, 100)) err(`otrosCargos.${i}`, 'Nombre del tercero: 5 a 100 caracteres.');
      }
    }
    if (!largo(o.detalle, 1, 160)) err(`otrosCargos.${i}`, 'Indique el detalle del cargo (máx. 160).');
    if (!(o.monto > 0)) err(`otrosCargos.${i}`, 'El monto del cargo debe ser mayor que cero.');
  });

  // ---- Medios de pago ----
  const exentoMedioPago = ['02', '08', '10'].includes(b.condicionVenta);
  if (b.mediosPago.length === 0 && !exentoMedioPago) err('mediosPago', 'Indique al menos un medio de pago (salvo ventas a crédito 02, 08 y 10).');
  if (b.mediosPago.length > 4) err('mediosPago', 'Máximo 4 medios de pago.');
  b.mediosPago.forEach((m, i) => {
    if (!enCatalogo(MEDIO_PAGO, m.tipo)) err(`mediosPago.${i}`, 'Medio de pago no válido (nota 6).');
    if (m.tipo === '99' && !largo(m.otros, 3, 100)) err(`mediosPago.${i}`, 'Describa el medio de pago "Otros" (3-100).');
    if (b.mediosPago.length > 1 && !(m.monto && m.monto > 0)) err(`mediosPago.${i}`, 'Con varios medios de pago, cada monto debe ser mayor que cero.');
  });
  if (b.mediosPago.some((m) => m.tipo === '06') && emisor.telefonosSinpe.length === 0) {
    adv(
      'mediosPago',
      'Se cobra por SINPE Móvil pero el emisor no tiene números SINPE registrados. El Decreto 45953-H obliga a registrarlos en el RUT según la resolución general que se emita.',
      'Decreto 45953-H (art. 22 inc. 3 RPT)',
    );
  }
  if (resumen && b.mediosPago.length > 1) {
    const suma = b.mediosPago.reduce((s, m) => s + (m.monto ?? 0), 0);
    if (Math.abs(suma - resumen.totalComprobante) > 0.00001) {
      err('mediosPago', `La suma de los medios de pago (${suma.toFixed(5)}) debe coincidir con el total del comprobante (${resumen.totalComprobante.toFixed(5)}).`);
    }
  }

  // ---- Referencias ----
  if (b.referencias.length > 10) err('referencias', 'Máximo 10 referencias.');
  const requiereRef = ['NC', 'ND', 'FEC', 'REP'].includes(b.tipo) || b.lineas.some((l) => l.exoneracion?.tipoDocumento === '11');
  if (requiereRef && b.referencias.length === 0) err('referencias', 'Este comprobante requiere información de referencia.');
  const vigente = actualizacionVigente(ahora);
  const exigirV2 = (campo: string, mensaje: string, fuente = FUENTE_V2_REFERENCIA) =>
    (vigente ? err : adv)(campo, `${mensaje}${vigente ? '' : ` (obligatorio ${DESDE_VIGENCIA})`}`, fuente);
  b.referencias.forEach((r, i) => {
    const td = enCatalogo(TIPO_DOC_REFERENCIA, r.tipoDoc);
    if (!td) err(`referencias.${i}`, 'Tipo de documento de referencia no válido (nota 10).');
    if (r.tipoDoc === '16' && b.tipo !== 'FEC') err(`referencias.${i}`, 'El tipo de documento 16 solo se permite en la FEC.');
    if (b.tipo === 'REP') {
      if (!REP_TIPOS_DOC_ANTES.includes(r.tipoDoc) && !REP_TIPOS_DOC_V2.includes(r.tipoDoc)) {
        err(`referencias.${i}`, `En el REP solo se permiten las referencias ${REP_TIPOS_DOC_V2.join(', ')} (antes de la actualización: ${REP_TIPOS_DOC_ANTES.join(', ')}).`);
      } else if (!REP_TIPOS_DOC_V2.includes(r.tipoDoc)) {
        exigirV2(`referencias.${i}`, `Con la actualización v4.4 el REP ya no puede referenciar notas de débito (02) ni de crédito (03); se admiten ${REP_TIPOS_DOC_V2.join(', ')}`);
      } else if (!vigente && !REP_TIPOS_DOC_ANTES.includes(r.tipoDoc)) {
        adv(`referencias.${i}`, `El tipo ${r.tipoDoc} en el REP es de uso voluntario hasta el 31/10/2026 y obligatorio ${DESDE_VIGENCIA}.`, FUENTE_V2_REFERENCIA);
      }
    }
    if (r.tipoDoc === '99' && !largo(r.tipoDocOtro, 5, 100)) err(`referencias.${i}`, 'Describa el tipo de documento de referencia OTRO.');
    if (r.tipoDoc !== '13') {
      if (!r.numero) err(`referencias.${i}`, 'Indique la clave o número del documento de referencia.');
      const conClave = r.numero && !REGEX_CLAVE.test(r.numero);
      if (TIPOS_DOC_CON_CLAVE.includes(r.tipoDoc) && conClave) {
        err(`referencias.${i}`, 'El documento referenciado debe identificarse con su clave de 50 posiciones.');
      }
      if (TIPOS_DOC_CON_CLAVE_V2.includes(r.tipoDoc) && conClave) {
        exigirV2(`referencias.${i}`, `Para el tipo de documento ${r.tipoDoc} la clave de 50 posiciones del documento referenciado es obligatoria`);
      }
      if (!r.codigo || !enCatalogo(CODIGO_REFERENCIA, r.codigo)) err(`referencias.${i}`, 'Código de referencia no válido (nota 9).');
      if (!largo(r.razon, 3, 180)) err(`referencias.${i}`, 'La razón de la referencia debe tener entre 3 y 180 caracteres.');
    }
    if (r.codigo === '99' && !largo(r.codigoOtro, 5, 100)) err(`referencias.${i}`, 'Describa el código de referencia OTRO.');
    validarCodigosActualizacion(b.tipo, r, vigente, (nivel, m, fuente) => (nivel === 'error' ? err : adv)(`referencias.${i}`, m, fuente));
    if (!REGEX_FECHA_RFC3339.test(r.fechaEmision)) err(`referencias.${i}`, 'Fecha del documento de referencia en formato RFC 3339.');
    else if (ahora.getTime() - new Date(r.fechaEmision).getTime() > 10 * 365.25 * 86400000) {
      err(`referencias.${i}`, 'La fecha de referencia no puede superar 10 años de antigüedad.');
    }
  });

  // ---- Situación ----
  if (b.situacion === '2' && !b.referencias.some((r) => r.tipoDoc === '08' || r.codigo === '05')) {
    err('referencias', 'Un comprobante en contingencia debe referenciar el comprobante provisional (tipo 08 / código 05).', 'Decreto 44739-H art. 23');
  }

  // ---- Sucursal y terminal ----
  if (!/^\d{3}$/.test(b.sucursal)) err('sucursal', 'La sucursal debe tener 3 dígitos.');
  // RES-0027 art. 2 y nota 3: la numeración se lleva por sucursal (001 casa matriz) y terminal registradas.
  if (emisor.sucursales?.length) {
    const suc = emisor.sucursales.find((s) => s.codigo === b.sucursal);
    if (!suc) err('sucursal', `La sucursal ${b.sucursal} no está registrada para el emisor.`, `RES-0027-2024 art. 2; ${ANEXO}, nota 3`);
    else if (!suc.terminales.includes(b.terminal)) err('terminal', `La terminal ${b.terminal} no está registrada en la sucursal ${b.sucursal}.`, `RES-0027-2024 art. 2; ${ANEXO}, nota 3`);
  }
  if (!/^\d{5}$/.test(b.terminal)) err('terminal', 'La terminal debe tener 5 dígitos.');

  return v;
}

const DESDE_VIGENCIA = 'a partir del 1.º de noviembre de 2026';
const NOTA9 = `${FUENTE_V2}; nota 9`;
const FUENTE_AJUSTES = `Decreto 44739-H art. 10; RES-0027-2024 art. 9; ${NOTA9}`;
const FUENTE_SUSTITUCION = `Decreto 44739-H arts. 19-20; ${NOTA9}`;
const FUENTE_RECHAZADO = `Decreto 44739-H art. 19; nota 10 código 10; ${NOTA9}`;

/**
 * Códigos de referencia 13-17. Las reglas de uso exclusivo son errores siempre (se derivan del
 * Reglamento y de la RES-0027); las que exigen el código nuevo en lugar del anterior son
 * advertencias antes de VIGENCIA_CODIGOS_ACTUALIZACION y errores desde ese día.
 */
function validarCodigosActualizacion(
  tipo: BorradorComprobante['tipo'],
  r: Referencia,
  vigente: boolean,
  reportar: (nivel: Validacion['nivel'], mensaje: string, fuente: string) => void,
): void {
  const err = (m: string, fuente: string) => reportar('error', m, fuente);
  const exigir = (m: string, fuente: string) => reportar(vigente ? 'error' : 'advertencia', `${m} (obligatorio ${DESDE_VIGENCIA}).`, fuente);
  const ajuste = tipo === 'NC' || tipo === 'ND';
  if (r.codigo === '13' && tipo !== 'NC') err('El código 13 «Anula documento de referencia por error material» solo se usa en notas de crédito: un comprobante válido solo se anula con nota de crédito.', FUENTE_AJUSTES);
  if (r.codigo === '14' && !ajuste) err('El código 14 «Corrige monto por error material» solo se usa en notas de crédito o débito.', FUENTE_AJUSTES);
  if (r.codigo === '12' && tipo !== 'NC') err('El código 12 «Nota de crédito financiera por exoneración posterior a la facturación» solo se usa en notas de crédito.', NOTA9);
  if ((r.codigo === '13' || r.codigo === '14') && ajuste && r.fechaEmision) {
    const periodo = r.fechaEmision.slice(0, 7).split('-').reverse().join('/');
    reportar('advertencia', `Código ${r.codigo}: el efecto contable se refleja en el período del comprobante que se modifica (${periodo}), no en el mes de emisión de la nota.`, NOTA9);
  }
  if ((r.codigo === '15' || r.codigo === '16') && (ajuste || tipo === 'REP')) {
    err(`El código ${r.codigo} se usa en el comprobante que sustituye, no en notas de crédito, débito ni en el REP.`, FUENTE_SUSTITUCION);
  }
  if (r.codigo === '16' && r.tipoDoc !== '10') err('El código 16 «Sustituye comprobante electrónico rechazado» se usa con el tipo de documento 10.', FUENTE_RECHAZADO);
  if (r.codigo === '17' && tipo !== 'REP') err('El código 17 «Pago a comprobante electrónico» es exclusivo del Recibo Electrónico de Pago.', NOTA9);
  if (tipo === 'REP' && r.codigo !== '17') exigir('El REP debe referenciar el comprobante pagado con el código 17 «Pago a comprobante electrónico»', `${NOTA9}; ${FUENTE_COMUNICADO}`);
  // Un comprobante rechazado carece de validez: no se ajusta con notas, se sustituye (el REP sí puede
  // referenciarlo, pero siempre con el código 17).
  if (r.tipoDoc === '10' && ajuste) err('Un comprobante rechazado por Hacienda no se ajusta con notas de crédito o débito: se sustituye por uno nuevo.', FUENTE_RECHAZADO);
  if (r.tipoDoc === '10' && !ajuste && tipo !== 'REP' && r.codigo !== '16') exigir('Para sustituir un comprobante rechazado por Hacienda use el código 16', FUENTE_RECHAZADO);
}

export function hayErrores(v: Validacion[]): boolean {
  return v.some((x) => x.nivel === 'error');
}
