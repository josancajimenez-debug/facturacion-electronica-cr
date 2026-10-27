/**
 * Backend SUPABASE: Auth (correo/contraseña), PostgreSQL con seguridad por fila, tiempo real
 * (postgres_changes) y la función Edge "api" para las operaciones que no puede hacer el cliente
 * (consecutivos, claves, XML, respuestas simuladas, confirmaciones y bitácora).
 */
import type { BorradorComprobante, Comprobante, Emisor, Producto, Receptor, Validacion } from '@fe-cr/core';
import { createClient, type RealtimeChannel } from '@supabase/supabase-js';
import { config } from '../config';
import { ErrorConValidaciones, LIMITE_BITACORA, consultarTipoCambio, type Backend, type DatosConfirmacion, type EntradaBitacora, type Recibido, type ResultadoLimpieza, type TipoCambio, type Usuario, type UsuarioResumen } from './tipos';

const limpiar = <T>(o: T): T => JSON.parse(JSON.stringify(o)) as T;

/** Mensajes de Supabase Auth (en inglés) más frecuentes, en español. */
const ERRORES_AUTH: [RegExp, string][] = [
  [/invalid login credentials/i, 'Correo o contraseña incorrectos.'],
  [/already registered/i, 'Ya existe una cuenta con ese correo.'],
  [/password should be at least (\d+)/i, 'La contraseña debe tener al menos $1 caracteres.'],
  [/invalid format|validate email/i, 'El correo electrónico no tiene un formato válido.'],
  [/rate limit|only request this after/i, 'Demasiados intentos seguidos; espere un momento e intente de nuevo.'],
  [/email not confirmed/i, 'Debe confirmar el correo antes de ingresar.'],
  [/signups not allowed/i, 'El registro de cuentas nuevas está deshabilitado.'],
  [/failed to fetch|network/i, 'No hay conexión con el servidor. Revise su conexión a internet.'],
];
const traducirErrorAuth = (mensaje: string) => {
  for (const [re, texto] of ERRORES_AUTH) {
    const m = re.exec(mensaje);
    if (m) return texto.replace('$1', m[1] ?? '');
  }
  return mensaje;
};
const nuevoId = () => crypto.randomUUID();

export class SupabaseBackend implements Backend {
  modo = 'supabase' as const;
  descripcion = `Supabase (${new URL(config.supabase.url).host})`;
  private sb = createClient(config.supabase.url, config.supabase.anonKey);
  private refrescos = new Map<string, Set<() => Promise<void>>>();

