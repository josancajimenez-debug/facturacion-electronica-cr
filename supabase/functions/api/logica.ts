/**
 * Lógica de la función Edge "api", independiente del entorno (Deno en Supabase, Node en pruebas).
 * Toda la persistencia pasa por la interfaz Repo; los cálculos, el XML y el simulador vienen de @fe-cr/core.
 */
import {
  EMISOR_DEMO,
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
  previsualizar,
  validarComoHacienda,
  type BorradorComprobante,
  type Comprobante,
  type DocumentoResumen,
  type Emisor,
  type EstadoComprobante,
  type Producto,
  type Receptor,
  type Validacion,
} from '@fe-cr/core';

export type ComprobanteGuardado = Comprobante & { escenarioPrueba?: string | null };

export interface Recibido {
  clave: string;
  estado: string;
  fechaEmision: string;
  [k: string]: unknown;
}

export interface EntradaBitacora {
  accion: string;
  clave?: string;
  consecutivo?: string;
  documento?: string;
  detalle?: string;
  usuario?: string | null;
}

export interface Repo {
  emisor(id: string): Promise<(Emisor & { miembros: string[] }) | null>;
  receptores(emisorId: string): Promise<Receptor[]>;
  siguienteNumero(emisorId: string, clave: string): Promise<number>;
  insertarComprobante(c: ComprobanteGuardado): Promise<void>;
  guardarComprobante(c: ComprobanteGuardado): Promise<void>;
  clavesValidadas(emisorId: string): Promise<Set<string>>;
  /** Consecutivos de todos los comprobantes del emisor (secuencia, RES-0027 art. 2). */
  consecutivos(emisorId: string): Promise<{ clave: string; consecutivo: string }[]>;
  /** Comprobantes aceptados del emisor (saldo de las notas de crédito, actualización v4.4). */
  documentosAceptados(emisorId: string): Promise<DocumentoResumen[]>;
  recibido(emisorId: string, clave: string): Promise<Recibido | null>;
  insertarRecibido(emisorId: string, r: Recibido): Promise<void>;
  /** Guarda la confirmación solo si el recibido sigue pendiente; devuelve false si otra solicitud se adelantó. */
  confirmarRecibido(emisorId: string, r: Recibido): Promise<boolean>;
  crearEmisor(uid: string, e: Emisor, receptores: Receptor[], productos: Producto[]): Promise<string>;
  bitacora(emisorId: string, e: EntradaBitacora): Promise<void>;
  /** Emisores de los que el usuario es miembro, o todos si uid es null. */
  emisores(uid: string | null): Promise<EmisorMiembros[]>;
  /** Elimina el emisor y, en cascada, sus receptores, productos, comprobantes, recibidos, contadores y bitácora. */
  eliminarEmisor(id: string): Promise<void>;
  /** Quita al usuario de un emisor compartido; si era el propietario, pasa a serlo el siguiente miembro. */
  retirarMiembro(id: string, uid: string): Promise<void>;
  /** Cuentas registradas (Supabase Auth). */
  usuarios(): Promise<{ id: string; email: string }[]>;
}

export interface EmisorMiembros {
  id: string;
  miembros: string[];
  propietario: string;
}

export interface Usuario {
  id: string;
  email?: string;
}

export interface Opciones {
  pausaMs: number;
  cabysValido?: (codigo: string) => boolean;
  /** Mantiene viva una tarea después de responder (EdgeRuntime.waitUntil en Supabase). */
  enSegundoPlano: (p: Promise<unknown>) => void;
  /** Correos con permiso de administrador (secreto ADMIN_EMAILS), en minúsculas. */
  administradores?: string[];
}

/** Frase que el administrador debe escribir para limpiar los datos de todos los usuarios. */
export const FRASE_LIMPIAR_TODO = 'LIMPIAR TODO';

export interface ResultadoLimpieza {
  emisoresEliminados: number;
  emisoresCompartidos: number;
}

export interface Respuesta {
  status: number;
  cuerpo: Record<string, unknown>;
}

class ErrorApi extends Error {
  constructor(public status: number, message: string, public validaciones?: Validacion[]) {
    super(message);
  }
}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function exigirMiembro(repo: Repo, emisorId: unknown, u: Usuario) {
  if (typeof emisorId !== 'string' || !emisorId) throw new ErrorApi(400, 'emisorId es obligatorio.');
  const e = await repo.emisor(emisorId);
  if (!e) throw new ErrorApi(404, 'El emisor no existe.');
  if (!e.miembros.includes(u.id)) throw new ErrorApi(403, 'No pertenece a este emisor.');
  return e;
}

