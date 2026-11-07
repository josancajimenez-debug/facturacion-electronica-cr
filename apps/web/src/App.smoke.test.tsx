/**
 * Prueba de humo de la interfaz: monta la APP completa (modo local, datos de práctica con una venta
 * emitida y una compra confirmada) en cada ruta y exige que cada página termine de cargar, muestre su
 * título y no deje errores en la consola ni caiga en el límite de errores.
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { Comprobante, Emisor } from '@fe-cr/core';
import { App } from './App';
import { LocalBackend, borrarDatosLocales } from './backend/local';
import { AppProvider } from './estado';
import type { Recibido } from './backend/tipos';

// En jsdom no hay servidor para /data/*.json ni red: el simulador omite esas verificaciones.
vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404, json: async () => ({}) })));
// React exige este indicador para usar act() fuera de una biblioteca de pruebas.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
// jsdom no implementa matchMedia ni scrollTo.
window.matchMedia ??= ((q: string) => ({ matches: false, media: q, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false })) as typeof window.matchMedia;
window.scrollTo = (() => undefined) as typeof window.scrollTo;

const ultimo = <T,>(suscribir: (cb: (v: T) => void) => () => void) =>
  new Promise<T>((resolve) => {
    const off = suscribir((v) => {
      queueMicrotask(() => off());
      resolve(v);
    });
  });

async function hasta<T>(obtener: () => Promise<T | undefined> | T | undefined, ms = 15000): Promise<T> {
  const fin = Date.now() + ms;
  for (;;) {
    const v = await obtener();
    if (v !== undefined) return v;
    if (Date.now() > fin) throw new Error('tiempo agotado');
    await new Promise((r) => setTimeout(r, 100));
  }
}

let claveVenta = '';

beforeAll(async () => {
  borrarDatosLocales();
  const b = new LocalBackend();
  await b.registrar('humo@demo.test', 'secreto123');
  const emisorId = await b.sembrarDemo();
  const { clave } = await b.emitir(emisorId, {
    tipo: 'FE', emisorId, sucursal: '001', terminal: '00001', situacion: '1', codigoActividadEmisor: '6920.0',
    contraparte: { nombre: 'Distribuidora Ficticia del Valle S.A.', identificacion: { tipo: '02', numero: '3109999002' } },
    condicionVenta: '02', plazoCredito: 30, moneda: 'CRC', tipoCambio: 1, otrosCargos: [], referencias: [], mediosPago: [{ tipo: '04' }],
    lineas: [{ codigoCabys: '8222100000000', detalle: 'Servicios de contabilidad', cantidad: 2, unidadMedida: 'Sp', precioUnitario: 50000, descuentos: [], codigoTarifaIva: '08' }],
  });
  claveVenta = clave;
  await hasta(async () => {
    const lista = await ultimo<Comprobante[]>((cb) => b.onComprobantes(emisorId, cb));
    return lista.find((c) => c.clave === clave && c.estado === 'aceptado');
  });
  await b.simularRecepcion(emisorId);
  const [recibido] = await ultimo<Recibido[]>((cb) => b.onRecibidos(emisorId, cb));
  const [emisor] = await ultimo<Emisor[]>((cb) => b.onEmisores(cb));
  await b.confirmar(emisorId, { clave: recibido.clave, mensaje: '1', condicionImpuesto: '01', codigoActividad: emisor.actividades[0].codigo });
}, 30000);

afterAll(() => borrarDatosLocales());

const RUTAS = [
  '/', '/emitir', '/comprobantes', '/recepcion', '/emisor', '/receptores', '/proveedores', '/productos',
  '/contabilidad/catalogo', '/contabilidad/apertura', '/contabilidad/transicion', '/contabilidad/diario',
  '/contabilidad/mayor', '/contabilidad/ajustes-cierre', '/contabilidad/estados-financieros', '/reportes',
  '/bitacora', '/escenarios', '/primeros-pasos', '/normativa', '/glosario', '/configuracion',
];

describe('prueba de humo de la interfaz', () => {
  it.each([...RUTAS, 'detalle'])('la ruta %s carga sin errores', async (ruta) => {
    const errores: string[] = [];
    // Las actualizaciones asíncronas posteriores (tipo de cambio, catálogos) ocurren fuera de act(): ese
    // aviso es propio del entorno de prueba, no de la APP.
    const anotar = (...a: unknown[]) => {
      const texto = a.map(String).join(' ');
      if (!texto.includes('not wrapped in act')) errores.push(texto);
    };
    const espia = vi.spyOn(console, 'error').mockImplementation(anotar);
    const avisos = vi.spyOn(console, 'warn').mockImplementation(anotar);
    window.history.pushState({}, '', ruta === 'detalle' ? `/comprobantes/${claveVenta}` : ruta);
    const div = document.createElement('div');
    document.body.appendChild(div);
    let root: Root | undefined;
    try {
      await act(async () => {
        root = createRoot(div);
        root.render(<AppProvider><App /></AppProvider>);
      });
      const main = await hasta(async () => {
        await act(async () => { await new Promise((r) => setTimeout(r, 50)); });
        const m = div.querySelector('main.content');
        return m && m.querySelector('h1') && !m.querySelector('.cargando') ? m : undefined;
      });
      expect(main.textContent).not.toContain('Ocurrió un error al mostrar esta página');
      expect(main.textContent).not.toContain('NaN');
      expect(main.textContent).not.toContain('undefined');
      expect(errores).toEqual([]);
    } finally {
      await act(async () => root?.unmount());
      div.remove();
      espia.mockRestore();
      avisos.mockRestore();
    }
  }, 30000);
});
