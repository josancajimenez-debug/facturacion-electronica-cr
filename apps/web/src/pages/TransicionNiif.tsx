import {
  APENDICE_A,
  CAMBIOS_TERCERA_EDICION,
  EXCEPCIONES_35_9,
  EXENCIONES_35_10,
  SECCIONES_NIIF,
  conciliarPatrimonio,
  fechasTransicion,
  revisarTransicion,
  type AjusteTransicion,
  type ConfigTransicion,
  type ModoTransicion,
  type NaturalezaAjuste,
} from '@fe-cr/core';
import { Plus, Save, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Alerta, Selector, Texto } from '../components/ui';
import { useApp } from '../estado';
import { useContabilidad } from '../lib/contabilidad';
import { dinero, fecha as fechaCR } from '../lib/formato';

const NATURALEZA_CAMBIO = { sustancial: ['err', 'Sustancial'], aclaracion: ['warn', 'Aclaración'], redaccion: ['', 'Redacción'], 'sin cambios': ['', 'Sin cambios'] } as const;
const NATURALEZA_AJUSTE: { codigo: NaturalezaAjuste; descripcion: string }[] = [
  { codigo: 'reconocimiento', descripcion: 'Reconocimiento' },
  { codigo: 'baja', descripcion: 'Baja en cuentas' },
  { codigo: 'reclasificacion', descripcion: 'Reclasificación' },
  { codigo: 'medicion', descripcion: 'Medición' },
];
const ajusteVacio = (n: number): AjusteTransicion => ({ ref: `A-${String(n).padStart(2, '0')}`, concepto: '', seccion: 2, naturaleza: 'medicion', efecto: 0 });

/**
 * Transición a la NIIF para las PYMES, tercera edición: primera adopción (Sección 35) o cambio desde la
 * segunda edición (Apéndice A). Metodología inspirada en la guía AIC-CILEA, con el contenido normativo
 * verificado contra el texto oficial de la Norma.
 */
