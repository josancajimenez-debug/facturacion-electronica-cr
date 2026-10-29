import { TIPO_IDENTIFICACION, descripcion, edicionNiifPara, estadosFinancieros, nombreUbicacion, type RenglonEstado, type RenglonFlujo } from '@fe-cr/core';
import { Download, Printer } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Alerta, Cargando, Texto } from '../components/ui';
import { useApp } from '../estado';
import { finDeMes, useContabilidad } from '../lib/contabilidad';
import { csv, descargar, dinero, fecha, mesCR, numero } from '../lib/formato';

function Renglones({ filas }: { filas: RenglonEstado[] }) {
  return (
    <>
      {filas.map((r) => (
        <tr key={`${r.codigo}-${r.nombre}`} style={{ fontWeight: r.nivel <= 2 ? 650 : undefined }}>
          <td style={{ paddingLeft: 12 + (r.nivel - 2) * 16 }}>{r.nombre}</td>
          <td className="num">{dinero(r.monto)}</td>
        </tr>
      ))}
    </>
  );
}

function Flujos({ filas }: { filas: RenglonFlujo[] }) {
  return (
    <>
      {filas.map((r) => (
        <tr key={`${r.codigo}-${r.concepto}`}>
          <td style={{ paddingLeft: 28 }}>{r.concepto}</td>
          <td className="num">{dinero(r.monto)}</td>
        </tr>
      ))}
    </>
  );
}

function Total({ texto, monto }: { texto: string; monto: number }) {
  return <tr><th>{texto}</th><th className="num">{dinero(monto)}</th></tr>;
}

function Subtitulo({ texto }: { texto: string }) {
  return <tr><td colSpan={2} style={{ fontWeight: 650, paddingTop: 14 }}>{texto}</td></tr>;
}

const VISTAS = {
  situacion: 'Situación financiera',
  resultados: 'Resultado integral',
  patrimonio: 'Cambios en el patrimonio',
  flujos: 'Flujos de efectivo',
  notas: 'Notas',
  inventario: 'Inventario y kárdex',
} as const;
type Vista = keyof typeof VISTAS;

/** Notas de detalle: cada cuenta de nivel 3 con sus subcuentas (Sección 8). */
function notasDeDetalle(filas: RenglonEstado[]) {
  const notas: { titulo: string; total: number; lineas: RenglonEstado[] }[] = [];
  for (const r of filas) {
    if (r.nivel === 3) notas.push({ titulo: r.nombre, total: r.monto, lineas: [] });
    else if (r.nivel === 4) notas.at(-1)?.lineas.push(r);
  }
  return notas;
}

