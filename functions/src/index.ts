/**
 * Cloud Functions (2.ª generación) del simulador de comprobantes electrónicos.
 *
 * Operaciones sensibles que el cliente NO puede hacer directamente (las reglas de Firestore lo impiden):
 * asignar consecutivos, generar claves y XML, registrar respuestas de Hacienda (simuladas),
 * confirmar comprobantes recibidos y escribir la bitácora de auditoría.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore, type Transaction } from 'firebase-admin/firestore';
import { setGlobalOptions } from 'firebase-functions/v2';
import { onDocumentCreated, onDocumentWrittenWithAuthContext } from 'firebase-functions/v2/firestore';
import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https';
import {
  EMISOR_DEMO,
  ErrorValidacion,
  PRODUCTOS_DEMO,
  PROVEEDOR_DEMO,
  RECEPTORES_DEMO,
  claveContador,
  construirComprobante,
  contextoSimuladorDemo,
  extraerDatosComprobante,
  fechaEmisionCR,
  generarConfirmacion,
  limiteConfirmacionReceptor,
  siguienteNumero,
  validarComoHacienda,
  type Ambiente,
  type BorradorComprobante,
  type Comprobante,
  type Emisor,
  type Receptor,
} from '@fe-cr/core';
import { EnvioRealBloqueado, enviarAHaciendaReal } from './pasarela-real';

initializeApp();
setGlobalOptions({ region: 'us-central1', maxInstances: 10 });
const db = getFirestore();

/** El ambiente se fija por variable de entorno del despliegue; por defecto SIEMPRE simulación. */
const AMBIENTE: Ambiente = process.env.APP_AMBIENTE === 'produccion' ? 'produccion' : 'simulacion';
const PAUSA_SIMULADOR_MS = Number(process.env.SIMULADOR_PAUSA_MS ?? 1500);

let cabys: Set<string> | null = null;
function cabysValido(codigo: string): boolean {
  if (!cabys) {
    const ruta = join(dirname(fileURLToPath(import.meta.url)), 'cabys-2025.json');
    const datos = JSON.parse(readFileSync(ruta, 'utf8')) as { codigos: [string, string, string][] };
    cabys = new Set(datos.codigos.map((c) => c[0]));
  }
  return cabys.has(codigo);
}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));
const limpiar = <T>(o: T): T => JSON.parse(JSON.stringify(o)) as T; // Firestore no admite undefined.

async function exigirMiembro(req: CallableRequest, emisorId: string): Promise<Emisor> {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Debe iniciar sesión.');
  if (typeof emisorId !== 'string' || !emisorId) throw new HttpsError('invalid-argument', 'emisorId es obligatorio.');
  const snap = await db.doc(`emisores/${emisorId}`).get();
  if (!snap.exists) throw new HttpsError('not-found', 'El emisor no existe.');
  const emisor = { ...(snap.data() as Emisor), id: snap.id };
  if (!emisor.miembros?.includes(req.auth.uid)) throw new HttpsError('permission-denied', 'No pertenece a este emisor.');
  return emisor;
}

function bitacora(tx: Transaction | null, emisorId: string, entrada: Record<string, unknown>) {
  const ref = db.collection(`emisores/${emisorId}/bitacora`).doc();
  const datos = limpiar({ ...entrada, fecha: fechaEmisionCR(), ambiente: AMBIENTE });
  return tx ? tx.set(ref, { ...datos, ts: FieldValue.serverTimestamp() }) : ref.set({ ...datos, ts: FieldValue.serverTimestamp() });
}

