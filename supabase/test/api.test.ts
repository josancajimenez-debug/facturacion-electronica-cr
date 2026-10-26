// Lógica de la función Edge "api" contra PostgreSQL (PGlite) con el esquema real.
// El repositorio replica en SQL lo que index.ts hace con supabase-js y la llave de servicio.
import { resumenDocumento, type Comprobante, type Emisor, type Receptor } from '@fe-cr/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { ejecutar, procesarEnvio, type ComprobanteGuardado, type Opciones, type Recibido, type Repo } from '../functions/api/logica';
import { crearBase } from './pg';

const ANA = '00000000-0000-0000-0000-00000000000a';
const BETO = '00000000-0000-0000-0000-00000000000b';
let como: Awaited<ReturnType<typeof crearBase>>['como'];
const pendientes: Promise<unknown>[] = [];
const op: Opciones = { pausaMs: 10, cabysValido: (c) => c !== '9999999999999', enSegundoPlano: (p) => pendientes.push(p) };

const repo: Repo = {
  async emisor(id) {
    const [r] = await como<{ id: string; miembros: string[]; datos: Emisor }>(null, 'select id, miembros, datos from emisores where id = $1', [id]);
    return r ? { ...r.datos, id: r.id, miembros: r.miembros } : null;
  },
  async receptores(e) {
    return (await como<{ id: string; datos: Receptor }>(null, 'select id, datos from receptores where emisor_id = $1', [e])).map((r) => ({ ...r.datos, id: r.id }));
  },
  async siguienteNumero(e, k) {
    return Number((await como<{ n: string }>(null, 'select siguiente_consecutivo($1, $2) as n', [e, k]))[0].n);
  },
  async insertarComprobante(c) {
    await como(null, 'insert into comprobantes (clave, emisor_id, tipo, estado, fecha_emision, datos) values ($1,$2,$3,$4,$5,$6)', [c.clave, c.emisorId, c.tipo, c.estado, c.fechaEmision, c]);
  },
  async guardarComprobante(c: ComprobanteGuardado) {
    await como(null, 'update comprobantes set estado = $2, datos = $3 where clave = $1', [c.clave, c.estado, c]);
  },
  async clavesValidadas(e) {
    return new Set((await como<{ clave: string }>(null, "select clave from comprobantes where emisor_id = $1 and estado in ('aceptado','rechazado')", [e])).map((r) => r.clave));
  },
  async consecutivos(e) {
    return como<{ clave: string; consecutivo: string }>(null, "select clave, datos->>'consecutivo' as consecutivo from comprobantes where emisor_id = $1", [e]);
  },
  async documentosAceptados(e) {
    return (await como<{ datos: Comprobante }>(null, "select datos from comprobantes where emisor_id = $1 and estado = 'aceptado'", [e])).map((r) => resumenDocumento(r.datos));
  },
  async recibido(e, k) {
    return (await como<{ datos: Recibido }>(null, 'select datos from recibidos where emisor_id = $1 and clave = $2', [e, k]))[0]?.datos ?? null;
  },
  async insertarRecibido(e, r) {
    await como(null, 'insert into recibidos (emisor_id, clave, estado, fecha_emision, datos) values ($1,$2,$3,$4,$5)', [e, r.clave, r.estado, r.fechaEmision, r]);
  },
  async confirmarRecibido(e, r) {
    const filas = await como(null, "update recibidos set estado = $3, datos = $4 where emisor_id = $1 and clave = $2 and estado = 'pendiente' returning clave", [e, r.clave, r.estado, r]);
    return filas.length === 1;
  },
  async crearEmisor(uid, e, receptores, productos) {
    const [f] = await como<{ id: string }>(null, 'insert into emisores (propietario, miembros, datos) values ($1, array[$1]::uuid[], $2) returning id', [uid, { ...e, id: undefined }]);
    for (const r of receptores) await como(null, 'insert into receptores (emisor_id, id, datos) values ($1,$2,$3)', [f.id, r.id, r]);
    for (const p of productos) await como(null, 'insert into productos (emisor_id, id, datos) values ($1,$2,$3)', [f.id, p.id, p]);
    return f.id;
  },
  async bitacora(e, b) {
    await como(null, 'insert into bitacora (emisor_id, fecha, accion, clave, consecutivo, documento, detalle, usuario) values ($1, ahora_cr(), $2, $3, $4, $5, $6, $7)', [e, b.accion, b.clave, b.consecutivo, b.documento, b.detalle, b.usuario]);
  },
};

const ana = { id: ANA, email: 'ana@demo.test' };
let emisorId = '';
const borrador = (extra: Record<string, unknown> = {}) => ({
  tipo: 'FE', sucursal: '001', terminal: '00001', situacion: '1', codigoActividadEmisor: '6920.0',
  contraparte: { nombre: 'Distribuidora Ficticia del Valle S.A.', identificacion: { tipo: '02', numero: '3109999002' } },
  condicionVenta: '01', moneda: 'CRC', tipoCambio: 1, otrosCargos: [], referencias: [], mediosPago: [{ tipo: '06' }],
  lineas: [{ codigoCabys: '8222100000000', detalle: 'Servicios de contabilidad', cantidad: 1, unidadMedida: 'Sp', precioUnitario: 100000, descuentos: [], codigoTarifaIva: '08' }],
  ...extra,
});

beforeAll(async () => {
  ({ como } = await crearBase());
});

