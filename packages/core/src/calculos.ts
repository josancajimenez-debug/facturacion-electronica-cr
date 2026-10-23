import Decimal from 'decimal.js';
import { tarifaIva, type TipoComprobante } from './catalogos';
import type {
  BorradorComprobante,
  DescuentoCalculado,
  DesgloseImpuesto,
  ImpuestoCalculado,
  LineaBorrador,
  LineaCalculada,
  Resumen,
} from './tipos';

Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

const D = (v: number | string | Decimal) => new Decimal(v);

/** Redondeo a 5 decimales (Anexo 1, II: método de redondeo "mitad hacia arriba"). */
export function r5(v: number | Decimal): number {
  return D(v).toDecimalPlaces(5, Decimal.ROUND_HALF_UP).toNumber();
}

const CODIGOS_REGALIA_BONIFICACION = ['01', '03'];

/** Servicio si el código CAByS inicia con 5-9; mercancía si inicia con 0-4 (reglas del resumen, pp. 50-52). */
export function esCabysServicio(cabys: string): boolean {
  return /^[5-9]/.test(cabys);
}

/**
 * Cálculo de una línea de detalle conforme a las descripciones de campo del Anexo 1 v4.4:
 * MontoTotal = Cantidad × PrecioUnitario; SubTotal = MontoTotal − descuentos;
 * BaseImponible = SubTotal + impuestos que integran la base (02 selectivo, 12 cemento);
 * Monto IVA = tarifa × BaseImponible (o × MontoTotal en regalías/bonificaciones);
 * MontoExoneracion = TarifaExonerada × BaseImponible; ImpuestoNeto = impuestos − exonerado − asumido;
 * MontoTotalLinea = SubTotal + ImpuestoNeto.
 *
 * Fuera de alcance (no se calculan): impuestos específicos no tarifarios 03-06, IVA cobrado
 * a nivel de fábrica (nota 21), IVA de bienes usados por factor (08) y surtidos.
 */
export function calcularLinea(linea: LineaBorrador, numeroLinea: number, tipo: TipoComprobante): LineaCalculada {
  const montoTotal = D(linea.cantidad).times(linea.precioUnitario).toDecimalPlaces(5);

  // Cada descuento adicional se calcula sobre la base menos el descuento anterior.
  let baseDescuento = montoTotal;
  const descuentos: DescuentoCalculado[] = linea.descuentos.map((d) => {
    const monto =
      d.monto !== undefined && d.monto !== null
        ? D(d.monto)
        : baseDescuento.times(d.porcentaje ?? 0).dividedBy(100).toDecimalPlaces(5);
    baseDescuento = baseDescuento.minus(monto);
    return { codigo: d.codigo, monto: r5(monto), codigoOtro: d.codigoOtro, naturaleza: d.naturaleza };
  });
  const totalDescuentos = descuentos.reduce((s, d) => s.plus(d.monto), D(0));
  const subTotal = montoTotal.minus(totalDescuentos);
  const esRegaliaBonificacion = descuentos.some((d) => CODIGOS_REGALIA_BONIFICACION.includes(d.codigo));

  const impuestos: ImpuestoCalculado[] = [];
  let baseImponible = subTotal;
  for (const adicional of linea.impuestosAdicionales ?? []) {
    const monto = subTotal.times(adicional.tarifa).dividedBy(100).toDecimalPlaces(5);
    impuestos.push({ codigo: adicional.codigo, codigoOtro: adicional.codigoOtro, tarifa: adicional.tarifa, monto: monto.toNumber() });
    if (adicional.codigo === '02' || adicional.codigo === '12') baseImponible = baseImponible.plus(monto);
  }

  const tarifa = tarifaIva(linea.codigoTarifaIva);
  if (!tarifa) throw new Error(`Línea ${numeroLinea}: código de tarifa IVA inválido (${linea.codigoTarifaIva}).`);
  const baseIva = esRegaliaBonificacion ? montoTotal : baseImponible;
  const montoIva = baseIva.times(tarifa.tarifa).dividedBy(100).toDecimalPlaces(5);
  const iva: ImpuestoCalculado = {
    codigo: '01',
    codigoTarifaIva: tarifa.codigo,
    tarifa: tarifa.tarifa,
    monto: montoIva.toNumber(),
  };
  if (linea.montoExportacion !== undefined) iva.montoExportacion = r5(linea.montoExportacion);

  let montoExonerado = D(0);
  if (linea.exoneracion && tipo !== 'FEE') {
    const tasa = Math.min(linea.exoneracion.tarifaExonerada, tarifa.tarifa);
    montoExonerado = baseImponible.times(tasa).dividedBy(100).toDecimalPlaces(5);
    if (montoExonerado.greaterThan(montoIva)) montoExonerado = montoIva;
    iva.exoneracion = { ...linea.exoneracion, montoExoneracion: montoExonerado.toNumber() };
  }
  impuestos.unshift(iva);

  const totalImpuestos = impuestos.reduce((s, i) => s.plus(i.monto), D(0));
  // Regalías/bonificaciones: el emisor asume el impuesto (menos lo exonerado).
  const asumido = esRegaliaBonificacion ? totalImpuestos.minus(montoExonerado) : D(0);
  const impuestoNeto = totalImpuestos.minus(montoExonerado).minus(asumido);

  return {
    numeroLinea,
    codigoCabys: linea.codigoCabys,
    codigoComercial: linea.codigoComercial,
    cantidad: D(linea.cantidad).toDecimalPlaces(3).toNumber(),
    unidadMedida: linea.unidadMedida,
    unidadMedidaComercial: linea.unidadMedidaComercial,
    tipoTransaccion: linea.tipoTransaccion,
    detalle: linea.detalle,
    partidaArancelaria: linea.partidaArancelaria,
    numeroVinSerie: linea.numeroVinSerie,
    registroMedicamento: linea.registroMedicamento,
    formaFarmaceutica: linea.formaFarmaceutica,
    formaFarmaceuticaMinsa: linea.formaFarmaceuticaMinsa,
    precioUnitario: r5(linea.precioUnitario),
    montoTotal: r5(montoTotal),
    descuentos,
    subTotal: r5(subTotal),
    baseImponible: r5(baseImponible),
    impuestos,
    impuestoAsumidoEmisorFabrica: r5(asumido),
    impuestoNeto: r5(impuestoNeto),
    montoTotalLinea: r5(subTotal.plus(impuestoNeto)),
    esServicio: esCabysServicio(linea.codigoCabys),
    clase: tarifa.clase,
    servicioSalud: linea.servicioSalud,
  };
}

