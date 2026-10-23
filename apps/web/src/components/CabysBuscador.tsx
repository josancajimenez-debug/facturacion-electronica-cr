import { descripcion, TARIFA_IVA } from '@fe-cr/core';
import { useEffect, useState } from 'react';
import { buscarCabys, cargarCabys, type ItemCabys } from '../lib/cabys';

/** Búsqueda en el Catálogo de Bienes y Servicios 2025 por código o descripción. */
export function CabysBuscador({ onElegir }: { onElegir: (item: ItemCabys) => void }) {
  const [q, setQ] = useState('');
  const [res, setRes] = useState<ItemCabys[]>([]);
  const [estado, setEstado] = useState('');

  useEffect(() => {
    cargarCabys().then(
      (c) => setEstado(`${c.total.toLocaleString('es-CR')} códigos disponibles.`),
      (e) => setEstado(String(e)),
    );
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      buscarCabys(q).then(setRes, () => setRes([]));
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="field">
      <label htmlFor="cabys-q">Buscar en CAByS 2025</label>
      <input id="cabys-q" placeholder="Ej.: servicios de contabilidad, café molido, 8222100000000" value={q} onChange={(e) => setQ(e.target.value)} />
      <span className="hint">{estado} Fuente: Banco Central de Costa Rica, Cabys 2025 (1/4/2025).</span>
      {res.length > 0 && (
        <div className="search-results" role="listbox">
          {res.map((r) => (
            <button key={r.codigo} type="button" onClick={() => { onElegir(r); setQ(''); setRes([]); }}>
              <span className="mono">{r.codigo}</span> · {r.descripcion}{' '}
              <span className="badge">{r.impuesto}{r.codigoTarifaIva ? ` → ${descripcion(TARIFA_IVA, r.codigoTarifaIva)}` : ''}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
