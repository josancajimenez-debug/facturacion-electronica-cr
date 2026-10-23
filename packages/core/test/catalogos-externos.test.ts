import { describe, expect, it } from 'vitest';
import { FORMAS_FARMACEUTICAS_MINSA } from '../src/catalogos';
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

describe('Formas farmacéuticas', () => {
  it('carga el catálogo del Ministerio de Salud', () => {
    expect(FORMAS_FARMACEUTICAS_MINSA).toHaveLength(91);
    expect(FORMAS_FARMACEUTICAS_MINSA.find((f) => f.codigo === '385049006')?.descripcion).toBe('cápsula');
  });

  it('rechaza en FormaFarmaceutica códigos de más de 3 caracteres y avisa si falta con registro sanitario', () => {
    const largo = validarBorrador(borrador({ lineas: [linea({ formaFarmaceutica: '385049006' })] }), EMISOR_DEMO);
    expect(largo.some((v) => v.nivel === 'error' && /3 caracteres/.test(v.mensaje))).toBe(true);
    const sinForma = validarBorrador(borrador({ lineas: [linea({ registroMedicamento: 'REG-0001' })] }), EMISOR_DEMO);
    expect(sinForma.some((v) => v.nivel === 'advertencia' && /forma farmacéutica/.test(v.mensaje))).toBe(true);
  });
});
