import {
  REGEX_CORREO,
  REGIMEN_VENDEDOR,
  TIPO_IDENTIFICACION,
  borradorFecPara,
  descripcion,
  infoRegimen,
  regimenDesdeHacienda,
  validarIdentificacion,
  type Receptor,
  type RegimenVendedor,
} from '@fe-cr/core';
import { FilePlus2, Pencil, Plus, Search, Trash2, Truck } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UbicacionCampos } from '../components/UbicacionCampos';
import { Alerta, Modal, Selector, Texto, Vacio } from '../components/ui';
import { useApp } from '../estado';
import { limpiarIdentificacion } from '../lib/formato';
import { consultable, consultarPadron, consultarRegistroMag, tipoSegunNumero } from '../lib/padron';

const nuevo = (): Receptor => ({
  id: '',
  nombre: '',
  identificacion: { tipo: '01', numero: '' },
  ubicacion: { provincia: '1', canton: '01', distrito: '01', otrasSenas: '' },
  proveedor: { regimen: 'simplificado' },
});

/** Proveedores a los que se les compra con Factura Electrónica de Compra (Decreto 44739-H, art. 2 inc. 13). */
export function Proveedores() {
  const { receptores, emisor, backend, avisar } = useApp();
  const navegar = useNavigate();
  const [editando, setEditando] = useState<Receptor | null>(null);
  const [filtro, setFiltro] = useState('');
  const lista = receptores
    .filter((r) => r.proveedor && `${r.nombre} ${r.identificacion?.numero ?? ''}`.toLowerCase().includes(filtro.toLowerCase()))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  const eliminar = async (r: Receptor) => {
    if (!confirm(`¿Eliminar a ${r.nombre}?`)) return;
    try {
      await backend.eliminarReceptor(emisor!.id, r.id);
      avisar('Proveedor eliminado.', 'ok');
    } catch (e) {
      avisar((e as Error).message, 'err');
    }
  };

  const emitirFec = (r: Receptor) =>
    navegar('/emitir', { state: { borrador: borradorFecPara(r.proveedor!.regimen, r.identificacion?.tipo), receptorId: r.id } });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Proveedores (compras con FEC)</h1>
          <p>Vendedores que no emiten comprobante electrónico: usted documenta la compra con una Factura Electrónica de Compra.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setEditando(nuevo())}><Plus /> Nuevo proveedor</button>
      </div>

      <div className="card">
        <div className="card-body">
          <Alerta tipo="info">
            <strong>Cuándo procede la FEC</strong> (Decreto 44739-H, art. 2 inc. 13): cuando quien vende no está obligado a emitir comprobantes (Régimen de
            Tributación Simplificada y demás casos del art. 7), está en el Régimen Especial Agropecuario, es un proveedor no domiciliado o es una persona física
            no inscrita. <strong>No procede</strong> con contribuyentes del régimen simplificado inscritos como emisores receptores no confirmantes (ellos emiten su
            factura), con el transporte público ni con pagos al Estado por sus actividades habituales. En el régimen especial, la FEC referencia el comprobante que le
            entregó el vendedor (tipo de documento 14).
          </Alerta>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <input placeholder="Buscar por nombre o identificación" value={filtro} onChange={(e) => setFiltro(e.target.value)} style={{ maxWidth: 360 }} aria-label="Buscar proveedor" />
          <span className="small muted">{lista.length} registros</span>
        </div>
        {lista.length === 0 ? (
          <Vacio icono={<Truck />} titulo="Sin proveedores">Registre los vendedores del régimen simplificado o agropecuario a los que les compra.</Vacio>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Nombre</th><th>Identificación</th><th>Régimen</th><th>Verificación en Hacienda</th><th /></tr></thead>
              <tbody>
                {lista.map((r) => {
                  const info = infoRegimen(r.proveedor!.regimen);
                  return (
                    <tr key={r.id}>
                      <td>{r.nombre}</td>
                      <td className="nowrap">{r.identificacion ? `${descripcion(TIPO_IDENTIFICACION, r.identificacion.tipo)} · ${r.identificacion.numero}` : '—'}</td>
                      <td><span className={`badge ${info?.procedeFec ? 'ok' : 'err'}`}>{info?.descripcion ?? r.proveedor!.regimen}</span></td>
                      <td className="small">{r.proveedor!.verificacion ? `${new Date(r.proveedor!.verificacion.fecha).toLocaleDateString('es-CR')}: ${r.proveedor!.verificacion.detalle}` : <span className="muted">Sin consultar</span>}</td>
                      <td className="nowrap right">
                        <button className="btn btn-sm" disabled={!info?.procedeFec} title={info?.procedeFec ? undefined : info?.ayuda} onClick={() => emitirFec(r)}><FilePlus2 /> Emitir FEC</button>
                        <button className="btn btn-ghost btn-icon" aria-label={`Editar ${r.nombre}`} onClick={() => setEditando(r)}><Pencil /></button>
                        <button className="btn btn-ghost btn-icon btn-danger" aria-label={`Eliminar ${r.nombre}`} onClick={() => eliminar(r)}><Trash2 /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {editando && <FormProveedor inicial={editando} onCerrar={() => setEditando(null)} />}
    </>
  );
}

function FormProveedor({ inicial, onCerrar }: { inicial: Receptor; onCerrar: () => void }) {
  const { emisor, receptores, backend, avisar } = useApp();
  const [r, setR] = useState<Receptor>(inicial);
  const [guardando, setGuardando] = useState(false);
  const [consultando, setConsultando] = useState(false);
  const set = (p: Partial<Receptor>) => setR((x) => ({ ...x, ...p }));
  const regimen = r.proveedor?.regimen ?? 'simplificado';
  const info = infoRegimen(regimen)!;
  const tipoId = r.identificacion?.tipo ?? '01';
  const extranjero = tipoId === '05';
  const numero = r.identificacion?.numero ?? '';

  const errores: string[] = [];
  // El vendedor va en el nodo <Emisor> de la FEC, que pide al menos 5 caracteres en el nombre.
  if (r.nombre.trim().length < 5) errores.push('Nombre: mínimo 5 caracteres (nodo Emisor de la FEC).');
  const eId = r.identificacion && validarIdentificacion(r.identificacion);
  if (eId) errores.push(eId);
  if (!info.identificaciones.includes(tipoId)) errores.push(`Para «${info.descripcion}» la identificación debe ser de tipo ${info.identificaciones.join(', ')}.`);
  if (!extranjero && !r.ubicacion) errores.push('La ubicación del vendedor es obligatoria en la FEC (salvo no domiciliado).');
  if (!extranjero && r.ubicacion && r.ubicacion.otrasSenas.trim().length < 5) errores.push('Otras señas de la ubicación: mínimo 5 caracteres.');
  if (r.correo && !REGEX_CORREO.test(r.correo)) errores.push('Correo con formato inválido.');
  const duplicado = receptores.find((x) => x.id !== r.id && x.identificacion?.numero && x.identificacion.numero === numero);
  if (duplicado) errores.push(`La identificación ${numero} ya está registrada (${duplicado.nombre}).`);

  const setRegimen = (v: RegimenVendedor, verificacion = r.proveedor?.verificacion) => set({ proveedor: { regimen: v, verificacion } });

  /** Padrón de Hacienda (/fe/ae) y registro agropecuario del MAG (/fe/agropecuario): sugiere el régimen y deja constancia. */
  const verificar = async () => {
    setConsultando(true);
    try {
      const [p, mag] = await Promise.all([consultarPadron(numero), consultarRegistroMag(numero).catch(() => undefined)]);
      const partes: string[] = [];
      let sugerido: RegimenVendedor | undefined;
      if (p.inscrito) {
        partes.push(`${p.estado}${p.regimen ? `, ${p.regimen}` : ''}`);
        sugerido = regimenDesdeHacienda(p.regimen);
        if (!r.nombre.trim()) set({ nombre: p.nombre });
      } else {
        partes.push('No inscrito en el padrón');
        if (['01', '03'].includes(tipoId)) sugerido = 'no-inscrito';
      }
      if (mag) partes.push(`registro MAG ${mag.activo ? 'activo' : 'inactivo'}${mag.vence ? ` (vence ${mag.vence})` : ''}`);
      else if (mag === null) partes.push('sin registro agropecuario en el MAG');
      if (mag?.activo && sugerido !== 'simplificado' && (!p.inscrito || !sugerido || sugerido === 'agropecuario')) sugerido = 'agropecuario';
      const verificacion = { fecha: new Date().toISOString(), detalle: partes.join('; ') };
      setR((x) => ({ ...x, ...(p.inscrito && !x.nombre.trim() ? { nombre: p.nombre } : {}), proveedor: { regimen: sugerido ?? x.proveedor?.regimen ?? 'simplificado', verificacion } }));
      avisar(`Hacienda: ${verificacion.detalle}.`, sugerido && !infoRegimen(sugerido)?.procedeFec ? 'err' : 'ok');
    } catch (e) {
      avisar((e as Error).message, 'err');
    } finally {
      setConsultando(false);
    }
  };

  const guardar = async () => {
    setGuardando(true);
    try {
      await backend.guardarReceptor(emisor!.id, { ...r, nombre: r.nombre.trim(), ubicacion: extranjero ? undefined : r.ubicacion, proveedor: { ...r.proveedor, regimen } });
      avisar('Proveedor guardado.', 'ok');
      onCerrar();
    } catch (e) {
      avisar((e as Error).message, 'err');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal
      titulo={inicial.id ? 'Editar proveedor' : 'Nuevo proveedor'}
      onCerrar={onCerrar}
      pie={<><button className="btn" onClick={onCerrar}>Cancelar</button><button className="btn btn-primary" disabled={errores.length > 0 || guardando} onClick={guardar}>{guardando ? 'Guardando…' : 'Guardar'}</button></>}
    >
      <div className="stack">
        {errores.length > 0 && <Alerta tipo="warn">{errores.join(' ')}</Alerta>}
        <div className="grid grid-2">
          <Selector etiqueta="Tipo de identificación" valor={tipoId} onCambio={(v) => set({ identificacion: { numero, tipo: v } })} opciones={TIPO_IDENTIFICACION.filter((t) => info.identificaciones.includes(t.codigo) || t.codigo === tipoId)} requerido />
          <div className="field">
            <Texto etiqueta="Número de identificación" valor={numero} requerido
              onCambio={(v) => {
                const n = limpiarIdentificacion(tipoId, v);
                set({ identificacion: { numero: n, tipo: ['01', '02', '03', '04'].includes(tipoId) ? tipoSegunNumero(n, tipoId) : tipoId } });
              }}
              ayuda={extranjero ? 'Hasta 20 caracteres alfanuméricos.' : 'Sin guiones.'} />
            {!extranjero && tipoId !== '06' && (
              <button className="btn btn-sm" style={{ alignSelf: 'flex-start' }} disabled={consultando || !consultable(numero)} onClick={verificar}>
                <Search /> {consultando ? 'Consultando…' : 'Verificar en Hacienda'}
              </button>
            )}
          </div>
          <Texto etiqueta="Nombre o razón social" valor={r.nombre} onCambio={(v) => set({ nombre: v })} requerido max={100} />
          <Texto etiqueta="Correo electrónico" tipo="email" valor={r.correo} onCambio={(v) => set({ correo: v || undefined })} ayuda="Opcional: para enviarle copia de la FEC." />
        </div>
        <Selector etiqueta="Régimen del vendedor" valor={regimen} mostrarCodigo={false} requerido
          onCambio={(v) => {
            const nuevoInfo = infoRegimen(v)!;
            setRegimen(v as RegimenVendedor);
            // Cada régimen admite ciertos tipos de identificación; se ajusta si el actual no corresponde.
            if (!nuevoInfo.identificaciones.includes(tipoId)) set({ identificacion: { numero, tipo: nuevoInfo.identificaciones[0] } });
          }}
          opciones={REGIMEN_VENDEDOR.map((x) => ({ codigo: x.codigo, descripcion: `${x.descripcion}${x.procedeFec ? '' : ' — no procede FEC'}` }))}
          ayuda={`${info.ayuda} Fundamento: ${info.fundamento}.`} />
        {!info.procedeFec && <Alerta tipo="err">No procede la Factura Electrónica de Compra con este proveedor. {info.ayuda}</Alerta>}
        {r.proveedor?.verificacion && <span className="small muted">Última verificación ({new Date(r.proveedor.verificacion.fecha).toLocaleString('es-CR')}): {r.proveedor.verificacion.detalle}.</span>}
        {extranjero ? (
          <Texto etiqueta="Otras señas en el extranjero" valor={r.otrasSenasExtranjero} onCambio={(v) => set({ otrasSenasExtranjero: v || undefined })} max={300} />
        ) : (
          <div className="grid grid-3">
            <UbicacionCampos valor={r.ubicacion ?? { provincia: '1', canton: '01', distrito: '01', otrasSenas: '' }} onCambio={(u) => set({ ubicacion: u })} maxSenas={160} />
          </div>
        )}
      </div>
    </Modal>
  );
}
