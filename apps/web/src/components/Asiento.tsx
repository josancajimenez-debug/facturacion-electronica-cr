import type { Asiento } from '@fe-cr/core';
import { Link } from 'react-router-dom';
import { dinero, fecha } from '../lib/formato';

/** Encabezado del asiento: número, fecha, glosa y estado. */
export function EncabezadoAsiento({ asiento: a }: { asiento: Asiento }) {
  return (
    <div className="row" style={{ justifyContent: 'space-between', flex: 1 }}>
      <div>
        <strong>Asiento N.º {a.numero}</strong> <span className="muted">· {fecha(a.fecha)}</span>
        <div className="small">
          {a.origen.documento === 'emitido' && a.origen.clave ? <Link to={`/comprobantes/${a.origen.clave}`}>{a.glosa}</Link> : a.glosa}
        </div>
      </div>
      <div className="row">
        {a.periodoTributario !== a.fecha.slice(0, 7) && <span className="badge info">Período tributario {a.periodoTributario}</span>}
        {a.deducibleRenta === 'revisar' && <span className="badge warn">Deducibilidad por revisar</span>}
        {a.origen.documento === 'ajuste' && <span className="badge info">Ajuste</span>}
        {a.origen.documento === 'cierre' && <span className="badge info">Cierre</span>}
        {a.requiereRevision ? <span className="badge warn">Requiere revisión</span> : <span className="badge">Borrador</span>}
      </div>
    </div>
  );
}

/** Líneas de un asiento en partida doble, con sus alertas y fundamento. */
export function TablaAsiento({ asiento: a }: { asiento: Asiento }) {
  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Cuenta</th><th>Nombre</th><th className="right">Debe</th><th className="right">Haber</th></tr></thead>
          <tbody>
            {a.lineas.map((l) => (
              <tr key={l.cuenta}>
                <td className="mono small nowrap">{l.cuenta}</td>
                <td style={{ paddingLeft: l.haber > 0 ? 28 : undefined }}>{l.nombre}</td>
                <td className="num">{l.debe ? dinero(l.debe) : ''}</td>
                <td className="num">{l.haber ? dinero(l.haber) : ''}</td>
              </tr>
            ))}
            <tr>
              <th colSpan={2}>Totales {a.cuadrado ? '' : '(descuadrado)'}</th>
              <th className="num">{dinero(a.totalDebe)}</th>
              <th className="num">{dinero(a.totalHaber)}</th>
            </tr>
          </tbody>
        </table>
      </div>
      {a.origen.moneda && a.origen.moneda !== 'CRC' && (
        <p className="small muted" style={{ margin: 0 }}>Comprobante en {a.origen.moneda}, convertido al tipo de cambio {a.origen.tipoCambio} del documento.</p>
      )}
      {a.alertas.length > 0 && (
        <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
          {a.alertas.map((x) => <li key={x}>{x}</li>)}
        </ul>
      )}
      {a.fundamento.length > 0 && <p className="small muted" style={{ margin: 0 }}>Fundamento: {a.fundamento.join(' · ')}</p>}
    </div>
  );
}
