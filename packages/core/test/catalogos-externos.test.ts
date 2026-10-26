import { describe, expect, it } from 'vitest';
import { FORMA_FARMACEUTICA, FORMAS_FARMACEUTICAS_MINSA, MONEDA } from '../src/catalogos';
import { EMISOR_DEMO } from '../src/datos-demo';
import { DIVISION_TERRITORIAL, cantonesDe, distritosDe, nombreUbicacion, verificarUbicacion } from '../src/ubicacion';
import { validarBorrador } from '../src/validaciones';
import { borrador, linea } from './helpers';

describe('División Territorial Administrativa 2022', () => {
  it('contiene las 7 provincias y los distritos del documento', () => {
    expect(DIVISION_TERRITORIAL.provincias.map((p) => p.nombre)).toEqual(['San José', 'Alajuela', 'Cartago', 'Heredia', 'Guanacaste', 'Puntarenas', 'Limón']);
    const total = DIVISION_TERRITORIAL.provincias.reduce((s, p) => s + p.cantones.reduce((t, c) => t + c.distritos.length, 0), 0);
    expect(total).toBe(488);
  });

  it('deriva códigos de 2 dígitos para cantón y distrito', () => {
    expect(cantonesDe('1')[0]).toMatchObject({ codigo: '01', nombre: 'San José' });
    expect(distritosDe('1', '01').slice(0, 2)).toEqual([{ codigo: '01', nombre: 'Carmen' }, { codigo: '02', nombre: 'Merced' }]);
    expect(nombreUbicacion({ provincia: '4', canton: '01', distrito: '01', otrasSenas: '' })).toBe('Heredia, Heredia, Heredia');
  });

  it('advierte (no rechaza) ubicaciones fuera del catálogo', () => {
    expect(verificarUbicacion({ provincia: '1', canton: '01', distrito: '99', otrasSenas: '' })).toMatch(/no figura/);
    const v = validarBorrador(borrador({ contraparte: { nombre: 'Cliente', identificacion: { tipo: '02', numero: '3109999002' }, ubicacion: { provincia: '1', canton: '01', distrito: '99', otrasSenas: 'x' } } }), EMISOR_DEMO);
    expect(v.find((x) => x.campo === 'contraparte.ubicacion')?.nivel).toBe('advertencia');
  });
});

describe('Monedas (nota 13.1, Codigodemoneda_V4.4)', () => {
  it('carga la tabla oficial con CRC, USD y EUR primero', () => {
    expect(MONEDA.length).toBeGreaterThan(150);
    expect(MONEDA.slice(0, 3).map((m) => m.codigo)).toEqual(['CRC', 'USD', 'EUR']);
    expect(new Set(MONEDA.map((m) => m.codigo)).size).toBe(MONEDA.length);
    expect(MONEDA.find((m) => m.codigo === 'JPY')?.descripcion).toBe('Yen');
  });

  it('rechaza un código de moneda que no está en la tabla', () => {
    const v = validarBorrador(borrador({ moneda: 'XYZ', tipoCambio: 10 }), EMISOR_DEMO);
    expect(v.some((x) => x.campo === 'moneda' && x.nivel === 'error')).toBe(true);
    expect(validarBorrador(borrador({ moneda: 'GBP', tipoCambio: 650 }), EMISOR_DEMO).some((x) => x.campo === 'moneda')).toBe(false);
  });
});

describe('Formas farmacéuticas', () => {
  it('carga el catálogo del Ministerio de Salud', () => {
    expect(FORMAS_FARMACEUTICAS_MINSA).toHaveLength(91);
    expect(FORMAS_FARMACEUTICAS_MINSA.find((f) => f.codigo === '385049006')?.descripcion).toBe('cápsula');
  });

  it('carga la tabla oficial de Hacienda (nota 19) con códigos de hasta 3 caracteres', () => {
    expect(FORMA_FARMACEUTICA).toHaveLength(229);
    expect(FORMA_FARMACEUTICA.find((f) => f.codigo === '04')?.descripcion).toBe('Cápsula');
    expect(FORMA_FARMACEUTICA.every((f) => /^\d{1,3}$/.test(f.codigo))).toBe(true);
  });

  it('solo admite códigos de la tabla de Hacienda y avisa si falta con registro sanitario', () => {
    const snomed = validarBorrador(borrador({ lineas: [linea({ formaFarmaceutica: '385049006' })] }), EMISOR_DEMO);
    expect(snomed.some((v) => v.nivel === 'error' && /tabla «Código de forma farmacéutica»/.test(v.mensaje))).toBe(true);
    const valida = validarBorrador(borrador({ lineas: [linea({ registroMedicamento: 'REG-0001', formaFarmaceutica: '04' })] }), EMISOR_DEMO);
    expect(valida.some((v) => v.campo.endsWith('formaFarmaceutica'))).toBe(false);
    const sinForma = validarBorrador(borrador({ lineas: [linea({ registroMedicamento: 'REG-0001' })] }), EMISOR_DEMO);
    expect(sinForma.some((v) => v.nivel === 'advertencia' && /forma farmacéutica/.test(v.mensaje))).toBe(true);
  });
});
