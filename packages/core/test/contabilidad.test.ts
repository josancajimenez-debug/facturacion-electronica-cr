import { describe, expect, it } from 'vitest';
import {
  POLITICAS_PREDETERMINADAS,
  Kardex,
  documentoDesdeComprobante,
  documentoDesdeXml,
  generarAsiento,
  generarLibroDiario,
  type ContextoContable,
  type RecibidoContable,
} from '../src/contabilidad';
import { CATALOGO_CUENTAS, cuenta, edicionNiifPara, seccionNiif } from '../src/cuentas';
import { EMISOR_DEMO, PROVEEDOR_DEMO } from '../src/datos-demo';
import { construirComprobante } from '../src/emision';
import { balanceComprobacion, estadosFinancieros, libroMayor } from '../src/libros';
import { extraerDatosComprobante, generarConfirmacion } from '../src/recepcion';
import type { BorradorComprobante, Comprobante } from '../src/tipos';
import { borrador, linea } from './helpers';

const CAFE = '2391102010200';
const COMPU = '4523000990000';

const aceptado = (c: Comprobante): Comprobante => ({ ...c, estado: 'aceptado' });
const emitir = (b: BorradorComprobante, numero = 1, fecha = new Date('2026-10-05T10:00:00-06:00')) =>
  aceptado(construirComprobante({ borrador: b, emisor: EMISOR_DEMO, numero, fecha, ambiente: 'simulacion', codigoSeguridad: '87654321' }));

/** Comprobante de un proveedor, confirmado por el emisor demo con la condición de impuesto indicada. */
function recibir(b: Partial<BorradorComprobante>, opciones: { numero?: number; fecha?: string; condicionImpuesto?: string; acreditar?: number } = {}): RecibidoContable {
  const fe = construirComprobante({
    emisor: PROVEEDOR_DEMO,
    numero: opciones.numero ?? 1,
    fecha: new Date(opciones.fecha ?? '2026-10-01T09:00:00-06:00'),
    ambiente: 'simulacion',
    codigoSeguridad: '12345678',
    borrador: borrador({
      emisorId: PROVEEDOR_DEMO.id,
      codigoActividadEmisor: PROVEEDOR_DEMO.actividades[0].codigo,
      contraparte: { nombre: EMISOR_DEMO.nombre, identificacion: EMISOR_DEMO.identificacion, correo: EMISOR_DEMO.correos[0] },
      ...b,
    }),
  });
  const recibido = extraerDatosComprobante(fe.xml);
  const conf = generarConfirmacion({
    recibido, receptor: EMISOR_DEMO, sucursal: '001', terminal: '00001', numero: opciones.numero ?? 1, mensaje: '1',
    condicionImpuesto: opciones.condicionImpuesto ?? '01', codigoActividad: '6920.0',
    montoTotalImpuestoAcreditar: opciones.acreditar,
    fecha: new Date('2026-10-02T09:00:00-06:00'),
  });
  return { recibido, estado: 'aceptado', xmlConfirmacion: conf.xml };
}

const contexto = (cabys: string[] = []): ContextoContable => ({
  politicas: POLITICAS_PREDETERMINADAS,
  esInventario: (c) => cabys.includes(c),
  kardex: new Kardex(),
  fraccionAcreditable: new Map(),
});

const lineasPorCuenta = (a: { lineas: { cuenta: string; debe: number; haber: number }[] }) =>
  Object.fromEntries(a.lineas.map((l) => [l.cuenta, l.debe - l.haber]));

describe('Catálogo de cuentas y manual', () => {
  it('códigos únicos, jerarquía completa y manual en todas las subcuentas', () => {
    const codigos = CATALOGO_CUENTAS.map((c) => c.codigo);
    expect(new Set(codigos).size).toBe(codigos.length);
    for (const c of CATALOGO_CUENTAS) {
      if (c.codigo.includes('.')) expect(codigos).toContain(c.codigo.split('.').slice(0, -1).join('.'));
      if (c.imputable) expect(c.descripcion && c.seDebita && c.seAcredita, c.codigo).toBeTruthy();
    }
  });

  it('naturaleza por clase y cuentas correctoras', () => {
    expect(cuenta('1.1.01.01').naturaleza).toBe('deudora');
    expect(cuenta('2.1.02.01').naturaleza).toBe('acreedora');
    expect(cuenta('1.2.02.01').naturaleza).toBe('acreedora');
    expect(cuenta('4.1.01.04').naturaleza).toBe('deudora');
  });

  it('edición de la NIIF para las PYMES según el periodo', () => {
    expect(edicionNiifPara('2026-12-31')).toBe('2015');
    expect(edicionNiifPara('2027-01-01')).toBe('2025');
    expect(edicionNiifPara('2026-06-01', true)).toBe('2025');
    expect(seccionNiif(23, '2025')).toContain('Procedentes de Contratos con Clientes');
    expect(seccionNiif(11, '2015')).toContain('Básicos');
  });
});

