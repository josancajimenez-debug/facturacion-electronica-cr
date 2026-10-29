import { CATALOGO_CUENTAS, CUENTAS_BALANCE, esCabysServicio, nivelCuenta, leerBalanceCsv, totalesApertura, validarApertura, type AperturaContable, type ExistenciaInicial, type SaldoApertura } from '@fe-cr/core';
import { Download, Paperclip, Plus, Save, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alerta, Texto } from '../components/ui';
import { useApp } from '../estado';
import { useContabilidad } from '../lib/contabilidad';
import { csv, descargar, dinero } from '../lib/formato';

type Modo = 'capital' | 'saldos';

type Montos = Record<string, { debe: number; haber: number }>;

/** Catálogo de balance completo (clases, grupos, cuentas y subcuentas) en el orden del plan de cuentas. */
const CATALOGO_BALANCE = CATALOGO_CUENTAS.filter((c) => /^[123](.|$)/.test(c.codigo));

const porCuenta = (saldos: SaldoApertura[] = []): Montos => Object.fromEntries(saldos.map((s) => [s.cuenta, { debe: s.debe, haber: s.haber }]));
const existenciaVacia = (): ExistenciaInicial => ({ cabys: '', detalle: '', cantidad: 0, costo: 0 });
const num = (v: string) => Number(v) || 0;

