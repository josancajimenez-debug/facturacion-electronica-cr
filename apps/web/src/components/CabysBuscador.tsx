import { descripcion, TARIFA_IVA } from '@fe-cr/core';
import { useEffect, useId, useState } from 'react';
import { buscarCabys, cargarCabys, type ItemCabys } from '../lib/cabys';

/** Búsqueda en el Catálogo de Bienes y Servicios 2025 por código o descripción. */
export function CabysBuscador({ onElegir }: { onElegir: (item: ItemCabys) => void }) {
  const id = useId();
  const [q, setQ] = useState('');
  const [res, setRes] = useState<ItemCabys[]>([]);
  const [estado, setEstado] = useState('Cargando catálogo…');

  useEffect(() => {
    let vigente = true;
    cargarCabys().then(
      (c) => vigente && setEstado(`${c.total.toLocaleString('es-CR')} códigos disponibles.`),
      (e: Error) => vigente && setEstado(`${e.message} La búsqueda no está disponible.`),
    );
    return () => {
      vigente = false;
    };
  }, []);

  useEffect(() => {
    // Se descarta la respuesta de una búsqueda anterior que llegue después de la actual.
    let vigente = true;
    const t = setTimeout(() => {
      buscarCabys(q).then((r) => vigente && setRes(r), () => vigente && setRes([]));
    }, 200);
    return () => {
      vigente = false;
      clearTimeout(t);
    };
  }, [q]);

  const sinResultados = q.trim().length >= 3 && res.length === 0;

  return (
    <div className="field">
      <label htmlFor={id}>Buscar en CAByS 2025</label>
      <input id={id} type="search" placeholder="Ej.: servicios de contabilidad, café molido, 8222100000000" value={q} onChange={(e) => setQ(e.target.value)} />
      <span className="hint">{estado} Fuente: Banco Central de Costa Rica, Cabys 2025 (1/4/2025).{sinResultados && ' Sin coincidencias.'}</span>
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
