/**
 * Backend SUPABASE: Auth (correo/contraseña), PostgreSQL con seguridad por fila, tiempo real
 * (postgres_changes) y la función Edge "api" para las operaciones que no puede hacer el cliente
 * (consecutivos, claves, XML, respuestas simuladas, confirmaciones y bitácora).
 */
import type { BorradorComprobante, Comprobante, Emisor, Producto, Receptor, Validacion } from '@fe-cr/core';
import { createClient, type RealtimeChannel } from '@supabase/supabase-js';
import { config } from '../config';
import { ErrorConValidaciones, type Backend, type DatosConfirmacion, type EntradaBitacora, type Recibido, type TipoCambio, type Usuario } from './tipos';

const limpiar = <T>(o: T): T => JSON.parse(JSON.stringify(o)) as T;
const nuevoId = () => crypto.randomUUID();

export class SupabaseBackend implements Backend {
  modo = 'supabase' as const;
  descripcion = `Supabase (${new URL(config.supabase.url).host})`;
  private sb = createClient(config.supabase.url, config.supabase.anonKey);
  private refrescos = new Map<string, Set<() => void>>();

  /**
   * Consulta inicial + suscripción en tiempo real a los cambios de la tabla. Se vuelve a consultar
   * al quedar suscrito, porque los cambios ocurridos entre la consulta y la suscripción no llegan.
   */
  private vivo<T>(tabla: string, filtro: string | null, cargar: () => Promise<T>, cb: (v: T) => void): () => void {
    let activo = true;
    const refrescar = () => void cargar().then((v) => activo && cb(v), (e) => console.error(tabla, e));
    refrescar();
    const canal: RealtimeChannel = this.sb
      .channel(`${tabla}-${filtro ?? 'todo'}-${nuevoId()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: tabla, ...(filtro ? { filter: filtro } : {}) }, refrescar)
      .subscribe((estado) => estado === 'SUBSCRIBED' && refrescar());
    const set = this.refrescos.get(tabla) ?? new Set();
    this.refrescos.set(tabla, set.add(refrescar));
    return () => {
      activo = false;
      set.delete(refrescar);
      void this.sb.removeChannel(canal);
    };
  }

  /** Refresca a los suscriptores de una tabla tras un cambio propio (no depende del tiempo real). */
  private refrescar(tabla: string) {
    this.refrescos.get(tabla)?.forEach((f) => f());
  }

  private async datos<T>(consulta: PromiseLike<{ data: T | null; error: { message: string } | null }>): Promise<T> {
    const { data, error } = await consulta;
    if (error) throw new Error(error.message);
    return data as T;
  }

  private async api<T>(accion: string, cuerpo: Record<string, unknown>): Promise<T> {
    const { data, error } = await this.sb.functions.invoke('api', { body: limpiar({ accion, ...cuerpo }) });
    if (error) {
      let detalle: { error?: string; validaciones?: Validacion[] } = {};
      try {
        detalle = await (error as { context?: Response }).context?.json();
      } catch {
        /* sin cuerpo JSON */
      }
      if (detalle?.validaciones) throw new ErrorConValidaciones(detalle.error ?? error.message, detalle.validaciones);
      throw new Error(detalle?.error ?? error.message);
    }
    return data as T;
  }

  // ---------------- Autenticación ----------------
  onAuth(cb: (u: Usuario | null) => void) {
    const aUsuario = (u: { id: string; email?: string } | null | undefined) => (u ? { uid: u.id, email: u.email ?? '' } : null);
    void this.sb.auth.getSession().then(({ data }) => cb(aUsuario(data.session?.user)));
    const { data } = this.sb.auth.onAuthStateChange((_e, s) => cb(aUsuario(s?.user)));
    return () => data.subscription.unsubscribe();
  }

  async ingresar(email: string, clave: string) {
    const { error } = await this.sb.auth.signInWithPassword({ email, password: clave });
    if (error) throw new Error(error.message === 'Invalid login credentials' ? 'Correo o contraseña incorrectos.' : error.message);
  }

  async registrar(email: string, clave: string) {
    const { data, error } = await this.sb.auth.signUp({ email, password: clave });
    if (error) throw new Error(error.message);
    if (!data.session) throw new Error('Cuenta creada. Revise su correo para confirmarla y luego ingrese.');
  }

  async salir() {
    await this.sb.auth.signOut();
  }

  // ---------------- Emisores ----------------
  onEmisores(cb: (e: Emisor[]) => void) {
    return this.vivo(
      'emisores',
      null,
      async () => {
        const filas = await this.datos(this.sb.from('emisores').select('id, propietario, miembros, datos').order('creado_en'));
        return (filas ?? []).map((f) => ({ ...(f.datos as Emisor), id: f.id, propietarioUid: f.propietario, miembros: f.miembros }));
      },
      cb,
    );
  }

  async guardarEmisor(e: Emisor) {
    const { id, propietarioUid: _p, miembros: _m, ...datos } = e;
    if (id) {
      await this.datos(this.sb.from('emisores').update({ datos: limpiar(datos) }).eq('id', id));
      return id;
    }
    const { data: u } = await this.sb.auth.getUser();
    if (!u.user) throw new Error('Debe iniciar sesión.');
    const fila = await this.datos<{ id: string } | null>(this.sb.from('emisores').insert({ propietario: u.user.id, miembros: [u.user.id], datos: limpiar(datos) }).select('id').single());
    if (!fila) throw new Error('No se pudo crear el emisor.');
    this.refrescar('emisores');
    return fila.id as string;
  }

  async sembrarDemo() {
    const { emisorId } = await this.api<{ emisorId: string }>('sembrarDemo', {});
    this.refrescar('emisores');
    return emisorId;
  }

  // ---------------- Receptores y productos ----------------
  private coleccion<T extends { id: string }>(tabla: 'receptores' | 'productos', emisorId: string, cb: (v: T[]) => void) {
    return this.vivo(
      tabla,
      `emisor_id=eq.${emisorId}`,
      async () => (await this.datos(this.sb.from(tabla).select('id, datos').eq('emisor_id', emisorId))).map((f) => ({ ...(f.datos as T), id: f.id })),
      cb,
    );
  }

  onReceptores(emisorId: string, cb: (r: Receptor[]) => void) {
    return this.coleccion<Receptor>('receptores', emisorId, cb);
  }

  async guardarReceptor(emisorId: string, r: Receptor) {
    const id = r.id || nuevoId();
    await this.datos(this.sb.from('receptores').upsert({ emisor_id: emisorId, id, datos: limpiar({ ...r, id }) }));
  }

  async eliminarReceptor(emisorId: string, id: string) {
    await this.datos(this.sb.from('receptores').delete().eq('emisor_id', emisorId).eq('id', id));
  }

  onProductos(emisorId: string, cb: (p: Producto[]) => void) {
    return this.coleccion<Producto>('productos', emisorId, cb);
  }

  async guardarProducto(emisorId: string, p: Producto) {
    const id = p.id || nuevoId();
    await this.datos(this.sb.from('productos').upsert({ emisor_id: emisorId, id, datos: limpiar({ ...p, id }) }));
  }

  async eliminarProducto(emisorId: string, id: string) {
    await this.datos(this.sb.from('productos').delete().eq('emisor_id', emisorId).eq('id', id));
  }

  // ---------------- Comprobantes y recepción ----------------
  onComprobantes(emisorId: string, cb: (c: Comprobante[]) => void) {
    return this.vivo(
      'comprobantes',
      `emisor_id=eq.${emisorId}`,
      async () => (await this.datos(this.sb.from('comprobantes').select('datos').eq('emisor_id', emisorId).order('fecha_emision', { ascending: false }))).map((f) => f.datos as Comprobante),
      cb,
    );
  }

  async emitir(emisorId: string, borrador: BorradorComprobante, escenarioPrueba?: string) {
    return this.api<{ clave: string }>('emitir', { emisorId, borrador, escenarioPrueba });
  }

  onRecibidos(emisorId: string, cb: (r: Recibido[]) => void) {
    return this.vivo(
      'recibidos',
      `emisor_id=eq.${emisorId}`,
      async () => (await this.datos(this.sb.from('recibidos').select('datos').eq('emisor_id', emisorId).order('fecha_emision', { ascending: false }))).map((f) => f.datos as Recibido),
      cb,
    );
  }

  async simularRecepcion(emisorId: string) {
    return this.api<{ clave: string }>('simularRecepcion', { emisorId });
  }

  async registrarRecibidoXml(emisorId: string, xml: string) {
    return this.api<{ clave: string }>('registrarRecibidoXml', { emisorId, xml });
  }

  async confirmar(emisorId: string, d: DatosConfirmacion) {
    return this.api<{ consecutivo: string }>('confirmar', { emisorId, ...d });
  }

  onBitacora(emisorId: string, cb: (b: EntradaBitacora[]) => void) {
    return this.vivo(
      'bitacora',
      `emisor_id=eq.${emisorId}`,
      async () => (await this.datos(this.sb.from('bitacora').select('*').eq('emisor_id', emisorId).order('id', { ascending: false }).limit(500))).map((f) => ({ ...f, id: String(f.id) }) as EntradaBitacora),
      cb,
    );
  }

  /** Tipo de cambio de referencia desde el API público de Hacienda (permite CORS). */
  async tipoCambio(): Promise<TipoCambio> {
    const resp = await fetch('https://api.hacienda.go.cr/indicadores/tc/dolar');
    if (!resp.ok) throw new Error(`El API de Hacienda respondió ${resp.status}.`);
    const j = (await resp.json()) as { venta: { fecha: string; valor: number }; compra: { valor: number } };
    return { venta: j.venta.valor, compra: j.compra.valor, fecha: j.venta.fecha, fuente: 'api.hacienda.go.cr/indicadores/tc/dolar' };
  }
}