export function BalanceApertura() {
  const { avisar, productos } = useApp();
  const { config, guardarConfig } = useContabilidad();
  const inicial = config.apertura;
  const [modo, setModo] = useState<Modo>(inicial?.saldos?.length ? 'saldos' : 'capital');
  const [fecha, setFecha] = useState(inicial?.fecha ?? '');
  const [capital, setCapital] = useState(inicial?.capital ?? 0);
  const [montos, setMontos] = useState<Montos>(() => porCuenta(inicial?.saldos));
  const [soloConSaldo, setSoloConSaldo] = useState(false);
  const [existencias, setExistencias] = useState<ExistenciaInicial[]>(inicial?.existencias ?? []);
  const [archivo, setArchivo] = useState(inicial?.archivo);
  const [pegado, setPegado] = useState('');
  const [erroresArchivo, setErroresArchivo] = useState<string[]>([]);
  const archivoRef = useRef<HTMLInputElement>(null);

  // Solo se guardan las subcuentas con monto, en el orden del catálogo.
  const conMonto: SaldoApertura[] = CUENTAS_BALANCE
    .map((c) => ({ cuenta: c.codigo, debe: montos[c.codigo]?.debe ?? 0, haber: montos[c.codigo]?.haber ?? 0 }))
    .filter((s) => s.debe || s.haber);
  /** Saldo de una cuenta o grupo con el signo de su naturaleza (suma de sus subcuentas). */
  const saldoDe = (codigo: string, naturaleza: 'deudora' | 'acreedora') => {
    const neto = conMonto.filter((s) => s.cuenta === codigo || s.cuenta.startsWith(`${codigo}.`)).reduce((t, s) => t + s.debe - s.haber, 0);
    return naturaleza === 'deudora' ? neto : -neto;
  };
  const borrador: AperturaContable = modo === 'capital'
    ? { fecha, capital }
    : { fecha, saldos: conMonto, existencias: existencias.filter((e) => e.cabys || e.cantidad || e.costo), archivo };
  const errores = validarApertura(borrador);
  const conDatos = !!fecha || capital > 0 || conMonto.length > 0;
  const t = totalesApertura(conMonto);
  const inventario = conMonto.find((s) => s.cuenta === '1.1.03.01');

  const importar = (texto: string, nombre?: string) => {
    const r = leerBalanceCsv(texto);
    setErroresArchivo(r.errores);
    if (!r.saldos.length) return avisar('No se cargaron saldos: revise el formato del archivo.', 'err');
    setMontos(porCuenta(r.saldos));
    setArchivo(nombre);
    setModo('saldos');
    avisar(`Se cargaron ${r.saldos.length} saldos${nombre ? ` de ${nombre}` : ''}. Revíselos y guarde.`, r.errores.length ? 'info' : 'ok');
  };
  const leerArchivo = async (f?: File) => {
    if (!f) return;
    if (/\.xlsx?$/i.test(f.name)) return avisar('Guarde la hoja de Excel como «CSV (delimitado por comas)» o copie las celdas y péguelas abajo.', 'err');
    importar(await f.text(), f.name);
  };
  const plantilla = () =>
    descargar('plantilla-balance-apertura.csv', csv([['Código', 'Cuenta', 'Debe', 'Haber'], ...CUENTAS_BALANCE.map((c) => [c.codigo, c.nombre, '', ''])]), 'text/csv');

  const cambiarMonto = (codigo: string, lado: 'debe' | 'haber', valor: number) =>
    setMontos((m) => ({ ...m, [codigo]: { ...(m[codigo] ?? { debe: 0, haber: 0 }), [lado]: valor } }));
  const cambiarExistencia = (i: number, e: Partial<ExistenciaInicial>) => setExistencias(existencias.map((x, j) => (j === i ? { ...x, ...e } : x)));
  const elegirProducto = (i: number, cabys: string) => {
    const p = productos.find((x) => x.codigoCabys === cabys);
    cambiarExistencia(i, { cabys, detalle: p?.descripcion ?? '' });
  };
  const mercaderia = productos.filter((p) => !esCabysServicio(p.codigoCabys));

  const guardar = () => {
    if (errores.length) return avisar(errores[0], 'err');
    if (guardarConfig({ ...config, apertura: borrador })) avisar('Balance de apertura guardado. Los libros se recalcularon.', 'ok');
  };
  const quitar = () => {
    if (!guardarConfig({ ...config, apertura: undefined })) return;
    setFecha('');
    setCapital(0);
    setMontos({});
    setExistencias([]);
    setArchivo(undefined);
    avisar('Se quitó el asiento de apertura.', 'ok');
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Balance de apertura</h1>
          <p>Primer asiento del libro diario y del libro de inventarios y balances (Código de Comercio, art. 255): el aporte inicial de una empresa nueva o los saldos del último balance de una empresa en marcha.</p>
        </div>
        <Link className="btn" to="/contabilidad/diario">Ver libro diario</Link>
      </div>

      <div className="stack">
        <div className="card">
          <div className="card-head"><h2>1. Tipo de apertura</h2>{inicial && <span className="badge ok">Registrada al {inicial.fecha}</span>}</div>
          <div className="card-body stack">
            <div className="row">
              <label className="check"><input type="radio" name="modo" checked={modo === 'capital'} onChange={() => setModo('capital')} /> Inicio de operaciones: aporte de capital en efectivo</label>
              <label className="check"><input type="radio" name="modo" checked={modo === 'saldos'} onChange={() => setModo('saldos')} /> Empresa en marcha: saldos del balance anterior</label>
            </div>
            <div className="grid grid-2">
              <Texto etiqueta="Fecha de apertura" tipo="date" valor={fecha} onCambio={setFecha} requerido
                ayuda={modo === 'saldos' ? 'Normalmente el 1 de enero, con los saldos de cierre al 31 de diciembre anterior.' : undefined} />
              {modo === 'capital' && (
                <Texto etiqueta="Capital aportado en efectivo (₡)" tipo="number" valor={capital || ''} onCambio={(v) => setCapital(num(v))}
                  ayuda="Bancos contra Capital social pagado." />
              )}
            </div>
          </div>
        </div>

        {modo === 'saldos' && (
          <>
            <div className="card">
              <div className="card-head"><h2>2. Anexar el balance</h2>{archivo && <span className="small muted"><Paperclip size={14} /> {archivo}</span>}</div>
              <div className="card-body stack">
                <p className="small muted" style={{ margin: 0 }}>
                  Archivo CSV (coma, punto y coma o tabulador) con el <strong>código de la cuenta</strong> del catálogo en la primera columna, el nombre (opcional) y el <strong>debe</strong> y el <strong>haber</strong>,
                  o un único <strong>saldo</strong> (positivo deudor, negativo acreedor). Los encabezados, los subtotales de grupo y las filas de totales se omiten. Desde Excel: «Guardar como → CSV» o copie las celdas y péguelas.
                </p>
                <div className="row">
                  <button className="btn btn-primary" onClick={() => archivoRef.current?.click()}><Paperclip /> Anexar archivo CSV</button>
                  <input ref={archivoRef} type="file" accept=".csv,.txt,.tsv,text/csv,text/plain,.xlsx,.xls" hidden aria-hidden onChange={(e) => { void leerArchivo(e.target.files?.[0]); e.target.value = ''; }} />
                  <button className="btn" onClick={plantilla}><Download /> Descargar plantilla</button>
                </div>
                <div className="field">
                  <label htmlFor="pegar-balance">O pegue aquí las celdas copiadas de Excel</label>
                  <textarea id="pegar-balance" value={pegado} onChange={(e) => setPegado(e.target.value)} placeholder={'1.1.01.02\tBancos\t1500000\t\n3.1.01.01\tCapital social pagado\t\t1500000'} />
                </div>
                <div><button className="btn" disabled={!pegado.trim()} onClick={() => { importar(pegado, 'datos pegados'); setPegado(''); }}>Cargar lo pegado</button></div>
                {erroresArchivo.length > 0 && <Alerta tipo="warn">Líneas no cargadas: {erroresArchivo.join(' ')}</Alerta>}
              </div>
            </div>

            <div className="card">
              <div className="card-head">
                <h2>3. Saldos por cuenta del catálogo</h2>
                <span className={`badge ${t.cuadra && t.debe > 0 ? 'ok' : 'warn'}`}>{t.cuadra && t.debe > 0 ? 'Cuadrado' : `Diferencia ${dinero(t.debe - t.haber)}`}</span>
              </div>
              <div className="card-body stack">
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <span className="small muted">
                    {CUENTAS_BALANCE.length} subcuentas de activo, pasivo y patrimonio · {conMonto.length} con saldo. Digite el saldo en la columna de su naturaleza.
                  </span>
                  <label className="check small">
                    <input type="checkbox" checked={soloConSaldo} onChange={(e) => setSoloConSaldo(e.target.checked)} /> Mostrar solo las cuentas con saldo
                  </label>
                </div>
                <div className="table-wrap">
                  <table className="tabla-editable">
                    <thead><tr><th style={{ width: 110 }}>Código</th><th>Cuenta</th><th className="right" style={{ width: 170 }}>Debe</th><th className="right" style={{ width: 170 }}>Haber</th></tr></thead>
                    <tbody>
                      {CATALOGO_BALANCE.map((c) => {
                        const nivel = nivelCuenta(c.codigo);
                        const saldo = saldoDe(c.codigo, c.naturaleza);
                        if (soloConSaldo && !conMonto.some((s) => s.cuenta === c.codigo || s.cuenta.startsWith(`${c.codigo}.`))) return null;
                        if (!c.imputable) {
                          // Clase, grupo o cuenta de mayor: encabezado con el subtotal de sus subcuentas.
                          return (
                            <tr key={c.codigo} style={{ fontWeight: nivel <= 2 ? 700 : 600, background: nivel === 1 ? 'var(--surface-2)' : undefined }}>
                              <td className="mono small">{c.codigo}</td>
                              <td style={{ paddingLeft: 12 + (nivel - 1) * 16 }}>{c.nombre}</td>
                              <td colSpan={2} className="num muted">{saldo ? dinero(saldo) : ''}</td>
                            </tr>
                          );
                        }
                        const m = montos[c.codigo] ?? { debe: 0, haber: 0 };
                        // Saldo del lado contrario a la naturaleza de la cuenta: casi siempre es un error de digitación.
                        const contrario = c.naturaleza === 'deudora' ? m.haber > m.debe : m.debe > m.haber;
                        return (
                          <tr key={c.codigo}>
                            <td className="mono small">{c.codigo}</td>
                            <td style={{ paddingLeft: 12 + (nivel - 1) * 16 }}>
                              {c.nombre}
                              <div className="small muted">Saldo {c.naturaleza === 'deudora' ? 'deudor' : 'acreedor'}{contrario && <span style={{ color: 'var(--warn)' }}> · contrario a su naturaleza, revíselo</span>}</div>
                            </td>
                            <td><input aria-label={`Debe de ${c.codigo} ${c.nombre}`} type="number" min={0} step="0.01" value={m.debe || ''} onChange={(e) => cambiarMonto(c.codigo, 'debe', num(e.target.value))} /></td>
                            <td><input aria-label={`Haber de ${c.codigo} ${c.nombre}`} type="number" min={0} step="0.01" value={m.haber || ''} onChange={(e) => cambiarMonto(c.codigo, 'haber', num(e.target.value))} /></td>
                          </tr>
                        );
                      })}
                      <tr><th colSpan={2}>Totales</th><th className="num">{dinero(t.debe)}</th><th className="num">{dinero(t.haber)}</th></tr>
                      <tr>
                        <td colSpan={2} className="small">Activo {dinero(saldoDe('1', 'deudora'))} = Pasivo {dinero(saldoDe('2', 'acreedora'))} + Patrimonio {dinero(saldoDe('3', 'acreedora'))}</td>
                        <td colSpan={2} className="right small">{t.cuadra ? 'Ecuación contable cumplida' : `Diferencia ${dinero(t.debe - t.haber)}`}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="small muted" style={{ margin: 0 }}>
                  Las cuentas de ingresos, costos y gastos no llevan saldo de apertura: el resultado del periodo anterior va en 3.3.01.01 Utilidades acumuladas. Las cuentas de valuación (depreciación acumulada,
                  estimación de incobrables) llevan saldo acreedor. La depreciación automática del cierre toma el costo de apertura como adquirido en esta fecha; si el activo ya tiene vida transcurrida, ajuste la vida útil o regístrela con un ajuste manual.
                </p>
              </div>
            </div>

            <div className="card">
              <div className="card-head"><h2>4. Inventario inicial por artículo</h2><span className="small muted">Saldo 1.1.03.01: {dinero((inventario?.debe ?? 0) - (inventario?.haber ?? 0))}</span></div>
              <div className="card-body stack">
                <p className="small muted" style={{ margin: 0 }}>
                  Detalle de la mercadería para el kárdex al costo promedio ponderado (Sección 13): sin él, las ventas de esos artículos no tienen costo. La suma debe coincidir con el saldo de Inventario de mercadería.
                </p>
                {existencias.length > 0 && (
                  <div className="table-wrap">
                    <table className="tabla-editable">
                      <thead><tr><th>Artículo (CAByS)</th><th>Descripción</th><th className="right" style={{ width: 120 }}>Cantidad</th><th className="right" style={{ width: 160 }}>Costo total</th><th /></tr></thead>
                      <tbody>
                        {existencias.map((e, i) => (
                          <tr key={i}>
                            <td>
                              {mercaderia.length > 0 ? (
                                <select aria-label={`Artículo ${i + 1}`} value={e.cabys} onChange={(ev) => elegirProducto(i, ev.target.value)} style={{ width: '100%' }}>
                                  <option value="">Elija el producto…</option>
                                  {mercaderia.map((p) => <option key={p.id} value={p.codigoCabys}>{p.codigoCabys} – {p.descripcion}</option>)}
                                </select>
                              ) : (
                                <input aria-label={`CAByS del artículo ${i + 1}`} value={e.cabys} maxLength={13} onChange={(ev) => cambiarExistencia(i, { cabys: ev.target.value.replace(/\D/g, '') })} />
                              )}
                            </td>
                            <td><input aria-label={`Descripción del artículo ${i + 1}`} value={e.detalle} onChange={(ev) => cambiarExistencia(i, { detalle: ev.target.value })} /></td>
                            <td><input aria-label={`Cantidad del artículo ${i + 1}`} type="number" min={0} step="any" value={e.cantidad || ''} onChange={(ev) => cambiarExistencia(i, { cantidad: num(ev.target.value) })} /></td>
                            <td><input aria-label={`Costo del artículo ${i + 1}`} type="number" min={0} step="0.01" value={e.costo || ''} onChange={(ev) => cambiarExistencia(i, { costo: num(ev.target.value) })} /></td>
                            <td><button className="btn btn-ghost btn-icon btn-danger" aria-label={`Quitar artículo ${i + 1}`} onClick={() => setExistencias(existencias.filter((_, j) => j !== i))}><Trash2 /></button></td>
                          </tr>
                        ))}
                        <tr><th colSpan={3}>Total del inventario</th><th className="num">{dinero(existencias.reduce((s, e) => s + (e.costo || 0), 0))}</th><th /></tr>
                      </tbody>
                    </table>
                  </div>
                )}
                <div><button className="btn" onClick={() => setExistencias([...existencias, existenciaVacia()])}><Plus /> Agregar artículo</button></div>
              </div>
            </div>
          </>
        )}

        {errores.length > 0 && conDatos && <Alerta tipo="warn">{errores.join(' ')}</Alerta>}
        <div className="row">
          <button className="btn btn-primary" onClick={guardar} disabled={errores.length > 0}><Save /> Guardar balance de apertura</button>
          {inicial && <button className="btn btn-danger" onClick={quitar}><Trash2 /> Quitar apertura</button>}
        </div>
      </div>
    </>
  );
}
