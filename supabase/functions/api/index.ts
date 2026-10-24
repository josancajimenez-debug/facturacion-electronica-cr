// Función Edge "api" (Supabase, Deno). Autentica al usuario con su JWT y opera con la llave de
// servicio, que es la única que puede escribir comprobantes, recibidos, contadores y bitácora.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.118.0';
import codigosCabys from '../_shared/cabys-codigos.json' with { type: 'json' };
import { fechaEmisionCR, type Emisor, type Producto, type Receptor } from '@fe-cr/core';
import { ejecutar, type ComprobanteGuardado, type Recibido, type Repo } from './logica.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const cabys = new Set<string>(codigosCabys as string[]);

function ok<T>(r: { data: T; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data;
}

function crearRepo(db: SupabaseClient): Repo {
  return {
    async emisor(id) {
      const { data } = await db.from('emisores').select('id, miembros, propietario, datos').eq('id', id).maybeSingle();
      return data ? { ...(data.datos as Emisor), id: data.id, miembros: data.miembros, propietarioUid: data.propietario } : null;
    },
    async receptores(emisorId) {
      const rows = ok(await db.from('receptores').select('id, datos').eq('emisor_id', emisorId));
      return rows.map((r) => ({ ...(r.datos as Receptor), id: r.id }));
    },
    async siguienteNumero(emisorId, clave) {
      return Number(ok(await db.rpc('siguiente_consecutivo', { p_emisor: emisorId, p_clave: clave })));
    },
    async insertarComprobante(c) {
      ok(await db.from('comprobantes').insert({ clave: c.clave, emisor_id: c.emisorId, tipo: c.tipo, estado: c.estado, fecha_emision: c.fechaEmision, datos: c }));
    },
    async guardarComprobante(c: ComprobanteGuardado) {
      ok(await db.from('comprobantes').update({ estado: c.estado, datos: c }).eq('clave', c.clave));
    },
    async clavesValidadas(emisorId) {
      const rows = ok(await db.from('comprobantes').select('clave').eq('emisor_id', emisorId).in('estado', ['aceptado', 'rechazado']));
      return new Set(rows.map((r) => r.clave as string));
    },
    async recibido(emisorId, clave) {
      const { data } = await db.from('recibidos').select('datos').eq('emisor_id', emisorId).eq('clave', clave).maybeSingle();
      return (data?.datos as Recibido) ?? null;
    },
    async insertarRecibido(emisorId, r) {
      ok(await db.from('recibidos').insert({ emisor_id: emisorId, clave: r.clave, estado: r.estado, fecha_emision: r.fechaEmision, datos: r }));
    },
    async confirmarRecibido(emisorId, r) {
      // Actualización condicional: si otra solicitud ya lo confirmó, no se modifica ninguna fila.
      const filas = ok(await db.from('recibidos').update({ estado: r.estado, datos: r }).eq('emisor_id', emisorId).eq('clave', r.clave).eq('estado', 'pendiente').select('clave'));
      return filas.length === 1;
    },
    async crearEmisor(uid, e: Emisor, receptores: Receptor[], productos: Producto[]) {
      const fila = ok(await db.from('emisores').insert({ propietario: uid, miembros: [uid], datos: { ...e, id: undefined } }).select('id').single());
      try {
        ok(await db.from('receptores').insert(receptores.map((r) => ({ emisor_id: fila.id, id: r.id, datos: r }))));
        ok(await db.from('productos').insert(productos.map((p) => ({ emisor_id: fila.id, id: p.id, datos: p }))));
      } catch (err) {
        // Sin transacciones en PostgREST: se elimina el emisor incompleto (cascada) para no dejar datos a medias.
        await db.from('emisores').delete().eq('id', fila.id);
        throw err;
      }
      return fila.id as string;
    },
    async bitacora(emisorId, e) {
      ok(await db.from('bitacora').insert({ emisor_id: emisorId, fecha: fechaEmisionCR(), ...e }));
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const json = (status: number, cuerpo: unknown) => new Response(JSON.stringify(cuerpo), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
  if (req.method !== 'POST') return json(405, { error: 'Método no permitido.' });

  const url = Deno.env.get('SUPABASE_URL')!;
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const publico = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!);
  const { data: auth, error } = await publico.auth.getUser(token);
  if (error || !auth.user) return json(401, { error: 'Debe iniciar sesión.' });

  const servicio = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const { accion, ...datos } = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const r = await ejecutar(String(accion ?? ''), datos, { id: auth.user.id, email: auth.user.email }, crearRepo(servicio), {
    pausaMs: Number(Deno.env.get('SIMULADOR_PAUSA_MS') ?? 1500),
    cabysValido: (c) => cabys.has(c),
    // @ts-ignore EdgeRuntime existe en el entorno de Supabase.
    enSegundoPlano: (p) => (typeof EdgeRuntime !== 'undefined' ? EdgeRuntime.waitUntil(p) : p.catch(console.error)),
  });
  return json(r.status, r.cuerpo);
});
