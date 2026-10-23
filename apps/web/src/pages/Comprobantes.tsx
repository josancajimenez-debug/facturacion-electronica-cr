import { CONDICION_VENTA, MEDIO_PAGO, NOMBRE_COMPROBANTE, TARIFA_IVA, descripcion } from '@fe-cr/core';
import { Download, FileText, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Estado, Selector, Texto, Vacio } from '../components/ui';
import { useApp } from '../estado';
import { csv, descargar, dinero, fechaHora } from '../lib/formato';

/** Criterios de búsqueda del art. 14 inc. 10 del Decreto 44739-H (consulta para la Administración Tributaria). */
interface Filtros {
  texto: string;
  tipo: string;
  estado: string;
  medioPago: string;
  condicion: string;
  tarifa: string;
  desde: string;
  hasta: string;
  montoMin: string;
  montoMax: string;
}

const inicial: Filtros = { texto: '', tipo: '', estado: '', medioPago: '', condicion: '', tarifa: '', desde: '', hasta: '', montoMin: '', montoMax: '' };

export function Comprobantes() {
  const { comprobantes } = useApp();
  const navegar = useNavigate();
  const [f, setF] = useState<Filtros>(inicial);
  const set = (p: Partial<Filtros>) => setF((x) => ({ ...x, ...p }));

  const lista = useMemo(
    () =>
      comprobantes.filter((c) => {
        const t = f.texto.trim();
        if (t && !`${c.clave} ${c.consecutivo} ${c.contraparte?.identificacion?.numero ?? ''} ${c.contraparte?.nombre ?? ''}`.toLowerCase().includes(t.toLowerCase())) return false;
        if (f.tipo && c.tipo !== f.tipo) return false;
        if (f.estado && c.estado !== f.estado) return false;
        if (f.medioPago && !c.resumen.mediosPago.some((m) => m.tipo === f.medioPago)) return false;
        if (f.condicion && c.borrador.condicionVenta !== f.condicion) return false;
        if (f.tarifa && !c.resumen.totalDesgloseImpuesto.some((d) => d.codigoTarifaIva === f.tarifa)) return false;
        const dia = c.fechaEmision.slice(0, 10);
        if (f.desde && dia < f.desde) return false;
        if (f.hasta && dia > f.hasta) return false;
        if (f.montoMin && c.resumen.totalComprobante < Number(f.montoMin)) return false;
        if (f.montoMax && c.resumen.totalComprobante > Number(f.montoMax)) return false;
        return true;
      }),
    [comprobantes, f],
  );

  const exportar = () =>
    descargar(
      `comprobantes-${new Date().toISOString().slice(0, 10)}.csv`,
      csv([
        ['Clave', 'Consecutivo', 'Tipo', 'Fecha emisión', 'Identificación contraparte', 'Nombre contraparte', 'Condición venta', 'Medios de pago', 'Moneda', 'Total venta neta', 'Total impuesto', 'Total comprobante', 'Estado'],
        ...lista.map((c) => [
          c.clave, c.consecutivo, c.tipo, c.fechaEmision, c.contraparte?.identificacion?.numero, c.contraparte?.nombre,
          descripcion(CONDICION_VENTA, c.borrador.condicionVenta), c.resumen.mediosPago.map((m) => descripcion(MEDIO_PAGO, m.tipo)).join(' + '),
          c.resumen.codigoMoneda, c.resumen.totalVentaNeta, c.resumen.totalImpuesto, c.resumen.totalComprobante, c.estado,
        ]),
      ]),
      'text/csv',
    );

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Comprobantes emitidos</h1>
          <p>Consulta selectiva por cédula, número, medio de pago, condición de venta, fecha, montos, impuestos y estado (art. 14 inc. 10, Decreto 44739-H).</p>
        </div>
        <div className="row">
          <button className="btn" onClick={exportar} disabled={!lista.length}><Download /> CSV</button>
          <Link className="btn btn-primary" to="/emitir"><Plus /> Emitir</Link>
        </div>
      </div>
      <div className="card">
        <div className="card-body grid grid-4">
          <Texto etiqueta="Clave, consecutivo, cédula o nombre" valor={f.texto} onCambio={(v) => set({ texto: v })} />
          <Selector etiqueta="Tipo" valor={f.tipo} vacio="Todos" mostrarCodigo={false} onCambio={(v) => set({ tipo: v })} opciones={Object.entries(NOMBRE_COMPROBANTE).map(([codigo, descripcion]) => ({ codigo, descripcion }))} />
          <Selector etiqueta="Estado (Hacienda simulado)" valor={f.estado} vacio="Todos" mostrarCodigo={false} onCambio={(v) => set({ estado: v })} opciones={['aceptado', 'rechazado', 'procesando', 'recibido', 'enviado', 'generado', 'error'].map((e) => ({ codigo: e, descripcion: e }))} />
          <Selector etiqueta="Medio de pago" valor={f.medioPago} vacio="Todos" onCambio={(v) => set({ medioPago: v })} opciones={MEDIO_PAGO} />
          <Selector etiqueta="Condición de venta" valor={f.condicion} vacio="Todas" onCambio={(v) => set({ condicion: v })} opciones={CONDICION_VENTA} />
          <Selector etiqueta="Tarifa de IVA" valor={f.tarifa} vacio="Todas" onCambio={(v) => set({ tarifa: v })} opciones={TARIFA_IVA} />
          <Texto etiqueta="Desde" tipo="date" valor={f.desde} onCambio={(v) => set({ desde: v })} />
          <Texto etiqueta="Hasta" tipo="date" valor={f.hasta} onCambio={(v) => set({ hasta: v })} />
          <Texto etiqueta="Monto mínimo" tipo="number" valor={f.montoMin} onCambio={(v) => set({ montoMin: v })} />
          <Texto etiqueta="Monto máximo" tipo="number" valor={f.montoMax} onCambio={(v) => set({ montoMax: v })} />
          <div className="field" style={{ justifyContent: 'flex-end' }}><button className="btn" onClick={() => setF(inicial)}>Limpiar filtros</button></div>
        </div>
      </div>
      <div className="card">
        {lista.length === 0 ? (
          <Vacio icono={<FileText />} titulo="No hay comprobantes con esos criterios" />
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Fecha</th><th>Tipo</th><th>Consecutivo</th><th>Contraparte</th><th>Condición</th><th className="right">Total</th><th>Estado</th></tr></thead>
              <tbody>
                {lista.map((c) => (
                  <tr key={c.clave} className="clickable" onClick={() => navegar(`/comprobantes/${c.clave}`)}>
                    <td className="nowrap">{fechaHora(c.fechaEmision)}</td>
                    <td><span className="badge">{c.tipo}</span></td>
                    <td className="mono"><Link to={`/comprobantes/${c.clave}`} onClick={(e) => e.stopPropagation()}>{c.consecutivo}</Link></td>
                    <td>{c.contraparte?.nombre ?? <span className="muted">Consumidor final</span>}</td>
                    <td className="small">{descripcion(CONDICION_VENTA, c.borrador.condicionVenta)}</td>
                    <td className="num">{dinero(c.resumen.totalComprobante, c.resumen.codigoMoneda)}</td>
                    <td><Estado estado={c.estado} /></td>
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
