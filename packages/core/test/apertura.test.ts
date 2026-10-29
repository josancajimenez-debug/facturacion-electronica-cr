import { describe, expect, it } from 'vitest';
import { asientoAperturaBalance, leerBalanceCsv, leerMonto, validarApertura, type AperturaContable } from '../src/apertura';
import { asientoManual } from '../src/cierre';
import { Kardex, generarLibroDiario } from '../src/contabilidad';
import { EMISOR_DEMO } from '../src/datos-demo';
import { estadosFinancieros } from '../src/libros';

const BALANCE = `Código;Cuenta;Debe;Haber
1;ACTIVO;;
1.1.01.02;Bancos;"1.500.000,00";
1.1.02.01;Clientes;800.000;
1.1.03.01;Inventario de mercadería;450000;
1.2.01.02;Equipo de cómputo;1.200.000,00;
1.2.02.01;Depreciación acumulada;;300.000
2.1.01.01;Proveedores;;650000
3.1.01.01;Capital social pagado;;2000000
3.3.01.01;Utilidades acumuladas;;1000000
Total;;3.950.000;3.950.000`;

describe('Balance de apertura', () => {
  it('detecta el separador en la primera fila de datos aunque el archivo empiece con un título', () => {
    const r = leerBalanceCsv('Balance de situación al 31 de diciembre de 2025\n\nCódigo;Cuenta;Debe;Haber\n1.1.01.02;Bancos;1.500.000,00;\n3.1.01.01;Capital;;1.500.000,00');
    expect(r.errores).toEqual([]);
    expect(r.saldos).toEqual([{ cuenta: '1.1.01.02', debe: 1500000, haber: 0 }, { cuenta: '3.1.01.01', debe: 0, haber: 1500000 }]);
  });

  it('una cuenta repetida en el archivo no se pierde en silencio: se informa y se conserva la primera', () => {
    const r = leerBalanceCsv('1.1.01.02,Bancos,800000,\n1.1.01.02,Bancos,200000,\n3.1.01.01,Capital,,800000');
    expect(r.saldos.map((s) => s.cuenta)).toEqual(['1.1.01.02', '3.1.01.01']);
    expect(r.saldos[0].debe).toBe(800000);
    expect(r.errores).toEqual(['Línea 2: la cuenta 1.1.01.02 ya aparece en la línea 1; se omitió esta línea.']);
  });

  it('lee montos en formato costarricense e internacional', () => {
    expect(leerMonto('1.234.567,89')).toBe(1234567.89);
    expect(leerMonto('1,234,567.89')).toBe(1234567.89);
    expect(leerMonto('₡ 1 500')).toBe(1500);
    expect(leerMonto('(2.000)')).toBe(-2000);
    expect(leerMonto('12,5')).toBe(12.5);
    expect(leerMonto('')).toBe(0);
  });

  it('lee el CSV con encabezado, subtotales y totales', () => {
    const { saldos, errores } = leerBalanceCsv(BALANCE);
    expect(errores).toEqual([]);
    expect(saldos).toHaveLength(8);
    expect(saldos[0]).toEqual({ cuenta: '1.1.01.02', debe: 1500000, haber: 0 });
    expect(saldos.find((s) => s.cuenta === '1.2.02.01')).toEqual({ cuenta: '1.2.02.01', debe: 0, haber: 300000 });
  });

  it('acepta una columna de saldo con signo y rechaza cuentas de resultados', () => {
    const { saldos, errores } = leerBalanceCsv('1.1.01.02\t500000\n3.1.01.01\t-500000\n4.1.01.01\t-10\n9.9.9\t1');
    expect(saldos).toEqual([{ cuenta: '1.1.01.02', debe: 500000, haber: 0 }, { cuenta: '3.1.01.01', debe: 0, haber: 500000 }]);
    expect(errores).toHaveLength(2);
  });

  it('valida cuadre e inventario contra el kárdex', () => {
    const { saldos } = leerBalanceCsv(BALANCE);
    const ok: AperturaContable = { fecha: '2026-01-01', saldos, existencias: [{ cabys: '2391102010200', detalle: 'Café', cantidad: 100, costo: 450000 }] };
    expect(validarApertura(ok)).toEqual([]);
    expect(validarApertura({ ...ok, existencias: [{ ...ok.existencias![0], costo: 400000 }] })[0]).toMatch(/deben coincidir/);
    expect(validarApertura({ ...ok, saldos: saldos.slice(1) })[0]).toMatch(/no cuadra/);
  });

  it('los saldos iniciales son el saldo al inicio de los estados financieros', () => {
    const { saldos } = leerBalanceCsv(BALANCE);
    const apertura = asientoAperturaBalance({ fecha: '2026-01-01', saldos })!;
    expect(apertura).toMatchObject({ cuadrado: true, totalDebe: 3950000, saldoInicial: true });
    expect(apertura.alertas[0]).toMatch(/inventario inicial/);
    const cobro = asientoManual({ id: 'c', fecha: '2026-02-01', glosa: 'Cobro', lineas: [{ cuenta: '1.1.01.02', debe: 300000, haber: 0 }, { cuenta: '1.1.02.01', debe: 0, haber: 300000 }] });
    const ef = estadosFinancieros([apertura, cobro], '2026-01-01', '2026-12-31');
    expect(ef.situacion).toMatchObject({ totalActivo: 3650000, cuadra: true });
    expect(ef.cambiosPatrimonio.filas[0]).toMatchObject({ concepto: 'Saldo al inicio del periodo', capital: 2000000, acumulados: 1000000 });
    expect(ef.cambiosPatrimonio.filas.some((f) => f.concepto.startsWith('Aportes'))).toBe(false);
    expect(ef.flujos).toMatchObject({ efectivoInicial: 1500000, efectivoFinal: 1800000, financiamiento: [], cuadra: true });
  });

  it('el inventario inicial entra al kárdex y costea las ventas', () => {
    const { saldos } = leerBalanceCsv(BALANCE);
    const libro = generarLibroDiario({
      emisor: EMISOR_DEMO, emitidos: [], recibidos: [], cabysInventario: ['2391102010200'],
      apertura: { fecha: '2026-01-01', saldos, existencias: [{ cabys: '2391102010200', detalle: 'Café', cantidad: 100, costo: 450000 }] },
    });
    expect(libro.asientos[0]).toMatchObject({ origen: { documento: 'apertura' }, alertas: [] });
    expect(libro.kardex.existencias()[0]).toMatchObject({ cantidad: 100, costoPromedio: 4500 });
    expect(new Kardex().existencias()).toEqual([]);
  });

  it('exige fecha y capital o saldos', () => {
    expect(validarApertura({ fecha: '', capital: 0 })).toEqual(['Indique la fecha del balance de apertura.', 'Registre el capital aportado o los saldos del balance.']);
    expect(validarApertura({ fecha: '2026-01-01', capital: 1000 })).toEqual([]);
  });

  it('sin saldos conserva el aporte de capital en efectivo', () => {
    expect(asientoAperturaBalance({ fecha: '2026-01-01', capital: 1000 })).toMatchObject({ totalDebe: 1000, glosa: expect.stringMatching(/aporte de capital/) });
    expect(asientoAperturaBalance({ fecha: '2026-01-01' })).toBeNull();
  });
});
