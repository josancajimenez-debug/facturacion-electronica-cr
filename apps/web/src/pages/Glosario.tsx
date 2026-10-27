import { BookA, ExternalLink, Hash } from 'lucide-react';
import { useState } from 'react';
import { Alerta, Vacio } from '../components/ui';
import { PASOS } from '../lib/codigos';
import { FECHA_GLOSARIO, REFERENCIAS, SIGLAS, TERMINOS, normalizar } from '../lib/glosario';

/** Muestra en cursiva los fragmentos marcados con *asteriscos* (títulos en las referencias APA). */
function ConCursiva({ texto }: { texto: string }) {
  return <>{texto.split('*').map((parte, i) => (i % 2 ? <em key={i}>{parte}</em> : parte))}</>;
}

/** Los catálogos largos (monedas, unidades, formas farmacéuticas) empiezan plegados. */
const LARGO = 30;
const TOTAL_CODIGOS = PASOS.reduce((n, p) => n + p.catalogos.reduce((m, c) => m + c.codigos.length, 0), 0);

function Terminos() {
  const [filtro, setFiltro] = useState('');
  const q = normalizar(filtro.trim());
  const terminos = TERMINOS.filter((t) => normalizar(`${t.termino} ${t.definicion}`).includes(q));
  const siglas = SIGLAS.filter(([s, d]) => normalizar(`${s} ${d}`).includes(q));
  return (
    <>
      <div className="card">
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
    </>
  );
}

function Codigos() {
  const [filtro, setFiltro] = useState('');
  const q = normalizar(filtro.trim());
  const pasos = PASOS.map((p) => ({
    ...p,
    catalogos: p.catalogos
      .map((c) => ({ ...c, codigos: normalizar(c.titulo).includes(q) ? c.codigos : c.codigos.filter((x) => normalizar(`${x.codigo} ${x.descripcion} ${x.nota ?? ''}`).includes(q)) }))
      .filter((c) => c.codigos.length > 0),
  })).filter((p) => p.catalogos.length > 0);
  const encontrados = pasos.reduce((n, p) => n + p.catalogos.reduce((m, c) => m + c.codigos.length, 0), 0);

  return (
    <>
      <div className="card">
        <div className="card-head">
          <input placeholder="Buscar código, catálogo o palabra" value={filtro} onChange={(e) => setFiltro(e.target.value)} style={{ maxWidth: 360 }} aria-label="Buscar código" />
          <span className="small muted">{encontrados} {encontrados === 1 ? 'código' : 'códigos'}</span>
        </div>
        {pasos.length === 0 && <Vacio icono={<Hash />} titulo="Ningún código coincide" />}
      </div>
      {pasos.map((p) => (
        <div className="card" key={p.titulo}>
          <div className="card-head">
            <div>
              <h2>{p.titulo}</h2>
              <p className="small muted" style={{ margin: '4px 0 0' }}>{p.descripcion}</p>
            </div>
          </div>
          {p.catalogos.map((c) => (
            // Al buscar se abren todos; la clave cambia para que el atributo inicial `open` se vuelva a aplicar.
            <details key={`${c.titulo}-${q !== ''}`} className="catalogo" open={q !== '' || c.codigos.length <= LARGO}>
              <summary>
                <strong>{c.titulo}</strong> <span className="badge">{c.codigos.length} {c.codigos.length === 1 ? 'código' : 'códigos'}</span>
              </summary>
              <p className="small" style={{ margin: '0 16px 8px' }}>{c.uso} <span className="muted">{c.fuente}</span></p>
              <div className="table-wrap">
                <table className="apilada">
                  <thead><tr><th>Código</th><th>Significado</th><th>Uso</th></tr></thead>
                  <tbody>
                    {c.codigos.map((x) => (
                      <tr key={x.codigo}>
                        <td className="mono nowrap" style={{ width: 90 }}><strong>{x.codigo}</strong></td>
                        <td className="small">{x.descripcion}</td>
                        <td className="small muted">
                          {x.soloAjustes && <span className="badge warn">Solo en NC o ND de ajuste</span>} {x.nota}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          ))}
        </div>
      ))}
    </>
  );
}

export function Glosario() {
  const [pestana, setPestana] = useState<'terminos' | 'codigos'>('terminos');
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Glosario</h1>
          <p>{TERMINOS.length} términos, {SIGLAS.length} siglas y {TOTAL_CODIGOS} códigos de la facturación electrónica, según la normativa vigente al {FECHA_GLOSARIO}.</p>
        </div>
      </div>
      <Alerta tipo="info">
        Cuando la norma trae una definición literal se respeta su redacción; en los demás casos se resume la disposición citada. Fuentes en formato APA 7.ª edición (autor, año y artículo o nota); DGT es la Dirección General de Tributación.
      </Alerta>
      <div className="tabs" role="tablist" style={{ marginTop: 16 }}>
        <button role="tab" aria-selected={pestana === 'terminos'} className={pestana === 'terminos' ? 'on' : ''} onClick={() => setPestana('terminos')}>Términos y siglas</button>
        <button role="tab" aria-selected={pestana === 'codigos'} className={pestana === 'codigos' ? 'on' : ''} onClick={() => setPestana('codigos')}>Códigos por paso del proceso</button>
      </div>
      <div style={{ marginTop: 16 }}>{pestana === 'terminos' ? <Terminos /> : <Codigos />}</div>
      <div className="card" style={{ marginTop: 16 }}>
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