describe('Asientos de ventas', () => {
  it('factura de contado: bancos, ingreso por servicios e IVA repercutido', () => {
    const a = generarAsiento(documentoDesdeComprobante(emitir(borrador({ mediosPago: [{ tipo: '06' }] }))), contexto());
    expect(lineasPorCuenta(a)).toEqual({ '1.1.01.02': 113000, '4.1.01.02': -100000, '2.1.02.01': -13000 });
    expect(a.cuadrado).toBe(true);
    expect(a.requiereRevision).toBe(false);
    expect(a.fundamento.join()).toMatch(/Sección 23/);
  });

  it('crédito con IVA diferido (condición 10) y su Recibo Electrónico de Pago', () => {
    const fe = emitir(borrador({ condicionVenta: '10', plazoCredito: 60, mediosPago: [] }));
    const ctx = contexto();
    expect(lineasPorCuenta(generarAsiento(documentoDesdeComprobante(fe), ctx))).toEqual({ '1.1.02.01': 113000, '4.1.01.02': -100000, '2.1.02.02': -13000 });
    const rep = emitir(borrador({
      tipo: 'REP', condicionVenta: '11', mediosPago: [{ tipo: '04' }],
      referencias: [{ tipoDoc: '01', numero: fe.clave, fechaEmision: fe.fechaEmision, codigo: '17', razon: 'Pago' }],
    }), 2);
    expect(lineasPorCuenta(generarAsiento(documentoDesdeComprobante(rep), ctx))).toEqual({
      '1.1.01.02': 113000, '1.1.02.01': -113000, '2.1.02.02': 13000, '2.1.02.01': -13000,
    });
  });

  it('nota de crédito: devoluciones sobre ventas y reversión del IVA', () => {
    const fe = emitir(borrador({ condicionVenta: '02', plazoCredito: 30, mediosPago: [] }));
    const nc = emitir(borrador({
      tipo: 'NC', condicionVenta: '02', plazoCredito: 30, mediosPago: [],
      lineas: [linea({ precioUnitario: 40000 })],
      referencias: [{ tipoDoc: '01', numero: fe.clave, fechaEmision: fe.fechaEmision, codigo: '02', razon: 'Descuento' }],
    }), 2);
    expect(lineasPorCuenta(generarAsiento(documentoDesdeComprobante(nc), contexto()))).toEqual({ '4.1.01.04': 40000, '2.1.02.01': 5200, '1.1.02.01': -45200 });
  });

  it('venta en dólares: convierte al tipo de cambio y conserva la partida doble', () => {
    const a = generarAsiento(documentoDesdeComprobante(emitir(borrador({ moneda: 'USD', tipoCambio: 505.37, mediosPago: [{ tipo: '04' }], lineas: [linea({ precioUnitario: 333.33 })] }))), contexto());
    expect(a.totalDebe).toBe(a.totalHaber);
    expect(lineasPorCuenta(a)['1.1.01.03']).toBeCloseTo(333.33 * 1.13 * 505.37, 0);
    expect(a.fundamento.join()).toMatch(/Sección 30/);
  });
});

