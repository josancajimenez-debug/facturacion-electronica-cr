import { describe, expect, it } from 'vitest';
import { baseIndicadores, descomposicionDuPont, diagnosticoFinanciero, indicadoresFinancieros, type EstadosFinancieros, type Indicador } from '../src';

interface Cifras {
  efectivo?: number; cxc?: number; inventario?: number; noCorriente?: number;
  proveedores?: number; otrosCorrientes?: number; deudaLargo?: number; capital?: number;
  ventas?: number; costo?: number; depreciacion?: number; otrosGastos?: number; financieros?: number; impuesto?: number;
  flujoOperacion?: number; desde?: string; hasta?: string;
}

/** Estados financieros mínimos con los códigos del catálogo, para probar los indicadores con cifras de libro. */
function estados(c: Cifras): EstadosFinancieros {
  const r = (codigo: string, nombre: string, nivel: number, monto = 0) => ({ codigo, nombre, nivel, monto });
  const ac = (c.efectivo ?? 0) + (c.cxc ?? 0) + (c.inventario ?? 0);
  const pc = (c.proveedores ?? 0) + (c.otrosCorrientes ?? 0);
  const activo = ac + (c.noCorriente ?? 0);
  const pasivo = pc + (c.deudaLargo ?? 0);
  const gastosOp = (c.depreciacion ?? 0) + (c.otrosGastos ?? 0);
  const uai = (c.ventas ?? 0) - (c.costo ?? 0) - gastosOp - (c.financieros ?? 0);
  const resultado = uai - (c.impuesto ?? 0);
  const patrimonio = activo - pasivo;
  const sin = (x: { monto: number }) => x.monto !== 0;
  return {
    desde: c.desde ?? '2009-01-01',
    hasta: c.hasta ?? '2009-12-31',
    situacion: {
      activo: [r('1.1', 'Activo corriente', 2, ac), r('1.1.01', 'Efectivo', 3, c.efectivo), r('1.1.02', 'Cuentas por cobrar', 3, c.cxc), r('1.1.03', 'Inventarios', 3, c.inventario), r('1.2', 'Activo no corriente', 2, c.noCorriente)].filter(sin),
      pasivo: [r('2.1', 'Pasivo corriente', 2, pc), r('2.1.01', 'Cuentas por pagar comerciales', 3, c.proveedores), r('2.2', 'Pasivo no corriente', 2, c.deudaLargo), r('2.2.01', 'Obligaciones financieras', 3, c.deudaLargo)].filter(sin),
      patrimonio: [r('3.1', 'Capital', 2, c.capital ?? patrimonio)].filter(sin),
      totalActivo: activo, totalPasivo: pasivo, totalPatrimonio: patrimonio, cuadra: true,
    },
    resultados: {
      ingresos: [r('4.1', 'Ingresos de actividades ordinarias', 2, c.ventas)].filter(sin),
      costos: [r('5.1', 'Costo de ventas', 2, c.costo)].filter(sin),
      gastos: [r('6.1', 'Gastos de operación', 2, gastosOp), r('6.1.01.11', 'Depreciación y amortización', 4, c.depreciacion), r('6.2', 'Gastos financieros', 2, c.financieros)].filter(sin),
      totalIngresos: c.ventas ?? 0, totalCostos: c.costo ?? 0, utilidadBruta: (c.ventas ?? 0) - (c.costo ?? 0),
      totalGastos: gastosOp + (c.financieros ?? 0), utilidadAntesImpuesto: uai, impuestoRenta: c.impuesto ?? 0, resultado,
    },
    cambiosPatrimonio: { filas: [], cuadra: true },
    flujos: { operacion: [], inversion: [], financiamiento: [], totalOperacion: c.flujoOperacion ?? 0, totalInversion: 0, totalFinanciamiento: 0, variacion: 0, efectivoInicial: 0, efectivoFinal: c.efectivo ?? 0, cuadra: true },
  };
}

// Prufrock Corporation, 2009 (Ross, Westerfield y Jordan, tablas 3.1 y 3.2, en millones de dólares).
const PRUFROCK = estados({
  efectivo: 98, cxc: 188, inventario: 422, noCorriente: 2880,
  proveedores: 344, otrosCorrientes: 196, deudaLargo: 457, capital: 550,
  ventas: 2311, costo: 1344, depreciacion: 276, financieros: 141, impuesto: 187,
});

const porId = (lista: Indicador[]) => Object.fromEntries(lista.map((i) => [i.id, i]));