/**
 * Envío, acuse, procesamiento y respuesta simulados (mismo flujo que el modo local). Si algo falla
 * a mitad del proceso, el comprobante queda en estado "error" con el motivo, en lugar de quedar
 * indefinidamente en "procesando".
 */
export async function procesarEnvio(repo: Repo, c: ComprobanteGuardado, op: Opciones): Promise<void> {
  const evento = async (estado: EstadoComprobante, detalle?: string) => {
    c.estado = estado;
    c.historial = [...c.historial, { estado, fecha: fechaEmisionCR(), detalle }];
    await repo.guardarComprobante(c);
  };
  try {
    await simularRespuesta(repo, c, op, evento);
  } catch (e) {
    const motivo = `Falla del simulador: ${(e as Error).message}`;
    await evento('error', motivo).catch(() => undefined);
    await repo.bitacora(c.emisorId, { accion: 'respuesta-error', clave: c.clave, detalle: motivo }).catch(() => undefined);
    throw e;
  }
}

async function simularRespuesta(
  repo: Repo,
  c: ComprobanteGuardado,
  op: Opciones,
  evento: (estado: EstadoComprobante, detalle?: string) => Promise<void>,
): Promise<void> {
  await evento('enviado', 'Envío al API de recepción SIMULADO (POST /recepcion).');
  await esperar(op.pausaMs / 2);
  await evento('recibido', 'Acuse de recibo simulado (art. 21 Decreto 44739-H).');
  await esperar(op.pausaMs / 2);
  await evento('procesando');

  const ctx = contextoSimuladorDemo([c.emisor]);
  for (const r of await repo.receptores(c.emisorId)) {
    if (r.identificacion && r.identificacion.tipo !== '05') {
      ctx.padron![r.identificacion.numero] = { nombre: r.nombre, estado: 'Inscrito', actividades: r.actividadEconomica ? [r.actividadEconomica] : [] };
    }
  }
  const previas = await repo.clavesValidadas(c.emisorId);
  previas.delete(c.clave);
  const documentosAceptados = c.tipo === 'NC' || c.tipo === 'ND' ? await repo.documentosAceptados(c.emisorId) : undefined;
  const consecutivosEmitidos = (await repo.consecutivos(c.emisorId)).filter((x) => x.clave !== c.clave).map((x) => x.consecutivo);
  const respuesta = validarComoHacienda(c, { ...ctx, cabysValido: op.cabysValido, clavesRecibidas: previas, consecutivosEmitidos, documentosAceptados, forzarRechazo: c.escenarioPrueba ?? undefined });
  await esperar(op.pausaMs);
  c.respuestaHacienda = respuesta;
  await evento(respuesta.estado, respuesta.detalle.join(' | ') || 'Sin observaciones');
  await repo.bitacora(c.emisorId, { accion: `respuesta-${respuesta.estado}`, clave: c.clave, detalle: respuesta.detalle.join(' | ') });
}

async function emitir(repo: Repo, d: Record<string, unknown>, u: Usuario, op: Opciones): Promise<Respuesta> {
  const emisor = await exigirMiembro(repo, d.emisorId, u);
  if (!d.borrador || typeof d.borrador !== 'object' || !(d.borrador as BorradorComprobante).tipo) throw new ErrorApi(400, 'Borrador requerido.');
  const borrador: BorradorComprobante = { ...(d.borrador as BorradorComprobante), emisorId: emisor.id };
  // Se valida antes de pedir el consecutivo para no consumir numeración con comprobantes inválidos.
  const vista = previsualizar(borrador, emisor);
  if (vista.validaciones.some((v) => v.nivel === 'error')) throw new ErrorApi(400, 'El comprobante tiene errores de validación.', vista.validaciones);
  const numero = await repo.siguienteNumero(emisor.id, claveContador(emisor.id, borrador.sucursal, borrador.terminal, borrador.tipo));
  const c: ComprobanteGuardado = {
    ...construirComprobante({ borrador, emisor, numero, ambiente: 'simulacion', usuario: u.email ?? u.id }),
    escenarioPrueba: typeof d.escenarioPrueba === 'string' ? d.escenarioPrueba : null,
  };
  await repo.insertarComprobante(c);
  await repo.bitacora(emisor.id, { accion: 'emision', clave: c.clave, consecutivo: c.consecutivo, detalle: `${c.tipo} por ${c.resumen.totalComprobante.toFixed(2)} ${c.resumen.codigoMoneda}`, usuario: u.email ?? u.id });
  op.enSegundoPlano(procesarEnvio(repo, c, op));
  return { status: 200, cuerpo: { clave: c.clave } };
}