/** Totales del apartado "Resumen del comprobante" (Anexo 1 v4.4, pp. 50-55). */
export function calcularResumen(borrador: BorradorComprobante, lineas: LineaCalculada[]): Resumen {
  const acc = {
    servGravados: D(0), servExentos: D(0), servExonerado: D(0), servNoSujeto: D(0),
    mercGravadas: D(0), mercExentas: D(0), mercExonerada: D(0), mercNoSujeta: D(0),
  };
  const desglose = new Map<string, DesgloseImpuesto & { acum: Decimal }>();
  let totalDescuentos = D(0);
  let totalImpuesto = D(0);
  let totalAsumido = D(0);
  let ivaSalud = D(0);

  for (const l of lineas) {
    totalDescuentos = totalDescuentos.plus(l.descuentos.reduce((s, d) => s.plus(d.monto), D(0)));
    const iva = l.impuestos.find((i) => i.codigo === '01');
    const monto = D(l.montoTotal);
    if (l.clase === 'gravado') {
      // Porcentaje de exoneración = TarifaExonerada / TarifaIVA.
      let pct = D(0);
      if (iva?.exoneracion && iva.tarifa > 0) pct = D(Math.min(iva.exoneracion.tarifaExonerada, iva.tarifa)).dividedBy(iva.tarifa);
      const exonerado = monto.times(pct);
      const gravado = monto.minus(exonerado);
      if (l.esServicio) {
        acc.servGravados = acc.servGravados.plus(gravado);
        acc.servExonerado = acc.servExonerado.plus(exonerado);
      } else {
        acc.mercGravadas = acc.mercGravadas.plus(gravado);
        acc.mercExonerada = acc.mercExonerada.plus(exonerado);
      }
    } else if (l.clase === 'exento') {
      if (l.esServicio) acc.servExentos = acc.servExentos.plus(monto);
      else acc.mercExentas = acc.mercExentas.plus(monto);
    } else {
      if (l.esServicio) acc.servNoSujeto = acc.servNoSujeto.plus(monto);
      else acc.mercNoSujeta = acc.mercNoSujeta.plus(monto);
    }

    // Desglose por impuesto: monto de líneas sin exoneración o impuesto neto (monto − exonerado − asumido).
    // En regalías/bonificaciones el emisor asume todo el impuesto neto de la línea.
    const asumidoLinea = D(l.impuestoAsumidoEmisorFabrica);
    const lineaAsumida = asumidoLinea.greaterThan(0);
    for (const imp of l.impuestos) {
      const neto = lineaAsumida ? D(0) : D(imp.monto).minus(imp.exoneracion?.montoExoneracion ?? 0);
      const clave = `${imp.codigo}|${imp.codigoTarifaIva ?? ''}`;
      const actual = desglose.get(clave) ?? { codigo: imp.codigo, codigoTarifaIva: imp.codigoTarifaIva, totalMontoImpuesto: 0, acum: D(0) };
      actual.acum = actual.acum.plus(neto);
      desglose.set(clave, actual);
    }
    totalImpuesto = totalImpuesto.plus(l.impuestoNeto);
    totalAsumido = totalAsumido.plus(asumidoLinea);
    if (l.servicioSalud) ivaSalud = ivaSalud.plus(l.impuestoNeto);
  }

  const totalGravado = acc.servGravados.plus(acc.mercGravadas);
  const totalExento = acc.servExentos.plus(acc.mercExentas);
  const totalExonerado = acc.servExonerado.plus(acc.mercExonerada);
  const totalNoSujeto = acc.servNoSujeto.plus(acc.mercNoSujeta);
  const totalVenta =
    borrador.tipo === 'REP'
      ? lineas.reduce((s, l) => s.plus(l.montoTotal), D(0))
      : totalGravado.plus(totalExento).plus(totalExonerado).plus(totalNoSujeto);
  const totalVentaNeta = totalVenta.minus(totalDescuentos);
  const totalOtrosCargos = borrador.otrosCargos.reduce((s, c) => s.plus(c.monto), D(0));

  // IVA devuelto: servicios de salud cuyo medio de pago sea tarjeta (código 02).
  const pagoConTarjeta = borrador.mediosPago.length > 0 && borrador.mediosPago.every((m) => m.tipo === '02');
  const totalIVADevuelto = pagoConTarjeta ? ivaSalud : D(0);

  // REP: TotalComprobante = TotalVenta (regla literal del Anexo, p. 55).
  const totalComprobante =
    borrador.tipo === 'REP'
      ? totalVenta
      : totalVentaNeta.plus(totalImpuesto).plus(totalOtrosCargos).minus(totalIVADevuelto);

  const mediosPago = borrador.mediosPago.map((m) => ({
    ...m,
    monto: m.monto !== undefined ? r5(m.monto) : borrador.mediosPago.length === 1 ? r5(totalComprobante) : undefined,
  }));

  return {
    codigoMoneda: borrador.moneda,
    tipoCambio: r5(borrador.tipoCambio),
    totalServGravados: r5(acc.servGravados),
    totalServExentos: r5(acc.servExentos),
    totalServExonerado: r5(acc.servExonerado),
    totalServNoSujeto: r5(acc.servNoSujeto),
    totalMercanciasGravadas: r5(acc.mercGravadas),
    totalMercanciasExentas: r5(acc.mercExentas),
    totalMercExonerada: r5(acc.mercExonerada),
    totalMercNoSujeta: r5(acc.mercNoSujeta),
    totalGravado: r5(totalGravado),
    totalExento: r5(totalExento),
    totalExonerado: r5(totalExonerado),
    totalNoSujeto: r5(totalNoSujeto),
    totalVenta: r5(totalVenta),
    totalDescuentos: r5(totalDescuentos),
    totalVentaNeta: r5(totalVentaNeta),
    // Se repite por cada código de impuesto incluido en las líneas de detalle.
    totalDesgloseImpuesto: [...desglose.values()].map(({ acum, ...d }) => ({ ...d, totalMontoImpuesto: r5(acum) })),
    totalImpuesto: r5(totalImpuesto),
    totalImpAsumEmisorFabrica: r5(totalAsumido),
    totalIVADevuelto: r5(totalIVADevuelto),
    totalOtrosCargos: r5(totalOtrosCargos),
    mediosPago,
    totalComprobante: r5(totalComprobante),
  };
}

export function calcularComprobante(borrador: BorradorComprobante): { lineas: LineaCalculada[]; resumen: Resumen } {
  const lineas = borrador.lineas.map((l, i) => calcularLinea(l, i + 1, borrador.tipo));
  return { lineas, resumen: calcularResumen(borrador, lineas) };
}
