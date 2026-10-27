import { estadosFinancieros, type RenglonEstado } from '@fe-cr/core';
import { Download } from 'lucide-react';
import { useMemo, useState } from 'react';
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

function Total({ texto, monto }: { texto: string; monto: number }) {
  return <tr><th>{texto}</th><th className="num">{dinero(monto)}</th></tr>;
}

export function InventariosBalances() {
  const { comprobantesListos, emisor } = useApp();
  const { libro } = useContabilidad();
  const [corte, setCorte] = useState(mesCR);
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

  if (!comprobantesListos || !datos) return <Cargando />;
  const { ef, existencias, movimientos } = datos;
  const s = ef.situacion;
  const r = ef.resultados;
  const totalInventario = existencias.reduce((t, m) => t + m.saldoCosto, 0);

  const exportar = () =>
    descargar(`inventarios-y-balances-${corte}.csv`, csv([
      [emisor?.nombre, `Libro de inventarios y balances al ${hasta}`, 'Montos en colones (simulación)'],
      [],
      ['Inventario de mercadería', 'CAByS', 'Cantidad', 'Costo promedio', 'Costo total'],
      ...existencias.map((m) => [m.detalle, m.cabys, m.saldoCantidad, m.saldoCantidad ? (m.saldoCosto / m.saldoCantidad).toFixed(2) : '', m.saldoCosto.toFixed(2)]),
      [],
      ['Estado de situación financiera', '', 'Monto'],
      ...[...s.activo, ...s.pasivo, ...s.patrimonio].map((x) => [x.nombre, x.codigo, x.monto.toFixed(2)]),
      ['Total activo', '', s.totalActivo.toFixed(2)],
      ['Total pasivo', '', s.totalPasivo.toFixed(2)],
      ['Total patrimonio', '', s.totalPatrimonio.toFixed(2)],
      [],
      [`Estado de resultados del ${desde} al ${hasta}`, '', 'Monto'],
      ...[...r.ingresos, ...r.costos, ...r.gastos].map((x) => [x.nombre, x.codigo, x.monto.toFixed(2)]),
      ['Resultado del periodo', '', r.resultado.toFixed(2)],
    ]), 'text/csv');

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Inventarios y balances</h1>
          <p>Inventario de mercadería, estado de situación financiera y estado de resultados a la fecha de corte (Código de Comercio, art. 255; NIIF para las PYMES, Secciones 3 a 5 y 13).</p>
        </div>
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <div style={{ width: 170 }}><Texto etiqueta="Corte al cierre de" tipo="month" valor={corte} onCambio={(v) => v && setCorte(v)} /></div>
          <button className="btn" onClick={exportar}><Download /> CSV</button>
        </div>
      </div>

      {!s.cuadra && <Alerta tipo="err">El estado de situación no cuadra: activo {dinero(s.totalActivo)} frente a pasivo más patrimonio {dinero(s.totalPasivo + s.totalPatrimonio)}.</Alerta>}

      <div className="stack">
        <div className="card">
          <div className="card-head"><h2>Inventario de mercadería al {fecha(hasta)}</h2><span className="small muted">Costo promedio ponderado (Sección 13)</span></div>
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
        </div>

        <div className="grid grid-2">
          <div className="card">
            <div className="card-head">
              <h2>Estado de situación financiera</h2>
              <span className={`badge ${s.cuadra ? 'ok' : 'err'}`}>{s.cuadra ? 'Cuadra' : 'No cuadra'}</span>
            </div>
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
          </div>
          <div className="card">
            <div className="card-head"><h2>Estado de resultados</h2><span className="small muted">{fecha(desde)} – {fecha(hasta)}</span></div>
            <div className="table-wrap">
              <table>
                <tbody>
                  <Renglones filas={r.ingresos} />
                  <Total texto="Total ingresos" monto={r.totalIngresos} />
                  <Renglones filas={r.costos} />
                  <Total texto="Utilidad bruta" monto={r.utilidadBruta} />
                  <Renglones filas={r.gastos} />
                  <Total texto="Total gastos" monto={r.totalGastos} />
                  <Total texto={r.resultado >= 0 ? 'Utilidad del periodo' : 'Pérdida del periodo'} monto={r.resultado} />
                </tbody>
              </table>
            </div>
            <p className="small muted card-body" style={{ margin: 0 }}>Antes del impuesto sobre la renta. Los gastos se registran aunque no sean deducibles; la conciliación fiscal se hace aparte (Sección 29).</p>
          </div>
        </div>
      </div>
    </>
  );
}
