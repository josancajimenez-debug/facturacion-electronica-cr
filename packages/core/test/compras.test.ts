import { describe, expect, it } from 'vitest';
import { ajustarFecAlRegimen, borradorFecPara, infoRegimen, regimenDesdeHacienda } from '../src/compras';
import { EMISOR_DEMO } from '../src/datos-demo';
import type { BorradorComprobante } from '../src/tipos';
import { validarBorrador } from '../src/validaciones';
import { borrador } from './helpers';

const vendedor = { nombre: 'Productor Ficticio Agropecuario', identificacion: { tipo: '01', numero: '199990002' }, ubicacion: { provincia: '5', canton: '01', distrito: '01', otrasSenas: 'Finca de pruebas' } };

const fec = (p: Partial<BorradorComprobante>) =>
  borrador({ tipo: 'FEC', codigoActividadEmisor: undefined, codigoActividadReceptor: '6920.0', contraparte: vendedor, ...p });

const conRegimen = (regimen: BorradorComprobante['regimenVendedor'], tipoId = '01') => {
  const base = borradorFecPara(regimen!, tipoId, '2026-10-29T08:00:00-06:00');
  return fec({ ...base, referencias: base.referencias!.map((r) => ({ ...r, numero: 'RTS-000123' })) });
};

const mensajes = (b: BorradorComprobante, nivel: 'error' | 'advertencia') =>
  validarBorrador(b, EMISOR_DEMO).filter((v) => v.nivel === nivel).map((v) => v.mensaje);

describe('Proveedores de la FEC (Decreto 44739-H, art. 2 inc. 13)', () => {
  it('régimen simplificado y agropecuario: procede la FEC con la referencia 14', () => {
    for (const r of ['simplificado', 'agropecuario'] as const) {
      expect(infoRegimen(r)).toMatchObject({ procedeFec: true, referencia: '14' });
      expect(mensajes(conRegimen(r), 'error')).toEqual([]);
    }
  });

  it('sin la referencia 14 la FEC al régimen especial no se emite', () => {
    const b = fec({ regimenVendedor: 'agropecuario', referencias: [{ tipoDoc: '99', tipoDocOtro: 'Factura física', numero: '123', fechaEmision: '2026-10-29T08:00:00-06:00', codigo: '04', razon: 'Compra' }] });
    expect(mensajes(b, 'error')).toContainEqual(expect.stringMatching(/tipo de documento 14/));
  });

  it('no procede con el RTS no confirmante ni con el régimen general', () => {
    expect(mensajes(conRegimen('no-confirmante'), 'error')).toContainEqual(expect.stringMatching(/No procede la FEC/));
    expect(mensajes(conRegimen('general'), 'error')).toContainEqual(expect.stringMatching(/No procede la FEC/));
  });

  it('el no domiciliado exige identificación 05 y referencia 16', () => {
    expect(borradorFecPara('no-domiciliado').referencias?.[0].tipoDoc).toBe('16');
    expect(mensajes(conRegimen('no-domiciliado'), 'error')).toContainEqual(expect.stringMatching(/tipo 05/));
  });

  it('el «No contribuyente» (06) lleva la condición de venta 13 de bienes usados', () => {
    expect(borradorFecPara('no-inscrito', '06')).toMatchObject({ condicionVenta: '13', referencias: [] });
  });

  it('sin régimen indicado solo advierte, para no romper FEC ya preparadas', () => {
    expect(mensajes(fec({ referencias: [{ tipoDoc: '14', numero: 'X-1', fechaEmision: '2026-10-29T08:00:00-06:00', codigo: '04', razon: 'Compra' }] }), 'advertencia'))
      .toContainEqual(expect.stringMatching(/régimen del vendedor/));
  });

  it('interpreta el régimen que informa el API de Hacienda', () => {
    expect(regimenDesdeHacienda('Régimen de Tributación Simplificada')).toBe('simplificado');
    expect(regimenDesdeHacienda('Régimen Especial Agropecuario')).toBe('agropecuario');
    expect(regimenDesdeHacienda('Régimen general')).toBe('general');
    expect(regimenDesdeHacienda(undefined)).toBeUndefined();
  });

  it('al cambiar de vendedor quita la referencia automática vacía y conserva la que el usuario completó', () => {
    const rea = borradorFecPara('agropecuario', '01');
    const b = { referencias: rea.referencias!, condicionVenta: '01' };
    // Pasa a un no domiciliado: la 14 vacía se reemplaza por la 16.
    expect(ajustarFecAlRegimen(b, 'no-domiciliado', '05').referencias.map((r) => r.tipoDoc)).toEqual(['16']);
    // Si la 14 ya tiene el número del comprobante, se conserva.
    const completada = { ...b, referencias: [{ ...b.referencias[0], numero: 'FAC-1' }] };
    expect(ajustarFecAlRegimen(completada, 'no-domiciliado', '05').referencias.map((r) => r.tipoDoc)).toEqual(['14', '16']);
    // La condición 13 se pone con el «No contribuyente» y se quita al cambiar a otro vendedor.
    const usado = ajustarFecAlRegimen(b, 'no-inscrito', '06');
    expect(usado.condicionVenta).toBe('13');
    expect(ajustarFecAlRegimen(usado, 'simplificado', '01')).toMatchObject({ condicionVenta: '01', regimenVendedor: 'simplificado' });
    expect(ajustarFecAlRegimen(b, undefined).referencias).toEqual([]);
  });
});