  /**
   * Consulta inicial + suscripción en tiempo real a los cambios de la tabla. Se vuelve a consultar
   * al quedar suscrito, porque los cambios ocurridos entre la consulta y la suscripción no llegan.
   */
  private vivo<T>(tabla: string, filtro: string | null, cargar: () => Promise<T>, cb: (v: T) => void): () => void {
    let activo = true;
    const refrescar = () => cargar().then((v) => void (activo && cb(v)), (e) => console.error(tabla, e));
    void refrescar();
    const canal: RealtimeChannel = this.sb
      .channel(`${tabla}-${filtro ?? 'todo'}-${nuevoId()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: tabla, ...(filtro ? { filter: filtro } : {}) }, () => void refrescar())
      .subscribe((estado) => estado === 'SUBSCRIBED' && void refrescar());
    const set = this.refrescos.get(tabla) ?? new Set();
    this.refrescos.set(tabla, set.add(refrescar));
    return () => {
      activo = false;
      set.delete(refrescar);
      void this.sb.removeChannel(canal);
    };
  }

  /**
   * Refresca a los suscriptores de una tabla tras un cambio propio (no depende del tiempo real). Se puede
   * esperar: así, al navegar al comprobante recién emitido, ya está en la lista y no aparece «no encontrado».
   */
  private async refrescar(tabla: string): Promise<void> {
    await Promise.all([...(this.refrescos.get(tabla) ?? [])].map((f) => f()));
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
      if (detalle?.error) throw new Error(detalle.error);
      throw new Error(/failed to send/i.test(error.message) ? 'No se pudo contactar al servidor. Revise su conexión e intente de nuevo.' : error.message);
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
    if (error) throw new Error(traducirErrorAuth(error.message));
  }

  async registrar(email: string, clave: string) {
    const { data, error } = await this.sb.auth.signUp({ email, password: clave });
    if (error) throw new Error(traducirErrorAuth(error.message));
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
      await this.refrescar('emisores');
      return id;
    }
    const { data: u } = await this.sb.auth.getUser();
    if (!u.user) throw new Error('Debe iniciar sesión.');
    const fila = await this.datos<{ id: string } | null>(this.sb.from('emisores').insert({ propietario: u.user.id, miembros: [u.user.id], datos: limpiar(datos) }).select('id').single());
    if (!fila) throw new Error('No se pudo crear el emisor.');
    await this.refrescar('emisores');
    return fila.id as string;
  }

  async sembrarDemo() {
    const { emisorId } = await this.api<{ emisorId: string }>('sembrarDemo', {});
    await this.refrescar('emisores');
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
    await this.refrescar('receptores');
  }

  async eliminarReceptor(emisorId: string, id: string) {
    await this.datos(this.sb.from('receptores').delete().eq('emisor_id', emisorId).eq('id', id));
    await this.refrescar('receptores');
  }

  onProductos(emisorId: string, cb: (p: Producto[]) => void) {
    return this.coleccion<Producto>('productos', emisorId, cb);
  }

  async guardarProducto(emisorId: string, p: Producto) {
    const id = p.id || nuevoId();
    await this.datos(this.sb.from('productos').upsert({ emisor_id: emisorId, id, datos: limpiar({ ...p, id }) }));
    await this.refrescar('productos');
  }

  async eliminarProducto(emisorId: string, id: string) {
    await this.datos(this.sb.from('productos').delete().eq('emisor_id', emisorId).eq('id', id));
    await this.refrescar('productos');
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
    const r = await this.api<{ clave: string }>('emitir', { emisorId, borrador, escenarioPrueba });
    await this.refrescar('comprobantes');
    return r;
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
    const r = await this.api<{ clave: string }>('simularRecepcion', { emisorId });
    await this.refrescar('recibidos');
    return r;
  }

  async registrarRecibidoXml(emisorId: string, xml: string) {
    const r = await this.api<{ clave: string }>('registrarRecibidoXml', { emisorId, xml });
    await this.refrescar('recibidos');
    return r;
  }

  // ---------------- Limpieza de datos ----------------
  perfil() {
    return this.api<{ administrador: boolean }>('perfil', {});
  }

  /** Tras limpiar se refrescan los emisores: si no queda ninguno, la app vuelve a la bienvenida. */
  private async limpiar(accion: string, cuerpo: Record<string, unknown>) {
    const r = await this.api<ResultadoLimpieza>(accion, cuerpo);
    await this.refrescar('emisores');
    return r;
  }

  limpiarMisDatos() {
    return this.limpiar('limpiarMisDatos', {});
  }

  async usuarios() {
    return (await this.api<{ usuarios: UsuarioResumen[] }>('listarUsuarios', {})).usuarios;
  }

  limpiarUsuario(uid: string) {
    return this.limpiar('limpiarUsuario', { uid });
  }

  limpiarTodo(confirmacion: string) {
    return this.limpiar('limpiarTodo', { confirmacion });
  }

  async confirmar(emisorId: string, d: DatosConfirmacion) {
    const r = await this.api<{ consecutivo: string }>('confirmar', { emisorId, ...d });
    await this.refrescar('recibidos');
    return r;
  }

  onBitacora(emisorId: string, cb: (b: EntradaBitacora[]) => void) {
    return this.vivo(
      'bitacora',
      `emisor_id=eq.${emisorId}`,
      async () => (await this.datos(this.sb.from('bitacora').select('*').eq('emisor_id', emisorId).order('id', { ascending: false }).limit(LIMITE_BITACORA))).map((f) => ({ ...f, id: String(f.id) }) as EntradaBitacora),
      cb,
    );
  }

  tipoCambio(): Promise<TipoCambio> {
    return consultarTipoCambio();
  }
}
