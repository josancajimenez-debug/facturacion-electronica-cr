import { balanceComprobacion, libroMayor } from '@fe-cr/core';
import { Download } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alerta, Cargando, Selector, Texto } from '../components/ui';
import { useApp } from '../estado';
import { finDeMes, useContabilidad } from '../lib/contabilidad';
import { csv, descargar, dinero, fecha, mesCR } from '../lib/formato';

export function LibroMayor() {
  const { comprobantesListos } = useApp();
  const { libro } = useContabilidad();
  const [desde, setDesde] = useState(`${mesCR().slice(0, 4)}-01`);
  const [hasta, setHasta] = useState(mesCR);
  const [codigo, setCodigo] = useState('');

  const datos = useMemo(() => {
    if (!libro) return null;
    const corte = finDeMes(hasta);
    return { mayor: libroMayor(libro.asientos, `${desde}-01`, corte), comprobacion: balanceComprobacion(libro.asientos, corte) };
  }, [libro, desde, hasta]);

  if (!comprobantesListos || !datos) return <Cargando />;
  const { mayor, comprobacion } = datos;
  const seleccionada = mayor.find((m) => m.cuenta.codigo === codigo) ?? mayor[0];

  const exportar = () =>
    descargar(`libro-mayor-${desde}-a-${hasta}.csv`, csv([
      ['Cuenta', 'Nombre', 'Asiento', 'Fecha', 'Glosa', 'Debe', 'Haber', 'Saldo'],
      ...mayor.flatMap((m) => [
        [m.cuenta.codigo, m.cuenta.nombre, '', `${desde}-01`, 'Saldo inicial', '', '', m.saldoInicial.toFixed(2)],
        ...m.movimientos.map((x) => [m.cuenta.codigo, m.cuenta.nombre, x.numero, x.fecha, x.glosa, x.debe.toFixed(2), x.haber.toFixed(2), x.saldo.toFixed(2)]),
      ]),
    ]), 'text/csv');

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Libro mayor</h1>
          <p>Movimientos y saldo de cada cuenta a partir del libro diario, y balance de comprobación de sumas y saldos al cierre del período.</p>
        </div>
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <div style={{ width: 160 }}><Texto etiqueta="Desde" tipo="month" valor={desde} onCambio={(v) => v && setDesde(v)} /></div>
          <div style={{ width: 160 }}><Texto etiqueta="Hasta" tipo="month" valor={hasta} onCambio={(v) => v && setHasta(v)} /></div>
          <button className="btn" onClick={exportar} disabled={mayor.length === 0}><Download /> CSV</button>
        </div>
      </div>

      {mayor.length === 0 ? (
        <Alerta>No hay asientos hasta {hasta}. Emita o confirme comprobantes para generar movimientos.</Alerta>
      ) : (
        <div className="stack">
          <div className="card">
            <div className="card-head">
              <h2>Cuenta</h2>
              <div style={{ minWidth: 280 }}>
                <Selector etiqueta="Cuenta del mayor" valor={seleccionada.cuenta.codigo} onCambio={setCodigo} mostrarCodigo
                  opciones={mayor.map((m) => ({ codigo: m.cuenta.codigo, descripcion: m.cuenta.nombre }))} />
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Asiento</th><th>Fecha</th><th>Glosa</th><th className="right">Debe</th><th className="right">Haber</th><th className="right">Saldo</th></tr></thead>
                <tbody>
                  <tr><td /><td className="nowrap">{fecha(`${desde}-01`)}</td><td className="muted">Saldo inicial</td><td /><td /><td className="num">{dinero(seleccionada.saldoInicial)}</td></tr>
                  {seleccionada.movimientos.map((m, i) => (
                    <tr key={i}>
                      <td>{m.clave ? <Link to={`/contabilidad/diario?clave=${m.clave}`}>{m.numero}</Link> : m.numero}</td>
                      <td className="nowrap">{fecha(m.fecha)}</td>
                      <td className="small">{m.glosa}</td>
                      <td className="num">{m.debe ? dinero(m.debe) : ''}</td>
                      <td className="num">{m.haber ? dinero(m.haber) : ''}</td>
                      <td className="num">{dinero(m.saldo)}</td>
                    </tr>
                  ))}
                  <tr>
                    <th colSpan={3}>Saldo final ({seleccionada.cuenta.naturaleza})</th>
                    <th className="num">{dinero(seleccionada.debe)}</th>
                    <th className="num">{dinero(seleccionada.haber)}</th>
                    <th className="num">{dinero(seleccionada.saldoFinal)}</th>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <h2>Balance de comprobación al {fecha(finDeMes(hasta))}</h2>
              <span className={`badge ${comprobacion.cuadra ? 'ok' : 'err'}`}>{comprobacion.cuadra ? 'Cuadrado' : 'Descuadrado'}</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Código</th><th>Cuenta</th><th className="right">Debe</th><th className="right">Haber</th><th className="right">Saldo deudor</th><th className="right">Saldo acreedor</th></tr>
                </thead>
                <tbody>
                  {comprobacion.filas.map((f) => (
                    <tr key={f.cuenta.codigo}>
                      <td className="mono small">{f.cuenta.codigo}</td>
                      <td>{f.cuenta.nombre}</td>
                      <td className="num">{dinero(f.debe)}</td>
                      <td className="num">{dinero(f.haber)}</td>
                      <td className="num">{f.saldoDeudor ? dinero(f.saldoDeudor) : ''}</td>
                      <td className="num">{f.saldoAcreedor ? dinero(f.saldoAcreedor) : ''}</td>
                    </tr>
                  ))}
                  <tr>
                    <th colSpan={2}>Totales</th>
                    <th className="num">{dinero(comprobacion.totales.debe)}</th>
                    <th className="num">{dinero(comprobacion.totales.haber)}</th>
                    <th className="num">{dinero(comprobacion.totales.saldoDeudor)}</th>
                    <th className="num">{dinero(comprobacion.totales.saldoAcreedor)}</th>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