export function EstadosFinancieros() {
  const { comprobantesListos, emisor } = useApp();
  const { libro, config } = useContabilidad();
  const [corte, setCorte] = useState(mesCR);
  const [vista, setVista] = useState<Vista>('situacion');
  const hasta = finDeMes(corte);
  const desde = `${corte.slice(0, 4)}-01-01`;

  const datos = useMemo(() => {
    if (!libro) return null;
    const movimientos = libro.kardex.movimientos.filter((m) => m.fecha.slice(0, 10) <= hasta);
    // Existencias al corte: último saldo de cada artículo hasta esa fecha.
    const existencias = new Map<string, (typeof movimientos)[number]>();
    for (const m of movimientos) existencias.set(m.cabys, m);
    return { ef: estadosFinancieros(libro.asientos, desde, hasta), existencias: [...existencias.values()].filter((m) => m.saldoCantidad !== 0 || m.saldoCosto !== 0), movimientos };
  }, [libro, desde, hasta]);

  if (!comprobantesListos || !datos || !emisor) return <Cargando />;
  const { ef, existencias, movimientos } = datos;
  const s = ef.situacion;
  const r = ef.resultados;
  const p = ef.cambiosPatrimonio;
  const f = ef.flujos;
  const totalInventario = existencias.reduce((t, m) => t + m.saldoCosto, 0);
  const edicion = edicionNiifPara(desde, config.politicas.adopcionAnticipadaNiif2025);
  const periodo = `del ${fecha(desde)} al ${fecha(hasta)}`;
  const actividad = emisor.actividades.find((a) => a.principal) ?? emisor.actividades[0];
  const notas = notasDeDetalle([...s.activo, ...s.pasivo, ...s.patrimonio]);
  const cierre = config.cierres?.[corte.slice(0, 4)];

  /** Encabezado formal de cada estado: entidad, nombre del estado, fecha o periodo y moneda. */
  const Encabezado = ({ titulo, cuando }: { titulo: string; cuando: string }) => (
    <div className="card-head" style={{ display: 'block', textAlign: 'center' }}>
      <strong>{emisor.nombre}</strong>
      <h2 style={{ margin: '2px 0' }}>{titulo}</h2>
      <span className="small muted">{cuando} · En colones costarricenses</span>
    </div>
  );
  const Seccion = ({ id, children }: { id: Vista; children: ReactNode }) => (
    <section className={`ef-seccion${vista === id ? '' : ' ef-oculta'}`}>{children}</section>
  );

  const exportar = () =>
    descargar(`estados-financieros-${corte}.csv`, csv([
      [emisor.nombre, `Estados financieros al ${hasta}`, 'Montos en colones (simulación)'],
      [],
      ['Estado de situación financiera', '', 'Monto'],
      ...[...s.activo, ...s.pasivo, ...s.patrimonio].map((x) => [x.nombre, x.codigo, x.monto.toFixed(2)]),
      ['Total activo', '', s.totalActivo.toFixed(2)],
      ['Total pasivo', '', s.totalPasivo.toFixed(2)],
      ['Total patrimonio', '', s.totalPatrimonio.toFixed(2)],
      [],
      [`Estado del resultado integral del ${desde} al ${hasta}`, '', 'Monto'],
      ...[...r.ingresos, ...r.costos, ...r.gastos].map((x) => [x.nombre, x.codigo, x.monto.toFixed(2)]),
      ['Utilidad antes del impuesto sobre la renta', '', r.utilidadAntesImpuesto.toFixed(2)],
      ['Impuesto sobre la renta', '6.3.01.01', r.impuestoRenta.toFixed(2)],
      ['Resultado integral del periodo', '', r.resultado.toFixed(2)],
      [],
      ['Estado de cambios en el patrimonio', 'Capital', 'Reservas', 'Resultados acumulados', 'Resultado del periodo', 'Total'],
      ...p.filas.map((x) => [x.concepto, x.capital.toFixed(2), x.reservas.toFixed(2), x.acumulados.toFixed(2), x.resultado.toFixed(2), x.total.toFixed(2)]),
      [],
      ['Estado de flujos de efectivo (método indirecto)', '', 'Monto'],
      ...f.operacion.map((x) => [x.concepto, 'Operación', x.monto.toFixed(2)]),
      ['Efectivo neto de actividades de operación', '', f.totalOperacion.toFixed(2)],
      ...f.inversion.map((x) => [x.concepto, 'Inversión', x.monto.toFixed(2)]),
      ['Efectivo neto de actividades de inversión', '', f.totalInversion.toFixed(2)],
      ...f.financiamiento.map((x) => [x.concepto, 'Financiamiento', x.monto.toFixed(2)]),
      ['Efectivo neto de actividades de financiamiento', '', f.totalFinanciamiento.toFixed(2)],
      ['Efectivo al inicio del periodo', '', f.efectivoInicial.toFixed(2)],
      ['Efectivo al final del periodo', '', f.efectivoFinal.toFixed(2)],
      [],
      ['Inventario de mercadería', 'CAByS', 'Cantidad', 'Costo promedio', 'Costo total'],
      ...existencias.map((m) => [m.detalle, m.cabys, m.saldoCantidad, m.saldoCantidad ? (m.saldoCosto / m.saldoCantidad).toFixed(2) : '', m.saldoCosto.toFixed(2)]),
    ]), 'text/csv');

  const imprimir = () => window.print();

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Estados financieros</h1>
          <p>Juego completo de estados financieros con sus notas (NIIF para las PYMES, Secciones 3 a 8; Código de Comercio, art. 255).</p>
        </div>
        <div className="row no-print" style={{ alignItems: 'flex-end' }}>
          <div style={{ width: 170 }}><Texto etiqueta="Corte al cierre de" tipo="month" valor={corte} onCambio={(v) => v && setCorte(v)} /></div>
          <button className="btn" onClick={exportar}><Download /> CSV</button>
          <button className="btn" onClick={imprimir} title="Imprime o guarda en PDF el juego completo"><Printer /> Imprimir</button>
        </div>
      </div>

      {!cierre?.cerrado && (
        <Alerta tipo="warn">
          Los asientos de {cierre?.ajustesAutomaticos ? 'cierre' : 'ajuste y de cierre'} del periodo {corte.slice(0, 4)} no están registrados: estas cifras son preliminares.{' '}
          <Link to="/contabilidad/ajustes-cierre">Ir a Ajustes y cierre</Link>
        </Alerta>
      )}
      {!s.cuadra && <Alerta tipo="err">El estado de situación no cuadra: activo {dinero(s.totalActivo)} frente a pasivo más patrimonio {dinero(s.totalPasivo + s.totalPatrimonio)}.</Alerta>}
      {!f.cuadra && <Alerta tipo="err">El estado de flujos de efectivo no concilia con la variación del efectivo del estado de situación.</Alerta>}

      <div className="card">
        <div className="tabs no-print" role="tablist">
          {(Object.keys(VISTAS) as Vista[]).map((v) => (
            <button key={v} role="tab" aria-selected={vista === v} className={vista === v ? 'on' : ''} onClick={() => setVista(v)}>{VISTAS[v]}</button>
          ))}
        </div>

        <Seccion id="situacion">
          <Encabezado titulo="Estado de situación financiera" cuando={`Al ${fecha(hasta)}`} />
          <div className="table-wrap">
            <table>
              <tbody>
                <Renglones filas={s.activo} />
                <Total texto="Total activo" monto={s.totalActivo} />
                <Renglones filas={s.pasivo} />
                <Total texto="Total pasivo" monto={s.totalPasivo} />
                <Renglones filas={s.patrimonio} />
                <Total texto="Total patrimonio" monto={s.totalPatrimonio} />
                <Total texto="Total pasivo y patrimonio" monto={s.totalPasivo + s.totalPatrimonio} />
              </tbody>
            </table>
          </div>
          <p className="small muted card-body" style={{ margin: 0 }}>
            Sección 4. Activos y pasivos clasificados en corrientes y no corrientes. <span className={`badge ${s.cuadra ? 'ok' : 'err'}`}>{s.cuadra ? 'Cuadra' : 'No cuadra'}</span>
          </p>
        </Seccion>

        <Seccion id="resultados">
          <Encabezado titulo="Estado del resultado integral" cuando={`Periodo ${periodo}`} />
          <div className="table-wrap">
            <table>
              <tbody>
                <Renglones filas={r.ingresos} />
                <Total texto="Total ingresos" monto={r.totalIngresos} />
                <Renglones filas={r.costos} />
                <Total texto="Utilidad bruta" monto={r.utilidadBruta} />
                <Renglones filas={r.gastos} />
                <Total texto="Total gastos" monto={r.totalGastos} />
                <Total texto={r.utilidadAntesImpuesto >= 0 ? 'Utilidad antes del impuesto sobre la renta' : 'Pérdida antes del impuesto sobre la renta'} monto={r.utilidadAntesImpuesto} />
                <tr><td style={{ paddingLeft: 12 }}>Impuesto sobre la renta</td><td className="num">{dinero(r.impuestoRenta)}</td></tr>
                <Total texto={r.resultado >= 0 ? 'Utilidad neta del periodo' : 'Pérdida neta del periodo'} monto={r.resultado} />
                <tr><td style={{ paddingLeft: 12 }}>Otro resultado integral</td><td className="num">{dinero(0)}</td></tr>
                <Total texto="Resultado integral total del periodo" monto={r.resultado} />
              </tbody>
            </table>
          </div>
          <p className="small muted card-body" style={{ margin: 0 }}>
            Sección 5, enfoque de un solo estado con desglose de gastos por función. El impuesto sobre la renta proviene del asiento de ajuste del periodo (Sección 29); los gastos se registran aunque no sean deducibles.
          </p>
        </Seccion>

        <Seccion id="patrimonio">
          <Encabezado titulo="Estado de cambios en el patrimonio" cuando={`Periodo ${periodo}`} />
          <div className="table-wrap">
            <table>
              <thead><tr><th>Concepto</th><th className="right">Capital social</th><th className="right">Reservas</th><th className="right">Resultados acumulados</th><th className="right">Resultado del periodo</th><th className="right">Total</th></tr></thead>
              <tbody>
                {p.filas.map((x) => {
                  const Celda = x.saldo ? 'th' : 'td';
                  return (
                    <tr key={x.concepto}>
                      <Celda>{x.concepto}</Celda>
                      {[x.capital, x.reservas, x.acumulados, x.resultado, x.total].map((m, i) => <Celda key={i} className="num">{dinero(m)}</Celda>)}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="small muted card-body" style={{ margin: 0 }}>
            Sección 6. Mientras no haya asiento de cierre, los resultados de periodos anteriores se presentan dentro de los resultados acumulados.{' '}
            <span className={`badge ${p.cuadra ? 'ok' : 'err'}`}>{p.cuadra ? 'Concilia con el estado de situación' : 'No concilia'}</span>
          </p>
        </Seccion>

        <Seccion id="flujos">
          <Encabezado titulo="Estado de flujos de efectivo" cuando={`Periodo ${periodo} · Método indirecto`} />
          <div className="table-wrap">
            <table>
              <tbody>
                <Subtitulo texto="Actividades de operación" />
                <Flujos filas={f.operacion} />
                <Total texto="Efectivo neto de actividades de operación" monto={f.totalOperacion} />
                <Subtitulo texto="Actividades de inversión" />
                {f.inversion.length ? <Flujos filas={f.inversion} /> : <tr><td colSpan={2} className="muted" style={{ paddingLeft: 28 }}>Sin movimientos</td></tr>}
                <Total texto="Efectivo neto de actividades de inversión" monto={f.totalInversion} />
                <Subtitulo texto="Actividades de financiamiento" />
                {f.financiamiento.length ? <Flujos filas={f.financiamiento} /> : <tr><td colSpan={2} className="muted" style={{ paddingLeft: 28 }}>Sin movimientos</td></tr>}
                <Total texto="Efectivo neto de actividades de financiamiento" monto={f.totalFinanciamiento} />
                <Total texto="Aumento (disminución) neto del efectivo" monto={f.variacion} />
                <tr><td>Efectivo y equivalentes al inicio del periodo</td><td className="num">{dinero(f.efectivoInicial)}</td></tr>
                <Total texto="Efectivo y equivalentes al final del periodo" monto={f.efectivoFinal} />
              </tbody>
            </table>
          </div>
          <p className="small muted card-body" style={{ margin: 0 }}>
            Sección 7. El resultado del periodo se ajusta por las partidas que no mueven efectivo y por los cambios en el capital de trabajo.{' '}
            <span className={`badge ${f.cuadra ? 'ok' : 'err'}`}>{f.cuadra ? 'Concilia con el efectivo del estado de situación' : 'No concilia'}</span>
          </p>
        </Seccion>

        <Seccion id="notas">
          <Encabezado titulo="Notas a los estados financieros" cuando={`Al ${fecha(hasta)}`} />
          <div className="card-body stack notas-ef">
            <div>
              <h3>Nota 1. Información general</h3>
              <p>
                {emisor.nombre}{emisor.nombreComercial ? ` («${emisor.nombreComercial}»)` : ''}, {descripcion(TIPO_IDENTIFICACION, emisor.identificacion.tipo).toLowerCase()} {emisor.identificacion.numero},
                domiciliado en {nombreUbicacion(emisor.ubicacion)}. Actividad económica principal: {actividad ? `${actividad.codigo} – ${actividad.descripcion}` : 'no registrada'}.
              </p>
            </div>
            <div>
              <h3>Nota 2. Bases de preparación</h3>
              <p>
                Los estados financieros se prepararon conforme a la NIIF para las PYMES (edición {edicion}){config.politicas.adopcionAnticipadaNiif2025 && edicion === '2025' && desde < '2027-01-01' ? ', con adopción anticipada de la tercera edición' : ''},
                sobre la base del costo histórico y bajo la hipótesis de negocio en marcha. Se presentan en colones costarricenses y cubren el periodo {periodo}.
                Las cifras provienen del libro diario generado a partir de los comprobantes electrónicos aceptados en este simulador educativo.
              </p>
            </div>
            <div>
              <h3>Nota 3. Políticas contables significativas</h3>
              <ul>
                <li><strong>Efectivo y equivalentes (Sección 7):</strong> caja, bancos y tarjetas por liquidar, de disponibilidad inmediata.</li>
                <li><strong>Cuentas por cobrar (Sección 11):</strong> al importe de la factura, neto de la estimación para pérdidas crediticias.</li>
                <li><strong>Inventarios (Sección 13):</strong> al menor entre el costo y el precio de venta estimado menos costos de terminación y venta; el costo se asigna por el método del promedio ponderado.</li>
                <li><strong>Propiedades, planta y equipo (Sección 17):</strong> se capitalizan las compras con costo unitario igual o superior a {dinero(config.politicas.umbralCapitalizacion)}; se miden al costo menos la depreciación acumulada.</li>
                <li><strong>Ingresos (Sección 23):</strong> se reconocen al emitirse el comprobante aceptado por Hacienda, netos de devoluciones, descuentos e IVA.</li>
                <li><strong>Impuesto al valor agregado:</strong> el IVA soportado acreditable se registra como crédito fiscal; el no acreditable forma parte del costo o del gasto.</li>
                <li><strong>Impuesto sobre la renta (Sección 29):</strong> el impuesto corriente se reconoce al cierre mediante un asiento de ajuste sobre la utilidad antes de impuesto{r.impuestoRenta ? '' : ' (en este periodo no se ha registrado)'}.</li>
                <li><strong>Depreciación y amortización (Secciones 17 y 18):</strong> línea recta sobre el costo, desde el mes de adquisición, según la vida útil definida para cada clase de activo.</li>
                <li><strong>Cierre del periodo:</strong> al 31 de diciembre los ingresos, costos y gastos se trasladan a utilidades acumuladas{config.cierres?.[corte.slice(0, 4)]?.parametros.reservaLegal ? ' y se asigna la reserva legal (Código de Comercio, art. 143)' : ''}.</li>
              </ul>
            </div>
            {notas.map((n, i) => (
              <div key={n.titulo}>
                <h3>Nota {i + 4}. {n.titulo}</h3>
                <table className="small">
                  <tbody>
                    {n.lineas.map((l) => <tr key={l.codigo}><td>{l.nombre}</td><td className="num">{dinero(l.monto)}</td></tr>)}
                    <Total texto="Total" monto={n.total} />
                  </tbody>
                </table>
                {n.titulo === 'Inventarios' && <p className="small muted">El detalle por artículo está en la pestaña «Inventario y kárdex».</p>}
              </div>
            ))}
            <div>
              <h3>Nota {notas.length + 4}. Hechos posteriores (Sección 32)</h3>
              <p>No se conocen hechos ocurridos después de la fecha de corte que requieran ajuste o revelación.</p>
            </div>
          </div>
        </Seccion>

        <Seccion id="inventario">
          <Encabezado titulo="Inventario de mercadería" cuando={`Al ${fecha(hasta)} · Costo promedio ponderado (Sección 13)`} />
          <div className="table-wrap">
            <table>
              <thead><tr><th>Artículo</th><th>CAByS</th><th className="right">Cantidad</th><th className="right">Costo promedio</th><th className="right">Costo total</th></tr></thead>
              <tbody>
                {existencias.length === 0 && <tr><td colSpan={5} className="muted">Sin existencias. Las compras de bienes que la empresa también vende (catálogo de productos) se registran aquí.</td></tr>}
                {existencias.map((m) => (
                  <tr key={m.cabys}>
                    <td>{m.detalle}</td>
                    <td className="mono small">{m.cabys}</td>
                    <td className="num">{numero(m.saldoCantidad, 3)}</td>
                    <td className="num">{m.saldoCantidad ? dinero(m.saldoCosto / m.saldoCantidad) : '—'}</td>
                    <td className="num">{dinero(m.saldoCosto)}</td>
                  </tr>
                ))}
                {existencias.length > 0 && <tr><th colSpan={4}>Total inventario</th><th className="num">{dinero(totalInventario)}</th></tr>}
              </tbody>
            </table>
          </div>
          {movimientos.length > 0 && (
            <details className="card-body">
              <summary>Kárdex ({movimientos.length} movimientos)</summary>
              <div className="table-wrap" style={{ marginTop: 8 }}>
                <table className="small">
                  <thead><tr><th>Fecha</th><th>Artículo</th><th>Movimiento</th><th className="right">Cantidad</th><th className="right">Costo</th><th className="right">Saldo cant.</th><th className="right">Saldo costo</th></tr></thead>
                  <tbody>
                    {movimientos.map((m, i) => (
                      <tr key={i}>
                        <td className="nowrap">{fecha(m.fecha)}</td>
                        <td>{m.detalle}</td>
                        <td>{{ entrada: 'Entrada', salida: 'Salida', ajuste: 'Ajuste de valor' }[m.tipo]}</td>
                        <td className="num">{numero(m.cantidad, 3)}</td>
                        <td className="num">{dinero(m.costo)}</td>
                        <td className="num">{numero(m.saldoCantidad, 3)}</td>
                        <td className="num">{dinero(m.saldoCosto)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}
        </Seccion>
      </div>
    </>
  );
}
