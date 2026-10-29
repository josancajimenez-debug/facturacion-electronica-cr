import { describe, expect, it } from 'vitest';
import { asientoManual, completarLibro, parametrosPredeterminados, type ConfigCierre } from '../src/cierre';
import { Kardex, asientoApertura, type LibroDiario } from '../src/contabilidad';
import { estadosFinancieros } from '../src/libros';

const op = (fecha: string, glosa: string, debe: string, haber: string, monto: number) =>
  asientoManual({ id: glosa, fecha, glosa, lineas: [{ cuenta: debe, debe: monto, haber: 0 }, { cuenta: haber, debe: 0, haber: monto }] });

const libro: LibroDiario = {
  asientos: [
    asientoApertura('2026-01-01', 1_000_000),
    op('2026-07-15', 'Compra de computadora', '1.2.01.02', '1.1.01.02', 600_000),
    op('2026-10-01', 'Servicios a crédito', '1.1.02.01', '4.1.01.02', 2_000_000),
    op('2026-11-01', 'Alquiler', '6.1.01.02', '1.1.01.02', 500_000),
  ],
  kardex: new Kardex(),
  omitidos: [],
};

const config = (c: Partial<ConfigCierre> = {}): Record<string, ConfigCierre> => ({
  '2026': { ajustesAutomaticos: true, cerrado: true, manuales: [], parametros: { ...parametrosPredeterminados('02'), porcentajeIncobrables: 2 }, ...c },
});
const lineas = (a: { lineas: { cuenta: string; debe: number; haber: number }[] }) => Object.fromEntries(a.lineas.map((l) => [l.cuenta, l.debe - l.haber]));

describe('Asientos de ajuste y de cierre', () => {
  const completo = completarLibro(libro, config());
  const { automaticos, cierre } = completo.cierres['2026'];

  it('depreciación desde el mes de adquisición, estimación de incobrables e impuesto sobre la renta', () => {
    // 600 000 / 60 meses × 6 meses (julio a diciembre).
    expect(lineas(automaticos[0])).toEqual({ '6.1.01.11': 60_000, '1.2.02.01': -60_000 });
    expect(lineas(automaticos[1])).toEqual({ '6.1.01.12': 40_000, '1.1.02.02': -40_000 });
    // (2 000 000 − 500 000 − 60 000 − 40 000) × 30 %.
    expect(lineas(automaticos[2])).toEqual({ '6.3.01.01': 420_000, '2.1.02.04': -420_000 });
    expect(automaticos.every((a) => a.cuadrado && a.fecha === '2026-12-31')).toBe(true);
  });

  it('el cierre salda los resultados contra utilidades acumuladas y asigna la reserva legal', () => {
    expect(lineas(cierre[0])).toMatchObject({ '4.1.01.02': 2_000_000, '6.1.01.02': -500_000, '6.3.01.01': -420_000, '3.3.01.01': -980_000 });
    expect(lineas(cierre[1])).toEqual({ '3.3.01.01': 49_000, '3.2.01.01': -49_000 });
    expect(completo.asientos.map((a) => a.origen.documento).slice(-5)).toEqual(['ajuste', 'ajuste', 'ajuste', 'cierre', 'cierre']);
    expect(completo.asientos.map((a) => a.numero)).toEqual(completo.asientos.map((_, i) => i + 1));
  });

  it('los estados del periodo cerrado siguen mostrando el resultado y todo concilia', () => {
    const ef = estadosFinancieros(completo.asientos, '2026-01-01', '2026-12-31');
    expect(ef.resultados).toMatchObject({ utilidadAntesImpuesto: 1_400_000, impuestoRenta: 420_000, resultado: 980_000, totalGastos: 600_000 });
    expect(ef.situacion.cuadra).toBe(true);
    expect(ef.cambiosPatrimonio.cuadra).toBe(true);
    expect(ef.flujos.cuadra).toBe(true);
    expect(ef.cambiosPatrimonio.filas.find((f) => f.concepto === 'Traslado a reservas')?.reservas).toBe(49_000);
  });

  it('el periodo siguiente parte de los saldos ya cerrados y deprecia el año completo', () => {
    const siguiente = completarLibro(libro, { ...config(), '2027': { ...config()['2026'], cerrado: false } });
    const ef = estadosFinancieros(siguiente.asientos, '2027-01-01', '2027-12-31');
    expect(ef.situacion.patrimonio.some((r) => r.nombre.startsWith('Resultados de periodos anteriores'))).toBe(false);
    expect(ef.cambiosPatrimonio.filas[0]).toMatchObject({ capital: 1_000_000, reservas: 49_000, acumulados: 931_000 });
    expect(lineas(siguiente.cierres['2027'].automaticos[0])).toEqual({ '6.1.01.11': 120_000, '1.2.02.01': -120_000 });
  });

  it('sin registrar: se proponen los asientos pero el libro no cambia', () => {
    const propuesto = completarLibro(libro, config({ ajustesAutomaticos: false, cerrado: false }));
    expect(propuesto.asientos).toHaveLength(4);
    expect(propuesto.cierres['2026'].automaticos).toHaveLength(3);
    expect(propuesto.cierres['2026'].cierre).toHaveLength(2);
  });
});