// ---------------------------------------------------------------------------------------------
// Emisión
// ---------------------------------------------------------------------------------------------
export const emitirComprobante = onCall(async (req) => {
  const { emisorId, borrador, escenarioPrueba } = req.data as { emisorId: string; borrador: BorradorComprobante; escenarioPrueba?: string };
  const emisor = await exigirMiembro(req, emisorId);
  if (!borrador || typeof borrador !== 'object') throw new HttpsError('invalid-argument', 'Borrador requerido.');
  if (escenarioPrueba && AMBIENTE !== 'simulacion') throw new HttpsError('failed-precondition', 'Los escenarios de prueba solo existen en simulación.');

  const contadorRef = db.doc(`emisores/${emisorId}/contadores/${claveContador(emisorId, borrador.sucursal, borrador.terminal, borrador.tipo)}`);
  try {
    const clave = await db.runTransaction(async (tx) => {
      const contador = await tx.get(contadorRef);
      const numero = siguienteNumero((contador.data()?.ultimo as number | undefined) ?? 0);
      const comprobante = construirComprobante({ borrador: { ...borrador, emisorId }, emisor, numero, ambiente: AMBIENTE, usuario: req.auth!.uid });
      const ref = db.doc(`emisores/${emisorId}/comprobantes/${comprobante.clave}`);
      tx.set(contadorRef, { ultimo: numero, actualizado: FieldValue.serverTimestamp() });
      tx.set(ref, limpiar({ ...comprobante, escenarioPrueba: escenarioPrueba ?? null, creadoTs: Date.now() }));
      bitacora(tx, emisorId, { accion: 'emision', clave: comprobante.clave, tipo: comprobante.tipo, consecutivo: comprobante.consecutivo, total: comprobante.resumen.totalComprobante, usuario: req.auth!.uid });
      return comprobante.clave;
    });
    return { clave };
  } catch (e) {
    if (e instanceof ErrorValidacion) {
      throw new HttpsError('invalid-argument', 'El comprobante tiene errores de validación.', { validaciones: e.validaciones });
    }
    throw e;
  }
});

/** Envío simulado: acuse de recibo, procesamiento y respuesta (aceptado/rechazado). */
export const procesarEnvio = onDocumentCreated('emisores/{emisorId}/comprobantes/{clave}', async (event) => {
  const snap = event.data;
  if (!snap) return;
  const ref = snap.ref;
  const c = snap.data() as Comprobante & { escenarioPrueba?: string | null };
  const { emisorId } = event.params;
  const evento = (estado: Comprobante['estado'], detalle?: string) =>
    ref.update({ estado, historial: FieldValue.arrayUnion(limpiar({ estado, fecha: fechaEmisionCR(), detalle })) });

  if (c.ambiente !== 'simulacion') {
    try {
      enviarAHaciendaReal(c.xml, c.ambiente);
    } catch (e) {
      const motivos = e instanceof EnvioRealBloqueado ? e.motivos.join(' ') : String(e);
      await evento('error', motivos);
      await bitacora(null, emisorId, { accion: 'envio-bloqueado', clave: c.clave, detalle: motivos });
    }
    return;
  }

  await evento('enviado', 'Envío al API de recepción SIMULADO (POST /recepcion).');
  await esperar(PAUSA_SIMULADOR_MS / 2);
  await evento('recibido', 'Acuse de recibo simulado (art. 21 Decreto 44739-H).');
  await esperar(PAUSA_SIMULADOR_MS / 2);
  await evento('procesando');

  const receptores = await db.collection(`emisores/${emisorId}/receptores`).get();
  const demo = contextoSimuladorDemo([c.emisor]);
  for (const r of receptores.docs) {
    const datos = r.data() as Receptor;
    if (datos.identificacion && datos.identificacion.tipo !== '05') {
      demo.padron![datos.identificacion.numero] = { nombre: datos.nombre, estado: 'Inscrito', actividades: datos.actividadEconomica ? [datos.actividadEconomica] : [] };
    }
  }
  const previas = await db.collection(`emisores/${emisorId}/comprobantes`).where('estado', 'in', ['aceptado', 'rechazado']).select().get();
  const respuesta = validarComoHacienda(c, {
    ...demo,
    cabysValido,
    clavesRecibidas: new Set(previas.docs.map((d) => d.id).filter((id) => id !== c.clave)),
    forzarRechazo: c.escenarioPrueba ?? undefined,
  });
  await esperar(PAUSA_SIMULADOR_MS);
  await ref.update({
    estado: respuesta.estado,
    respuestaHacienda: limpiar(respuesta),
    historial: FieldValue.arrayUnion(limpiar({ estado: respuesta.estado, fecha: respuesta.fecha, detalle: respuesta.detalle.join(' | ') || 'Sin observaciones' })),
  });
  await bitacora(null, emisorId, { accion: `respuesta-${respuesta.estado}`, clave: c.clave, detalle: respuesta.detalle.join(' | ') });
});

