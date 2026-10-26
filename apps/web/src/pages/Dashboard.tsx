import { NOMBRE_COMPROBANTE, limiteConfirmacionReceptor, periodoContable } from '@fe-cr/core';
import type { Recibido } from '../backend/tipos';
import { FilePlus2, FileText, FlaskConical, Inbox } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Estado, Vacio } from '../components/ui';
import { useApp } from '../estado';
import { aColones, dinero, fecha, fechaHora, mesCR, signoVenta } from '../lib/formato';

export function Dashboard() {
  const { emisor, comprobantes, recibidos, preferencias } = useApp();
  const mesActual = mesCR();

  const kpi = useMemo(() => {
    // Mismo criterio que Reportes: las NC/ND por error material (13/14) cuentan en el período que modifican.
    const delMes = comprobantes.filter((c) => c.estado === 'aceptado' && periodoContable(c) === mesActual);
    const ventas = delMes.reduce((s, c) => s + signoVenta(c.tipo) * aColones(c.resumen.totalVentaNeta, c.resumen.tipoCambio), 0);
    const iva = delMes.reduce((s, c) => s + signoVenta(c.tipo) * aColones(c.resumen.totalImpuesto, c.resumen.tipoCambio), 0);
    const porEstado: Record<string, number> = {};
    for (const c of comprobantes) porEstado[c.estado] = (porEstado[c.estado] ?? 0) + 1;
    const pendientes = recibidos.filter((r) => r.estado === 'pendiente');
    return { ventas, iva, porEstado, pendientes, cantidadMes: delMes.length };
  }, [comprobantes, recibidos, mesActual]);

  const total = comprobantes.length || 1;
  // Igual que en Recepción: el plazo se recalcula con los feriados configurados.
  const limiteConFeriados = (r: Recibido) => {
    const d = new Date(r.fechaEmision);
    return Number.isNaN(d.getTime()) ? r.limiteConfirmacion : limiteConfirmacionReceptor(d, preferencias.feriados);
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Panel</h1>
          <p>{emisor?.nombre} · {emisor?.identificacion.numero}</p>
        </div>
        <div className="row">
          <Link className="btn" to="/escenarios"><FlaskConical /> Escenarios de prueba</Link>
          <Link className="btn btn-primary" to="/emitir"><FilePlus2 /> Emitir comprobante</Link>
        </div>
      </div>

      <div className="grid grid-4">
        <div className="card kpi"><div className="label">Ventas netas aceptadas del mes (₡)</div><div className="value">{dinero(kpi.ventas)}</div><div className="sub">{kpi.cantidadMes} comprobantes · NC restan</div></div>
        <div className="card kpi"><div className="label">Impuestos del mes (₡)</div><div className="value">{dinero(kpi.iva)}</div><div className="sub">Débito según comprobantes aceptados</div></div>
        <div className="card kpi"><div className="label">Rechazados</div><div className="value">{kpi.porEstado.rechazado ?? 0}</div><div className="sub">Requieren comprobante sustituto</div></div>
        <div className="card kpi"><div className="label">Recibidos por confirmar</div><div className="value">{kpi.pendientes.length}</div><div className="sub">Plazo: 8 días hábiles del mes siguiente</div></div>
      </div>

      <div className="grid grid-2" style={{ marginTop: 16 }}>
        <div className="card">
          <div className="card-head"><h2>Últimos comprobantes</h2><Link to="/comprobantes" className="small">Ver todos</Link></div>
          {comprobantes.length === 0 ? (
            <Vacio icono={<FileText />} titulo="Aún no ha emitido comprobantes"><Link to="/emitir">Emitir el primero</Link></Vacio>
          ) : (
            <div className="table-wrap">
              <table>
                <tbody>
                  {comprobantes.slice(0, 8).map((c) => (
                    <tr key={c.clave}>
                      <td><Link to={`/comprobantes/${c.clave}`}>{NOMBRE_COMPROBANTE[c.tipo]}</Link><div className="small muted">{fechaHora(c.fechaEmision)}</div></td>
                      <td className="num">{dinero(c.resumen.totalComprobante, c.resumen.codigoMoneda)}</td>
                      <td><Estado estado={c.estado} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="stack">
          <div className="card">
            <div className="card-head"><h2>Estados ante Hacienda (simulado)</h2></div>
            <div className="card-body stack" style={{ gap: 8 }}>
              {['aceptado', 'rechazado', 'procesando', 'recibido', 'enviado', 'generado', 'error'].map((e) => (
                <div key={e} className="row" style={{ flexWrap: 'nowrap' }}>
                  <div style={{ width: 110 }}><Estado estado={e} /></div>
                  <div className="bar-track"><div className="bar" style={{ width: `${((kpi.porEstado[e] ?? 0) / total) * 100}%` }} /></div>
                  <span className="num small" style={{ width: 30 }}>{kpi.porEstado[e] ?? 0}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="card-head"><h2>Recibidos pendientes de confirmar</h2><Link to="/recepcion" className="small">Recepción</Link></div>
            {kpi.pendientes.length === 0 ? (
              <Vacio icono={<Inbox />} titulo="Sin pendientes" />
            ) : (
              <table><tbody>
                {kpi.pendientes.slice(0, 5).map((r) => (
                  <tr key={r.clave}><td>{r.nombreEmisor}</td><td className="num">{dinero(r.totalComprobante, r.moneda ?? 'CRC')}</td><td className="small">vence {fecha(limiteConFeriados(r))}</td></tr>
                ))}
              </tbody></table>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