export function TransicionNiif() {
  const { avisar } = useApp();
  const { config, guardarConfig } = useContabilidad();
  const [t, setT] = useState<ConfigTransicion>(() => config.transicion ?? { modo: 'primera-adopcion', primerEjercicio: 2027, granContribuyente: config.politicas.granContribuyenteNacional });
  const set = (p: Partial<ConfigTransicion>) => setT((x) => ({ ...x, ...p }));
  const f = fechasTransicion(t.modo, t.primerEjercicio);
  const avisos = revisarTransicion(t);
  const ajustes = t.ajustes ?? [];
  const conc = conciliarPatrimonio(t.patrimonioAnterior ?? 0, ajustes);
  const primera = t.modo === 'primera-adopcion';
  const setAjuste = (i: number, p: Partial<AjusteTransicion>) => set({ ajustes: ajustes.map((a, j) => (j === i ? { ...a, ...p } : a)) });
  const setBrecha = (s: number, p: NonNullable<ConfigTransicion['brechas']>[number]) => set({ brechas: { ...t.brechas, [s]: { ...t.brechas?.[s], ...p } } });

  const guardar = () => {
    if (guardarConfig({ ...config, transicion: t })) avisar('Plan de transición guardado.', 'ok');
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Transición a la NIIF para las PYMES</h1>
          <p>Tercera edición (IASB, febrero de 2025), obligatoria para los periodos que comienzan a partir del 1/01/2027.</p>
        </div>
        <button className="btn btn-primary" onClick={guardar}><Save /> Guardar</button>
      </div>

      <div className="card">
        <div className="card-head"><h2>1. Clasificación y camino de transición</h2></div>
        <div className="card-body stack">
          <div className="grid grid-3">
            <Selector etiqueta="Situación de la entidad" valor={t.modo} mostrarCodigo={false} onCambio={(v) => set({ modo: v as ModoTransicion })}
              opciones={[
                { codigo: 'primera-adopcion', descripcion: 'Adopta la NIIF para las PYMES por primera vez (Sección 35)' },
                { codigo: 'cambio-edicion', descripcion: 'Ya aplicaba la segunda edición (Apéndice A)' },
              ]} />
            <Texto etiqueta="Primer ejercicio bajo la tercera edición" tipo="number" valor={t.primerEjercicio} onCambio={(v) => set({ primerEjercicio: Number(v) || 2027 })} ayuda="Ejercicio anual de enero a diciembre." />
            <div className="stack" style={{ gap: 6 }}>
              <label className="check"><input type="checkbox" checked={!!t.obligacionPublica} onChange={(e) => set({ obligacionPublica: e.target.checked })} /> Tiene obligación pública de rendir cuentas</label>
              <label className="check"><input type="checkbox" checked={!!t.granContribuyente} onChange={(e) => set({ granContribuyente: e.target.checked })} /> Gran Contribuyente Nacional</label>
            </div>
          </div>
          <div className="grid grid-3">
            <div><span className="small muted">{primera ? 'Fecha de transición (estado de situación financiera de apertura)' : 'Fecha de aplicación inicial'}</span><div><strong>{fechaCR(f.fechaClave)}</strong></div></div>
            <div><span className="small muted">Periodo comparativo</span><div><strong>{fechaCR(f.inicioComparativo)} – {fechaCR(`${t.primerEjercicio - 1}-12-31`)}</strong></div></div>
            <div><span className="small muted">Cierre del primer ejercicio</span><div><strong>{fechaCR(f.cierrePrimerEjercicio)}</strong> {f.anticipada && <span className="badge info">Aplicación anticipada: revelarla</span>}</div></div>
          </div>
          {primera ? (
            <Alerta tipo="info">Viene de otro marco (PCGA locales, base fiscal, caja): en la fecha de transición reconozca, dé de baja, reclasifique y mida todo según la Norma, con el efecto en ganancias acumuladas (35.7). Registre ese estado de situación en el <Link to="/contabilidad/apertura">Balance de apertura</Link> y concilie el patrimonio abajo (35.13).</Alerta>
          ) : (
            <Alerta tipo="info">Ya aplicaba la segunda edición: no use la Sección 35. Aplique la tercera edición de forma retroactiva según la Sección 10, con los tratamientos del Apéndice A (varios son prospectivos), y revele lo exigido por el párrafo 10.13.</Alerta>
          )}
          {avisos.length > 0 && (
            <ul className="lista-errores">
              {avisos.map((a) => <li key={a.mensaje}><span className={`badge ${a.nivel === 'error' ? 'err' : 'warn'}`}>{a.nivel === 'error' ? 'Error' : 'Advertencia'}</span> {a.mensaje} <span className="small muted">({a.fuente})</span></li>)}
            </ul>
          )}
        </div>
      </div>

      {primera ? (
        <div className="grid grid-2">
          <div className="card">
            <div className="card-head"><h2>2. Excepciones obligatorias (35.9)</h2></div>
            <div className="card-body stack">
              <p className="small muted" style={{ margin: 0 }}>No se pueden aplicar de forma retroactiva.</p>
              {EXCEPCIONES_35_9.map((e) => <div key={e.codigo}><strong>{e.parrafo} {e.titulo}.</strong> <span className="small">{e.detalle}</span></div>)}
            </div>
          </div>
          <div className="card">
            <div className="card-head"><h2>3. Exenciones optativas (35.10)</h2></div>
            <div className="card-body stack">
              <p className="small muted" style={{ margin: 0 }}>Se deciden partida por partida y se documentan.</p>
              {EXENCIONES_35_10.map((e) => {
                const d = t.exenciones?.[e.codigo];
                return (
                  <div key={e.codigo} className="stack" style={{ gap: 4 }}>
                    <label className="check"><input type="checkbox" checked={!!d?.aplica} onChange={(ev) => set({ exenciones: { ...t.exenciones, [e.codigo]: { ...d, aplica: ev.target.checked } } })} /> <strong>{e.parrafo} {e.titulo}</strong></label>
                    <span className="small muted">{e.detalle}</span>
                    {d?.aplica && <Texto etiqueta="Justificación y efecto" valor={d.justificacion} onCambio={(v) => set({ exenciones: { ...t.exenciones, [e.codigo]: { aplica: true, justificacion: v } } })} />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-head"><h2>2. Tratamientos del Apéndice A</h2></div>
          <div className="card-body stack">
            <Selector etiqueta="Sección 23: aplicación de la sección revisada (A27)" valor={t.seccion23 ?? 'retroactiva'} mostrarCodigo={false} onCambio={(v) => set({ seccion23: v as 'retroactiva' | 'prospectiva' })}
              opciones={[{ codigo: 'retroactiva', descripcion: 'Retroactiva (Sección 10, exenciones del A28)' }, { codigo: 'prospectiva', descripcion: 'Prospectiva: contratos que comiencen después de la fecha de aplicación inicial' }]} />
            <div className="table-wrap">
              <table>
                <thead><tr><th>Sección</th><th>Tema</th><th>Tratamiento</th><th>Detalle</th></tr></thead>
                <tbody>{APENDICE_A.map((a) => <tr key={a.tema}><td className="mono">{a.seccion}</td><td>{a.tema}</td><td><span className={`badge ${a.tratamiento === 'prospectivo' ? 'info' : a.tratamiento === 'retroactivo' ? 'warn' : ''}`}>{a.tratamiento}</span></td><td className="small">{a.detalle}</td></tr>)}</tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-head"><h2>{primera ? '4' : '3'}. Matriz de brechas por sección</h2></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Sección</th><th>Cambio en la tercera edición</th><th>¿Aplica?</th><th>¿Brecha?</th><th>Prioridad</th></tr></thead>
            <tbody>
              {Object.entries(SECCIONES_NIIF).map(([n, nombre]) => {
                const s = Number(n);
                const c = CAMBIOS_TERCERA_EDICION[s];
                const b = t.brechas?.[s];
                return (
                  <tr key={n}>
                    <td><span className="mono">{n}</span> {nombre}</td>
                    <td className="small"><span className={`badge ${NATURALEZA_CAMBIO[c.naturaleza][0]}`}>{NATURALEZA_CAMBIO[c.naturaleza][1]}</span> {c.resumen}</td>
                    <td><input type="checkbox" aria-label={`Sección ${n} aplica`} checked={!!b?.aplica} onChange={(e) => setBrecha(s, { aplica: e.target.checked })} /></td>
                    <td><input type="checkbox" aria-label={`Sección ${n} con brecha`} checked={!!b?.brecha} onChange={(e) => setBrecha(s, { brecha: e.target.checked })} /></td>
                    <td>
                      <select aria-label={`Prioridad de la sección ${n}`} value={b?.prioridad ?? ''} onChange={(e) => setBrecha(s, { prioridad: (e.target.value || undefined) as 'alta' | 'media' | 'baja' | undefined })}>
                        <option value="">—</option><option value="alta">Alta</option><option value="media">Media</option><option value="baja">Baja</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h2>{primera ? '5. Conciliación del patrimonio (35.13)' : '4. Ajustes de la aplicación inicial (10.13)'}</h2>
          <button className="btn btn-sm" onClick={() => set({ ajustes: [...ajustes, ajusteVacio(ajustes.length + 1)] })}><Plus /> Ajuste</button>
        </div>
        <div className="card-body stack">
          <div style={{ maxWidth: 320 }}>
            <Texto etiqueta={primera ? 'Patrimonio según el marco anterior' : 'Patrimonio según la segunda edición'} tipo="number" valor={t.patrimonioAnterior} onCambio={(v) => set({ patrimonioAnterior: v === '' ? undefined : Number(v) })} />
          </div>
          {ajustes.map((a, i) => (
            <div key={i} className="row" style={{ alignItems: 'flex-end' }}>
              <div style={{ width: 80 }}><Texto etiqueta="Ref." valor={a.ref} onCambio={(v) => setAjuste(i, { ref: v })} /></div>
              <div style={{ flex: 1, minWidth: 200 }}><Texto etiqueta="Concepto" valor={a.concepto} onCambio={(v) => setAjuste(i, { concepto: v })} /></div>
              <div style={{ width: 90 }}><Texto etiqueta="Sección" tipo="number" valor={a.seccion} onCambio={(v) => setAjuste(i, { seccion: Number(v) || 0 })} /></div>
              <div style={{ width: 160 }}><Selector etiqueta="Naturaleza" valor={a.naturaleza} mostrarCodigo={false} onCambio={(v) => setAjuste(i, { naturaleza: v as NaturalezaAjuste })} opciones={NATURALEZA_AJUSTE} /></div>
              <div style={{ width: 150 }}><Texto etiqueta="Efecto en patrimonio" tipo="number" valor={a.efecto} onCambio={(v) => setAjuste(i, { efecto: Number(v) || 0 })} /></div>
              <label className="check" style={{ marginBottom: 8 }} title="Vidas útiles, valores residuales, porcentajes de incobrables"><input type="checkbox" checked={!!a.cambioEstimacion} onChange={(e) => setAjuste(i, { cambioEstimacion: e.target.checked })} /> Cambia una estimación</label>
              <button className="btn btn-ghost btn-icon btn-danger" aria-label={`Quitar ajuste ${a.ref}`} onClick={() => set({ ajustes: ajustes.filter((_, j) => j !== i) })}><Trash2 /></button>
            </div>
          ))}
          <div className="table-wrap">
            <table>
              <tbody>
                <tr><td>{primera ? 'Patrimonio según el marco anterior' : 'Patrimonio según la segunda edición'}</td><td className="right mono">{dinero(t.patrimonioAnterior ?? 0)}</td></tr>
                <tr><td>Total de ajustes</td><td className="right mono">{dinero(conc.totalAjustes)}</td></tr>
                <tr><td><strong>Patrimonio según la NIIF para las PYMES, tercera edición</strong></td><td className="right mono"><strong>{dinero(conc.patrimonioNiif)}</strong></td></tr>
              </tbody>
            </table>
          </div>
          {primera && <p className="small muted" style={{ margin: 0 }}>La Sección 35 también exige conciliar el patrimonio al cierre del último periodo del marco anterior y el resultado de ese periodo (35.13(b)(ii) y (c)), y explicar cada ajuste material.</p>}
        </div>
      </div>
    </>
  );
}
