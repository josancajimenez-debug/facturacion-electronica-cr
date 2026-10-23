import { ExternalLink } from 'lucide-react';
import { Alerta } from '../components/ui';
import { CONTRADICCIONES, FECHA_CONSULTA, MATRIZ } from '../lib/normativa';

export function Normativa() {
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Matriz normativa</h1>
          <p>Normas vigentes verificadas en SINALEVI y en la bibliografía, con su aplicación en esta herramienta. Consulta: {FECHA_CONSULTA}.</p>
        </div>
      </div>
      <Alerta tipo="info">
        Resumen de referencia. La matriz completa, la arquitectura y las referencias en formato APA 7.ª edición están en <code>docs/MATRIZ_NORMATIVA.md</code> del repositorio.
      </Alerta>
      <div className="card" style={{ marginTop: 16 }}>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Norma</th><th>Publicación</th><th>Estado</th><th>Disposiciones relevantes</th><th>Aplicación en la app</th></tr></thead>
            <tbody>
              {MATRIZ.map((n) => (
                <tr key={n.norma}>
                  <td style={{ minWidth: 200 }}>
                    <strong>{n.norma}</strong>
                    {n.url && <div><a href={n.url} target="_blank" rel="noreferrer" className="small">Fuente <ExternalLink size={12} /></a></div>}
                  </td>
                  <td className="small" style={{ minWidth: 150 }}>{n.datos}</td>
                  <td className="small" style={{ minWidth: 160 }}>{n.estado}</td>
                  <td className="small" style={{ minWidth: 280 }}>{n.disposiciones}</td>
                  <td className="small" style={{ minWidth: 200 }}>{n.implementacion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="card">
        <div className="card-head"><h2>Contradicciones y decisiones de interpretación</h2></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Tema</th><th>Hallazgo</th><th>Decisión</th></tr></thead>
            <tbody>
              {CONTRADICCIONES.map((c) => (
                <tr key={c.tema}><td><strong>{c.tema}</strong></td><td className="small">{c.detalle}</td><td className="small">{c.decision}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
