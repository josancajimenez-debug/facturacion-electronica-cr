import { ClipboardList, Download } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LIMITE_BITACORA } from '../backend/tipos';
import { Vacio } from '../components/ui';
import { useApp } from '../estado';
import { csv, descargar, fechaHora, hoyCR } from '../lib/formato';

export function Bitacora() {
  const { bitacora, backend, comprobantes } = useApp();
  const [filtro, setFiltro] = useState('');
  const lista = bitacora.filter((b) => `${b.accion} ${b.clave ?? ''} ${b.detalle ?? ''} ${b.usuario ?? ''}`.toLowerCase().includes(filtro.toLowerCase()));
  // Las claves de recepción y confirmación son de comprobantes de proveedores: no tienen página de detalle.
  const emitidos = new Set(comprobantes.map((c) => c.clave));

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Auditoría</h1>
          <p>
            Bitácora de cada transacción (art. 6, MH-DGT-RES-0027-2024).{' '}
            {backend.modo === 'supabase' ? 'Solo la función Edge y los triggers de la base de datos escriben en ella; la seguridad por fila impide modificarla desde el cliente.' : 'En modo local se guarda en este navegador.'}
          </p>
        </div>
        <button className="btn" disabled={!lista.length} onClick={() => descargar(`bitacora-${hoyCR()}.csv`, csv([['Fecha', 'Acción', 'Clave', 'Consecutivo', 'Documento', 'Detalle', 'Usuario', 'Ambiente'], ...lista.map((b) => [b.fecha, b.accion, b.clave, b.consecutivo, b.documento, b.detalle, b.usuario, b.ambiente])]), 'text/csv')}>
          <Download /> CSV
        </button>
      </div>
      <div className="card">
        <div className="card-head">
          <input placeholder="Filtrar por acción, clave, detalle o usuario" value={filtro} onChange={(e) => setFiltro(e.target.value)} style={{ maxWidth: 380 }} aria-label="Filtrar bitácora" />
          <span className="small muted">
            {lista.length} entradas
            {backend.modo === 'supabase' && bitacora.length >= LIMITE_BITACORA && ` (se muestran las ${LIMITE_BITACORA} más recientes)`}
          </span>
        </div>
        {lista.length === 0 ? (
          <Vacio icono={<ClipboardList />} titulo="Sin registros" />
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Fecha</th><th>Acción</th><th>Referencia</th><th>Detalle</th><th>Usuario</th></tr></thead>
              <tbody>
                {lista.map((b) => (
                  <tr key={b.id}>
                    <td className="nowrap small">{fechaHora(b.fecha)}</td>
                    <td><span className={`badge ${b.accion.includes('rechaz') || b.accion.includes('bloqueado') ? 'err' : b.accion.includes('aceptado') ? 'ok' : ''}`}>{b.accion}</span></td>
                    <td className="mono small">
                      {b.clave
                        ? emitidos.has(b.clave)
                          ? <Link to={`/comprobantes/${b.clave}`}>{b.consecutivo ?? b.clave.slice(21, 41)}</Link>
                          : <span title={b.clave}>{b.consecutivo ?? b.clave.slice(21, 41)}</span>
                        : b.documento ?? '—'}
                    </td>
                    <td className="small" style={{ maxWidth: 420, wordBreak: 'break-word' }}>{b.detalle ?? ''}</td>
                    <td className="small">{b.usuario ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
