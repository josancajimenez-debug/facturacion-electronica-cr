import { describe, expect, it } from 'vitest';
import { calcularComprobante, r5 } from '../src/calculos';
import { RECEPTORES_DEMO } from '../src/datos-demo';
import { borrador, linea } from './helpers';

describe('Cálculo de líneas de detalle', () => {
  it('servicio gravado al 13%', () => {
    const { lineas, resumen } = calcularComprobante(borrador());
    const l = lineas[0];
    expect(l).toMatchObject({ montoTotal: 100000, subTotal: 100000, baseImponible: 100000, impuestoNeto: 13000, montoTotalLinea: 113000, esServicio: true, clase: 'gravado' });
    expect(l.impuestos[0]).toMatchObject({ codigo: '01', codigoTarifaIva: '08', tarifa: 13, monto: 13000 });
    expect(resumen).toMatchObject({
      totalServGravados: 100000,
      totalGravado: 100000,
      totalVenta: 100000,
      totalVentaNeta: 100000,
      totalImpuesto: 13000,
      totalComprobante: 113000,
    });
    expect(resumen.totalDesgloseImpuesto).toEqual([{ codigo: '01', codigoTarifaIva: '08', totalMontoImpuesto: 13000 }]);
    expect(resumen.mediosPago[0].monto).toBe(113000);
  });

  it('descuentos sucesivos: cada uno sobre la base menos el anterior', () => {
    const b = borrador({
      lineas: [linea({ cantidad: 2, precioUnitario: 50000, descuentos: [{ codigo: '07', porcentaje: 10 }, { codigo: '04', porcentaje: 5 }] })],
    });
    const { lineas, resumen } = calcularComprobante(b);
    expect(lineas[0].descuentos.map((d) => d.monto)).toEqual([10000, 4500]);
    expect(lineas[0]).toMatchObject({ subTotal: 85500, impuestoNeto: 11115, montoTotalLinea: 96615 });
    expect(resumen).toMatchObject({ totalVenta: 100000, totalDescuentos: 14500, totalVentaNeta: 85500, totalComprobante: 96615 });
  });

  it('exoneración total (tarifa exonerada = tarifa IVA)', () => {
    const ex = RECEPTORES_DEMO.find((r) => r.id === 'rec-exonerada')!.exoneracion!;
    const b = borrador({
      lineas: [linea({ codigoCabys: '4523000990000', detalle: 'Computadora', unidadMedida: 'Unid', precioUnitario: 420000, exoneracion: ex })],
    });
    const { lineas, resumen } = calcularComprobante(b);
    expect(lineas[0].impuestos[0].monto).toBe(54600);
    expect(lineas[0].impuestos[0].exoneracion?.montoExoneracion).toBe(54600);
    expect(lineas[0].impuestoNeto).toBe(0);
    expect(resumen).toMatchObject({ totalMercExonerada: 420000, totalMercanciasGravadas: 0, totalExonerado: 420000, totalVenta: 420000, totalImpuesto: 0, totalComprobante: 420000 });
  });

  it('exoneración parcial: porcentaje = tarifa exonerada / tarifa IVA', () => {
    const b = borrador({
      lineas: [linea({ exoneracion: { tipoDocumento: '03', numeroDocumento: 'Ley-0000', articulo: 1, institucion: '99', institucionOtro: 'Institución ficticia', fechaEmision: '2025-01-01T00:00:00-06:00', tarifaExonerada: 4 } })],
    });
    const { lineas, resumen } = calcularComprobante(b);
    expect(lineas[0].impuestos[0].exoneracion?.montoExoneracion).toBe(4000);
    expect(lineas[0].impuestoNeto).toBe(9000);
    expect(resumen.totalServExonerado).toBe(30769.23077);
    expect(resumen.totalServGravados).toBe(69230.76923);
    expect(resumen.totalVenta).toBe(100000);
    expect(resumen.totalComprobante).toBe(109000);
  });

  it('regalía: el IVA se calcula sobre el monto total y lo asume el emisor', () => {
    const b = borrador({
      lineas: [linea({ codigoCabys: '2441002020000', detalle: 'Agua de regalía', unidadMedida: 'Unid', precioUnitario: 650, descuentos: [{ codigo: '01', monto: 650 }] })],
    });
    const { lineas, resumen } = calcularComprobante(b);
    expect(lineas[0]).toMatchObject({ subTotal: 0, impuestoAsumidoEmisorFabrica: 84.5, impuestoNeto: 0, montoTotalLinea: 0 });
    expect(lineas[0].impuestos[0].monto).toBe(84.5);
    expect(resumen).toMatchObject({ totalImpAsumEmisorFabrica: 84.5, totalImpuesto: 0, totalDescuentos: 650, totalComprobante: 0 });
  });

  it('mercancía exenta (código 10) y no sujeta (código 01)', () => {
    const b = borrador({
      lineas: [
        linea({ codigoCabys: '3221000000000', detalle: 'Libro escolar', unidadMedida: 'Unid', cantidad: 2, precioUnitario: 12000, codigoTarifaIva: '10' }),
        linea({ codigoTarifaIva: '01', precioUnitario: 5000 }),
      ],
    });
    const { lineas, resumen } = calcularComprobante(b);
    expect(lineas[0].clase).toBe('exento');
    expect(lineas[0].impuestos[0].monto).toBe(0);
    expect(resumen).toMatchObject({ totalMercanciasExentas: 24000, totalExento: 24000, totalServNoSujeto: 5000, totalNoSujeto: 5000, totalVenta: 29000, totalComprobante: 29000 });
  });

  it('IVA devuelto: servicios de salud pagados con tarjeta', () => {
    const b = borrador({
      lineas: [linea({ codigoCabys: '9310100000100', detalle: 'Consulta médica', precioUnitario: 30000, codigoTarifaIva: '04', servicioSalud: true })],
      mediosPago: [{ tipo: '02' }],
    });
    const { resumen } = calcularComprobante(b);
    expect(resumen.totalImpuesto).toBe(1200);
    expect(resumen.totalIVADevuelto).toBe(1200);
    expect(resumen.totalComprobante).toBe(30000);
  });

  it('otros cargos se suman al total del comprobante', () => {
    const b = borrador({ otrosCargos: [{ tipoDocumento: '06', detalle: 'Impuesto de servicio', porcentaje: 10, monto: 10000 }] });
    expect(calcularComprobante(b).resumen).toMatchObject({ totalOtrosCargos: 10000, totalComprobante: 123000 });
  });

  it('impuesto selectivo de consumo integra la base imponible del IVA', () => {
    const b = borrador({ lineas: [linea({ precioUnitario: 1000, impuestosAdicionales: [{ codigo: '02', tarifa: 10 }] })] });
    const l = calcularComprobante(b).lineas[0];
    expect(l.baseImponible).toBe(1100);
    expect(l.impuestos.map((i) => [i.codigo, i.monto])).toEqual([['01', 143], ['02', 100]]);
    expect(l.montoTotalLinea).toBe(1243);
  });

  it('redondea a 5 decimales con mitad hacia arriba', () => {
    expect(r5(1.000005)).toBe(1.00001);
    expect(r5(20.203512)).toBe(20.20351);
    expect(r5(20.203518)).toBe(20.20352);
    const l = calcularComprobante(borrador({ lineas: [linea({ cantidad: 3, precioUnitario: 0.333335 })] })).lineas[0];
    expect(l.montoTotal).toBe(1.00001);
  });

  it('Recibo Electrónico de Pago: TotalComprobante = TotalVenta (regla literal del Anexo)', () => {
    const b = borrador({
      tipo: 'REP',
      condicionVenta: '11',
      lineas: [linea({ detalle: 'Pago cuota 1 de 2', precioUnitario: 50000 })],
      mediosPago: [{ tipo: '04' }],
    });
    const { resumen } = calcularComprobante(b);
    expect(resumen.totalVenta).toBe(50000);
    expect(resumen.totalImpuesto).toBe(6500);
    expect(resumen.totalComprobante).toBe(50000);
  });
});