describe('función Edge api', () => {
  it('siembra los datos de demostración', async () => {
    const r = await ejecutar('sembrarDemo', {}, ana, repo, op);
    expect(r.status).toBe(200);
    emisorId = r.cuerpo.emisorId as string;
    expect(await como(ANA, 'select id from receptores')).toHaveLength(4);
  });

  it('emite una FE, la procesa y queda aceptada con su historial', async () => {
    const r = await ejecutar('emitir', { emisorId, borrador: borrador() }, ana, repo, op);
    expect(r.status).toBe(200);
    await Promise.all(pendientes.splice(0));
    const [c] = await como<{ estado: string; datos: ComprobanteGuardado }>(ANA, 'select estado, datos from comprobantes where clave = $1', [r.cuerpo.clave]);
    expect(c.estado).toBe('aceptado');
    expect(c.datos.consecutivo).toBe('00100001010000000001');
    expect(c.datos.resumen.totalComprobante).toBe(113000);
    expect(c.datos.historial.map((h) => h.estado)).toEqual(['generado', 'enviado', 'recibido', 'procesando', 'aceptado']);
  });

  it('rechaza un borrador inválido sin consumir consecutivo', async () => {
    const r = await ejecutar('emitir', { emisorId, borrador: borrador({ lineas: [], mediosPago: [] }) }, ana, repo, op);
    expect(r.status).toBe(400);
    expect((r.cuerpo.validaciones as unknown[]).length).toBeGreaterThan(0);
    const ok = await ejecutar('emitir', { emisorId, borrador: borrador() }, ana, repo, op);
    await Promise.all(pendientes.splice(0));
    const [c] = await como<{ datos: ComprobanteGuardado }>(ANA, 'select datos from comprobantes where clave = $1', [ok.cuerpo.clave]);
    expect(c.datos.consecutivo.endsWith('0000000002')).toBe(true);
  });

  it('el simulador rechaza un CAByS inexistente', async () => {
    const r = await ejecutar('emitir', { emisorId, borrador: borrador({ lineas: [{ ...borrador().lineas[0], codigoCabys: '9999999999999' }] }) }, ana, repo, op);
    await Promise.all(pendientes.splice(0));
    const [c] = await como<{ estado: string }>(ANA, 'select estado from comprobantes where clave = $1', [r.cuerpo.clave]);
    expect(c.estado).toBe('rechazado');
  });

  it('un usuario ajeno no puede emitir para el emisor', async () => {
    const r = await ejecutar('emitir', { emisorId, borrador: borrador() }, { id: BETO }, repo, op);
    expect(r.status).toBe(403);
  });

  it('recibe un comprobante de proveedor y lo confirma (05) una sola vez', async () => {
    const r = await ejecutar('simularRecepcion', { emisorId }, ana, repo, op);
    const conf = await ejecutar('confirmar', { emisorId, clave: r.cuerpo.clave, mensaje: '1', condicionImpuesto: '01', codigoActividad: '6920.0' }, ana, repo, op);
    expect((conf.cuerpo.consecutivo as string).slice(8, 10)).toBe('05');
    expect((await ejecutar('confirmar', { emisorId, clave: r.cuerpo.clave, mensaje: '1' }, ana, repo, op)).status).toBe(409);
    const rechazo = await ejecutar('simularRecepcion', { emisorId }, ana, repo, op);
    expect((await ejecutar('confirmar', { emisorId, clave: rechazo.cuerpo.clave, mensaje: '3' }, ana, repo, op)).status).toBe(400);
  });

  it('dos confirmaciones simultáneas: solo una gana', async () => {
    const r = await ejecutar('simularRecepcion', { emisorId }, ana, repo, op);
    const datos = { emisorId, clave: r.cuerpo.clave, mensaje: '1', condicionImpuesto: '01', codigoActividad: '6920.0' };
    const estados = (await Promise.all([ejecutar('confirmar', datos, ana, repo, op), ejecutar('confirmar', datos, ana, repo, op)])).map((x) => x.status).sort();
    expect(estados).toEqual([200, 409]);
  });

  it('si el simulador falla, el comprobante queda en "error" y no en "procesando"', async () => {
    const r = await ejecutar('emitir', { emisorId, borrador: borrador() }, ana, repo, op);
    const conFalla: Repo = { ...repo, receptores: async () => { throw new Error('base de datos no disponible'); } };
    const [c] = await como<{ datos: ComprobanteGuardado }>(ANA, 'select datos from comprobantes where clave = $1', [r.cuerpo.clave]);
    await Promise.all(pendientes.splice(0));
    await expect(procesarEnvio(conFalla, { ...c.datos, historial: [] }, op)).rejects.toThrow('base de datos no disponible');
    const [despues] = await como<{ estado: string; datos: ComprobanteGuardado }>(ANA, 'select estado, datos from comprobantes where clave = $1', [r.cuerpo.clave]);
    expect(despues.estado).toBe('error');
    expect(despues.datos.historial.at(-1)?.detalle).toMatch(/Falla del simulador/);
  });

  it('registra todo en la bitácora visible solo para el miembro', async () => {
    const acciones = (await como<{ accion: string }>(ANA, 'select accion from bitacora')).map((b) => b.accion);
    expect(acciones).toEqual(expect.arrayContaining(['datos-demo', 'emision', 'respuesta-aceptado', 'respuesta-rechazado', 'recepcion', 'confirmacion-CCE']));
    expect(await como(BETO, 'select * from bitacora')).toHaveLength(0);
  });
});
