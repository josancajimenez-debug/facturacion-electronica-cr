import { AVISO_NIIF_COMPLETAS, CATEGORIAS_INDICADORES, NOMBRE_EDICION_NIIF, NOMBRE_NIVEL_INDICADOR, NOMBRE_UNIDAD_INDICADOR, PARAMETROS_INDICADORES, TIPO_IDENTIFICACION, VIGENCIA_NIIF_2025, descripcion, diagnosticoFinanciero, esAplicacionAnticipadaNiif, estadosFinancieros, formatearIndicador, indicadoresFinancieros, nombreUbicacion, type RenglonEstado, type RenglonFlujo } from '@fe-cr/core';
import { Download, Printer } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { IndicadoresFinancieros } from '../components/IndicadoresFinancieros';
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
  indicadores: 'Indicadores (KPI)',
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

/** Encabezado formal de cada estado: entidad, nombre del estado, fecha o periodo y moneda. */
function Encabezado({ entidad, titulo, cuando }: { entidad: string; titulo: string; cuando: string }) {
  return (
    <div className="card-head" style={{ display: 'block', textAlign: 'center' }}>
      <strong>{entidad}</strong>
      <h2 style={{ margin: '2px 0' }}>{titulo}</h2>
      <span className="small muted">{cuando} · En colones costarricenses</span>
    </div>
  );
}

/** Todas las secciones se dibujan (para imprimir el juego completo); en pantalla solo se ve la activa. */
function Seccion({ visible, children }: { visible: boolean; children: ReactNode }) {
  return <section className={`ef-seccion${visible ? '' : ' ef-oculta'}`}>{children}</section>;
}

