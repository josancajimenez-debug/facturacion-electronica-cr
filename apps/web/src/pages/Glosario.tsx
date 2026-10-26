import { BookA, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { Alerta, Vacio } from '../components/ui';
import { FECHA_GLOSARIO, REFERENCIAS, SIGLAS, TERMINOS, normalizar } from '../lib/glosario';

/** Muestra en cursiva los fragmentos marcados con *asteriscos* (títulos en las referencias APA). */
function ConCursiva({ texto }: { texto: string }) {
  return <>{texto.split('*').map((parte, i) => (i % 2 ? <em key={i}>{parte}</em> : parte))}</>;
}

export function Glosario() {
  const [filtro, setFiltro] = useState('');
  const q = normalizar(filtro.trim());
  const terminos = TERMINOS.filter((t) => normalizar(`${t.termino} ${t.definicion}`).includes(q));
  const siglas = SIGLAS.filter(([s, d]) => normalizar(`${s} ${d}`).includes(q));

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Glosario</h1>
          <p>{TERMINOS.length} términos y {SIGLAS.length} siglas de la facturación electrónica, definidos según la normativa vigente al {FECHA_GLOSARIO}.</p>
        </div>
      </div>
      <Alerta tipo="info">
        Cuando la norma trae una definición literal se respeta su redacción; en los demás casos se resume la disposición citada. Fuentes en formato APA 7.ª edición (autor, año y artículo o nota); DGT es la Dirección General de Tributación.
      </Alerta>
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-head">
          <input placeholder="Buscar término, sigla o palabra" value={filtro} onChange={(e) => setFiltro(e.target.value)} style={{ maxWidth: 360 }} aria-label="Buscar en el glosario" />
          <span className="small muted">{terminos.length} términos · {siglas.length} siglas</span>
        </div>
        {terminos.length === 0 ? (
          <Vacio icono={<BookA />} titulo="Ningún término coincide" />
        ) : (
          <div className="table-wrap">
            <table className="apilada">
              <thead><tr><th>Término</th><th>Definición</th><th>Fuente (APA 7)</th></tr></thead>
              <tbody>
                {terminos.map((t) => (
                  <tr key={t.termino}>
                    <td style={{ minWidth: 180 }}><strong>{t.termino}</strong></td>
                    <td className="small" style={{ minWidth: 320 }}>{t.definicion}</td>
                    <td className="small muted" style={{ minWidth: 200 }}>{t.fuente}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {siglas.length > 0 && (
        <div className="card">
          <div className="card-head"><h2>Siglas y abreviaturas</h2></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Sigla</th><th>Significado</th></tr></thead>
              <tbody>
                {siglas.map(([s, d]) => (
                  <tr key={s}><td className="nowrap"><strong>{s}</strong></td><td className="small">{d}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <div className="card">
        <div className="card-head"><h2>Referencias</h2></div>
        <div style={{ padding: 16 }}>
          {REFERENCIAS.map((r) => (
            <p key={r.texto} className="small" style={{ paddingLeft: 24, textIndent: -24, margin: '0 0 10px', overflowWrap: 'anywhere' }}>
              <ConCursiva texto={r.texto} />
              {r.url && <> <a href={r.url} target="_blank" rel="noreferrer">{r.url} <ExternalLink size={12} /></a></>}
            </p>
          ))}
        </div>
      </div>
    </>
  );
}
