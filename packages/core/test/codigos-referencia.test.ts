import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CODIGO_REFERENCIA, VIGENCIA_CODIGOS_ACTUALIZACION } from '../src/catalogos';
import { EMISOR_DEMO } from '../src/datos-demo';
import type { BorradorComprobante, Referencia } from '../src/tipos';
import { validarBorrador } from '../src/validaciones';
import { borrador } from './helpers';

const CLAVE = '50623102600010123045600100001010000000025112345678';
const ref = (extra: Partial<Referencia>): Referencia => ({ tipoDoc: '01', numero: CLAVE, fechaEmision: '2026-10-01T08:00:00-06:00', codigo: '04', razon: 'Referencia de prueba', ...extra });
const mensajes = (tipo: BorradorComprobante['tipo'], r: Referencia, nivel: 'error' | 'advertencia') =>
  validarBorrador(borrador({ tipo, referencias: [r] }), EMISOR_DEMO).filter((v) => v.nivel === nivel && v.campo === 'referencias.0').map((v) => v.mensaje).join(' | ');

describe('Códigos de referencia 13-17 (actualización v4.4)', () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ['Date'] }));
  afterEach(() => vi.useRealTimers());

  it('incluye los códigos nuevos y el 12 ajustado; obligatorios desde el 1/11/2026', () => {
    const codigos = CODIGO_REFERENCIA.map((c) => c.codigo);
    expect(codigos).toEqual(expect.arrayContaining(['12', '13', '14', '15', '16', '17']));
    expect(CODIGO_REFERENCIA.find((c) => c.codigo === '12')?.descripcion).toMatch(/exoneración posterior/);
    expect(VIGENCIA_CODIGOS_ACTUALIZACION).toBe('2026-11-01');
  });

  it('usos exclusivos: 13 solo NC, 14 solo NC/ND, 15-16 no en ajustes, 16 con tipo 10, 17 solo REP', () => {
    vi.setSystemTime(new Date('2026-10-23T12:00:00-06:00'));
    expect(mensajes('FE', ref({ codigo: '13' }), 'error')).toMatch(/solo se usa en notas de crédito/);
    expect(mensajes('NC', ref({ tipoDoc: '01', codigo: '13' }), 'error')).toBe('');
    expect(mensajes('FE', ref({ codigo: '14' }), 'error')).toMatch(/notas de crédito o débito/);
    expect(mensajes('NC', ref({ codigo: '15' }), 'error')).toMatch(/comprobante que sustituye/);
    expect(mensajes('FE', ref({ codigo: '16', tipoDoc: '01' }), 'error')).toMatch(/tipo de documento 10/);
    expect(mensajes('FE', ref({ codigo: '17' }), 'error')).toMatch(/exclusivo del Recibo/);
  });

  it('antes del 1/11/2026 el código anterior solo genera advertencia', () => {
    vi.setSystemTime(new Date('2026-10-31T23:30:00-06:00'));
    expect(mensajes('FE', ref({ tipoDoc: '10', codigo: '07' }), 'error')).toBe('');
    expect(mensajes('FE', ref({ tipoDoc: '10', codigo: '07' }), 'advertencia')).toMatch(/use el código 16/);
    expect(mensajes('REP', ref({ codigo: '04' }), 'advertencia')).toMatch(/código 17/);
  });

  it('desde el 1/11/2026 (hora de Costa Rica) el código anterior es un error', () => {
    vi.setSystemTime(new Date('2026-11-01T00:30:00-06:00'));
    expect(mensajes('FE', ref({ tipoDoc: '10', codigo: '07' }), 'error')).toMatch(/use el código 16/);
    expect(mensajes('REP', ref({ codigo: '04' }), 'error')).toMatch(/código 17/);
    expect(mensajes('FE', ref({ tipoDoc: '10', codigo: '16' }), 'error')).toBe('');
    expect(mensajes('REP', ref({ codigo: '17' }), 'error')).not.toMatch(/código 17/);
  });
});
