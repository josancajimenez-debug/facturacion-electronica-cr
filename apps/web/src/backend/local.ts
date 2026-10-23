/**
 * Backend LOCAL: persiste en localStorage y ejecuta en el navegador la misma lógica del paquete
 * @fe-cr/core que usan las Cloud Functions. Pensado para práctica individual sin Firebase.
 * La autenticación local es solo una conveniencia de demostración (no es un mecanismo seguro).
 */
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
  type BorradorComprobante,
  type Comprobante,
  type Emisor,
  type EstadoComprobante,
  type Producto,
  type Receptor,
} from '@fe-cr/core';
import { verificadorCabys } from '../lib/cabys';
import { ErrorConValidaciones, type Backend, type DatosConfirmacion, type EntradaBitacora, type Recibido, type TipoCambio, type Usuario } from './tipos';

const CLAVE_STORAGE = 'fe-cr:local:v1';
const PAUSA_MS = 900;

type ComprobanteGuardado = Comprobante & { escenarioPrueba?: string | null };

interface Estado {
  usuarios: Record<string, { uid: string; email: string; hash: string }>;
  sesion: string | null;
  emisores: Record<string, Emisor>;
  receptores: Record<string, Record<string, Receptor>>;
  productos: Record<string, Record<string, Producto>>;
  comprobantes: Record<string, Record<string, ComprobanteGuardado>>;
  recibidos: Record<string, Record<string, Recibido>>;
  bitacora: Record<string, EntradaBitacora[]>;
  contadores: Record<string, number>;
}

const vacio = (): Estado => ({ usuarios: {}, sesion: null, emisores: {}, receptores: {}, productos: {}, comprobantes: {}, recibidos: {}, bitacora: {}, contadores: {} });

function cargar(): Estado {
  try {
    const raw = localStorage.getItem(CLAVE_STORAGE);
    return raw ? { ...vacio(), ...(JSON.parse(raw) as Estado) } : vacio();
  } catch {
    return vacio();
  }
}

async function hash(texto: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const id = () => crypto.randomUUID();
const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));
const copia = <T>(o: T): T => JSON.parse(JSON.stringify(o)) as T;

export function borrarDatosLocales(): void {
  try {
    localStorage.removeItem(CLAVE_STORAGE);
  } catch {
    /* almacenamiento no disponible */
  }
}

export class LocalBackend implements Backend {
  modo = 'local' as const;
  descripcion = 'Modo local: datos en este navegador (localStorage). Sin Firebase.';
  private estado = cargar();
  private oyentes = new Set<() => void>();

  private guardar(): void {
    try {
      localStorage.setItem(CLAVE_STORAGE, JSON.stringify(this.estado));
    } catch {
      console.warn('No se pudo guardar en localStorage (¿espacio lleno o modo privado?).');
    }
    this.oyentes.forEach((f) => f());
  }

  private suscribir(f: () => void): () => void {
    this.oyentes.add(f);
    queueMicrotask(f);
    return () => this.oyentes.delete(f);
  }

  private usuario(): Usuario | null {
    const u = this.estado.sesion ? Object.values(this.estado.usuarios).find((x) => x.uid === this.estado.sesion) : null;
    return u ? { uid: u.uid, email: u.email } : null;
  }

  private exigirMiembro(emisorId: string): Emisor {
    const u = this.usuario();
    const e = this.estado.emisores[emisorId];
    if (!u) throw new Error('Debe iniciar sesión.');
    if (!e || !e.miembros?.includes(u.uid)) throw new Error('No pertenece a este emisor.');
    return e;
  }

  private bitacora(emisorId: string, entrada: Omit<EntradaBitacora, 'id' | 'fecha'>): void {
    const lista = (this.estado.bitacora[emisorId] ??= []);
    lista.unshift({ id: id(), fecha: fechaEmisionCR(), ambiente: 'simulacion', usuario: this.usuario()?.email ?? null, ...entrada });
  }

  // ---------------- Autenticación ----------------
  onAuth(cb: (u: Usuario | null) => void) {
    return this.suscribir(() => cb(this.usuario()));
  }

  async ingresar(email: string, clave: string) {
    const u = this.estado.usuarios[email.toLowerCase()];
    if (!u || u.hash !== (await hash(`${email.toLowerCase()}:${clave}`))) throw new Error('Correo o contraseña incorrectos.');
    this.estado.sesion = u.uid;
    this.guardar();
  }