// ---------------------------------------------------------------------------------------------
// Recepción de comprobantes de proveedores
// ---------------------------------------------------------------------------------------------
export const simularRecepcionProveedor = onCall(async (req) => {
  const { emisorId } = req.data as { emisorId: string };
  const emisor = await exigirMiembro(req, emisorId);
  if (AMBIENTE !== 'simulacion') throw new HttpsError('failed-precondition', 'Solo disponible en simulación.');
  const contadorRef = db.doc(`emisores/${emisorId}/contadores/proveedor-demo`);
  const clave = await db.runTransaction(async (tx) => {
    const numero = siguienteNumero(((await tx.get(contadorRef)).data()?.ultimo as number | undefined) ?? 0);
    const fe = construirComprobante({
      emisor: PROVEEDOR_DEMO,
      numero,
      ambiente: 'simulacion',
      borrador: {
        tipo: 'FE', emisorId: PROVEEDOR_DEMO.id, sucursal: '001', terminal: '00001', situacion: '1',
        codigoActividadEmisor: PROVEEDOR_DEMO.actividades[0].codigo,
        contraparte: { nombre: emisor.nombre, identificacion: emisor.identificacion, correo: emisor.correos[0] },
        condicionVenta: '02', plazoCredito: 30, moneda: 'CRC', tipoCambio: 1, otrosCargos: [], mediosPago: [], referencias: [],
        lineas: [
          { codigoCabys: '2441002020000', detalle: 'Agua natural embotellada 600 ml (caja)', cantidad: 24, unidadMedida: 'Unid', precioUnitario: 450, descuentos: [], codigoTarifaIva: '08' },
          { codigoCabys: '2391102010200', detalle: 'Café tostado molido 1 kg', cantidad: 5, unidadMedida: 'Kg', precioUnitario: 5200, descuentos: [], codigoTarifaIva: '02' },
        ],
      },
    });
    const datos = extraerDatosComprobante(fe.xml);
    tx.set(contadorRef, { ultimo: numero });
    tx.set(db.doc(`emisores/${emisorId}/recibidos/${datos.clave}`), limpiar({ ...datos, estado: 'pendiente', limiteConfirmacion: limiteConfirmacionReceptor(new Date(datos.fechaEmision)), recibidoEn: fechaEmisionCR() }));
    bitacora(tx, emisorId, { accion: 'recepcion', clave: datos.clave, detalle: `Comprobante recibido de ${datos.nombreEmisor} (simulado)` });
    return datos.clave;
  });
  return { clave };
});

/** Registra un XML de comprobante recibido (cargado por el usuario) para su confirmación. */
export const registrarRecibidoXml = onCall(async (req) => {
  const { emisorId, xml } = req.data as { emisorId: string; xml: string };
  const emisor = await exigirMiembro(req, emisorId);
  if (typeof xml !== 'string' || xml.length > 1_000_000) throw new HttpsError('invalid-argument', 'XML inválido o demasiado grande.');
  let datos;
  try {
    datos = extraerDatosComprobante(xml);
  } catch (e) {
    throw new HttpsError('invalid-argument', (e as Error).message);
  }
  if (datos.identificacionReceptor && datos.identificacionReceptor.numero !== emisor.identificacion.numero) {
    throw new HttpsError('failed-precondition', 'El comprobante no está dirigido a este emisor.');
  }
  const ref = db.doc(`emisores/${emisorId}/recibidos/${datos.clave}`);
  await db.runTransaction(async (tx) => {
    if ((await tx.get(ref)).exists) throw new HttpsError('already-exists', 'Este comprobante ya fue registrado.');
    tx.set(ref, limpiar({ ...datos, estado: 'pendiente', limiteConfirmacion: limiteConfirmacionReceptor(new Date(datos.fechaEmision)), recibidoEn: fechaEmisionCR() }));
    bitacora(tx, emisorId, { accion: 'recepcion', clave: datos.clave, detalle: `XML cargado: ${datos.nombreEmisor}`, usuario: req.auth!.uid });
  });
  return { clave: datos.clave };
});

