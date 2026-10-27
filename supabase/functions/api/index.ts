// Función Edge "api" (Supabase, Deno). Autentica al usuario con su JWT y opera con la llave de
// servicio, que es la única que puede escribir comprobantes, recibidos, contadores y bitácora.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.118.0';
import codigosCabys from '../_shared/cabys-codigos.json' with { type: 'json' };
import { fechaEmisionCR, resumenDocumento, type Comprobante, type Emisor, type Producto, type Receptor } from '@fe-cr/core';
import { ejecutar, type ComprobanteGuardado, type EmisorMiembros, type Recibido, type Repo } from './logica.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const cabys = new Set<string>(codigosCabys as string[]);

/**
 * Lanza el error de PostgREST o devuelve los datos. Sin error, una consulta con select() siempre trae
 * datos (single() falla si no hay fila); las escrituras sin select() no usan el valor devuelto.
 */
function ok<T>(r: { data: T; error: { message: string } | null }): NonNullable<T> {
  if (r.error) throw new Error(r.error.message);
  return r.data as NonNullable<T>;
}

const PAGINA = 1000;

/**
 * PostgREST devuelve como máximo 1000 filas por consulta (max_rows en config.toml): sin paginar, a partir
 * de ese número se perderían filas en silencio. La consulta debe tener un orden estable.
 */
async function todas<T>(pedir: (desde: number, hasta: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T[]> {
  const filas: T[] = [];
  for (let desde = 0; ; desde += PAGINA) {
    const pagina = (ok(await pedir(desde, desde + PAGINA - 1)) ?? []) as T[];
    filas.push(...pagina);
    if (pagina.length < PAGINA) return filas;
  }
}

function crearRepo(db: SupabaseClient): Repo {
  return {
    async emisor(id) {
      const { data } = await db.from('emisores').select('id, miembros, propietario, datos').eq('id', id).maybeSingle();
      return data ? { ...(data.datos as Emisor), id: data.id, miembros: data.miembros, propietarioUid: data.propietario } : null;
    },
    async receptores(emisorId) {
      const rows = await todas<{ id: string; datos: Receptor }>((d, h) => db.from('receptores').select('id, datos').eq('emisor_id', emisorId).order('id').range(d, h));
      return rows.map((r) => ({ ...r.datos, id: r.id }));
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
      const rows = await todas<{ clave: string }>((d, h) => db.from('comprobantes').select('clave').eq('emisor_id', emisorId).in('estado', ['aceptado', 'rechazado']).order('clave').range(d, h));
      return new Set(rows.map((r) => r.clave));
    },
    async consecutivos(emisorId) {
      return await todas<{ clave: string; consecutivo: string }>((d, h) => db.from('comprobantes').select('clave, consecutivo:datos->>consecutivo').eq('emisor_id', emisorId).order('clave').range(d, h));
    },
    async documentosAceptados(emisorId) {
      const rows = await todas<Pick<Comprobante, 'clave' | 'tipo' | 'resumen' | 'borrador'>>((d, h) =>
        db.from('comprobantes').select('clave, tipo, resumen:datos->resumen, borrador:datos->borrador').eq('emisor_id', emisorId).eq('estado', 'aceptado').order('clave').range(d, h));
      return rows.map(resumenDocumento);
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
    async emisores(uid) {
      return await todas<EmisorMiembros>((d, h) => {
        const q = db.from('emisores').select('id, miembros, propietario').order('creado_en').order('id').range(d, h);
        return uid ? q.contains('miembros', [uid]) : q;
      });
    },
    async eliminarEmisor(id) {
      ok(await db.from('emisores').delete().eq('id', id));
    },
    async retirarMiembro(id, uid) {
      const e = ok(await db.from('emisores').select('miembros, propietario').eq('id', id).single());
      const miembros = (e.miembros as string[]).filter((m) => m !== uid);
      ok(await db.from('emisores').update({ miembros, propietario: e.propietario === uid ? miembros[0] : e.propietario }).eq('id', id));
    },
    async usuarios() {
      const lista: { id: string; email: string }[] = [];
      for (let page = 1; ; page++) {
        const { data, error } = await db.auth.admin.listUsers({ page, perPage: PAGINA });
        if (error) throw new Error(error.message);
        lista.push(...data.users.map((x) => ({ id: x.id, email: x.email ?? '' })));
        if (data.users.length < PAGINA) return lista;
      }
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const json = (status: number, cuerpo: unknown) => new Response(JSON.stringify(cuerpo), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
  if (req.method !== 'POST') return json(405, { error: 'Método no permitido.' });

  // Toda falla inesperada (p. ej. sin conexión con Auth) responde JSON con CORS: si no, el navegador
  // solo vería un error de red sin detalle.
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    const publico = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!);
    const { data: auth, error } = await publico.auth.getUser(token);
    if (error || !auth.user) return json(401, { error: 'Debe iniciar sesión.' });

    const cuerpo: unknown = await req.json().catch(() => null);
    if (!cuerpo || typeof cuerpo !== 'object' || Array.isArray(cuerpo)) return json(400, { error: 'El cuerpo de la solicitud debe ser un objeto JSON.' });
    const { accion, ...datos } = cuerpo as Record<string, unknown>;

    const servicio = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
    const r = await ejecutar(String(accion ?? ''), datos, { id: auth.user.id, email: auth.user.email }, crearRepo(servicio), {
      pausaMs: Number(Deno.env.get('SIMULADOR_PAUSA_MS') ?? 1500),
      cabysValido: (c) => cabys.has(c),
      administradores: (Deno.env.get('ADMIN_EMAILS') ?? '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean),
      // @ts-ignore EdgeRuntime existe en el entorno de Supabase.
      enSegundoPlano: (p) => (typeof EdgeRuntime !== 'undefined' ? EdgeRuntime.waitUntil(p.catch(console.error)) : p.catch(console.error)),
    });
    return json(r.status, r.cuerpo);
  } catch (e) {
    console.error(e);
    return json(500, { error: 'Error interno del servidor. Intente de nuevo.' });
  }
});