describe('Indicadores financieros (bibliografía de finanzas)', () => {
  it('reproduce las razones de Prufrock del capítulo 3 de Ross', () => {
    const k = porId(indicadoresFinancieros(PRUFROCK));
    expect(k['razon-corriente'].valor).toBeCloseTo(1.31, 2);
    expect(k['prueba-acida'].valor).toBeCloseTo(0.53, 2);
    expect(k['razon-efectivo'].valor).toBeCloseTo(0.18, 2);
    expect(k['razon-deuda'].valor).toBeCloseTo(0.28, 2);
    expect(k['deuda-patrimonio'].valor).toBeCloseTo(0.38, 1);
    expect(k['multiplicador'].valor).toBeCloseTo(1.38, 2);
    expect(k['cobertura-intereses'].valor).toBeCloseTo(4.9, 1);
    expect(k['dias-inventario'].valor).toBeCloseTo(114.6, 0);
    expect(k['dias-cobro'].valor).toBeCloseTo(29.7, 1);
    expect(k['rotacion-activos'].valor).toBeCloseTo(0.64, 2);
    expect(k['margen-neto'].valor).toBeCloseTo(0.157, 3);
    expect(k['roa'].valor).toBeCloseTo(0.1012, 3);
    expect(k['roe'].valor).toBeCloseTo(0.1401, 3);
    // Medida del intervalo: costos sin depreciación ni intereses (1 344) ÷ 365 → 708 ÷ 3,68 ≈ 192 días.
    expect(k['intervalo'].valor).toBeCloseTo(192, 0);
  });

  it('la identidad Du Pont reconstruye el ROE (15,7 % × 0,64 × 1,38 ≈ 14 %)', () => {
    const dp = descomposicionDuPont(baseIndicadores(PRUFROCK));
    expect(dp?.margen).toBeCloseTo(0.157, 3);
    expect(dp?.roe).toBeCloseTo(0.1401, 3);
  });

  it('aplica los rangos de Amat: liquidez 1,1 «vigilar», endeudamiento 0,43 «favorable», cobro en 15 días', () => {
    const k = porId(indicadoresFinancieros(estados({ efectivo: 4000, cxc: 125000 - 85000, inventario: 0, proveedores: 30000, otrosCorrientes: 10000, noCorriente: 26000 - 4000 + 4000 })));
    expect(k['razon-corriente'].valor).toBeCloseTo(1.1, 2);
    expect(k['razon-corriente'].nivel).toBe('vigilar');
    const deuda = porId(indicadoresFinancieros(estados({ efectivo: 70000, proveedores: 30000 })));
    expect(deuda['razon-deuda'].valor).toBeCloseTo(0.43, 2);
    expect(deuda['razon-deuda'].nivel).toBe('favorable');
    const cobro = porId(indicadoresFinancieros(estados({ cxc: 125000, ventas: 3_000_000 })));
    expect(cobro['dias-cobro'].valor).toBeCloseTo(15.2, 1);
    expect(cobro['dias-cobro'].nivel).toBe('favorable');
  });

  it('EVA de Brealey y Myers: utilidad de 130 sobre un capital de 1 000 al 10 % crea 30', () => {
    const ef = estados({ efectivo: 1000, ventas: 130 });
    const k = porId(indicadoresFinancieros(ef, { parametros: { costoCapital: 0.1 } }));
    expect(k['eva'].valor).toBeCloseTo(30, 6);
    expect(k['eva'].nivel).toBe('favorable');
    // El ROE se compara con el costo de oportunidad de los dueños.
    expect(porId(indicadoresFinancieros(ef, { parametros: { costoCapital: 0.2 } }))['roe'].nivel).toBe('vigilar');
  });

  it('anualiza rotaciones y rentabilidades de un corte parcial', () => {
    const k = porId(indicadoresFinancieros(estados({ efectivo: 1000, ventas: 500, desde: '2026-01-01', hasta: '2026-06-30' })));
    expect(k['roe'].valor).toBeCloseTo((500 * 365) / 181 / 1000, 6);
    expect(k['roe'].calculo).toMatch(/365 ÷ 181 días/);
  });

  it('sin deuda ni ventas no divide entre cero y explica por qué', () => {
    const k = porId(indicadoresFinancieros(estados({ efectivo: 500 })));
    expect(k['razon-corriente']).toMatchObject({ valor: null, nivel: 'favorable', motivo: 'No hay pasivo corriente.' });
    expect(k['cobertura-intereses'].nivel).toBe('favorable');
    expect(k['margen-neto'].nivel).toBe('sin-datos');
    expect(indicadoresFinancieros(estados({ efectivo: 500 })).every((i) => i.analisis.length > 0)).toBe(true);
  });

  it('marca la tendencia frente al año anterior según la dirección de cada razón', () => {
    const anterior = estados({ efectivo: 100, inventario: 100, proveedores: 200, ventas: 1000, costo: 600 });
    const k = porId(indicadoresFinancieros(PRUFROCK, { anterior }));
    expect(k['razon-corriente'].anterior).toBeCloseTo(1, 6);
    expect(k['razon-corriente'].tendencia).toBe('mejora');
    expect(k['razon-deuda'].tendencia).toBe('mejora');
  });

  it('el diagnóstico resume niveles, alertas y acciones', () => {
    const critico = estados({ efectivo: 10, inventario: 50, proveedores: 400, noCorriente: 500, ventas: 300, costo: 290, otrosGastos: 80 });
    const d = diagnosticoFinanciero(indicadoresFinancieros(critico));
    expect(d.conteo.desfavorable).toBeGreaterThan(3);
    expect(d.categorias.liquidez.nivel).toBe('desfavorable');
    expect(d.alertas.some((a) => a.startsWith('Razón corriente'))).toBe(true);
    expect(d.acciones.length).toBeGreaterThan(0);
    expect(d.resumen).toMatch(/áreas críticas/);
    expect(diagnosticoFinanciero(indicadoresFinancieros(estados({}))).resumen).toMatch(/Aún no hay movimientos/);
  });
});
