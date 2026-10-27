import { NotebookPen, Download } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { EncabezadoAsiento, TablaAsiento } from '../components/Asiento';
import { Alerta, Cargando, Texto, Vacio } from '../components/ui';
import { useApp } from '../estado';
import { finDeMes, useContabilidad } from '../lib/contabilidad';
import { csv, descargar, dinero, mesCR } from '../lib/formato';

export function LibroDiario() {
  const { comprobantesListos } = useApp();
  const { libro } = useContabilidad();
  const [parametros, setParametros] = useSearchParams();
  const clave = parametros.get('clave');
  const [desde, setDesde] = useState(`${mesCR().slice(0, 4)}-01`);
  const [hasta, setHasta] = useState(mesCR);
  const [soloRevision, setSoloRevision] = useState(false);

  if (!comprobantesListos || !libro) return <Cargando />;
  const asientos = libro.asientos.filter((a) =>
    clave ? a.origen.clave === clave : a.fecha >= `${desde}-01` && a.fecha <= finDeMes(hasta) && (!soloRevision || a.requiereRevision),
  );
  const totalDebe = asientos.reduce((s, a) => s + a.totalDebe, 0);
  const totalHaber = asientos.reduce((s, a) => s + a.totalHaber, 0);
  const porRevisar = asientos.filter((a) => a.requiereRevision).length;

  const exportar = () =>
    descargar(`libro-diario-${desde}-a-${hasta}.csv`, csv([
      ['Asiento', 'Fecha', 'Período tributario', 'Cuenta', 'Nombre', 'Debe', 'Haber', 'Glosa', 'Clave', 'Estado'],
      ...asientos.flatMap((a) => a.lineas.map((l) => [
        a.numero, a.fecha, a.periodoTributario, l.cuenta, l.nombre, l.debe.toFixed(2), l.haber.toFixed(2), a.glosa, a.origen.clave, a.requiereRevision ? 'Requiere revisión' : 'Borrador',
      ])),
    ]), 'text/csv');

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Libro diario</h1>
          <p>Asientos generados automáticamente de cada comprobante aceptado, en orden cronológico. Son propuestas en borrador hasta que el contador los apruebe.</p>
        </div>
        <div className="row" style={{ alignItems: 'flex-end' }}>
          {!clave && (
            <>
              <div style={{ width: 160 }}><Texto etiqueta="Desde" tipo="month" valor={desde} onCambio={(v) => v && setDesde(v)} /></div>
              <div style={{ width: 160 }}><Texto etiqueta="Hasta" tipo="month" valor={hasta} onCambio={(v) => v && setHasta(v)} /></div>
            </>
          )}
          <button className="btn" onClick={exportar} disabled={asientos.length === 0}><Download /> CSV</button>
        </div>
      </div>

      {clave && (
        <Alerta>
          Se muestra el asiento del comprobante {clave.slice(21, 41)}. <button className="btn btn-sm" onClick={() => setParametros({})}>Ver todo el libro</button>
        </Alerta>
      )}
      {libro.omitidos.length > 0 && !clave && (
        <details className="card" style={{ marginBottom: 16 }}>
          <summary className="card-body">{libro.omitidos.length} comprobante(s) sin asiento</summary>
          <div className="card-body small stack" style={{ gap: 4, paddingTop: 0 }}>
            {libro.omitidos.map((o) => <div key={o.clave}>{o.documento} · <span className="mono">{o.clave.slice(21, 41)}</span> — {o.motivo}</div>)}
          </div>
        </details>
      )}

      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
        <span className="small muted">
          {asientos.length} asiento(s) · Debe {dinero(totalDebe)} · Haber {dinero(totalHaber)}{porRevisar > 0 && ` · ${porRevisar} requieren revisión`}
        </span>
        {!clave && (
          <label className="check small">
            <input type="checkbox" checked={soloRevision} onChange={(e) => setSoloRevision(e.target.checked)} /> Solo los que requieren revisión
          </label>
        )}
      </div>

      {asientos.length === 0 ? (
        <div className="card">
          <Vacio icono={<NotebookPen size={32} />} titulo="Sin asientos en el período">
            Los asientos se generan al aceptarse un comprobante emitido o al confirmar uno recibido en «Recepción».
          </Vacio>
        </div>
      ) : (
        <div className="stack">
          {asientos.map((a) => (
            <div key={`${a.numero}`} className="card">
              <div className="card-head"><EncabezadoAsiento asiento={a} /></div>
              <div className="card-body"><TablaAsiento asiento={a} /></div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
