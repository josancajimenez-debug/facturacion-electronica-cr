// Prueba de integración contra los emuladores de Auth, Firestore y Functions:
//   npm run test:integracion   (desde la raíz; usa firebase emulators:exec)
import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, doc, getDoc, getFirestore, setDoc } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions, httpsCallable } from 'firebase/functions';
import { describe, expect, it } from 'vitest';

const app = initializeApp({ apiKey: 'demo-api-key', projectId: 'demo-fe-cr', authDomain: 'demo-fe-cr.firebaseapp.com' });
const auth = getAuth(app);
const db = getFirestore(app);
const fns = getFunctions(app, 'us-central1');
connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
connectFirestoreEmulator(db, '127.0.0.1', 8080);
connectFunctionsEmulator(fns, '127.0.0.1', 5001);

const esperarEstado = async (ruta: string, finales: string[]) => {
  for (let i = 0; i < 40; i++) {
    const s = await getDoc(doc(db, ruta));
    const estado = s.data()?.estado as string | undefined;
    if (estado && finales.includes(estado)) return s.data()!;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Tiempo agotado esperando ${finales.join('/')} en ${ruta}`);
};

describe('flujo completo con emuladores', () => {
  let emisorId = '';

  it('crea usuario y carga datos de demostración', async () => {
    await createUserWithEmailAndPassword(auth, `integracion${Date.now()}@demo.test`, 'secreto123');
    const r = await httpsCallable<unknown, { emisorId: string }>(fns, 'sembrarDatosDemo')({});
    emisorId = r.data.emisorId;
    expect((await getDoc(doc(db, `emisores/${emisorId}`))).data()?.nombre).toMatch(/Ficticia/);
  });

  it('emite una FE y el simulador la acepta', async () => {
    const borrador = {
      tipo: 'FE', emisorId, sucursal: '001', terminal: '00001', situacion: '1', codigoActividadEmisor: '6920.0',
      contraparte: { nombre: 'Distribuidora Ficticia del Valle S.A.', identificacion: { tipo: '02', numero: '3109999002' } },
      condicionVenta: '01', moneda: 'CRC', tipoCambio: 1, otrosCargos: [], referencias: [], mediosPago: [{ tipo: '06' }],
      lineas: [{ codigoCabys: '8222100000000', detalle: 'Servicios de contabilidad', cantidad: 1, unidadMedida: 'Sp', precioUnitario: 100000, descuentos: [], codigoTarifaIva: '08' }],
    };
    const r = await httpsCallable<unknown, { clave: string }>(fns, 'emitirComprobante')({ emisorId, borrador });
    expect(r.data.clave).toMatch(/^506\d{47}$/);
    const c = await esperarEstado(`emisores/${emisorId}/comprobantes/${r.data.clave}`, ['aceptado', 'rechazado']);
    expect(c.estado).toBe('aceptado');
    expect(c.resumen.totalComprobante).toBe(113000);
    expect(c.historial.map((h: { estado: string }) => h.estado)).toEqual(['generado', 'enviado', 'recibido', 'procesando', 'aceptado']);
  });

  it('rechaza en la función un borrador inválido sin consumir consecutivo', async () => {
    const malo = { tipo: 'FE', emisorId, sucursal: '001', terminal: '00001', situacion: '1', condicionVenta: '01', moneda: 'CRC', tipoCambio: 1, otrosCargos: [], referencias: [], mediosPago: [], lineas: [] };
    await expect(httpsCallable(fns, 'emitirComprobante')({ emisorId, borrador: malo })).rejects.toThrow(/validación/);
  });

  it('el cliente no puede escribir comprobantes directamente', async () => {
    await expect(setDoc(doc(db, `emisores/${emisorId}/comprobantes/falso`), { estado: 'aceptado' })).rejects.toThrow();
  });

  it('recibe un comprobante de proveedor y lo confirma (mensaje 05)', async () => {
    const r = await httpsCallable<unknown, { clave: string }>(fns, 'simularRecepcionProveedor')({ emisorId });
    const conf = await httpsCallable<unknown, { consecutivo: string }>(fns, 'confirmarRecibido')({ emisorId, clave: r.data.clave, mensaje: '1', condicionImpuesto: '01', codigoActividad: '6920.0' });
    expect(conf.data.consecutivo.slice(8, 10)).toBe('05');
    expect((await getDoc(doc(db, `emisores/${emisorId}/recibidos/${r.data.clave}`))).data()?.estado).toBe('aceptado');
  });
});
