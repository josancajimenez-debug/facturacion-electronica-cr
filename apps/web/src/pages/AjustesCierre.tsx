import { CUENTAS_IMPUTABLES, VIDA_UTIL_SUGERIDA, cuenta, parametrosPredeterminados, type Asiento, type ConfigCierre, type LineaManual } from '@fe-cr/core';
import { Lock, LockOpen, Plus, Trash2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { EncabezadoAsiento, TablaAsiento } from '../components/Asiento';
import { Alerta, Cargando, Texto } from '../components/ui';
import { useApp } from '../estado';
import { useContabilidad } from '../lib/contabilidad';
import { dinero, hoyCR } from '../lib/formato';

const lineaVacia = (): LineaManual => ({ cuenta: '', debe: 0, haber: 0 });

function ListaAsientos({ asientos, vacio, accion }: { asientos: Asiento[]; vacio: string; accion?: (a: Asiento, i: number) => ReactNode }) {
  if (!asientos.length) return <p className="small muted" style={{ margin: 0 }}>{vacio}</p>;
  return (
    <>
      {asientos.map((a, i) => (
        <div key={`${a.glosa}-${i}`} className="linea-card stack" style={{ gap: 8 }}>
          <div className="row" style={{ alignItems: 'flex-start' }}>
            {a.numero ? <EncabezadoAsiento asiento={a} /> : <div style={{ flex: 1 }}><strong>Propuesto</strong> <span className="small muted">· {a.glosa}</span></div>}
            {accion?.(a, i)}
          </div>
          <TablaAsiento asiento={a} />
        </div>
      ))}
    </>
  );
}

export function AjustesCierre() {
  const { emisor, avisar } = useApp();
  const { libro, config, guardarConfig } = useContabilidad();
  const [anio, setAnio] = useState(() => hoyCR().slice(0, 4));
  const [glosa, setGlosa] = useState('');
  const [fechaAjuste, setFechaAjuste] = useState('');
  const [lineas, setLineas] = useState<LineaManual[]>([lineaVacia(), lineaVacia()]);

  if (!libro || !emisor) return <Cargando />;
  const c = config.cierres?.[anio];
  const detalle = libro.cierres[anio];
  const anios = [...new Set([...libro.asientos.map((a) => a.fecha.slice(0, 4)), hoyCR().slice(0, 4), ...Object.keys(config.cierres ?? {})])].sort().reverse();
  const guardar = (cambio: Partial<ConfigCierre>) => !!c && guardarConfig({ ...config, cierres: { ...config.cierres, [anio]: { ...c, ...cambio } } });
  const preparar = () =>
    guardarConfig({ ...config, cierres: { ...config.cierres, [anio]: { ajustesAutomaticos: false, cerrado: false, manuales: [], parametros: parametrosPredeterminados(emisor.identificacion.tipo) } } });
  const bloqueado = !!c?.cerrado;

  const totalDebe = lineas.reduce((t, l) => t + (l.debe || 0), 0);
  const totalHaber = lineas.reduce((t, l) => t + (l.haber || 0), 0);
  const fecha = fechaAjuste || `${anio}-12-31`;
  const erroresManual = [
    !glosa.trim() && 'Escriba la descripción del ajuste.',
    !fecha.startsWith(`${anio}-`) && `La fecha debe estar dentro del periodo ${anio}.`,
    lineas.some((l) => (l.debe || l.haber) && !l.cuenta) && 'Elija la cuenta de cada línea con monto.',
    lineas.some((l) => l.debe && l.haber) && 'Cada línea va al debe o al haber, no a ambos.',
    totalDebe <= 0 && 'Registre los montos del asiento.',
    Math.abs(totalDebe - totalHaber) >= 0.005 && `El asiento no cuadra: debe ${dinero(totalDebe)} y haber ${dinero(totalHaber)}.`,
  ].filter((x): x is string => !!x);
  const cambiarLinea = (i: number, l: Partial<LineaManual>) => setLineas(lineas.map((x, j) => (j === i ? { ...x, ...l } : x)));
  const registrarManual = () => {
    // Si no se pudo guardar se conserva lo digitado para reintentar.
    if (!guardar({ manuales: [...(c?.manuales ?? []), { id: crypto.randomUUID(), fecha, glosa: glosa.trim(), lineas: lineas.filter((l) => l.cuenta && (l.debe || l.haber)) }] })) return;
    setGlosa('');
    setLineas([lineaVacia(), lineaVacia()]);
    avisar('Asiento de ajuste registrado en el libro diario.', 'ok');
  };

  const p = c?.parametros;
  const cambiarParametro = (cambio: Partial<ConfigCierre['parametros']>) => p && guardar({ parametros: { ...p, ...cambio } });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Asientos de ajuste y de cierre</h1>
          <p>Antes de emitir los estados financieros: ajustes por devengo y valuación de cada cuenta, y cierre del periodo fiscal (enero a diciembre).</p>
        </div>
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <div className="field" style={{ width: 140 }}>
            <label htmlFor="anio-cierre">Periodo fiscal</label>
            <select id="anio-cierre" value={anio} onChange={(e) => { setAnio(e.target.value); setFechaAjuste(''); }}>
              {anios.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <Link className="btn" to="/contabilidad/estados-financieros">Ver estados financieros</Link>
        </div>
      </div>

      <ol className="small muted" style={{ margin: '0 0 16px', paddingLeft: 18 }}>
        <li>Registre los <strong>ajustes manuales</strong> que correspondan a cada cuenta (devengos, pagos anticipados, reclasificaciones).</li>
        <li>Revise y registre los <strong>ajustes automáticos</strong>: depreciación, deterioro de cuentas por cobrar e impuesto sobre la renta.</li>
        <li>Registre los <strong>asientos de cierre</strong> al 31 de diciembre. Después consulte los estados financieros.</li>
      </ol>

      {!c || !detalle ? (
        <div className="card">
          <div className="card-body stack">
            <p style={{ margin: 0 }}>Todavía no se ha preparado el cierre del periodo {anio}.</p>
            <div><button className="btn btn-primary" onClick={preparar}>Preparar ajustes y cierre de {anio}</button></div>
          </div>
        </div>
      ) : (
        <div className="stack">
          {bloqueado && <Alerta tipo="info">El periodo {anio} está cerrado. Para modificar los ajustes, primero reábralo.</Alerta>}

          <div className="card">
            <div className="card-head"><h2>1. Ajustes manuales por cuenta</h2><span className="small muted">{c.manuales.length} registrados</span></div>
            <div className="card-body stack">
              <ListaAsientos asientos={detalle.manuales} vacio="Sin ajustes manuales en este periodo."
                accion={(_, i) => !bloqueado && (
                  <button className="btn btn-ghost btn-icon btn-danger" aria-label="Eliminar ajuste" onClick={() => guardar({ manuales: c.manuales.filter((_, j) => j !== i) })}><Trash2 /></button>
                )} />
              {!bloqueado && (
                <div className="linea-card stack">
                  <strong>Nuevo asiento de ajuste</strong>
                  <p className="small muted" style={{ margin: 0 }}>
                    Ejemplos: seguro devengado (debe 6.1.01.13 Seguros / haber 1.1.05.01 Pagos anticipados); gasto devengado sin factura (debe la cuenta de gasto / haber 2.1.03.02 Gastos acumulados por pagar); IVA soportado no acreditable que pasa al gasto.
                  </p>
                  <div className="grid grid-2">
                    <Texto etiqueta="Descripción" valor={glosa} onCambio={setGlosa} requerido max={150} />
                    <Texto etiqueta="Fecha" tipo="date" valor={fecha} onCambio={setFechaAjuste} />
                  </div>
                  <div className="table-wrap">
                    <table className="tabla-editable">
                      <thead><tr><th>Cuenta</th><th className="right" style={{ width: 160 }}>Debe</th><th className="right" style={{ width: 160 }}>Haber</th><th /></tr></thead>
                      <tbody>
                        {lineas.map((l, i) => (
                          <tr key={i}>
                            <td>
                              <select aria-label={`Cuenta de la línea ${i + 1}`} value={l.cuenta} onChange={(e) => cambiarLinea(i, { cuenta: e.target.value })} style={{ width: '100%' }}>
                                <option value="">Elija la cuenta…</option>
                                {CUENTAS_IMPUTABLES.map((x) => <option key={x.codigo} value={x.codigo}>{x.codigo} – {x.nombre}</option>)}
                              </select>
                            </td>
                            <td><input aria-label={`Debe de la línea ${i + 1}`} type="number" min={0} step="0.01" value={l.debe || ''} onChange={(e) => cambiarLinea(i, { debe: Number(e.target.value) || 0 })} /></td>
                            <td><input aria-label={`Haber de la línea ${i + 1}`} type="number" min={0} step="0.01" value={l.haber || ''} onChange={(e) => cambiarLinea(i, { haber: Number(e.target.value) || 0 })} /></td>
                            <td>{lineas.length > 2 && <button className="btn btn-ghost btn-icon btn-danger" aria-label={`Quitar línea ${i + 1}`} onClick={() => setLineas(lineas.filter((_, j) => j !== i))}><Trash2 /></button>}</td>
                          </tr>
                        ))}
                        <tr><th>Totales</th><th className="num">{dinero(totalDebe)}</th><th className="num">{dinero(totalHaber)}</th><th /></tr>
                      </tbody>
                    </table>
                  </div>
                  {erroresManual.length > 0 && (glosa || totalDebe > 0) && <Alerta tipo="warn">{erroresManual.join(' ')}</Alerta>}
                  <div className="row">
                    <button className="btn" onClick={() => setLineas([...lineas, lineaVacia()])}><Plus /> Agregar línea</button>
                    <button className="btn btn-primary" disabled={erroresManual.length > 0} onClick={registrarManual}>Registrar ajuste</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {p && (
            <div className="card">
              <div className="card-head">
                <h2>2. Ajustes automáticos</h2>
                <span className={`badge ${c.ajustesAutomaticos ? 'ok' : 'warn'}`}>{c.ajustesAutomaticos ? 'Registrados' : 'Sin registrar'}</span>
              </div>
              <div className="card-body stack">
                <div className="grid grid-3">
                  {Object.keys(VIDA_UTIL_SUGERIDA).map((k) => (
                    <Texto key={k} etiqueta={`Vida útil (años): ${cuenta(k).nombre}`} tipo="number" valor={p.vidaUtil[k] ?? ''} deshabilitado={bloqueado}
                      onCambio={(v) => cambiarParametro({ vidaUtil: { ...p.vidaUtil, [k]: Number(v) || 0 } })} />
                  ))}
                  <Texto etiqueta="Deterioro de cuentas por cobrar (% de la cartera)" tipo="number" valor={p.porcentajeIncobrables} deshabilitado={bloqueado}
                    onCambio={(v) => cambiarParametro({ porcentajeIncobrables: Number(v) || 0 })} ayuda="Sección 11 (2025): solo pérdidas ya incurridas con evidencia objetiva (mora, dificultades financieras del cliente), evaluadas en grupo por riesgo crediticio similar; no pérdidas esperadas futuras. 0 = sin deterioro." />
                  <Texto etiqueta="Tasa del impuesto sobre la renta (%)" tipo="number" valor={p.tasaRenta} deshabilitado={bloqueado}
                    onCambio={(v) => cambiarParametro({ tasaRenta: Number(v) || 0 })}
                    ayuda="Sociedades: 30 % (tarifa general). Personas físicas con actividad lucrativa y pequeñas empresas tributan por tramos: indique la tasa efectiva o registre el impuesto como ajuste manual." />
                </div>
                <p className="small muted" style={{ margin: 0 }}>
                  Depreciación por línea recta sobre el costo, desde el mes de adquisición; la vida útil sugerida es solo un punto de partida para su política contable (Sección 17).
                </p>
                <ListaAsientos asientos={detalle.automaticos} vacio="Con los saldos actuales no hay ajustes automáticos que proponer." />
                {!bloqueado && detalle.automaticos.length > 0 && (
                  <div>
                    <button className={`btn ${c.ajustesAutomaticos ? '' : 'btn-primary'}`} onClick={() => guardar({ ajustesAutomaticos: !c.ajustesAutomaticos })}>
                      {c.ajustesAutomaticos ? 'Quitar del libro diario' : 'Registrar en el libro diario'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {p && (
            <div className="card">
              <div className="card-head">
                <h2>3. Asientos de cierre al 31/12/{anio}</h2>
                <span className={`badge ${c.cerrado ? 'ok' : 'warn'}`}>{c.cerrado ? 'Periodo cerrado' : 'Periodo abierto'}</span>
              </div>
              <div className="card-body stack">
                <label className="check">
                  <input type="checkbox" checked={p.reservaLegal} disabled={bloqueado} onChange={(e) => cambiarParametro({ reservaLegal: e.target.checked })} />
                  Asignar la reserva legal: 5 % de la utilidad neta hasta alcanzar el 20 % del capital social (Código de Comercio, art. 143; aplica a sociedades).
                </label>
                {!c.ajustesAutomaticos && detalle.automaticos.length > 0 && !bloqueado && (
                  <Alerta tipo="warn">Los ajustes automáticos propuestos aún no están registrados: el cierre se calcula sin ellos.</Alerta>
                )}
                <ListaAsientos asientos={detalle.cierre} vacio="No hay saldos de ingresos, costos ni gastos que cerrar en este periodo." />
                {detalle.cierre.length > 0 && (
                  <div>
                    {c.cerrado ? (
                      <button className="btn" onClick={() => guardar({ cerrado: false })}><LockOpen /> Reabrir el periodo {anio}</button>
                    ) : (
                      <button className="btn btn-primary" onClick={() => { if (guardar({ cerrado: true })) avisar(`Periodo ${anio} cerrado. Los resultados pasaron a utilidades acumuladas.`, 'ok'); }}>
                        <Lock /> Registrar el cierre de {anio}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
