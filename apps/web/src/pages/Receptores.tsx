import {
  INSTITUCION_EXONERACION,
  PROVINCIA,
  REGEX_CORREO,
  TIPO_EXONERACION,
  TIPO_IDENTIFICACION,
  descripcion,
  fechaEmisionCR,
  validarIdentificacion,
  type Receptor,
} from '@fe-cr/core';
import { Pencil, Plus, Trash2, Users } from 'lucide-react';
import { useState } from 'react';
import { Alerta, Modal, Selector, Texto, Vacio } from '../components/ui';
import { useApp } from '../estado';

const vacio = (): Receptor => ({ id: '', nombre: '', identificacion: { tipo: '01', numero: '' } });

export function Receptores() {
  const { receptores, emisor, backend, avisar } = useApp();
  const [editando, setEditando] = useState<Receptor | null>(null);
  const [filtro, setFiltro] = useState('');
  const lista = receptores
    .filter((r) => `${r.nombre} ${r.identificacion?.numero ?? ''}`.toLowerCase().includes(filtro.toLowerCase()))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  const eliminar = async (r: Receptor) => {
    if (!confirm(`¿Eliminar a ${r.nombre}?`)) return;
    await backend.eliminarReceptor(emisor!.id, r.id);
    avisar('Receptor eliminado.', 'ok');
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Receptores</h1>
          <p>Clientes y contrapartes: identificación, ubicación, actividad económica y exoneraciones.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setEditando(vacio())}><Plus /> Nuevo receptor</button>
      </div>
      <div className="card">
        <div className="card-head">
          <input placeholder="Buscar por nombre o identificación" value={filtro} onChange={(e) => setFiltro(e.target.value)} style={{ maxWidth: 360 }} aria-label="Buscar receptor" />
          <span className="small muted">{lista.length} registros</span>
        </div>
        {lista.length === 0 ? (
          <Vacio icono={<Users />} titulo="Sin receptores" />
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Nombre</th><th>Identificación</th><th>Correo</th><th>Actividad</th><th>Exoneración</th><th /></tr></thead>
              <tbody>
                {lista.map((r) => (
                  <tr key={r.id}>
                    <td>{r.nombre}</td>
                    <td className="nowrap">{r.identificacion ? `${descripcion(TIPO_IDENTIFICACION, r.identificacion.tipo)} · ${r.identificacion.numero}` : '—'}</td>
                    <td>{r.correo ?? '—'}</td>
                    <td className="mono">{r.actividadEconomica ?? '—'}</td>
                    <td>{r.exoneracion ? <span className="badge info">{r.exoneracion.numeroDocumento} · {r.exoneracion.tarifaExonerada}%</span> : '—'}</td>
                    <td className="nowrap right">
                      <button className="btn btn-ghost btn-icon" aria-label="Editar" onClick={() => setEditando(r)}><Pencil /></button>
                      <button className="btn btn-ghost btn-icon btn-danger" aria-label="Eliminar" onClick={() => eliminar(r)}><Trash2 /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {editando && <FormReceptor inicial={editando} onCerrar={() => setEditando(null)} />}
    </>
  );
}

function FormReceptor({ inicial, onCerrar }: { inicial: Receptor; onCerrar: () => void }) {
  const { emisor, backend, avisar } = useApp();
  const [r, setR] = useState<Receptor>(inicial);
  const set = (p: Partial<Receptor>) => setR((x) => ({ ...x, ...p }));
  const errores: string[] = [];
  if (r.nombre.trim().length < 3) errores.push('Nombre: mínimo 3 caracteres.');
  if (r.identificacion?.numero) {
    const e = validarIdentificacion(r.identificacion);
    if (e) errores.push(e);
  }
  if (r.correo && !REGEX_CORREO.test(r.correo)) errores.push('Correo con formato inválido.');
  if (r.exoneracion && (!r.exoneracion.numeroDocumento || !(r.exoneracion.tarifaExonerada > 0))) errores.push('Complete el número y la tarifa de la exoneración.');
  const extranjero = r.identificacion?.tipo === '05';

  const guardar = async () => {
    try {
      const datos: Receptor = { ...r, identificacion: r.identificacion?.numero ? r.identificacion : undefined };
      await backend.guardarReceptor(emisor!.id, datos);
      avisar('Receptor guardado.', 'ok');
      onCerrar();
    } catch (e) {
      avisar((e as Error).message, 'err');
    }
  };

  return (
    <Modal
      titulo={inicial.id ? 'Editar receptor' : 'Nuevo receptor'}
      onCerrar={onCerrar}
      pie={<><button className="btn" onClick={onCerrar}>Cancelar</button><button className="btn btn-primary" disabled={errores.length > 0} onClick={guardar}>Guardar</button></>}
    >
      <div className="stack">
        {errores.length > 0 && <Alerta tipo="warn">{errores.join(' ')}</Alerta>}
        <div className="grid grid-2">
          <Texto etiqueta="Nombre o razón social" valor={r.nombre} onCambio={(v) => set({ nombre: v })} requerido max={100} />
          <Texto etiqueta="Nombre comercial" valor={r.nombreComercial} onCambio={(v) => set({ nombreComercial: v || undefined })} max={80} />
          <Selector etiqueta="Tipo de identificación" valor={r.identificacion?.tipo} onCambio={(v) => set({ identificacion: { numero: r.identificacion?.numero ?? '', tipo: v } })} opciones={TIPO_IDENTIFICACION.slice(0, 5)} />
          <Texto etiqueta="Número" valor={r.identificacion?.numero} onCambio={(v) => set({ identificacion: { tipo: r.identificacion?.tipo ?? '01', numero: extranjero ? v.replace(/[^A-Za-z0-9]/g, '') : v.replace(/\D/g, '') } })} ayuda={extranjero ? 'Hasta 20 caracteres alfanuméricos.' : 'Sin guiones.'} />
          <Texto etiqueta="Correo electrónico" tipo="email" valor={r.correo} onCambio={(v) => set({ correo: v || undefined })} />
          <Texto etiqueta="Actividad económica del receptor" valor={r.actividadEconomica} onCambio={(v) => set({ actividadEconomica: v || undefined })} ayuda="Código CIIU 4 inscrito (p. ej. 4719.9). Requerido si el receptor lo pide para crédito o gasto." />
        </div>
        {extranjero ? (
          <Texto etiqueta="Otras señas en el extranjero" valor={r.otrasSenasExtranjero} onCambio={(v) => set({ otrasSenasExtranjero: v || undefined })} max={300} />
        ) : (
          <details>
            <summary className="small" style={{ cursor: 'pointer' }}>Ubicación (opcional en TE; condicional en FE)</summary>
            <div className="grid grid-3" style={{ marginTop: 8 }}>
              <Selector etiqueta="Provincia" valor={r.ubicacion?.provincia} vacio="—" onCambio={(v) => set({ ubicacion: v ? { canton: '01', distrito: '01', otrasSenas: '', ...r.ubicacion, provincia: v } : undefined })} opciones={PROVINCIA} />
              <Texto etiqueta="Cantón" valor={r.ubicacion?.canton} onCambio={(v) => r.ubicacion && set({ ubicacion: { ...r.ubicacion, canton: v.replace(/\D/g, '').slice(0, 2) } })} />
              <Texto etiqueta="Distrito" valor={r.ubicacion?.distrito} onCambio={(v) => r.ubicacion && set({ ubicacion: { ...r.ubicacion, distrito: v.replace(/\D/g, '').slice(0, 2) } })} />
              <div style={{ gridColumn: '1 / -1' }}>
                <Texto etiqueta="Otras señas" valor={r.ubicacion?.otrasSenas} onCambio={(v) => r.ubicacion && set({ ubicacion: { ...r.ubicacion, otrasSenas: v } })} max={160} />
              </div>
            </div>
          </details>
        )}
        <label className="check">
          <input type="checkbox" checked={!!r.exoneracion} onChange={(e) => set({ exoneracion: e.target.checked ? { tipoDocumento: '04', numeroDocumento: '', institucion: '01', fechaEmision: fechaEmisionCR(), tarifaExonerada: 13 } : undefined })} />
          El receptor goza de exoneración
        </label>
        {r.exoneracion && (
          <div className="grid grid-2 linea-card">
            <Selector etiqueta="Tipo de documento (nota 10.1)" valor={r.exoneracion.tipoDocumento} onCambio={(v) => set({ exoneracion: { ...r.exoneracion!, tipoDocumento: v } })} opciones={TIPO_EXONERACION.filter((t) => !t.soloAjustes)} />
            <Texto etiqueta="Número de documento" valor={r.exoneracion.numeroDocumento} onCambio={(v) => set({ exoneracion: { ...r.exoneracion!, numeroDocumento: v } })} ayuda="Autorizaciones de Hacienda: AL-XXXXXXXX-XX (verificables en GET /fe/ex)." />
            <Selector etiqueta="Institución (nota 23)" valor={r.exoneracion.institucion} onCambio={(v) => set({ exoneracion: { ...r.exoneracion!, institucion: v } })} opciones={INSTITUCION_EXONERACION} />
            <Texto etiqueta="Tarifa exonerada (%)" tipo="number" valor={r.exoneracion.tarifaExonerada} onCambio={(v) => set({ exoneracion: { ...r.exoneracion!, tarifaExonerada: Number(v) } })} />
            <Texto etiqueta="Fecha de emisión" tipo="datetime-local" valor={r.exoneracion.fechaEmision.slice(0, 16)} onCambio={(v) => set({ exoneracion: { ...r.exoneracion!, fechaEmision: `${v}:00-06:00` } })} />
            <Texto etiqueta="Artículo (códigos 02, 03, 08)" tipo="number" valor={r.exoneracion.articulo} onCambio={(v) => set({ exoneracion: { ...r.exoneracion!, articulo: v ? Number(v) : undefined } })} />
          </div>
        )}
      </div>
    </Modal>
  );
}
