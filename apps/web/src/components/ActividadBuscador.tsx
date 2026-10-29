import { ACTIVIDADES_CIIU4, buscarActividades, type ActividadCiiu4 } from '@fe-cr/core';
import { useId, useMemo, useState } from 'react';

/** Búsqueda en el listado de actividades económicas CIIU 4 de TRIBU-CR por código o descripción. */
export function ActividadBuscador({ onElegir, yaElegidas, etiqueta = 'Buscar actividad económica (CIIU 4)' }: { onElegir: (a: ActividadCiiu4) => void; yaElegidas: string[]; etiqueta?: string }) {
  const id = useId();
  const [q, setQ] = useState('');
  const res = useMemo(() => buscarActividades(q), [q]);
  const sinResultados = q.trim().length >= 2 && res.length === 0;

  return (
    <div className="field">
      <label htmlFor={id}>{etiqueta}</label>
      <input id={id} type="search" placeholder="Ej.: repuestos, contabilidad, panadería, 4530" value={q} onChange={(e) => setQ(e.target.value)} />
      <span className="hint">
        {ACTIVIDADES_CIIU4.length} actividades del listado oficial del Ministerio de Hacienda (correspondencia ATV – TRIBU-CR). Busca también por el nombre que tenía la actividad en ATV.
        {sinResultados && ' Sin coincidencias: pruebe con otra palabra o escriba el código manualmente con «Agregar».'}
      </span>
      {res.length > 0 && (
        <div className="search-results" role="listbox" aria-label="Actividades encontradas">
          {res.map((a) => {
            const elegida = yaElegidas.includes(a.codigo);
            return (
              <button key={a.codigo} type="button" role="option" aria-selected={elegida} disabled={elegida} onClick={() => { onElegir(a); setQ(''); }}>
                <span className="mono">{a.codigo}</span> · {a.descripcion}
                {a.coincidencia && <span className="small muted"> — incluye «{a.coincidencia.toLowerCase()}»</span>}
                {elegida && <> <span className="badge">Ya agregada</span></>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
