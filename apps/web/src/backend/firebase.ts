/**
 * Backend FIREBASE: Authentication (correo/contraseña), Firestore con actualizaciones en tiempo
 * real (onSnapshot) y Cloud Functions para las operaciones que no puede hacer el cliente
 * (consecutivos, claves, XML, respuestas simuladas, confirmaciones y bitácora).
 */
import type { BorradorComprobante, Comprobante, Emisor, Producto, Receptor, Validacion } from '@fe-cr/core';
import { initializeApp } from 'firebase/app';
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import {
  collection,
  connectFirestoreEmulator,
  deleteDoc,
  doc,
  getDoc,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions, httpsCallable } from 'firebase/functions';
import { config } from '../config';
import { ErrorConValidaciones, type Backend, type DatosConfirmacion, type EntradaBitacora, type Recibido, type TipoCambio, type Usuario } from './tipos';

const limpiar = <T>(o: T): T => JSON.parse(JSON.stringify(o)) as T;

export class FirebaseBackend implements Backend {
  modo = 'firebase' as const;
  descripcion: string;
  private app = initializeApp(config.firebase);
  private auth = getAuth(this.app);
  private db = getFirestore(this.app);
  private fns = getFunctions(this.app, 'us-central1');

  constructor() {
    if (config.usarEmuladores) {
      connectAuthEmulator(this.auth, 'http://127.0.0.1:9099', { disableWarnings: true });
      connectFirestoreEmulator(this.db, '127.0.0.1', 8080);
      connectFunctionsEmulator(this.fns, '127.0.0.1', 5001);
    }
    this.descripcion = config.usarEmuladores
      ? `Firebase (emuladores locales, proyecto ${config.firebase.projectId})`
      : `Firebase (proyecto ${config.firebase.projectId})`;
  }

  private async llamar<T>(nombre: string, datos: unknown): Promise<T> {
    try {
      const r = await httpsCallable(this.fns, nombre)(datos);
      return r.data as T;
    } catch (e) {
      const err = e as { message: string; details?: { validaciones?: Validacion[] } };
      if (err.details?.validaciones) throw new ErrorConValidaciones(err.message, err.details.validaciones);
      throw new Error(err.message);
    }
  }

  private uid(): string {
    const u = this.auth.currentUser;
    if (!u) throw new Error('Debe iniciar sesión.');
    return u.uid;
  }

  onAuth(cb: (u: Usuario | null) => void) {
    return onAuthStateChanged(this.auth, (u) => cb(u ? { uid: u.uid, email: u.email ?? '' } : null));
  }

  async ingresar(email: string, clave: string) {
    await signInWithEmailAndPassword(this.auth, email, clave);
  }

  async registrar(email: string, clave: string) {
    await createUserWithEmailAndPassword(this.auth, email, clave);
  }

  async salir() {
    await signOut(this.auth);
  }

  onEmisores(cb: (e: Emisor[]) => void) {
    let interno: (() => void) | null = null;
    const externo = onAuthStateChanged(this.auth, (u) => {
      interno?.();
      if (!u) return cb([]);
      interno = onSnapshot(query(collection(this.db, 'emisores'), where('miembros', 'array-contains', u.uid)), (s) =>
        cb(s.docs.map((d) => ({ ...(d.data() as Emisor), id: d.id }))),
      );
    });
    return () => {
      interno?.();
      externo();
    };
  }

  async guardarEmisor(e: Emisor) {
    const uid = this.uid();
    if (e.id) {
      const ref = doc(this.db, 'emisores', e.id);
      const actual = await getDoc(ref);
      if (actual.exists()) {
        const prev = actual.data() as Emisor;
        await setDoc(ref, limpiar({ ...e, propietarioUid: prev.propietarioUid, miembros: prev.miembros }));
        return e.id;
      }
    }
    const ref = doc(collection(this.db, 'emisores'));
    await setDoc(ref, limpiar({ ...e, id: ref.id, propietarioUid: uid, miembros: [uid] }));
    return ref.id;
  }

  async sembrarDemo() {
    const r = await this.llamar<{ emisorId: string }>('sembrarDatosDemo', {});
    return r.emisorId;
  }

  onReceptores(emisorId: string, cb: (r: Receptor[]) => void) {
    return onSnapshot(collection(this.db, `emisores/${emisorId}/receptores`), (s) => cb(s.docs.map((d) => ({ ...(d.data() as Receptor), id: d.id }))));
  }

  async guardarReceptor(emisorId: string, r: Receptor) {
    const ref = r.id ? doc(this.db, `emisores/${emisorId}/receptores`, r.id) : doc(collection(this.db, `emisores/${emisorId}/receptores`));
    await setDoc(ref, limpiar({ ...r, id: ref.id }));
  }

  async eliminarReceptor(emisorId: string, id: string) {
    await deleteDoc(doc(this.db, `emisores/${emisorId}/receptores`, id));
  }

  onProductos(emisorId: string, cb: (p: Producto[]) => void) {
    return onSnapshot(collection(this.db, `emisores/${emisorId}/productos`), (s) => cb(s.docs.map((d) => ({ ...(d.data() as Producto), id: d.id }))));
  }

  async guardarProducto(emisorId: string, p: Producto) {
    const ref = p.id ? doc(this.db, `emisores/${emisorId}/productos`, p.id) : doc(collection(this.db, `emisores/${emisorId}/productos`));
    await setDoc(ref, limpiar({ ...p, id: ref.id }));
  }

  async eliminarProducto(emisorId: string, id: string) {
    await deleteDoc(doc(this.db, `emisores/${emisorId}/productos`, id));
  }

  onComprobantes(emisorId: string, cb: (c: Comprobante[]) => void) {
    return onSnapshot(query(collection(this.db, `emisores/${emisorId}/comprobantes`), orderBy('fechaEmision', 'desc')), (s) =>
      cb(s.docs.map((d) => d.data() as Comprobante)),
    );
  }

  async emitir(emisorId: string, borrador: BorradorComprobante, escenarioPrueba?: string) {
    return this.llamar<{ clave: string }>('emitirComprobante', limpiar({ emisorId, borrador, escenarioPrueba }));
  }

  onRecibidos(emisorId: string, cb: (r: Recibido[]) => void) {
    return onSnapshot(query(collection(this.db, `emisores/${emisorId}/recibidos`), orderBy('fechaEmision', 'desc')), (s) =>
      cb(s.docs.map((d) => d.data() as Recibido)),
    );
  }

  async simularRecepcion(emisorId: string) {
    return this.llamar<{ clave: string }>('simularRecepcionProveedor', { emisorId });
  }

  async registrarRecibidoXml(emisorId: string, xml: string) {
    return this.llamar<{ clave: string }>('registrarRecibidoXml', { emisorId, xml });
  }

  async confirmar(emisorId: string, d: DatosConfirmacion) {
    return this.llamar<{ consecutivo: string }>('confirmarRecibido', limpiar({ emisorId, ...d }));
  }

  onBitacora(emisorId: string, cb: (b: EntradaBitacora[]) => void) {
    return onSnapshot(query(collection(this.db, `emisores/${emisorId}/bitacora`), orderBy('ts', 'desc'), limit(500)), (s) =>
      cb(s.docs.map((d) => ({ ...(d.data() as EntradaBitacora), id: d.id }))),
    );
  }

  async tipoCambio() {
    return this.llamar<TipoCambio>('obtenerTipoCambio', {});
  }
}