export function EstadosFinancieros() {
  const { comprobantesListos, emisor } = useApp();
  const { libro, config, guardarConfig } = useContabilidad();
  const costoCapital = config.costoCapital ?? PARAMETROS_INDICADORES.costoCapital;
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
    // Mismo corte del año anterior, para la tendencia de los indicadores.
    const anioAnterior = String(Number(corte.slice(0, 4)) - 1);
    const anterior = estadosFinancieros(libro.asientos, `${anioAnterior}-01-01`, finDeMes(`${anioAnterior}${corte.slice(4)}`));
    return {
      ef: estadosFinancieros(libro.asientos, desde, hasta),
      anterior: anterior.situacion.totalActivo !== 0 ? anterior : undefined,
      existencias: [...existencias.values()].filter((m) => m.saldoCantidad !== 0 || m.saldoCosto !== 0),
      movimientos,
    };
  }, [libro, corte, desde, hasta]);

  if (!comprobantesListos || !datos || !emisor) return <Cargando />;
  const { ef, anterior, existencias, movimientos } = datos;
  const s = ef.situacion;
  const r = ef.resultados;
  const p = ef.cambiosPatrimonio;
  const f = ef.flujos;
  const totalInventario = existencias.reduce((t, m) => t + m.saldoCosto, 0);
  const anticipada = esAplicacionAnticipadaNiif(desde);
  const periodo = `del ${fecha(desde)} al ${fecha(hasta)}`;
  const actividad = emisor.actividades.find((a) => a.principal) ?? emisor.actividades[0];
  const notas = notasDeDetalle([...s.activo, ...s.pasivo, ...s.patrimonio]);
  const cierre = config.cierres?.[corte.slice(0, 4)];


  const exportar = () => {
    const indicadores = indicadoresFinancieros(ef, { anterior, parametros: { costoCapital } });
    const diagnostico = diagnosticoFinanciero(indicadores);
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
      [],
      [`Indicadores financieros (costo de capital ${formatearIndicador(costoCapital, 'porcentaje')})`, 'Categoría', 'Valor', 'Unidad', 'Evaluación', 'Año anterior', 'Fórmula', 'Análisis'],
      ...indicadores.map((i) => [i.nombre, CATEGORIAS_INDICADORES[i.categoria].nombre, i.valor === null ? 'N/A' : i.valor.toFixed(4), NOMBRE_UNIDAD_INDICADOR[i.unidad], NOMBRE_NIVEL_INDICADOR[i.nivel], i.anterior == null ? '' : i.anterior.toFixed(4), i.formula, i.analisis]),
      ['Diagnóstico', '', '', '', '', '', '', diagnostico.resumen],
    ]), 'text/csv');
  };

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

      {config.politicas.granContribuyenteNacional && <Alerta tipo="err">{AVISO_NIIF_COMPLETAS}</Alerta>}
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

        <Seccion visible={vista === 'situacion'}>
          <Encabezado entidad={emisor.nombre} titulo="Estado de situación financiera" cuando={`Al ${fecha(hasta)}`} />
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

        <Seccion visible={vista === 'resultados'}>
          <Encabezado entidad={emisor.nombre} titulo="Estado del resultado integral" cuando={`Periodo ${periodo}`} />
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

        <Seccion visible={vista === 'patrimonio'}>
          <Encabezado entidad={emisor.nombre} titulo="Estado de cambios en el patrimonio" cuando={`Periodo ${periodo}`} />
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

        <Seccion visible={vista === 'flujos'}>
          <Encabezado entidad={emisor.nombre} titulo="Estado de flujos de efectivo" cuando={`Periodo ${periodo} · Método indirecto`} />
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

        <Seccion visible={vista === 'indicadores'}>
          <Encabezado entidad={emisor.nombre} titulo="Indicadores financieros" cuando={`Periodo ${periodo}`} />
          <IndicadoresFinancieros
            ef={ef}
            anterior={anterior}
            costoCapital={costoCapital}
            onCostoCapital={(v) => guardarConfig({ ...config, costoCapital: v })}
          />
        </Seccion>

        <Seccion visible={vista === 'notas'}>
          <Encabezado entidad={emisor.nombre} titulo="Notas a los estados financieros" cuando={`Al ${fecha(hasta)}`} />
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
                Los estados financieros se prepararon conforme a la {NOMBRE_EDICION_NIIF}, sobre la base del costo histórico y bajo la hipótesis de negocio en marcha. Se presentan en colones costarricenses y cubren el periodo {periodo}.
                Las cifras provienen del libro diario generado a partir de los comprobantes electrónicos aceptados en este simulador educativo.
              </p>
              {anticipada && (
                <p>
                  <strong>Aplicación anticipada.</strong> La tercera edición es obligatoria para los periodos anuales que comienzan a partir del {fecha(VIGENCIA_NIIF_2025)}.
                  La entidad la aplica anticipadamente en este periodo, como lo permite la Norma (Apéndice A, Fecha de vigencia), y revela este hecho.
                </p>
              )}
              <p>
                Los registros contables se llevan conforme al artículo 128 del Código de Normas y Procedimientos Tributarios; las diferencias entre la base contable y la fiscal
                se tratan según los criterios interpretativos de la Resolución DGT-R-029-2018.
              </p>
            </div>
            <div>
              <h3>Nota 3. Información material o con importancia relativa sobre políticas contables (Sección 8)</h3>
              <ul>
                <li><strong>Efectivo y equivalentes (Sección 7):</strong> caja, bancos y tarjetas por liquidar, de disponibilidad inmediata.</li>
                <li><strong>Cuentas por cobrar (Sección 11):</strong> al precio de la transacción facturado, neto de la estimación por deterioro. El deterioro se reconoce solo cuando hay evidencia objetiva de una pérdida ya incurrida (párrafos 11.21 a 11.26), evaluada individualmente o en grupo por riesgo crediticio similar; no se reconocen pérdidas crediticias esperadas futuras.</li>
                <li><strong>Inventarios (Sección 13):</strong> al menor entre el costo y el precio de venta estimado menos costos de terminación y venta; el costo se asigna por el método del promedio ponderado.</li>
                <li><strong>Propiedades, planta y equipo (Sección 17):</strong> se capitalizan las compras con costo unitario igual o superior a {dinero(config.politicas.umbralCapitalizacion)}; se miden al costo menos la depreciación acumulada.</li>
                <li><strong>Ingresos (Sección 23, modelo de cinco pasos):</strong> se reconocen cuando la entidad satisface el compromiso con el cliente al transferirle el control del bien o servicio, por el precio de la transacción, neto de devoluciones, descuentos e IVA. En este simulador la evidencia de esa transferencia es el comprobante electrónico aceptado por Hacienda.</li>
                <li><strong>Impuesto al valor agregado:</strong> el IVA soportado acreditable se registra como crédito fiscal; el no acreditable forma parte del costo o del gasto.</li>
                <li><strong>Impuesto sobre la renta (Sección 29):</strong> el impuesto corriente se reconoce al cierre mediante un asiento de ajuste sobre la utilidad antes de impuesto{r.impuestoRenta ? '' : ' (en este periodo no se ha registrado)'}.</li>
                <li><strong>Depreciación y amortización (Secciones 17 y 18):</strong> línea recta sobre el costo, desde el mes de adquisición, según la vida útil definida para cada clase de activo.</li>
                <li><strong>Juicios y estimaciones contables (Secciones 8 y 10):</strong> la vida útil de los activos, el deterioro de las cuentas por cobrar y el impuesto sobre la renta son estimaciones contables; sus cambios se reconocen de forma prospectiva.</li>
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

        <Seccion visible={vista === 'inventario'}>
          <Encabezado entidad={emisor.nombre} titulo="Inventario de mercadería" cuando={`Al ${fecha(hasta)} · Costo promedio ponderado (Sección 13)`} />
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
