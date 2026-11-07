import { describe, expect, it } from 'vitest';
import { generarLibroDiario } from '../src/contabilidad';
import { EMISOR_DEMO } from '../src/datos-demo';
import { construirComprobante } from '../src/emision';
import { ivaDiferidoDelPeriodo, venceIvaDiferido } from '../src/ivaDiferido';
import type { BorradorComprobante, Comprobante } from '../src/tipos';
import { validarBorrador } from '../src/validaciones';
import { borrador, linea } from './helpers';

const emitir = (b: BorradorComprobante, numero: number, fecha: string): Comprobante => ({
  ...construirComprobante({ borrador: b, emisor: EMISOR_DEMO, numero, fecha: new Date(fecha), ambiente: 'simulacion', codigoSeguridad: '87654321' }),
  estado: 'aceptado',
});

/** Venta a crédito con IVA diferido: 100 000 + 13 000 de IVA. */
const venta = (fecha = '2026-01-10T10:00:00-06:00', numero = 1) =>
  emitir(borrador({ condicionVenta: '10', plazoCredito: 60, mediosPago: [] }), numero, fecha);

const rep = (fe: Comprobante, numero: number, fecha: string) =>
  emitir(borrador({
    tipo: 'REP', condicionVenta: '11', mediosPago: [{ tipo: '04' }],
    referencias: [{ tipoDoc: '01', numero: fe.clave, fechaEmision: fe.fechaEmision, codigo: '17', razon: 'Pago' }],
  }), numero, fecha);

const libro = (emitidos: Comprobante[], fechaCorte: string) =>
  generarLibroDiario({ emisor: EMISOR_DEMO, emitidos, recibidos: [], cabysInventario: [], fechaCorte });

const saldo = (l: ReturnType<typeof libro>, cuenta: string) =>
  l.asientos.flatMap((a) => a.lineas).filter((x) => x.cuenta === cuenta).reduce((s, x) => s + x.haber - x.debe, 0);

