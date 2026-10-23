import { describe, expect, it } from 'vitest';
import {
  descomponerClave,
  descomponerConsecutivo,
  generarClave,
  generarCodigoSeguridad,
  generarConsecutivo,
  identificacionParaClave,
  siguienteNumero,
  validarClave,
} from '../src/clave';
import { fechaEmisionCR, limiteConfirmacionReceptor, limiteEnvioSinInternet } from '../src/fechas';

describe('Numeración consecutiva (Nota 3)', () => {
  it('compone sucursal(3) + terminal(5) + tipo(2) + número(10)', () => {
    const c = generarConsecutivo('001', '00001', 'FE', 1);
    expect(c).toBe('00100001010000000001');
    expect(c).toHaveLength(20);
    expect(descomponerConsecutivo(c)).toEqual({ sucursal: '001', terminal: '00001', tipoDocumento: '01', numero: 1 });
  });

  it('usa los códigos de tipo de documento del Anexo', () => {
    expect(generarConsecutivo('2', '1', 'NC', 15).slice(8, 10)).toBe('03');
    expect(generarConsecutivo('1', '1', 'REP', 1).slice(8, 10)).toBe('10');
    expect(generarConsecutivo('1', '1', 'RCE', 1).slice(8, 10)).toBe('07');
  });

  it('reinicia en 1 al llegar al tope', () => {
    expect(siguienteNumero(9_999_999_999)).toBe(1);
    expect(siguienteNumero(41)).toBe(42);
  });

  it('rechaza números fuera de rango', () => {
    expect(() => generarConsecutivo('001', '00001', 'FE', 0)).toThrow();
  });
});

describe('Clave numérica de 50 dígitos', () => {
  it('rellena la identificación a 12 dígitos según la nota 4.1', () => {
    expect(identificacionParaClave({ tipo: '01', numero: '199990001' })).toBe('000199990001');
    expect(identificacionParaClave({ tipo: '02', numero: '3109999001' })).toBe('003109999001');
    expect(identificacionParaClave({ tipo: '03', numero: '15500000000' })).toBe('015500000000');
  });

  it('genera la clave con 506, fecha de Costa Rica, cédula, consecutivo, situación y seguridad', () => {
    // 2025-01-01T03:00Z equivale al 31/12/2024 21:00 en Costa Rica (UTC-6).
    const fecha = new Date('2025-01-01T03:00:00Z');
    const consecutivo = generarConsecutivo('001', '00001', 'FE', 7);
    const clave = generarClave({ fecha, identificacion: { tipo: '02', numero: '3109999001' }, consecutivo, situacion: '1', codigoSeguridad: '12345678' });
    expect(clave).toHaveLength(50);
    expect(clave).toBe('506' + '31' + '12' + '24' + '003109999001' + consecutivo + '1' + '12345678');
    const p = descomponerClave(clave)!;
    expect(p.consecutivo).toBe(consecutivo);
    expect(validarClave(clave, { fechaEmision: fechaEmisionCR(fecha), consecutivo })).toEqual([]);
  });

  it('detecta incoherencias entre clave, fecha y consecutivo', () => {
    const consecutivo = generarConsecutivo('001', '00001', 'FE', 1);
    const clave = generarClave({ fecha: new Date('2025-06-10T15:00:00Z'), identificacion: { tipo: '01', numero: '199990001' }, consecutivo, situacion: '1', codigoSeguridad: '00000001' });
    expect(validarClave(clave, { fechaEmision: '2025-06-11T09:00:00-06:00' })).toContain('La fecha de la clave no coincide con FechaEmision.');
    expect(validarClave('123')).toHaveLength(1);
  });

  it('el código de seguridad tiene 8 dígitos', () => {
    for (let i = 0; i < 20; i++) expect(generarCodigoSeguridad()).toMatch(/^\d{8}$/);
  });
});

describe('Fechas y plazos', () => {
  it('formatea FechaEmision en RFC 3339 con -06:00', () => {
    expect(fechaEmisionCR(new Date('2025-03-05T18:04:09Z'))).toBe('2025-03-05T12:04:09-06:00');
  });

  it('calcula 8 días hábiles desde el primer día del mes siguiente (art. 10 RES-0027)', () => {
    // 1/11/2025 es sábado: hábiles 3,4,5,6,7,10,11,12 de noviembre.
    expect(limiteConfirmacionReceptor(new Date('2025-10-15T16:00:00Z'))).toBe('2025-11-12');
    // Con un feriado configurado el plazo se corre un día.
    expect(limiteConfirmacionReceptor(new Date('2025-10-15T16:00:00Z'), ['2025-11-05'])).toBe('2025-11-13');
  });

  it('calcula dos días hábiles para envío sin internet (art. 21 Decreto 44739-H)', () => {
    // Viernes 7/11/2025 -> lunes 10 y martes 11.
    expect(limiteEnvioSinInternet(new Date('2025-11-07T15:00:00Z'))).toBe('2025-11-11');
  });
});