describe('Asientos de compras', () => {
  it('mercadería con crédito total va a inventario e IVA acreditable', () => {
    const r = recibir({ condicionVenta: '02', plazoCredito: 30, mediosPago: [], lineas: [linea({ codigoCabys: CAFE, detalle: 'Café', cantidad: 10, unidadMedida: 'Kg', precioUnitario: 5000, codigoTarifaIva: '08' })] });
    const ctx = contexto([CAFE]);
    const a = generarAsiento({ ...documentoDesdeXml(r.recibido.xml!), confirmacion: { mensaje: '1', condicionImpuesto: '01' } }, ctx);
    expect(lineasPorCuenta(a)).toEqual({ '1.1.03.01': 50000, '1.1.04.01': 6500, '2.1.01.01': -56500 });
    expect(ctx.kardex.existencias()).toEqual([{ cabys: CAFE, detalle: 'Café', cantidad: 10, costo: 50000, costoPromedio: 5000 }]);
  });

  it('gasto corriente sin crédito (condición 04): el IVA se suma al gasto', () => {
    const r = recibir({ lineas: [linea({ codigoCabys: '8222100000000', detalle: 'Auditoría' })] });
    const a = generarAsiento({ ...documentoDesdeXml(r.recibido.xml!), confirmacion: { mensaje: '1', condicionImpuesto: '04' } }, contexto());
    expect(lineasPorCuenta(a)).toEqual({ '6.1.01.01': 113000, '1.1.01.01': -113000 });
  });

  it('crédito parcial (condición 02) según MontoTotalImpuestoAcreditar', () => {
    const r = recibir({ lineas: [linea({ codigoCabys: '6911200000000', detalle: 'Electricidad' })] });
    const a = generarAsiento({ ...documentoDesdeXml(r.recibido.xml!), confirmacion: { mensaje: '1', condicionImpuesto: '02', montoImpuestoAcreditar: 6500 } }, contexto());
    expect(lineasPorCuenta(a)).toEqual({ '6.1.01.03': 106500, '1.1.04.01': 6500, '1.1.01.01': -113000 });
  });

  it('equipo de cómputo: se capitaliza sobre el umbral y se lleva a gasto debajo de él', () => {
    const caro = recibir({ lineas: [linea({ codigoCabys: COMPU, detalle: 'Computadora', unidadMedida: 'Unid', precioUnitario: 420000 })] });
    const a = generarAsiento({ ...documentoDesdeXml(caro.recibido.xml!), confirmacion: { mensaje: '1', condicionImpuesto: '03' } }, contexto());
    expect(lineasPorCuenta(a)['1.2.01.02']).toBe(420000);
    expect(a.fundamento.join()).toMatch(/Sección 17/);
    const barato = recibir({ lineas: [linea({ codigoCabys: COMPU, detalle: 'Teclado', unidadMedida: 'Unid', precioUnitario: 15000 })] });
    expect(lineasPorCuenta(generarAsiento(documentoDesdeXml(barato.recibido.xml!), contexto()))['6.1.01.04']).toBe(15000);
  });

  it('tiquete recibido: sin crédito fiscal y deducibilidad por revisar', () => {
    const te = construirComprobante({ emisor: PROVEEDOR_DEMO, numero: 1, ambiente: 'simulacion', borrador: borrador({ tipo: 'TE', emisorId: PROVEEDOR_DEMO.id, codigoActividadEmisor: '4719.9', contraparte: undefined, lineas: [linea({ codigoCabys: '6332000000000', detalle: 'Almuerzo' })] }) });
    const a = generarAsiento(documentoDesdeXml(te.xml), contexto());
    expect(lineasPorCuenta(a)).toEqual({ '6.1.01.08': 113000, '1.1.01.01': -113000 });
    expect(a.deducibleRenta).toBe('revisar');
    expect(a.alertas.join()).toMatch(/TIQUETE_SIN_CREDITO/);
  });
});

describe('Libros', () => {
  const compra = recibir({ condicionVenta: '02', plazoCredito: 30, mediosPago: [], lineas: [linea({ codigoCabys: CAFE, detalle: 'Café', cantidad: 10, unidadMedida: 'Kg', precioUnitario: 4000 })] });
  const compra2 = recibir({ condicionVenta: '02', plazoCredito: 30, mediosPago: [], lineas: [linea({ codigoCabys: CAFE, detalle: 'Café', cantidad: 10, unidadMedida: 'Kg', precioUnitario: 5000 })] }, { numero: 2, fecha: '2026-10-03T09:00:00-06:00' });
  const venta = emitir(borrador({ lineas: [linea({ codigoCabys: CAFE, detalle: 'Café', cantidad: 5, unidadMedida: 'Kg', precioUnitario: 6500, codigoTarifaIva: '02' })] }), 1, new Date('2026-10-10T10:00:00-06:00'));
  const libro = generarLibroDiario({
    emisor: EMISOR_DEMO,
    emitidos: [venta],
    recibidos: [compra2, compra, { ...recibir({}, { numero: 3 }), estado: 'pendiente' }],
    cabysInventario: [CAFE],
    apertura: { fecha: '2026-10-01', capital: 1000000 },
  });

  it('libro diario cronológico y numerado, con la apertura primero', () => {
    expect(libro.asientos.map((a) => a.numero)).toEqual([1, 2, 3, 4]);
    expect(libro.asientos[0].origen.documento).toBe('apertura');
    expect(libro.asientos.every((a) => a.cuadrado)).toBe(true);
    expect(libro.omitidos.map((o) => o.motivo)).toEqual(['Pendiente de confirmar (mensaje receptor).']);
  });

  it('costo de ventas al promedio ponderado', () => {
    // (10 × 4 000 + 10 × 5 000) / 20 = 4 500 por kilo.
    expect(lineasPorCuenta(libro.asientos[3])).toMatchObject({ '5.1.01.01': 22500, '1.1.03.01': -22500, '4.1.01.01': -32500 });
    expect(libro.kardex.existencias()[0]).toMatchObject({ cantidad: 15, costo: 67500, costoPromedio: 4500 });
  });

  it('mayor, balance de comprobación y estados financieros cuadran', () => {
    const inventario = libroMayor(libro.asientos).find((m) => m.cuenta.codigo === '1.1.03.01')!;
    expect(inventario.saldoFinal).toBe(67500);
    expect(inventario.movimientos.map((m) => m.saldo)).toEqual([40000, 90000, 67500]);
    expect(balanceComprobacion(libro.asientos).cuadra).toBe(true);
    const ef = estadosFinancieros(libro.asientos, '2026-01-01', '2026-10-31');
    expect(ef.situacion.cuadra).toBe(true);
    expect(ef.resultados.utilidadBruta).toBe(10000);
    expect(ef.resultados.resultado).toBe(10000);
  });
});