async function registrarRecibido(repo: Repo, emisor: Emisor, xml: string, origen: string, u: Usuario): Promise<Respuesta> {
  let datos;
  try {
    datos = extraerDatosComprobante(xml);
  } catch (e) {
    throw new ErrorApi(400, (e as Error).message);
  }
  if (datos.identificacionReceptor && datos.identificacionReceptor.numero !== emisor.identificacion.numero) {
    throw new ErrorApi(409, 'El comprobante no está dirigido a este emisor (la identificación del receptor no coincide).');
  }
  if (await repo.recibido(emisor.id, datos.clave)) throw new ErrorApi(409, 'Este comprobante ya fue registrado.');
  await repo.insertarRecibido(emisor.id, {
    ...datos,
    estado: 'pendiente',
    limiteConfirmacion: limiteConfirmacionReceptor(new Date(datos.fechaEmision)),
    recibidoEn: fechaEmisionCR(),
  });
  await repo.bitacora(emisor.id, { accion: 'recepcion', clave: datos.clave, detalle: `${origen}: ${datos.nombreEmisor}`, usuario: u.email ?? u.id });
  return { status: 200, cuerpo: { clave: datos.clave } };
}

async function simularRecepcion(repo: Repo, d: Record<string, unknown>, u: Usuario): Promise<Respuesta> {
  const emisor = await exigirMiembro(repo, d.emisorId, u);
  const numero = await repo.siguienteNumero(emisor.id, 'proveedor-demo');
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
  return registrarRecibido(repo, emisor, fe.xml, 'Comprobante simulado de proveedor', u);
}

async function confirmar(repo: Repo, d: Record<string, unknown>, u: Usuario): Promise<Respuesta> {
  const emisor = await exigirMiembro(repo, d.emisorId, u);
  const clave = String(d.clave ?? '');
  const recibido = await repo.recibido(emisor.id, clave);
  if (!recibido) throw new ErrorApi(404, 'Comprobante recibido no encontrado.');
  if (recibido.estado !== 'pendiente') throw new ErrorApi(409, 'El comprobante ya fue confirmado.');
  const mensaje = d.mensaje as '1' | '2' | '3';
  if (!['1', '2', '3'].includes(mensaje)) throw new ErrorApi(400, 'Mensaje inválido (nota 11).');
  const tipo = { '1': 'CCE', '2': 'CPCE', '3': 'RCE' }[mensaje];
  const solicitud = {
    recibido: recibido as never,
    receptor: emisor,
    mensaje,
    detalleMensaje: d.detalleMensaje as string | undefined,
    condicionImpuesto: d.condicionImpuesto as string | undefined,
    codigoActividad: d.codigoActividad as string | undefined,
    montoTotalImpuestoAcreditar: d.montoTotalImpuestoAcreditar as number | undefined,
    montoTotalDeGastoAplicable: d.montoTotalDeGastoAplicable as number | undefined,
    feriados: Array.isArray(d.feriados) ? d.feriados.filter((f): f is string => typeof f === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(f)) : [],
    sucursal: '001',
    terminal: '00001',
  };
  // Validación previa con un número provisional para no consumir consecutivo si hay errores.
  const prueba = generarConfirmacion({ ...solicitud, numero: 1 });
  if (prueba.validaciones.some((v) => v.nivel === 'error')) throw new ErrorApi(400, 'La confirmación tiene errores.', prueba.validaciones);
  const numero = await repo.siguienteNumero(emisor.id, claveContador(emisor.id, '001', '00001', tipo));
  const conf = generarConfirmacion({ ...solicitud, numero });
  const guardado = await repo.confirmarRecibido(emisor.id, {
    ...recibido,
    estado: { '1': 'aceptado', '2': 'aceptado-parcial', '3': 'rechazado' }[mensaje],
    confirmacion: {
      consecutivo: conf.consecutivo, xml: conf.xml, tipo: conf.tipo, fecha: fechaEmisionCR(), respuestaHacienda: 'aceptado (simulado)',
      advertencias: conf.validaciones.filter((v) => v.nivel === 'advertencia').map((v) => v.mensaje),
    },
  });
  if (!guardado) throw new ErrorApi(409, 'El comprobante ya fue confirmado.');
  await repo.bitacora(emisor.id, { accion: `confirmacion-${conf.tipo}`, clave, consecutivo: conf.consecutivo, usuario: u.email ?? u.id });
  return { status: 200, cuerpo: { consecutivo: conf.consecutivo } };
}

