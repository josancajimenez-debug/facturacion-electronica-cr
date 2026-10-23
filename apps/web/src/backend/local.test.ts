import type { Comprobante, Emisor } from '@fe-cr/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { csv } from '../lib/formato';
import { LocalBackend, borrarDatosLocales } from './local';
import { ErrorConValidaciones } from './tipos';

// En jsdom no hay servidor para /data/cabys-2025.json; el simulador omite esa verificación.
vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404 })));

const ultimo = <T>(suscribir: (cb: (v: T) => void) => () => void) =>
  new Promise<T>((resolve) => {
    const off = suscribir((v) => {
      queueMicrotask(() => off());
      resolve(v);
    });
  });

async function esperarEstado(b: LocalBackend, emisorId: string, clave: string): Promise<Comprobante> {
  for (let i = 0; i < 60; i++) {
    const lista = await ultimo<Comprobante[]>((cb) => b.onComprobantes(emisorId, cb));
    const c = lista.find((x) => x.clave === clave);
    if (c && (c.estado === 'aceptado' || c.estado === 'rechazado')) return c;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('tiempo agotado');
}

describe('LocalBackend', () => {
  beforeEach(() => borrarDatosLocales());

  it('registra, carga la demo, emite y recibe respuesta simulada', async () => {
    const b = new LocalBackend();
    await b.registrar('a@demo.test', 'secreto123');
    const emisorId = await b.sembrarDemo();
    const [emisor] = await ultimo<Emisor[]>((cb) => b.onEmisores(cb));
    expect(emisor.id).toBe(emisorId);

    const { clave } = await b.emitir(emisorId, {
      tipo: 'FE', emisorId, sucursal: '001', terminal: '00001', situacion: '1', codigoActividadEmisor: '6920.0',
      contraparte: { nombre: 'Distribuidora Ficticia del Valle S.A.', identificacion: { tipo: '02', numero: '3109999002' } },
      condicionVenta: '01', moneda: 'CRC', tipoCambio: 1, otrosCargos: [], referencias: [], mediosPago: [{ tipo: '01' }],
      lineas: [{ codigoCabys: '8222100000000', detalle: 'Servicios de contabilidad', cantidad: 1, unidadMedida: 'Sp', precioUnitario: 1000, descuentos: [], codigoTarifaIva: '08' }],
    });
    const c = await esperarEstado(b, emisorId, clave);
    expect(c.estado).toBe('aceptado');
    expect(c.consecutivo).toBe('00100001010000000001');
    expect(c.historial.map((h) => h.estado)).toEqual(['generado', 'enviado', 'recibido', 'procesando', 'aceptado']);
  }, 20000);

  it('no consume consecutivo cuando hay errores de validación', async () => {
    const b = new LocalBackend();
    await b.registrar('b@demo.test', 'secreto123');
    const emisorId = await b.sembrarDemo();
    const malo = { tipo: 'FE' as const, emisorId, sucursal: '001', terminal: '00001', situacion: '1' as const, condicionVenta: '01', moneda: 'CRC', tipoCambio: 1, otrosCargos: [], referencias: [], mediosPago: [], lineas: [] };
    await expect(b.emitir(emisorId, malo)).rejects.toBeInstanceOf(ErrorConValidaciones);
    const lista = await ultimo<Comprobante[]>((cb) => b.onComprobantes(emisorId, cb));
    expect(lista).toHaveLength(0);
  });

  it('impide operar sobre un emisor ajeno', async () => {
    const b = new LocalBackend();
    await b.registrar('c@demo.test', 'secreto123');
    const emisorId = await b.sembrarDemo();
    await b.salir();
    await b.registrar('d@demo.test', 'secreto123');
    await expect(b.simularRecepcion(emisorId)).rejects.toThrow(/No pertenece/);
  });

  it('confirma un comprobante recibido con mensaje 05', async () => {
    const b = new LocalBackend();
    await b.registrar('e@demo.test', 'secreto123');
    const emisorId = await b.sembrarDemo();
    const { clave } = await b.simularRecepcion(emisorId);
    const r = await b.confirmar(emisorId, { clave, mensaje: '1', condicionImpuesto: '01', codigoActividad: '6920.0' });
    expect(r.consecutivo.slice(8, 10)).toBe('05');
    await expect(b.confirmar(emisorId, { clave, mensaje: '1' })).rejects.toThrow(/ya fue confirmado/);
  });
});

describe('formato CSV', () => {
  it('usa ; como separador, escapa comillas e incluye BOM', () => {
    expect(csv([['a', 'b;c', 'd"e']])).toBe('﻿a;"b;c";"d""e"');
  });
});