describe('IVA diferido (condición 10; art. 27 LIVA y art. 40 bis RLIVA)', () => {
  it('el plazo vence a los 90 días naturales de la emisión', () => {
    expect(venceIvaDiferido('2026-01-10T10:00:00-06:00')).toBe('2026-04-10');
    expect(venceIvaDiferido('2026-11-15')).toBe('2027-02-13');
  });

  it('cobro dentro del plazo: el REP traslada todo el IVA y no hay ajuste', () => {
    const fe = venta();
    const l = libro([fe, rep(fe, 2, '2026-03-01T10:00:00-06:00')], '2026-12-31');
    expect(l.asientos.some((a) => a.origen.documento === 'ajuste')).toBe(false);
    expect(saldo(l, '2.1.02.02')).toBeCloseTo(0, 2);
    expect(saldo(l, '2.1.02.01')).toBeCloseTo(13000, 2);
  });

  it('sin cobro a los 90 días: traslado automático en la fecha de vencimiento', () => {
    const l = libro([venta()], '2026-05-01');
    const ajuste = l.asientos.find((a) => a.origen.documento === 'ajuste')!;
    expect(ajuste.fecha).toBe('2026-04-10');
    expect(ajuste.periodoTributario).toBe('2026-04');
    expect(ajuste.lineas).toEqual([
      expect.objectContaining({ cuenta: '2.1.02.02', debe: 13000, haber: 0 }),
      expect.objectContaining({ cuenta: '2.1.02.01', debe: 0, haber: 13000 }),
    ]);
    expect(ajuste.fundamento.join(' ')).toContain('40 bis');
  });

  it('antes del vencimiento no hay traslado; el mismo día 90 todavía se puede cobrar', () => {
    expect(libro([venta()], '2026-04-10').asientos.some((a) => a.origen.documento === 'ajuste')).toBe(false);
    const fe = venta();
    const l = libro([fe, rep(fe, 2, '2026-04-10T16:00:00-06:00')], '2026-12-31');
    expect(l.asientos.some((a) => a.origen.documento === 'ajuste')).toBe(false);
  });

  it('cobro después del vencimiento: el REP no vuelve a trasladar el IVA', () => {
    const fe = venta();
    const l = libro([fe, rep(fe, 2, '2026-06-01T10:00:00-06:00')], '2026-12-31');
    const asientoRep = l.asientos.find((a) => a.origen.tipo === 'REP')!;
    expect(asientoRep.lineas.map((x) => x.cuenta)).not.toContain('2.1.02.02');
    expect(asientoRep.alertas.join(' ')).toContain('IVA_DIFERIDO_VENCIDO');
    expect(saldo(l, '2.1.02.02')).toBeCloseTo(0, 2);
    expect(saldo(l, '2.1.02.01')).toBeCloseTo(13000, 2);
  });

  it('nota de crédito sobre IVA ya vencido: lo rebaja del IVA repercutido', () => {
    const fe = venta();
    const nc = emitir(borrador({
      tipo: 'NC', condicionVenta: '02', plazoCredito: 30, mediosPago: [],
      lineas: [linea({ precioUnitario: 40000 })],
      referencias: [{ tipoDoc: '01', numero: fe.clave, fechaEmision: fe.fechaEmision, codigo: '02', razon: 'Descuento' }],
    }), 2, '2026-05-05T10:00:00-06:00');
    const l = libro([fe, nc], '2026-12-31');
    expect(saldo(l, '2.1.02.02')).toBeCloseTo(0, 2);
    expect(saldo(l, '2.1.02.01')).toBeCloseTo(13000 - 5200, 2);
  });

  it('reporte del período: rebaja, recuperado, vencido y ajuste neto', () => {
    const a = venta('2026-01-10T10:00:00-06:00', 1);
    const b = venta('2026-01-20T10:00:00-06:00', 2);
    const c = venta('2026-02-05T10:00:00-06:00', 3);
    const docs = [a, b, c, rep(b, 4, '2026-02-10T10:00:00-06:00')];
    const enero = ivaDiferidoDelPeriodo(docs, '2026-01', '2026-12-31');
    expect(enero).toMatchObject({ diferido: 26000, recuperado: 0, vencido: 0, ajuste: -26000 });
    const febrero = ivaDiferidoDelPeriodo(docs, '2026-02', '2026-12-31');
    expect(febrero).toMatchObject({ diferido: 13000, recuperado: 13000, vencido: 0, ajuste: 0 });
    const abril = ivaDiferidoDelPeriodo(docs, '2026-04', '2026-12-31');
    expect(abril.vencido).toBe(13000);
    expect(abril.detalle.vencido[0].vence).toBe('2026-04-10');
    const mayo = ivaDiferidoDelPeriodo(docs, '2026-05', '2026-12-31');
    expect(mayo.vencido).toBe(13000); // la venta del 5/02 vence el 6/05
    // Consultado el 8/04, la venta del 10/01 aún no ha vencido: queda como «por vencer».
    const abrilAnticipado = ivaDiferidoDelPeriodo(docs, '2026-04', '2026-04-08');
    expect(abrilAnticipado.vencido).toBe(0);
    expect(abrilAnticipado.porVencer).toHaveLength(1);
  });

  it('validación: informa quién puede acogerse y el límite de 90 días del impuesto', () => {
    const v = validarBorrador(borrador({ condicionVenta: '10', plazoCredito: 120, mediosPago: [] }), EMISOR_DEMO);
    const avisos = v.filter((x) => x.nivel === 'advertencia' && x.fuente?.includes('40 bis'));
    expect(avisos.map((x) => x.campo).sort()).toEqual(['condicionVenta', 'plazoCredito']);
    expect(avisos.find((x) => x.campo === 'condicionVenta')!.mensaje).toContain('Grandes Contribuyentes Nacionales');
    expect(v.some((x) => x.nivel === 'error' && x.campo === 'plazoCredito')).toBe(false);
  });
});