export const confirmarRecibido = onCall(async (req) => {
  const d = req.data as {
    emisorId: string; clave: string; mensaje: '1' | '2' | '3'; detalleMensaje?: string; condicionImpuesto?: string;
    codigoActividad?: string; montoTotalImpuestoAcreditar?: number; montoTotalDeGastoAplicable?: number; sucursal?: string; terminal?: string;
  };
  const emisor = await exigirMiembro(req, d.emisorId);
  const recibidoRef = db.doc(`emisores/${d.emisorId}/recibidos/${d.clave}`);
  const sucursal = d.sucursal ?? '001';
  const terminal = d.terminal ?? '00001';
  return db.runTransaction(async (tx) => {
    const recibido = await tx.get(recibidoRef);
    if (!recibido.exists) throw new HttpsError('not-found', 'Comprobante recibido no encontrado.');
    if (recibido.data()!.estado !== 'pendiente') throw new HttpsError('failed-precondition', 'El comprobante ya fue confirmado.');
    const tipo = { '1': 'CCE', '2': 'CPCE', '3': 'RCE' }[d.mensaje];
    const contadorRef = db.doc(`emisores/${d.emisorId}/contadores/${claveContador(d.emisorId, sucursal, terminal, tipo)}`);
    const numero = siguienteNumero(((await tx.get(contadorRef)).data()?.ultimo as number | undefined) ?? 0);
    const conf = generarConfirmacion({ ...d, recibido: recibido.data() as never, receptor: emisor, sucursal, terminal, numero }, AMBIENTE);
    const errores = conf.validaciones.filter((v) => v.nivel === 'error');
    if (errores.length) throw new HttpsError('invalid-argument', 'La confirmación tiene errores.', { validaciones: conf.validaciones });
    tx.set(contadorRef, { ultimo: numero });
    tx.update(recibidoRef, limpiar({
      estado: { '1': 'aceptado', '2': 'aceptado-parcial', '3': 'rechazado' }[d.mensaje],
      confirmacion: { consecutivo: conf.consecutivo, xml: conf.xml, tipo: conf.tipo, fecha: fechaEmisionCR(), respuestaHacienda: 'aceptado (simulado)', advertencias: conf.validaciones.filter((v) => v.nivel === 'advertencia').map((v) => v.mensaje) },
    }));
    bitacora(tx, d.emisorId, { accion: `confirmacion-${conf.tipo}`, clave: d.clave, consecutivo: conf.consecutivo, usuario: req.auth!.uid });
    return { consecutivo: conf.consecutivo };
  });
});

// ---------------------------------------------------------------------------------------------
// Datos de demostración, parámetros y auditoría
// ---------------------------------------------------------------------------------------------
export const sembrarDatosDemo = onCall(async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Debe iniciar sesión.');
  const uid = req.auth.uid;
  const emisorRef = db.collection('emisores').doc();
  const batch = db.batch();
  batch.set(emisorRef, limpiar({ ...EMISOR_DEMO, id: emisorRef.id, propietarioUid: uid, miembros: [uid], creadoEn: fechaEmisionCR() }));
  RECEPTORES_DEMO.forEach((r) => batch.set(emisorRef.collection('receptores').doc(r.id), limpiar(r)));
  PRODUCTOS_DEMO.forEach((p) => batch.set(emisorRef.collection('productos').doc(p.id), limpiar(p)));
  batch.set(db.doc(`usuarios/${uid}`), { emisorActivo: emisorRef.id }, { merge: true });
  await batch.commit();
  await bitacora(null, emisorRef.id, { accion: 'datos-demo', usuario: uid, detalle: 'Se cargaron datos ficticios de demostración.' });
  return { emisorId: emisorRef.id };
});

/** Tipo de cambio de referencia (API pública del Ministerio de Hacienda), con caché de una hora. */
export const obtenerTipoCambio = onCall(async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Debe iniciar sesión.');
  const ref = db.doc('parametros/tipoCambioUSD');
  const cache = await ref.get();
  if (cache.exists && Date.now() - (cache.data()!.ts as number) < 3_600_000) return cache.data();
  const resp = await fetch('https://api.hacienda.go.cr/indicadores/tc/dolar');
  if (!resp.ok) throw new HttpsError('unavailable', `El API de Hacienda respondió ${resp.status}. Ingrese el tipo de cambio manualmente.`);
  const json = (await resp.json()) as { venta: { fecha: string; valor: number }; compra: { fecha: string; valor: number } };
  const datos = { venta: json.venta.valor, compra: json.compra.valor, fecha: json.venta.fecha, fuente: 'api.hacienda.go.cr/indicadores/tc/dolar', ts: Date.now() };
  await ref.set(datos);
  return datos;
});

/** Auditoría de cambios en catálogos y datos del emisor (escritos por el cliente). */
const auditar = (coleccion: string) =>
  onDocumentWrittenWithAuthContext(`emisores/{emisorId}/${coleccion}/{id}`, async (event) => {
    const antes = event.data?.before.exists;
    const despues = event.data?.after.exists;
    const accion = !antes ? 'creacion' : !despues ? 'eliminacion' : 'modificacion';
    await bitacora(null, event.params.emisorId, { accion: `${coleccion}-${accion}`, documento: event.params.id, usuario: event.authId ?? null });
  });
export const auditarReceptores = auditar('receptores');
export const auditarProductos = auditar('productos');
export const auditarEmisor = onDocumentWrittenWithAuthContext('emisores/{emisorId}', async (event) => {
  if (!event.data?.before.exists) return; // la creación se registra al sembrar o crear
  await bitacora(null, event.params.emisorId, { accion: 'emisor-modificacion', usuario: event.authId ?? null });
});
