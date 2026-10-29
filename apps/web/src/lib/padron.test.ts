import { afterEach, describe, expect, it, vi } from 'vitest';
import { consultable, consultarPadron, consultarRegistroMag, tipoSegunNumero } from './padron';

const responder = (status: number, cuerpo?: unknown) =>
  vi.stubGlobal('fetch', vi.fn(async () => new Response(cuerpo === undefined ? null : JSON.stringify(cuerpo), { status })));

describe('padrón de Hacienda', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('deduce el tipo de identificación por la cantidad de caracteres', () => {
    expect(tipoSegunNumero('112340567', '02')).toBe('01');
    expect(tipoSegunNumero('3101000046', '01')).toBe('02');
    expect(tipoSegunNumero('3101000046', '04')).toBe('04');
    expect(tipoSegunNumero('155812345678', '02')).toBe('03');
    expect(tipoSegunNumero('3101', '02')).toBe('02');
    expect(consultable('3101')).toBe(false);
    expect(consultable('3A01B23456')).toBe(true);
  });

  it('un contribuyente inscrito trae nombre, tipo y solo sus actividades activas', async () => {
    responder(200, {
      nombre: 'COMPAÑIA DE PRUEBA SOCIEDAD ANONIMA ',
      tipoIdentificacion: '02',
      regimen: { codigo: 1, descripcion: 'Régimen general' },
      situacion: { estado: 'Inscrito', administracionTributaria: 'Dirección de Grandes Contribuyentes Nacionales' },
      actividades: [
        { estado: 'A', tipo: 'S', codigo: '4530.0', descripcion: 'Venta de partes , piezas y accesorios' },
        { estado: 'A', tipo: 'P', codigo: '4520.0', descripcion: 'Mantenimiento y reparación de vehículos automotores' },
        { estado: 'I', tipo: 'S', codigo: '4510.0', descripcion: 'Venta de vehículos automotores' },
      ],
    });
    const p = await consultarPadron('3101000046');
    expect(p).toMatchObject({ inscrito: true, nombre: 'COMPAÑIA DE PRUEBA SOCIEDAD ANONIMA', tipoIdentificacion: '02', regimen: 'Régimen general', estado: 'Inscrito' });
    expect(p.inscrito && p.actividades).toEqual([
      { codigo: '4530.0', descripcion: 'Venta de partes, piezas y accesorios', principal: false },
      { codigo: '4520.0', descripcion: 'Mantenimiento y reparación de vehículos automotores', principal: true },
    ]);
  });

  it('sin actividad principal marcada, la primera hace de principal', async () => {
    responder(200, { nombre: 'X', actividades: [{ estado: 'A', tipo: 'S', codigo: '6920.0', descripcion: 'Contabilidad' }] });
    const p = await consultarPadron('112340567');
    expect(p.inscrito && p.actividades[0].principal).toBe(true);
  });

  it('el 404 significa que no está inscrito; el 429, límite de consultas', async () => {
    responder(404, { code: 404 });
    expect(await consultarPadron('112340567')).toEqual({ inscrito: false, numero: '112340567' });
    responder(429);
    await expect(consultarPadron('112340567')).rejects.toThrow(/Límite de consultas/);
  });

  it('registro agropecuario del MAG: toma el activo y trata el «Not Found» con estado 200 como sin registro', async () => {
    responder(200, { listaDatosMAG: [
      { nombreMAG: 'Finca A', indicadorActivoMAG: false, fechaBajaMAG: '2023-06-17', fuenteMAG: 'MAG' },
      { nombreMAG: 'Finca A', indicadorActivoMAG: true, fechaBajaMAG: '2029-06-17', fuenteMAG: 'SFE Viveros' },
    ] });
    expect(await consultarRegistroMag('112340567')).toEqual({ activo: true, nombre: 'Finca A', fuente: 'SFE Viveros', vence: '2029-06-17' });
    responder(200, { title: 'Not Found', status: 404 });
    expect(await consultarRegistroMag('112340567')).toBeNull();
  });

  it('en el navegador el 404 llega como error de red: si Hacienda responde, no está inscrito', async () => {
    const fetchSimulado = vi.fn(async (url: string) => {
      if (url.includes('/fe/ae')) throw new TypeError('Failed to fetch');
      return new Response('{}', { status: 200 });
    });
    vi.stubGlobal('fetch', fetchSimulado);
    expect(await consultarPadron('999999998')).toEqual({ inscrito: false, numero: '999999998' });
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    await expect(consultarPadron('999999998')).rejects.toThrow(/No se pudo conectar/);
  });
});
