import { MEDIO_PAGO, NOMBRE_COMPROBANTE, TARIFA_IVA, descripcion, type TipoComprobante } from '@fe-cr/core';
import { Download } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Alerta, Texto } from '../components/ui';
import { useApp } from '../estado';
import { csv, descargar, dinero } from '../lib/formato';

type Fila = { clave: string; etiqueta: string; base: number; impuesto: number; cantidad: number };

/** Signo de cada comprobante en las ventas: las NC restan; FEC (compras) y REP (pagos) no son ventas nuevas. */
const signoVenta = (t: TipoComprobante) => (t === 'NC' ? -1 : t === 'FEC' || t === 'REP' ? 0 : 1);

export function Reportes() {
  const { comprobantes, recibidos } = useApp();
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7));

  const datos = useMemo(() => {
    const delMes = comprobantes.filter((c) => c.fechaEmision.startsWith(mes) && c.estado === 'aceptado');
    const porTarifa = new Map<string, Fila>();
    const porMedio = new Map<string, Fila>();
    const porTipo = new Map<string, Fila>();
    let compras = 0;
    let ivaCompras = 0;
    for (const c of delMes) {
      const s = signoVenta(c.tipo);
      const tc = c.resumen.tipoCambio || 1;
      const t = porTipo.get(c.tipo) ?? { clave: c.tipo, etiqueta: NOMBRE_COMPROBANTE[c.tipo], base: 0, impuesto: 0, cantidad: 0 };
      t.base += c.resumen.totalVentaNeta * tc;
      t.impuesto += c.resumen.totalImpuesto * tc;
      t.cantidad++;
      porTipo.set(c.tipo, t);
      if (c.tipo === 'FEC') {
        compras += c.resumen.totalVentaNeta * tc;
        ivaCompras += c.resumen.totalImpuesto * tc;
      }
      if (s === 0) continue;
      for (const l of c.lineas) {
        const iva = l.impuestos.find((i) => i.codigo === '01');
        const k = iva?.codigoTarifaIva ?? '—';
        const f = porTarifa.get(k) ?? { clave: k, etiqueta: descripcion(TARIFA_IVA, k), base: 0, impuesto: 0, cantidad: 0 };
        f.base += s * l.subTotal * tc;
        f.impuesto += s * l.impuestoNeto * tc;
        f.cantidad++;
        porTarifa.set(k, f);
      }
      const medios = c.resumen.mediosPago.length ? c.resumen.mediosPago : [{ tipo: 'credito', monto: c.resumen.totalComprobante }];
      for (const m of medios) {
        const etiqueta = m.tipo === 'credito' ? 'Sin medio de pago (crédito)' : descripcion(MEDIO_PAGO, m.tipo);
        const f = porMedio.get(m.tipo) ?? { clave: m.tipo, etiqueta, base: 0, impuesto: 0, cantidad: 0 };
        f.base += s * (m.monto ?? c.resumen.totalComprobante) * tc;
        f.cantidad++;
        porMedio.set(m.tipo, f);
      }
    }
    const recMes = recibidos.filter((r) => r.fechaEmision.startsWith(mes));
    const confirmados = recMes.filter((r) => r.estado === 'aceptado' || r.estado === 'aceptado-parcial');
    return {
      tarifas: [...porTarifa.values()].sort((a, b) => a.clave.localeCompare(b.clave)),
      medios: [...porMedio.values()].sort((a, b) => b.base - a.base),
      tipos: [...porTipo.values()],
      compras, ivaCompras,
      recibidosConfirmados: confirmados.length,
      creditoRecibidos: confirmados.reduce((s, r) => s + r.totalImpuesto, 0),
      pendientes: recMes.filter((r) => r.estado === 'pendiente').length,
    };
  }, [comprobantes, recibidos, mes]);

  const exportar = () =>
    descargar(`reporte-${mes}.csv`, csv([
      ['Reporte del período', mes, 'Montos en colones; solo comprobantes ACEPTADOS (simulado)'],
      [],
      ['Ventas por tarifa de IVA', 'Base (subtotal)', 'Impuesto neto', 'Líneas'],
      ...datos.tarifas.map((f) => [f.etiqueta, f.base.toFixed(2), f.impuesto.toFixed(2), f.cantidad]),
      [],
      ['Ventas por medio de pago', 'Monto', '', 'Comprobantes'],
      ...datos.medios.map((f) => [f.etiqueta, f.base.toFixed(2), '', f.cantidad]),
      [],
      ['Por tipo de comprobante', 'Venta neta', 'Impuesto', 'Cantidad'],
      ...datos.tipos.map((f) => [f.etiqueta, f.base.toFixed(2), f.impuesto.toFixed(2), f.cantidad]),
      [],
      ['Compras con FEC', datos.compras.toFixed(2), datos.ivaCompras.toFixed(2)],
      ['Recibidos confirmados', datos.recibidosConfirmados, datos.creditoRecibidos.toFixed(2)],
    ]), 'text/csv');

  const maxMedio = Math.max(1, ...datos.medios.map((m) => Math.abs(m.base)));

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Reportes</h1>
          <p>Resumen del período a partir de comprobantes aceptados por el simulador. Útil como apoyo, no sustituye la declaración de IVA (D-104) en TRIBU-CR.</p>
        </div>
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <div style={{ width: 170 }}><Texto etiqueta="Período" tipo="month" valor={mes} onCambio={setMes} /></div>
          <button className="btn" onClick={exportar}><Download /> CSV</button>
        </div>
      </div>
      <div className="grid grid-2">
        <div className="card">
          <div className="card-head"><h2>Ventas por tarifa de IVA</h2></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Tarifa</th><th className="right">Base</th><th className="right">Impuesto</th></tr></thead>
              <tbody>
                {datos.tarifas.length === 0 && <tr><td colSpan={3} className="muted">Sin ventas aceptadas en el período.</td></tr>}
                {datos.tarifas.map((f) => <tr key={f.clave}><td>{f.etiqueta}</td><td className="num">{dinero(f.base)}</td><td className="num">{dinero(f.impuesto)}</td></tr>)}
                {datos.tarifas.length > 0 && (
                  <tr><th>Total</th><th className="num">{dinero(datos.tarifas.reduce((s, f) => s + f.base, 0))}</th><th className="num">{dinero(datos.tarifas.reduce((s, f) => s + f.impuesto, 0))}</th></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <div className="card-head"><h2>Cobros por medio de pago</h2></div>
          <div className="card-body stack" style={{ gap: 10 }}>
            {datos.medios.length === 0 && <span className="muted">Sin datos.</span>}
            {datos.medios.map((m) => (
              <div key={m.clave}>
                <div className="row" style={{ justifyContent: 'space-between' }}><span>{m.etiqueta}{m.clave === '06' && <span className="badge info" style={{ marginLeft: 6 }}>SINPE</span>}</span><span className="num">{dinero(m.base)}</span></div>
                <div className="bar-track"><div className="bar" style={{ width: `${(Math.abs(m.base) / maxMedio) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-head"><h2>Por tipo de comprobante</h2></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Tipo</th><th className="right">Cant.</th><th className="right">Venta neta</th><th className="right">Impuesto</th></tr></thead>
              <tbody>{datos.tipos.map((f) => <tr key={f.clave}><td>{f.etiqueta}</td><td className="num">{f.cantidad}</td><td className="num">{dinero(f.base)}</td><td className="num">{dinero(f.impuesto)}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <div className="card-head"><h2>Compras y crédito fiscal</h2></div>
          <div className="card-body stack">
            <div className="row" style={{ justifyContent: 'space-between' }}><span>Compras respaldadas con FEC</span><span className="num">{dinero(datos.compras)}</span></div>
            <div className="row" style={{ justifyContent: 'space-between' }}><span>Comprobantes recibidos confirmados</span><span className="num">{datos.recibidosConfirmados}</span></div>
            <div className="row" style={{ justifyContent: 'space-between' }}><span>Impuesto en recibidos confirmados</span><span className="num">{dinero(datos.creditoRecibidos)}</span></div>
            {datos.pendientes > 0 && <Alerta tipo="warn">{datos.pendientes} comprobante(s) recibidos del período siguen pendientes de confirmar.</Alerta>}
          </div>
        </div>
      </div>
    </>
  );
}