  async registrar(email: string, clave: string) {
    const correo = email.toLowerCase();
    if (this.estado.usuarios[correo]) throw new Error('Ya existe un usuario con ese correo.');
    if (clave.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.');
    const uid = id();
    this.estado.usuarios[correo] = { uid, email: correo, hash: await hash(`${correo}:${clave}`) };
    this.estado.sesion = uid;
    this.guardar();
  }

  async salir() {
    this.estado.sesion = null;
    this.guardar();
  }

  // ---------------- Emisores ----------------
  onEmisores(cb: (e: Emisor[]) => void) {
    return this.suscribir(() => {
      const uid = this.usuario()?.uid;
      cb(uid ? Object.values(this.estado.emisores).filter((e) => e.miembros?.includes(uid)).map(copia) : []);
    });
  }

  async guardarEmisor(e: Emisor) {
    const u = this.usuario();
    if (!u) throw new Error('Debe iniciar sesión.');
    const existente = e.id ? this.estado.emisores[e.id] : undefined;
    if (existente) this.exigirMiembro(e.id);
    const emisorId = existente ? e.id : id();
    this.estado.emisores[emisorId] = {
      ...copia(e),
      id: emisorId,
      propietarioUid: existente?.propietarioUid ?? u.uid,
      miembros: existente?.miembros ?? [u.uid],
      creadoEn: existente?.creadoEn ?? fechaEmisionCR(),
    };
    this.bitacora(emisorId, { accion: existente ? 'emisor-modificacion' : 'emisor-creacion' });
    this.guardar();
    return emisorId;
  }

  async sembrarDemo() {
    const u = this.usuario();
    if (!u) throw new Error('Debe iniciar sesión.');
    const emisorId = id();
    this.estado.emisores[emisorId] = { ...copia(EMISOR_DEMO), id: emisorId, propietarioUid: u.uid, miembros: [u.uid], creadoEn: fechaEmisionCR() };
    this.estado.receptores[emisorId] = Object.fromEntries(RECEPTORES_DEMO.map((r) => [r.id, copia(r)]));
    this.estado.productos[emisorId] = Object.fromEntries(PRODUCTOS_DEMO.map((p) => [p.id, copia(p)]));
    this.bitacora(emisorId, { accion: 'datos-demo', detalle: 'Se cargaron datos ficticios de demostración.' });
    this.guardar();
    return emisorId;
  }

  // ---------------- Receptores y productos ----------------
  onReceptores(emisorId: string, cb: (r: Receptor[]) => void) {
    return this.suscribir(() => cb(Object.values(this.estado.receptores[emisorId] ?? {}).map(copia)));
  }

  async guardarReceptor(emisorId: string, r: Receptor) {
    this.exigirMiembro(emisorId);
    const rid = r.id || id();
    const nuevo = !this.estado.receptores[emisorId]?.[rid];
    (this.estado.receptores[emisorId] ??= {})[rid] = { ...copia(r), id: rid };
    this.bitacora(emisorId, { accion: `receptores-${nuevo ? 'creacion' : 'modificacion'}`, documento: rid, detalle: r.nombre });
    this.guardar();
  }

  async eliminarReceptor(emisorId: string, rid: string) {
    this.exigirMiembro(emisorId);
    delete this.estado.receptores[emisorId]?.[rid];
    this.bitacora(emisorId, { accion: 'receptores-eliminacion', documento: rid });
    this.guardar();
  }

  onProductos(emisorId: string, cb: (p: Producto[]) => void) {
    return this.suscribir(() => cb(Object.values(this.estado.productos[emisorId] ?? {}).map(copia)));
  }

  async guardarProducto(emisorId: string, p: Producto) {
    this.exigirMiembro(emisorId);
    if (!/^\d{13}$/.test(p.codigoCabys)) throw new Error('El código CAByS debe tener 13 dígitos.');
    if (!(p.precioUnitario > 0)) throw new Error('El precio debe ser mayor que cero.');
    const pid = p.id || id();
    const nuevo = !this.estado.productos[emisorId]?.[pid];
    (this.estado.productos[emisorId] ??= {})[pid] = { ...copia(p), id: pid };
    this.bitacora(emisorId, { accion: `productos-${nuevo ? 'creacion' : 'modificacion'}`, documento: pid, detalle: p.descripcion });
    this.guardar();
  }

  async eliminarProducto(emisorId: string, pid: string) {
    this.exigirMiembro(emisorId);
    delete this.estado.productos[emisorId]?.[pid];
    this.bitacora(emisorId, { accion: 'productos-eliminacion', documento: pid });
    this.guardar();
  }

  // ---------------- Comprobantes ----------------
  onComprobantes(emisorId: string, cb: (c: Comprobante[]) => void) {
    return this.suscribir(() =>
      cb(Object.values(this.estado.comprobantes[emisorId] ?? {}).map(copia).sort((a, b) => b.fechaEmision.localeCompare(a.fechaEmision) || b.consecutivo.localeCompare(a.consecutivo))),
    );
  }

  async emitir(emisorId: string, borrador: BorradorComprobante, escenarioPrueba?: string) {
    const emisor = this.exigirMiembro(emisorId);
    const kc = claveContador(emisorId, borrador.sucursal, borrador.terminal, borrador.tipo);
    const numero = siguienteNumero(this.estado.contadores[kc] ?? 0);
    let c: Comprobante;
    try {
      c = construirComprobante({ borrador: { ...borrador, emisorId }, emisor, numero, ambiente: 'simulacion', usuario: this.usuario()?.email });
    } catch (e) {
      if (e instanceof ErrorValidacion) throw new ErrorConValidaciones('El comprobante tiene errores de validación.', e.validaciones);
      throw e;
    }
    // El consecutivo solo se consume si el comprobante se generó correctamente.
    this.estado.contadores[kc] = numero;
    (this.estado.comprobantes[emisorId] ??= {})[c.clave] = { ...copia(c), escenarioPrueba: escenarioPrueba ?? null };
    this.bitacora(emisorId, { accion: 'emision', clave: c.clave, consecutivo: c.consecutivo, detalle: `${c.tipo} por ${c.resumen.totalComprobante.toFixed(2)} ${c.resumen.codigoMoneda}` });
    this.guardar();
    void this.procesar(emisorId, c.clave);
    return { clave: c.clave };
  }

  /** Mismo flujo que la Cloud Function procesarEnvio: envío, acuse, procesamiento y respuesta simulados. */
  private async procesar(emisorId: string, clave: string) {
    const evento = (estado: EstadoComprobante, detalle?: string) => {
      const c = this.estado.comprobantes[emisorId]?.[clave];
      if (!c) return;
      c.estado = estado;
      c.historial.push({ estado, fecha: fechaEmisionCR(), detalle });
      this.guardar();
    };
    await esperar(PAUSA_MS / 2);
    evento('enviado', 'Envío al API de recepción SIMULADO (POST /recepcion).');
    await esperar(PAUSA_MS / 2);
    evento('recibido', 'Acuse de recibo simulado (art. 21 Decreto 44739-H).');
    await esperar(PAUSA_MS / 2);
    evento('procesando');

    const c = this.estado.comprobantes[emisorId][clave];
    const ctx = contextoSimuladorDemo([c.emisor]);
    for (const r of Object.values(this.estado.receptores[emisorId] ?? {})) {
      if (r.identificacion && r.identificacion.tipo !== '05') {
        ctx.padron![r.identificacion.numero] = { nombre: r.nombre, estado: 'Inscrito', actividades: r.actividadEconomica ? [r.actividadEconomica] : [] };
      }
    }
    let cabysValido: ((codigo: string) => boolean) | undefined;
    try {
      cabysValido = await verificadorCabys();
    } catch {
      cabysValido = undefined; // sin catálogo disponible se omite esa verificación
    }
    const respuesta = validarComoHacienda(c, { ...ctx, cabysValido, forzarRechazo: c.escenarioPrueba ?? undefined });
    await esperar(PAUSA_MS);
    c.respuestaHacienda = respuesta;
    evento(respuesta.estado, respuesta.detalle.join(' | ') || 'Sin observaciones');
    this.bitacora(emisorId, { accion: `respuesta-${respuesta.estado}`, clave, detalle: respuesta.detalle.join(' | ') });
    this.guardar();
  }

  // ---------------- Recepción ----------------
  onRecibidos(emisorId: string, cb: (r: Recibido[]) => void) {
    return this.suscribir(() => cb(Object.values(this.estado.recibidos[emisorId] ?? {}).map(copia).sort((a, b) => b.fechaEmision.localeCompare(a.fechaEmision))));
  }

  private guardarRecibido(emisorId: string, xml: string, origen: string) {
    const emisor = this.exigirMiembro(emisorId);
    const datos = extraerDatosComprobante(xml);
    if (datos.identificacionReceptor && datos.identificacionReceptor.numero !== emisor.identificacion.numero) {
      throw new Error('El comprobante no está dirigido a este emisor (la identificación del receptor no coincide).');
    }
    if (this.estado.recibidos[emisorId]?.[datos.clave]) throw new Error('Este comprobante ya fue registrado.');
    (this.estado.recibidos[emisorId] ??= {})[datos.clave] = {
      ...datos,
      estado: 'pendiente',
      limiteConfirmacion: limiteConfirmacionReceptor(new Date(datos.fechaEmision)),
      recibidoEn: fechaEmisionCR(),
    };
    this.bitacora(emisorId, { accion: 'recepcion', clave: datos.clave, detalle: `${origen}: ${datos.nombreEmisor}` });
    this.guardar();
    return { clave: datos.clave };
  }

  async simularRecepcion(emisorId: string) {
    const emisor = this.exigirMiembro(emisorId);
    const numero = siguienteNumero(this.estado.contadores['proveedor-demo'] ?? 0);
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
    this.estado.contadores['proveedor-demo'] = numero;
    return this.guardarRecibido(emisorId, fe.xml, 'Comprobante simulado de proveedor');
  }

  async registrarRecibidoXml(emisorId: string, xml: string) {
    return this.guardarRecibido(emisorId, xml, 'XML cargado');
  }

  async confirmar(emisorId: string, d: DatosConfirmacion) {
    const emisor = this.exigirMiembro(emisorId);
    const recibido = this.estado.recibidos[emisorId]?.[d.clave];
    if (!recibido) throw new Error('Comprobante recibido no encontrado.');
    if (recibido.estado !== 'pendiente') throw new Error('El comprobante ya fue confirmado.');
    const tipo = { '1': 'CCE', '2': 'CPCE', '3': 'RCE' }[d.mensaje];
    const kc = claveContador(emisorId, '001', '00001', tipo);
    const numero = siguienteNumero(this.estado.contadores[kc] ?? 0);
    const conf = generarConfirmacion({ ...d, recibido, receptor: emisor, sucursal: '001', terminal: '00001', numero });
    if (conf.validaciones.some((v) => v.nivel === 'error')) throw new ErrorConValidaciones('La confirmación tiene errores.', conf.validaciones);
    this.estado.contadores[kc] = numero;
    recibido.estado = ({ '1': 'aceptado', '2': 'aceptado-parcial', '3': 'rechazado' } as const)[d.mensaje];
    recibido.confirmacion = {
      consecutivo: conf.consecutivo,
      xml: conf.xml,
      tipo: conf.tipo,
      fecha: fechaEmisionCR(),
      respuestaHacienda: 'aceptado (simulado)',
      advertencias: conf.validaciones.filter((v) => v.nivel === 'advertencia').map((v) => v.mensaje),
    };
    this.bitacora(emisorId, { accion: `confirmacion-${conf.tipo}`, clave: d.clave, consecutivo: conf.consecutivo });
    this.guardar();
    return { consecutivo: conf.consecutivo };
  }

  onBitacora(emisorId: string, cb: (b: EntradaBitacora[]) => void) {
    return this.suscribir(() => cb(copia(this.estado.bitacora[emisorId] ?? [])));
  }

  async tipoCambio(): Promise<TipoCambio> {
    const resp = await fetch('https://api.hacienda.go.cr/indicadores/tc/dolar');
    if (!resp.ok) throw new Error(`El API de Hacienda respondió ${resp.status}.`);
    const j = (await resp.json()) as { venta: { fecha: string; valor: number }; compra: { valor: number } };
    return { venta: j.venta.valor, compra: j.compra.valor, fecha: j.venta.fecha, fuente: 'api.hacienda.go.cr/indicadores/tc/dolar' };
  }
}
