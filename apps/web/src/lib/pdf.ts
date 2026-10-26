/**
 * Representación gráfica en PDF (art. 5, MH-DGT-RES-0027-2024).
 * - Nota 1 del Anexo: tipo de documento, clave y consecutivo se muestran juntos.
 * - Nota 7: los códigos se imprimen con su descripción.
 * - Código QR: el Transitorio III de la resolución suspende su entrada en vigor hasta que la DGT
 *   lo comunique; por eso es opcional y está desactivado por defecto (Configuración).
 */
import {
  CONDICION_VENTA,
  FORMA_FARMACEUTICA,
  FORMAS_FARMACEUTICAS_MINSA,
  MEDIO_PAGO,
  NOMBRE_COMPROBANTE,
  TARIFA_IVA,
  nombreUbicacion,
  TIPO_DOC_REFERENCIA,
  TIPO_IDENTIFICACION,
  descripcion,
  type Comprobante,
  type Contraparte,
} from '@fe-cr/core';
import { fechaHora, numero } from './formato';

export async function generarPdf(c: Comprobante, opciones: { incluirQr: boolean }): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const M = 14;
  const ancho = 210 - 2 * M;
  let y = M;
  const mon = c.resumen.codigoMoneda;
  const $ = (v: number) => numero(v, 2);
  const INICIO = 16;
  const LIMITE = 272; // por debajo quedan el pie y el QR

  /** Salta de página si el bloque siguiente no cabe; devuelve true si saltó. */
  const asegurar = (alto: number): boolean => {
    if (y + alto <= LIMITE) return false;
    doc.addPage();
    y = INICIO;
    return true;
  };
  y = INICIO;

  // Bloque del documento (Nota 1: tipo, clave y consecutivo juntos)
  const bx = 118;
  doc.setDrawColor(15, 118, 110).setLineWidth(0.4).roundedRect(bx, y, 210 - M - bx, 34, 2, 2);
  doc.setTextColor(15, 118, 110).setFontSize(11.5).text(NOMBRE_COMPROBANTE[c.tipo], bx + 3, y + 6);
  doc.setTextColor(30, 41, 59).setFontSize(7.5).setFont('helvetica', 'normal');
  doc.text('Clave numérica:', bx + 3, y + 11.5);
  doc.setFont('courier', 'normal').setFontSize(7.6);
  doc.text(c.clave.slice(0, 25), bx + 3, y + 15);
  doc.text(c.clave.slice(25), bx + 3, y + 18.5);
  doc.setFont('helvetica', 'normal').setFontSize(7.5).text('Consecutivo:', bx + 3, y + 23);
  doc.setFont('courier', 'normal').setFontSize(8).text(c.consecutivo, bx + 22, y + 23);
  doc.setFont('helvetica', 'normal').setFontSize(7.5).text(`Fecha de emisión: ${fechaHora(c.fechaEmision)}`, bx + 3, y + 28);
  doc.text(`Situación: ${{ '1': 'Normal', '2': 'Contingencia', '3': 'Sin internet' }[c.situacion]}`, bx + 3, y + 32);

  // Emisor (en la FEC el nodo Emisor es el vendedor)
  const propio: Contraparte = { nombre: c.emisor.nombre, nombreComercial: c.emisor.nombreComercial, identificacion: c.emisor.identificacion, ubicacion: c.emisor.ubicacion, telefono: c.emisor.telefono, correo: c.emisor.correos.join(', ') };
  const nodoEmisor = c.tipo === 'FEC' ? c.contraparte : propio;
  const nodoReceptor = c.tipo === 'FEC' ? propio : c.contraparte;
  const persona = (p: Contraparte | undefined, titulo: string, x: number, yy: number, w: number) => {
    doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(100, 116, 139).text(titulo, x, yy);
    if (!p) {
      doc.setFont('helvetica', 'normal').setTextColor(30, 41, 59).text('Consumidor final', x, yy + 4.5);
      return yy + 8;
    }
    doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(15, 23, 42);
    const nombre = doc.splitTextToSize(p.nombre, w);
    doc.text(nombre, x, yy + 4.5);
    let yy2 = yy + 4.5 + nombre.length * 4.2;
    doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(30, 41, 59);
    const lineas = [
      p.nombreComercial,
      p.identificacion ? `${descripcion(TIPO_IDENTIFICACION, p.identificacion.tipo)}: ${p.identificacion.numero}` : undefined,
      p.ubicacion ? `${nombreUbicacion(p.ubicacion)}. ${p.ubicacion.barrio ? `${p.ubicacion.barrio}. ` : ''}${p.ubicacion.otrasSenas}` : p.otrasSenasExtranjero,
      p.telefono ? `Tel. +${p.telefono.codigoPais} ${p.telefono.numero}` : undefined,
      p.correo,
    ].filter(Boolean) as string[];
    for (const l of lineas) {
      const partes = doc.splitTextToSize(l, w);
      doc.text(partes, x, yy2);
      yy2 += partes.length * 3.6;
    }
    return yy2;
  };
  const yEmisor = persona(nodoEmisor, c.tipo === 'FEC' ? 'VENDEDOR' : 'EMISOR', M, y + 2, 98);
  y = Math.max(yEmisor, y + 36) + 3;
  const yReceptor = persona(nodoReceptor, c.tipo === 'FEC' ? 'RECEPTOR (EMITE LA FEC)' : 'RECEPTOR', M, y, 98);

  // Condiciones
  doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(30, 41, 59);
  const cond = [
    `Condición de venta: ${descripcion(CONDICION_VENTA, c.borrador.condicionVenta)}${c.borrador.plazoCredito ? ` (${c.borrador.plazoCredito} días)` : ''}`,
    `Medio(s) de pago: ${c.resumen.mediosPago.map((m) => (m.tipo === '99' ? m.otros : descripcion(MEDIO_PAGO, m.tipo))).join(', ') || 'No aplica (crédito)'}`,
    `Moneda: ${mon}${mon !== 'CRC' ? ` · Tipo de cambio: ${c.resumen.tipoCambio}` : ''}`,
    `Actividad económica: ${c.tipo === 'FEC' ? c.borrador.codigoActividadReceptor ?? '' : c.borrador.codigoActividadEmisor ?? ''}`,
  ];
  cond.forEach((t, i) => doc.text(doc.splitTextToSize(t, 80), bx, y + i * 4.4));
  y = Math.max(yReceptor, y + 18) + 4;

  // Tabla de detalle
  const cols = [
    { t: '#', w: 7, a: 'left' },
    { t: 'Cant.', w: 14, a: 'right' },
    { t: 'Unid.', w: 12, a: 'left' },
    { t: 'CAByS', w: 25, a: 'left' },
    { t: 'Detalle', w: 54, a: 'left' },
    { t: 'P. unitario', w: 22, a: 'right' },
    { t: 'Desc.', w: 16, a: 'right' },
    { t: 'IVA', w: 10, a: 'right' },
    { t: 'Total', w: ancho - 160, a: 'right' },
  ] as const;
  const encabezado = () => {
    doc.setFillColor(241, 245, 249).rect(M, y, ancho, 6, 'F');
    doc.setFont('helvetica', 'bold').setFontSize(7.5).setTextColor(71, 85, 105);
    let x = M;
    cols.forEach((col) => {
      doc.text(col.t, col.a === 'right' ? x + col.w - 1 : x + 1, y + 4, { align: col.a });
      x += col.w;
    });
    y += 7;
  };
  encabezado();
  doc.setFont('helvetica', 'normal').setTextColor(15, 23, 42);
  for (const l of c.lineas) {
    // Nota 7: se imprime la descripción del código (tabla de Hacienda; si no hay, la referencia del Ministerio de Salud).
    const forma = l.formaFarmaceutica
      ? `${descripcion(FORMA_FARMACEUTICA, l.formaFarmaceutica)} (${l.formaFarmaceutica})`
      : l.formaFarmaceuticaMinsa ? descripcion(FORMAS_FARMACEUTICAS_MINSA, l.formaFarmaceuticaMinsa) : undefined;
    const textoDetalle = [l.detalle, l.registroMedicamento ? `Reg. sanitario: ${l.registroMedicamento}` : '', forma ? `Forma farmacéutica: ${forma}` : '']
      .filter(Boolean)
      .join(' · ');
    const detalle = doc.splitTextToSize(textoDetalle, cols[4].w - 2) as string[];
    const alto = Math.max(1, detalle.length) * 3.6 + 1.5;
    if (asegurar(alto)) {
      encabezado();
      doc.setFont('helvetica', 'normal').setTextColor(15, 23, 42);
    }
    const iva = l.impuestos.find((i) => i.codigo === '01');
    const valores = [
      String(l.numeroLinea),
      numero(l.cantidad, 3),
      l.unidadMedida,
      l.codigoCabys,
      detalle,
      $(l.precioUnitario),
      $(l.descuentos.reduce((s, d) => s + d.monto, 0)),
      iva ? `${iva.tarifa}%` : '',
      $(l.montoTotalLinea),
    ];
    let x = M;
    doc.setFontSize(7.5);
    cols.forEach((col, k) => {
      doc.text(valores[k] as string | string[], col.a === 'right' ? x + col.w - 1 : x + 1, y + 3, { align: col.a });
      x += col.w;
    });
    y += alto;
    doc.setDrawColor(226, 232, 240).setLineWidth(0.2).line(M, y - 0.8, M + ancho, y - 0.8);
  }
  c.borrador.otrosCargos.forEach((o) => {
    asegurar(5);
    doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(15, 23, 42).text(`Otro cargo: ${o.detalle}`, M + 1, y + 3);
    doc.text($(o.monto), M + ancho - 1, y + 3, { align: 'right' });
    y += 5;
  });

  // Totales (el bloque completo va en una sola página)
  y += 3;
  const r = c.resumen;
  const filas: [string, number][] = [
    ['Total servicios gravados', r.totalServGravados],
    ['Total servicios exentos', r.totalServExentos],
    ['Total servicios exonerados', r.totalServExonerado],
    ['Total servicios no sujetos', r.totalServNoSujeto],
    ['Total mercancías gravadas', r.totalMercanciasGravadas],
    ['Total mercancías exentas', r.totalMercanciasExentas],
    ['Total mercancías exoneradas', r.totalMercExonerada],
    ['Total mercancías no sujetas', r.totalMercNoSujeta],
    ['Total venta', r.totalVenta],
    ['Total descuentos', r.totalDescuentos],
    ['Total venta neta', r.totalVentaNeta],
    ['Total impuesto', r.totalImpuesto],
    ['Impuesto asumido por el emisor', r.totalImpAsumEmisorFabrica],
    ['IVA devuelto', r.totalIVADevuelto],
    ['Total otros cargos', r.totalOtrosCargos],
  ].filter(([k, v]) => v !== 0 || ['Total venta', 'Total venta neta', 'Total impuesto'].includes(k as string)) as [string, number][];
  asegurar(Math.max(filas.length, r.totalDesgloseImpuesto.length + 1) * 4.4 + 12);
  const tx = 118;
  doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(30, 41, 59);
  filas.forEach(([k, v]) => {
    doc.text(doc.splitTextToSize(k, 58), tx, y);
    doc.text($(v), M + ancho, y, { align: 'right' });
    y += 4.4;
  });
  doc.setFont('helvetica', 'bold').setFontSize(11).text('TOTAL', tx, y + 2);
  doc.text(`${mon} ${$(r.totalComprobante)}`, M + ancho, y + 2, { align: 'right' });
  const yDesglose = y - filas.length * 4.4;
  doc.setFont('helvetica', 'bold').setFontSize(8).text('Desglose de impuestos', M, yDesglose);
  doc.setFont('helvetica', 'normal');
  r.totalDesgloseImpuesto.forEach((d, i) => {
    doc.text(`${d.codigo === '01' ? 'Impuesto sobre el Valor Agregado' : `Impuesto ${d.codigo}`} ${d.codigoTarifaIva ? descripcion(TARIFA_IVA, d.codigoTarifaIva) : ''}: ${$(d.totalMontoImpuesto)}`, M, yDesglose + 4.4 * (i + 1));
  });
  y = Math.max(y, yDesglose + 4.4 * (r.totalDesgloseImpuesto.length + 1)) + 10;

  // Referencias
  if (c.borrador.referencias.length) {
    asegurar(10);
    doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(30, 41, 59).text('Información de referencia', M, y);
    doc.setFont('helvetica', 'normal');
    c.borrador.referencias.forEach((ref) => {
      const texto = doc.splitTextToSize(`${descripcion(TIPO_DOC_REFERENCIA, ref.tipoDoc)} ${ref.numero ?? ''} — ${ref.razon ?? ''}`, ancho - 35) as string[];
      asegurar(texto.length * 3.6 + 4.2);
      y += 4.2;
      doc.text(texto, M, y);
      y += (texto.length - 1) * 3.6;
    });
    y += 6;
  }

  // Estado de validación
  asegurar(6);
  const resp = c.respuestaHacienda;
  doc.setFontSize(8).setFont('helvetica', 'bold');
  doc.setTextColor(resp?.estado === 'aceptado' ? 21 : resp?.estado === 'rechazado' ? 185 : 100, resp?.estado === 'aceptado' ? 128 : 28, resp?.estado === 'aceptado' ? 61 : 28);
  doc.text(`Estado de validación (SIMULADO): ${resp ? resp.estado.toUpperCase() : c.estado.toUpperCase()}${resp ? ` · ${fechaHora(resp.fecha)}` : ''}`, M, y);
  y += 6;

  // QR en la esquina inferior derecha de la última página (mínimo 2,5 × 2,5 cm, art. 5).
  if (opciones.incluirQr) {
    const yQr = 297 - M - 30;
    if (y > yQr - 2) {
      doc.addPage();
      y = INICIO;
    }
    const QR = await import('qrcode');
    const dataUrl = await QR.toDataURL(c.clave, { margin: 0, width: 300 });
    doc.addImage(dataUrl, 'PNG', 210 - M - 26, yQr, 26, 26);
  }

  // Franja de simulación y pie en TODAS las páginas: ninguna hoja suelta debe parecer un documento real.
  const paginas = doc.getNumberOfPages();
  for (let i = 1; i <= paginas; i++) {
    doc.setPage(i);
    doc.setFillColor(255, 237, 213).rect(0, 0, 210, 9, 'F');
    doc.setFontSize(8.5).setTextColor(124, 45, 18).setFont('helvetica', 'bold');
    doc.text('ENTORNO DE SIMULACIÓN — DOCUMENTO SIN VALIDEZ TRIBUTARIA — NO ENVIADO AL MINISTERIO DE HACIENDA', 105, 6, { align: 'center' });
    doc.setTextColor(100, 116, 139).setFont('helvetica', 'normal').setFontSize(7);
    doc.text('Versión del documento 4.4 · Representación gráfica de un comprobante electrónico generado en un simulador educativo.', M, 287);
    doc.text(`${c.consecutivo} · Página ${i} de ${paginas}`, 210 - M, 291, { align: 'right' });
  }

  return doc.output('blob');
}