const esAdministrador = (u: Usuario, op: Opciones) => !!u.email && (op.administradores ?? []).includes(u.email.toLowerCase());

function exigirAdministrador(u: Usuario, op: Opciones) {
  if (!esAdministrador(u, op)) throw new ErrorApi(403, 'Solo el administrador puede hacer esta operación.');
}

/**
 * Borra los datos de práctica de un usuario sin tocar su cuenta: elimina los emisores en los que es el
 * único miembro y lo retira de los compartidos, que conservan sus datos para los demás miembros.
 */
async function limpiarDatosDe(repo: Repo, uid: string, quien: string): Promise<ResultadoLimpieza> {
  const r: ResultadoLimpieza = { emisoresEliminados: 0, emisoresCompartidos: 0 };
  for (const e of await repo.emisores(uid)) {
    if (e.miembros.every((m) => m === uid)) {
      await repo.eliminarEmisor(e.id);
      r.emisoresEliminados++;
    } else {
      await repo.retirarMiembro(e.id, uid);
      await repo.bitacora(e.id, { accion: 'miembro-retirado', detalle: `Se retiró al usuario ${uid} al limpiar sus datos.`, usuario: quien });
      r.emisoresCompartidos++;
    }
  }
  return r;
}

async function listarUsuarios(repo: Repo) {
  const emisores = await repo.emisores(null);
  const usuarios = (await repo.usuarios()).map((x) => ({ uid: x.id, email: x.email, emisores: emisores.filter((e) => e.miembros.includes(x.id)).length }));
  return usuarios.sort((a, b) => a.email.localeCompare(b.email));
}

/** Punto de entrada: despacha la acción solicitada y convierte errores en respuestas HTTP. */
export async function ejecutar(accion: string, datos: Record<string, unknown>, u: Usuario, repo: Repo, op: Opciones): Promise<Respuesta> {
  try {
    switch (accion) {
      case 'emitir':
        return await emitir(repo, datos, u, op);
      case 'sembrarDemo': {
        const id = await repo.crearEmisor(u.id, EMISOR_DEMO, RECEPTORES_DEMO, PRODUCTOS_DEMO);
        await repo.bitacora(id, { accion: 'datos-demo', detalle: 'Se cargaron datos ficticios de demostración.', usuario: u.email ?? u.id });
        return { status: 200, cuerpo: { emisorId: id } };
      }
      case 'simularRecepcion':
        return await simularRecepcion(repo, datos, u);
      case 'registrarRecibidoXml': {
        const emisor = await exigirMiembro(repo, datos.emisorId, u);
        if (typeof datos.xml !== 'string' || datos.xml.length > 1_000_000) throw new ErrorApi(400, 'XML inválido o demasiado grande.');
        return await registrarRecibido(repo, emisor, datos.xml, 'XML cargado', u);
      }
      case 'confirmar':
        return await confirmar(repo, datos, u);
      case 'perfil':
        return { status: 200, cuerpo: { administrador: esAdministrador(u, op) } };
      case 'limpiarMisDatos':
        return { status: 200, cuerpo: { ...(await limpiarDatosDe(repo, u.id, u.email ?? u.id)) } };
      case 'listarUsuarios':
        exigirAdministrador(u, op);
        return { status: 200, cuerpo: { usuarios: await listarUsuarios(repo) } };
      case 'limpiarUsuario': {
        exigirAdministrador(u, op);
        if (typeof datos.uid !== 'string' || !/^[0-9a-f-]{36}$/i.test(datos.uid)) throw new ErrorApi(400, 'uid inválido.');
        return { status: 200, cuerpo: { ...(await limpiarDatosDe(repo, datos.uid, u.email ?? u.id)) } };
      }
      case 'limpiarTodo': {
        exigirAdministrador(u, op);
        if (datos.confirmacion !== FRASE_LIMPIAR_TODO) throw new ErrorApi(400, `Escriba «${FRASE_LIMPIAR_TODO}» para confirmar.`);
        const emisores = await repo.emisores(null);
        for (const e of emisores) await repo.eliminarEmisor(e.id);
        return { status: 200, cuerpo: { emisoresEliminados: emisores.length, emisoresCompartidos: 0 } };
      }
      default:
        return { status: 400, cuerpo: { error: `Acción desconocida: ${accion}` } };
    }
  } catch (e) {
    if (e instanceof ErrorApi) return { status: e.status, cuerpo: { error: e.message, validaciones: e.validaciones } };
    return { status: 500, cuerpo: { error: (e as Error).message } };
  }
}
