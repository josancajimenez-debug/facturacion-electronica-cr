import { describe, expect, it } from 'vitest';
import { asientoManual, completarLibro, parametrosPredeterminados } from '../src/cierre';
import { Kardex, POLITICAS_PREDETERMINADAS, SALARIO_BASE, asientoApertura, clasificarCompra } from '../src/contabilidad';
import { AVISO_NIIF_COMPLETAS, criterioFiscalNiif } from '../src/cuentas';

const ctx = { esInventario: () => false, politicas: POLITICAS_PREDETERMINADAS };
const silla = (precio: number) => ({ cabys: '3811000000000', cantidad: 1, subTotal: precio, esServicio: false });

describe('Criterios fiscales (Ley 7092, Decreto 43198-H y RES-0015-2026)', () => {
  it('gasto contable bajo el umbral: deducible hasta el 25 % del salario base', () => {
    const tope = SALARIO_BASE.monto * 0.25; // ₡115 550 en 2026
    expect(SALARIO_BASE).toMatchObject({ monto: 462200, anio: 2026 });
    expect(clasificarCompra(silla(tope), 1, ctx)).toMatchObject({ cuenta: '6.1.01.04', fiscal: undefined });
    const mayor = clasificarCompra(silla(200000), 1, ctx);
    expect(mayor.cuenta).toBe('6.1.01.04');
    expect(mayor.fiscal).toContain('25 % del salario base');
    // Sobre el umbral contable se capitaliza y no hay advertencia de gasto.
    const capitalizado = clasificarCompra(silla(300000), 1, ctx);
    expect(capitalizado.cuenta).toBe('1.2.01.01');
    expect(capitalizado.fiscal).toBeUndefined();
    // El salario base es configurable por periodo.
    expect(clasificarCompra(silla(200000), 1, { ...ctx, politicas: { ...POLITICAS_PREDETERMINADAS, salarioBase: 1_000_000 } }).fiscal).toBeUndefined();
  });

  it('la estimación por deterioro de cuentas por cobrar no es deducible', () => {
    const op = (fecha: string, debe: string, haber: string, monto: number) =>
      asientoManual({ id: fecha, fecha, glosa: 'op', lineas: [{ cuenta: debe, debe: monto, haber: 0 }, { cuenta: haber, debe: 0, haber: monto }] });
    const libro = { asientos: [asientoApertura('2026-01-01', 1_000_000), op('2026-10-01', '1.1.02.01', '4.1.01.02', 2_000_000)], kardex: new Kardex(), omitidos: [] };
    const r = completarLibro(libro, { '2026': { ajustesAutomaticos: true, cerrado: false, manuales: [], parametros: { ...parametrosPredeterminados('02'), porcentajeIncobrables: 2 } } });
    const estimacion = r.cierres['2026'].automaticos.find((a) => a.glosa.includes('deterioro'))!;
    expect(estimacion.deducibleRenta).toBe(false);
    expect(estimacion.fundamento.join(' ')).toContain('art. 17 inc. g');
  });

  it('criterio interpretativo NIIF–tributario según el periodo', () => {
    expect(criterioFiscalNiif('2026-01-01').resolucion).toBe('Resolución DGT-R-029-2018');
    expect(criterioFiscalNiif('2027-01-01').resolucion).toBe('Resolución MH-DGT-RES-0015-2026');
    expect(AVISO_NIIF_COMPLETAS).toContain('MH-DGT-RES-0015-2026');
  });
});
