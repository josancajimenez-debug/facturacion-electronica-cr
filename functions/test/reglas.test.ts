// Pruebas de las reglas de seguridad de Firestore. Requieren el emulador:
//   npm run test:reglas   (desde la raíz; usa firebase emulators:exec)
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

let env: RulesTestEnvironment;
const emisor = {
  nombre: 'Servicios Contables Demo Ficticia S.A.',
  identificacion: { tipo: '02', numero: '3109999001' },
  propietarioUid: 'ana',
  miembros: ['ana'],
};

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-fe-cr',
    firestore: { rules: readFileSync(resolve(__dirname, '../../firestore.rules'), 'utf8') },
  });
});
afterAll(() => env.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const fs = ctx.firestore();
    await setDoc(doc(fs, 'emisores/e1'), emisor);
    await setDoc(doc(fs, 'emisores/e1/comprobantes/c1'), { estado: 'aceptado' });
  });
});

describe('reglas de Firestore', () => {
  it('un miembro lee su emisor y sus comprobantes', async () => {
    const db = env.authenticatedContext('ana').firestore();
    await assertSucceeds(getDoc(doc(db, 'emisores/e1')));
    await assertSucceeds(getDoc(doc(db, 'emisores/e1/comprobantes/c1')));
  });

  it('un usuario ajeno no puede leer el emisor', async () => {
    const db = env.authenticatedContext('beto').firestore();
    await assertFails(getDoc(doc(db, 'emisores/e1')));
    await assertFails(getDocs(collection(db, 'emisores')));
  });

  it('un miembro puede consultar sus emisores por membresía', async () => {
    const db = env.authenticatedContext('ana').firestore();
    await assertSucceeds(getDocs(query(collection(db, 'emisores'), where('miembros', 'array-contains', 'ana'))));
  });

  it('nadie escribe comprobantes ni bitácora desde el cliente', async () => {
    const db = env.authenticatedContext('ana').firestore();
    await assertFails(setDoc(doc(db, 'emisores/e1/comprobantes/c2'), { estado: 'aceptado' }));
    await assertFails(updateDoc(doc(db, 'emisores/e1/comprobantes/c1'), { estado: 'rechazado' }));
    await assertFails(setDoc(doc(db, 'emisores/e1/bitacora/b1'), { accion: 'x' }));
    await assertFails(setDoc(doc(db, 'emisores/e1/contadores/k'), { ultimo: 0 }));
  });

  it('valida productos (CAByS de 13 dígitos y precio positivo)', async () => {
    const db = env.authenticatedContext('ana').firestore();
    const ok = { codigoCabys: '8222100000000', precioUnitario: 1000, codigoTarifaIva: '08', descripcion: 'x' };
    await assertSucceeds(setDoc(doc(db, 'emisores/e1/productos/p1'), ok));
    await assertFails(setDoc(doc(db, 'emisores/e1/productos/p2'), { ...ok, codigoCabys: '123' }));
    await assertFails(setDoc(doc(db, 'emisores/e1/productos/p3'), { ...ok, precioUnitario: -5 }));
  });

  it('no se puede alterar la membresía de un emisor', async () => {
    const db = env.authenticatedContext('ana').firestore();
    await assertFails(updateDoc(doc(db, 'emisores/e1'), { miembros: ['ana', 'beto'] }));
    await assertSucceeds(updateDoc(doc(db, 'emisores/e1'), { nombreComercial: 'Demo' }));
  });

  it('crear un emisor exige ser el propietario y único miembro', async () => {
    const db = env.authenticatedContext('carla').firestore();
    await assertSucceeds(setDoc(doc(db, 'emisores/e2'), { ...emisor, propietarioUid: 'carla', miembros: ['carla'] }));
    await assertFails(setDoc(doc(db, 'emisores/e3'), { ...emisor, propietarioUid: 'carla', miembros: ['carla', 'ana'] }));
  });
});
