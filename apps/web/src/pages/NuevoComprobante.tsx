import {
  CODIGO_DESCUENTO,
  CODIGO_REFERENCIA,
  CONDICION_VENTA,
  FORMAS_FARMACEUTICAS_MINSA,
  INSTITUCION_EXONERACION,
  MEDIO_PAGO,
  MONEDA,
  NOMBRE_COMPROBANTE,
  SITUACION,
  TARIFA_IVA,
  TIPO_DOC_REFERENCIA,
  TIPO_EXONERACION,
  TIPO_IDENTIFICACION,
  TIPO_OTROS_CARGOS,
  TIPO_TRANSACCION,
  UNIDAD_MEDIDA,
  fechaEmisionCR,
  previsualizar,
  tarifaIva,
  type BorradorComprobante,
  type Contraparte,
  type LineaBorrador,
  type Receptor,
  type TipoComprobante,
  type Validacion,
} from '@fe-cr/core';
import { Plus, Send, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ErrorConValidaciones } from '../backend/tipos';
import { CabysBuscador } from '../components/CabysBuscador';
import { UbicacionCampos } from '../components/UbicacionCampos';
import { Alerta, ListaValidaciones, Selector, Texto } from '../components/ui';
import { useApp } from '../estado';
import { aRfc, deRfc, dinero } from '../lib/formato';

const TIPOS: { codigo: TipoComprobante; corto: string }[] = [
  { codigo: 'FE', corto: 'Factura' },
  { codigo: 'TE', corto: 'Tiquete' },
  { codigo: 'NC', corto: 'Nota crédito' },
  { codigo: 'ND', corto: 'Nota débito' },
  { codigo: 'FEC', corto: 'Factura compra' },
  { codigo: 'FEE', corto: 'Exportación' },
  { codigo: 'REP', corto: 'Recibo de pago' },
];

export const contraparteDesde = (r: Receptor): Contraparte => ({
  nombre: r.nombre,
  nombreComercial: r.nombreComercial,
  identificacion: r.identificacion,
  ubicacion: r.ubicacion,
  otrasSenasExtranjero: r.otrasSenasExtranjero,
  telefono: r.telefono,
  correo: r.correo,
});

export function NuevoComprobante() {
  const { emisor, receptores, productos, comprobantes, backend, avisar } = useApp();
  const navegar = useNavigate();
  const ubicacion = useLocation();
  const prellenado = (ubicacion.state as { borrador?: Partial<BorradorComprobante>; receptorId?: string } | null) ?? null;
  const principal = emisor!.actividades.find((a) => a.principal)?.codigo ?? emisor!.actividades[0]?.codigo;

  const [b, setB] = useState<BorradorComprobante>(() => ({
    tipo: 'FE',
    emisorId: emisor!.id,
    sucursal: emisor!.sucursales[0]?.codigo ?? '001',
    terminal: emisor!.sucursales[0]?.terminales[0] ?? '00001',
    situacion: '1',
    codigoActividadEmisor: principal,
    condicionVenta: '01',
    moneda: 'CRC',
    tipoCambio: 1,
    lineas: [],
    otrosCargos: [],
    mediosPago: [{ tipo: '01' }],
    referencias: [],
    ...prellenado?.borrador,
  }));
  // Si llega una contraparte prellenada (p. ej. desde una nota de crédito) se conserva como "manual".
  const [receptorId, setReceptorId] = useState<string>(prellenado?.receptorId ?? (prellenado?.borrador?.contraparte ? '__manual' : ''));
  const [escenario, setEscenario] = useState('');
  const [erroresServidor, setErroresServidor] = useState<Validacion[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [buscarCabysEn, setBuscarCabysEn] = useState<number | null>(null);

  const set = (p: Partial<BorradorComprobante>) => setB((x) => ({ ...x, ...p }));
  const setLinea = (i: number, p: Partial<LineaBorrador>) => set({ lineas: b.lineas.map((l, j) => (j === i ? { ...l, ...p } : l)) });
  const receptor = receptores.find((r) => r.id === receptorId);
  const sucursal = emisor!.sucursales.find((s) => s.codigo === b.sucursal);

  // Ajustes dependientes del tipo de comprobante.
  useEffect(() => {
    setB((x) => {
      const n = { ...x };
      if (x.tipo === 'REP' && !['09', '11'].includes(x.condicionVenta)) n.condicionVenta = '11';
      if (x.tipo !== 'REP' && ['09', '11'].includes(x.condicionVenta)) n.condicionVenta = '01';
      if (x.tipo === 'FEC') {
        n.codigoActividadReceptor = x.codigoActividadReceptor ?? principal;
        n.codigoActividadEmisor = undefined;
      } else {
        n.codigoActividadEmisor = x.codigoActividadEmisor ?? principal;
        if (!receptor?.actividadEconomica) n.codigoActividadReceptor = undefined;
      }
      if (x.tipo === 'FEE') n.lineas = x.lineas.map((l) => ({ ...l, exoneracion: undefined }));
      return n;
    });
  }, [b.tipo]); // eslint-disable-line react-hooks/exhaustive-deps

  // La contraparte se toma del receptor seleccionado.
  useEffect(() => {
    if (receptor) {
      set({
        contraparte: contraparteDesde(receptor),
        codigoActividadReceptor: b.tipo === 'FEC' ? b.codigoActividadReceptor : receptor.actividadEconomica,
      });
    } else if (receptorId === '') {
      set({ contraparte: undefined });
    }
  }, [receptorId]); // eslint-disable-line react-hooks/exhaustive-deps

  const vista = useMemo(() => previsualizar(b, emisor!), [b, emisor]);
  const errores = vista.validaciones.filter((v) => v.nivel === 'error');
  const r = vista.resumen;

  // Los cargos definidos por porcentaje (p. ej. servicio 10 %) se recalculan cuando cambia la venta neta.
  const ventaNeta = r?.totalVentaNeta;
  useEffect(() => {
    if (ventaNeta === undefined) return;
    setB((x) => {
      let cambio = false;
      const otrosCargos = x.otrosCargos.map((o) => {
        if (o.porcentaje === undefined) return o;
        const monto = Math.round(ventaNeta * o.porcentaje) / 100;
        if (monto === o.monto) return o;
        cambio = true;
        return { ...o, monto };
      });
      return cambio ? { ...x, otrosCargos } : x;
    });
  }, [ventaNeta]);

  /** Precio del producto en la moneda del comprobante; null si no se puede convertir sin tipo de cambio. */
  const precioEnMoneda = (precio: number, moneda: string): number | null => {
    if (moneda === b.moneda) return precio;
    // Solo se conoce el tipo de cambio de la moneda del comprobante respecto al colón.
    if (moneda === 'CRC' && b.tipoCambio > 0) return Math.round((precio / b.tipoCambio) * 100000) / 100000;
    return null;
  };

  const agregarProducto = (id: string) => {
    const p = productos.find((x) => x.id === id);
    if (!p) return;
    const convertido = precioEnMoneda(p.precioUnitario, p.moneda);
    if (convertido === null) {
      avisar(`«${p.descripcion}» tiene precio en ${p.moneda} y el comprobante es en ${b.moneda}: se copió el precio sin convertir; ajústelo antes de emitir.`, 'err');
    } else if (p.moneda !== b.moneda) {
      avisar(`Precio convertido de ${p.moneda} a ${b.moneda} con el tipo de cambio ${b.tipoCambio}.`, 'info');
    }
    const linea: LineaBorrador = {
      codigoCabys: p.codigoCabys,
      detalle: p.descripcion,
      cantidad: 1,
      unidadMedida: p.unidadMedida,
      unidadMedidaComercial: p.unidadMedidaComercial,
      precioUnitario: convertido ?? p.precioUnitario,
      descuentos: [],
      codigoTarifaIva: p.codigoTarifaIva,
      impuestosAdicionales: p.impuestosAdicionales,
      codigoComercial: p.codigoComercial?.codigo ? p.codigoComercial : undefined,
      partidaArancelaria: b.tipo === 'FEE' ? p.partidaArancelaria : undefined,
      registroMedicamento: p.registroMedicamento,
      formaFarmaceutica: p.formaFarmaceutica,
      formaFarmaceuticaMinsa: p.formaFarmaceuticaMinsa,
      servicioSalud: p.servicioSalud,
      exoneracion: receptor?.exoneracion && b.tipo !== 'FEE' ? receptor.exoneracion : undefined,
    };
    set({ lineas: [...b.lineas, linea] });
  };

  const lineaVacia = (): LineaBorrador => ({ codigoCabys: '', detalle: '', cantidad: 1, unidadMedida: 'Unid', precioUnitario: 0, descuentos: [], codigoTarifaIva: '08' });

  const emitir = async () => {
    setEnviando(true);
    setErroresServidor([]);
    try {
      const { clave } = await backend.emitir(emisor!.id, b, escenario || undefined);
      avisar('Comprobante generado y enviado al simulador de Hacienda.', 'ok');
      navegar(`/comprobantes/${clave}`);
    } catch (e) {
      if (e instanceof ErrorConValidaciones) setErroresServidor(e.validaciones);
      avisar((e as Error).message, 'err');
    } finally {
      setEnviando(false);
    }
  };

  const esFEC = b.tipo === 'FEC';
  const requiereRef = ['NC', 'ND', 'FEC', 'REP'].includes(b.tipo);
  const credito = ['02', '10'].includes(b.condicionVenta);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Emitir {NOMBRE_COMPROBANTE[b.tipo]}</h1>
          <p>El consecutivo y la clave numérica se asignan al emitir; si hay errores no se consume numeración.</p>
        </div>
      </div>

      <div className="segmented" role="tablist" aria-label="Tipo de comprobante" style={{ marginBottom: 16 }}>
        {TIPOS.map((t) => (
          <button key={t.codigo} role="tab" aria-selected={b.tipo === t.codigo} className={b.tipo === t.codigo ? 'on' : ''} onClick={() => set({ tipo: t.codigo })}>
            {t.corto}
          </button>
        ))}
      </div>

      <div className="split">
        <div>
          {/* ---------- Encabezado ---------- */}
          <div className="card">
            <div className="card-head"><h2>Encabezado</h2></div>
            <div className="card-body grid grid-3">
              <Selector etiqueta="Sucursal" valor={b.sucursal} mostrarCodigo onCambio={(v) => set({ sucursal: v, terminal: emisor!.sucursales.find((s) => s.codigo === v)?.terminales[0] ?? '00001' })} opciones={emisor!.sucursales.map((s) => ({ codigo: s.codigo, descripcion: s.nombre }))} />
              <Selector etiqueta="Terminal" valor={b.terminal} mostrarCodigo={false} onCambio={(v) => set({ terminal: v })} opciones={(sucursal?.terminales ?? ['00001']).map((t) => ({ codigo: t, descripcion: t }))} />
              <Selector etiqueta="Situación" valor={b.situacion} onCambio={(v) => set({ situacion: v as BorradorComprobante['situacion'] })} opciones={SITUACION} ayuda={b.situacion === '3' ? 'Envío a más tardar 2 días hábiles después (art. 21).' : b.situacion === '2' ? 'Debe referenciar el comprobante provisional.' : undefined} />
              {esFEC ? (
                <Selector etiqueta="Actividad económica propia (CodigoActividadReceptor)" valor={b.codigoActividadReceptor} onCambio={(v) => set({ codigoActividadReceptor: v })} opciones={emisor!.actividades} requerido />
              ) : (
                <Selector etiqueta="Actividad económica del emisor" valor={b.codigoActividadEmisor} onCambio={(v) => set({ codigoActividadEmisor: v })} opciones={emisor!.actividades} requerido={b.tipo !== 'REP'} />
              )}
              <Selector etiqueta="Condición de venta (nota 5)" valor={b.condicionVenta} onCambio={(v) => set({ condicionVenta: v, mediosPago: ['02', '08', '10'].includes(v) ? [] : b.mediosPago.length ? b.mediosPago : [{ tipo: '01' }] })} opciones={CONDICION_VENTA.filter((c) => (b.tipo === 'REP' ? ['09', '11'].includes(c.codigo) : !['09', '11'].includes(c.codigo)))} />
              {credito && <Texto etiqueta="Plazo de crédito (días)" tipo="number" valor={b.plazoCredito} onCambio={(v) => set({ plazoCredito: v ? Number(v) : undefined })} requerido />}
              {b.condicionVenta === '99' && <Texto etiqueta="Detalle condición «Otros»" valor={b.condicionVentaOtros} onCambio={(v) => set({ condicionVentaOtros: v })} max={100} />}
              <Selector etiqueta="Moneda" valor={b.moneda} onCambio={(v) => set({ moneda: v, tipoCambio: v === 'CRC' ? 1 : b.tipoCambio === 1 ? 0 : b.tipoCambio })} opciones={MONEDA} />
              {b.moneda !== 'CRC' && (
                <div className="field">
                  <label>Tipo de cambio *</label>
                  <div className="row" style={{ flexWrap: 'nowrap' }}>
                    <input aria-label="Tipo de cambio" type="number" step="0.00001" value={b.tipoCambio || ''} onChange={(e) => set({ tipoCambio: Number(e.target.value) })} />
                    <button className="btn btn-sm" onClick={async () => {
                      try {
                        const tc = await backend.tipoCambio();
                        set({ tipoCambio: tc.venta });
                        avisar(`Tipo de cambio de venta ${tc.venta} (${tc.fecha}) – ${tc.fuente}`, 'ok');
                      } catch (e) {
                        avisar(`No se obtuvo el tipo de cambio: ${(e as Error).message}`, 'err');
                      }
                    }}>BCCR/Hacienda</button>
                  </div>
                  <span className="hint">USD: tipo de cambio de venta de referencia del BCCR.</span>
                </div>
              )}
            </div>
          </div>

          {/* ---------- Contraparte ---------- */}
          <div className="card">
            <div className="card-head"><h2>{esFEC ? 'Vendedor (nodo Emisor de la FEC)' : 'Receptor'}</h2></div>
            <div className="card-body stack">
              <Selector
                etiqueta={esFEC ? 'Vendedor registrado' : 'Receptor registrado'}
                valor={receptorId}
                vacio={b.tipo === 'TE' ? '— Consumidor final sin identificar —' : '— Seleccione —'}
                mostrarCodigo={false}
                onCambio={setReceptorId}
                opciones={[...receptores.map((x) => ({ codigo: x.id, descripcion: `${x.nombre}${x.identificacion ? ` (${x.identificacion.numero})` : ''}` })), { codigo: '__manual', descripcion: 'Ingresar datos manualmente…' }]}
              />
              {receptorId === '__manual' && (
                <div className="grid grid-2 linea-card">
                  <Texto etiqueta="Nombre" valor={b.contraparte?.nombre} onCambio={(v) => set({ contraparte: { ...b.contraparte, nombre: v } })} requerido />
                  <Texto etiqueta="Correo" valor={b.contraparte?.correo} onCambio={(v) => set({ contraparte: { nombre: '', ...b.contraparte, correo: v || undefined } })} />
                  <Selector etiqueta="Tipo de identificación" valor={b.contraparte?.identificacion?.tipo} vacio="—" onCambio={(v) => set({ contraparte: { nombre: '', ...b.contraparte, identificacion: v ? { tipo: v, numero: b.contraparte?.identificacion?.numero ?? '' } : undefined } })} opciones={TIPO_IDENTIFICACION} />
                  <Texto etiqueta="Número" valor={b.contraparte?.identificacion?.numero} onCambio={(v) => b.contraparte?.identificacion && set({ contraparte: { ...b.contraparte, identificacion: { ...b.contraparte.identificacion, numero: v.trim() } } })} />
                  {esFEC && (
                    <UbicacionCampos
                      valor={b.contraparte?.ubicacion ?? { provincia: '1', canton: '01', distrito: '01', otrasSenas: '' }}
                      onCambio={(u) => set({ contraparte: { nombre: '', ...b.contraparte, ubicacion: u } })}
                    />
                  )}
                </div>
              )}
              {receptor?.exoneracion && b.tipo !== 'FEE' && (
                <Alerta tipo="info">Este receptor tiene exoneración {receptor.exoneracion.numeroDocumento} ({receptor.exoneracion.tarifaExonerada}%). Se aplicará a las líneas que agregue.</Alerta>
              )}
              {!esFEC && (
                <Texto etiqueta="Actividad económica del receptor" valor={b.codigoActividadReceptor} onCambio={(v) => set({ codigoActividadReceptor: v || undefined })} ayuda="Para FE: cuando el receptor la requiera para crédito o gasto (el MH comunicará su obligatoriedad)." deshabilitado={['TE', 'FEE', 'REP'].includes(b.tipo)} />
              )}
            </div>
          </div>

          {/* ---------- Líneas ---------- */}
          <div className="card">
            <div className="card-head">
              <h2>Detalle ({b.lineas.length})</h2>
              <div className="row">
                <select aria-label="Agregar producto del catálogo" value="" onChange={(e) => agregarProducto(e.target.value)} style={{ maxWidth: 260 }}>
                  <option value="">+ Agregar del catálogo…</option>
                  {productos.filter((p) => p.activo).map((p) => <option key={p.id} value={p.id}>{p.descripcion}</option>)}
                </select>
                <button className="btn btn-sm" onClick={() => { set({ lineas: [...b.lineas, lineaVacia()] }); setBuscarCabysEn(b.lineas.length); }}><Plus /> Línea libre</button>
              </div>
            </div>
            <div className="card-body">
              {b.lineas.length === 0 && <p className="muted" style={{ margin: 0 }}>Agregue productos o servicios. En REP cada línea representa el pago aplicado al comprobante original.</p>}
              {b.lineas.map((l, i) => {
                const calc = vista.lineas[i];
                return (
                  <div key={i} className="linea-card">
                    <div className="row" style={{ justifyContent: 'space-between' }}>
                      <strong>Línea {i + 1}</strong>
                      <div className="row">
                        {calc && <span className="small muted">Subtotal {dinero(calc.subTotal, b.moneda)} · Impuesto {dinero(calc.impuestoNeto, b.moneda)} · <strong>Total {dinero(calc.montoTotalLinea, b.moneda)}</strong></span>}
                        <button className="btn btn-ghost btn-icon btn-danger" aria-label={`Eliminar línea ${i + 1}`} onClick={() => { set({ lineas: b.lineas.filter((_, j) => j !== i) }); setBuscarCabysEn(null); }}><Trash2 /></button>
                      </div>
                    </div>
                    {buscarCabysEn === i && <CabysBuscador onElegir={(c) => { setLinea(i, { codigoCabys: c.codigo, detalle: l.detalle || c.descripcion.slice(0, 200), codigoTarifaIva: c.codigoTarifaIva ?? l.codigoTarifaIva }); setBuscarCabysEn(null); }} />}
                    <div className="grid grid-4" style={{ marginTop: 8 }}>
                      <div className="field" style={{ gridColumn: 'span 2' }}>
                        <label>CAByS</label>
                        <div className="row" style={{ flexWrap: 'nowrap' }}>
                          <input aria-label="Código CAByS" className="mono" value={l.codigoCabys} onChange={(e) => setLinea(i, { codigoCabys: e.target.value.replace(/\D/g, '').slice(0, 13) })} />
                          <button className="btn btn-sm" onClick={() => setBuscarCabysEn(buscarCabysEn === i ? null : i)}>Buscar</button>
                        </div>
                      </div>
                      <div style={{ gridColumn: 'span 2' }}><Texto etiqueta="Detalle" valor={l.detalle} onCambio={(v) => setLinea(i, { detalle: v })} max={200} /></div>
                      <Texto etiqueta="Cantidad" tipo="number" paso="0.001" valor={l.cantidad} onCambio={(v) => setLinea(i, { cantidad: Number(v) })} />
                      <Selector etiqueta="Unidad" valor={l.unidadMedida} mostrarCodigo={false} onCambio={(v) => setLinea(i, { unidadMedida: v })} opciones={UNIDAD_MEDIDA.map((u) => ({ codigo: u.codigo, descripcion: `${u.codigo} – ${u.descripcion}` }))} />
                      <Texto etiqueta={b.tipo === 'REP' ? 'Monto del pago' : 'Precio unitario'} tipo="number" paso="0.00001" valor={l.precioUnitario} onCambio={(v) => setLinea(i, { precioUnitario: Number(v) })} />
                      <Selector etiqueta="Tarifa IVA" valor={l.codigoTarifaIva} mostrarCodigo={false} onCambio={(v) => setLinea(i, { codigoTarifaIva: v })} opciones={TARIFA_IVA.filter((t) => !t.soloAjustes || ['NC', 'ND'].includes(b.tipo)).map((t) => ({ codigo: t.codigo, descripcion: `${t.codigo} – ${t.descripcion}` }))} />
                    </div>
                    <details style={{ marginTop: 8 }}>
                      <summary className="small" style={{ cursor: 'pointer' }}>Descuentos, exoneración y datos adicionales</summary>
                      <div className="stack" style={{ marginTop: 8 }}>
                        {l.descuentos.map((d, k) => (
                          <div key={k} className="row" style={{ alignItems: 'flex-end' }}>
                            <div style={{ minWidth: 220, flex: 1 }}><Selector etiqueta={`Descuento ${k + 1} (nota 20)`} valor={d.codigo} onCambio={(v) => setLinea(i, { descuentos: l.descuentos.map((x, m) => (m === k ? { ...x, codigo: v } : x)) })} opciones={CODIGO_DESCUENTO} /></div>
                            <div style={{ width: 120 }}><Texto etiqueta="%" tipo="number" valor={d.porcentaje} onCambio={(v) => setLinea(i, { descuentos: l.descuentos.map((x, m) => (m === k ? { ...x, porcentaje: v ? Number(v) : undefined, monto: undefined } : x)) })} /></div>
                            <div style={{ width: 150 }}><Texto etiqueta="o monto" tipo="number" valor={d.monto} onCambio={(v) => setLinea(i, { descuentos: l.descuentos.map((x, m) => (m === k ? { ...x, monto: v ? Number(v) : undefined, porcentaje: undefined } : x)) })} /></div>
                            {d.codigo === '99' && <div style={{ flex: 1 }}><Texto etiqueta="Naturaleza / código OTRO" valor={d.naturaleza} onCambio={(v) => setLinea(i, { descuentos: l.descuentos.map((x, m) => (m === k ? { ...x, naturaleza: v, codigoOtro: v } : x)) })} /></div>}
                            <button className="btn btn-ghost btn-icon btn-danger" aria-label="Quitar descuento" onClick={() => setLinea(i, { descuentos: l.descuentos.filter((_, m) => m !== k) })}><Trash2 /></button>
                          </div>
                        ))}
                        {l.descuentos.length < 5 && b.tipo !== 'REP' && (
                          <div><button className="btn btn-sm" onClick={() => setLinea(i, { descuentos: [...l.descuentos, { codigo: '07', porcentaje: 0 }] })}><Plus /> Descuento</button></div>
                        )}
                        {b.tipo !== 'FEE' && (
                          <label className="check">
                            <input type="checkbox" checked={!!l.exoneracion} onChange={(e) => setLinea(i, { exoneracion: e.target.checked ? receptor?.exoneracion ?? { tipoDocumento: '04', numeroDocumento: '', institucion: '01', fechaEmision: fechaEmisionCR(), tarifaExonerada: tarifaIva(l.codigoTarifaIva)?.tarifa || 13 } : undefined })} />
                            Aplicar exoneración
                          </label>
                        )}
                        {l.exoneracion && (
                          <div className="grid grid-3">
                            <Selector etiqueta="Tipo (nota 10.1)" valor={l.exoneracion.tipoDocumento} onCambio={(v) => setLinea(i, { exoneracion: { ...l.exoneracion!, tipoDocumento: v } })} opciones={TIPO_EXONERACION.filter((t) => !t.soloAjustes || ['NC', 'ND'].includes(b.tipo))} />
                            <Texto etiqueta="Número de documento" valor={l.exoneracion.numeroDocumento} onCambio={(v) => setLinea(i, { exoneracion: { ...l.exoneracion!, numeroDocumento: v } })} />
                            <Texto etiqueta="Tarifa exonerada (%)" tipo="number" valor={l.exoneracion.tarifaExonerada} onCambio={(v) => setLinea(i, { exoneracion: { ...l.exoneracion!, tarifaExonerada: Number(v) } })} />
                            <Selector etiqueta="Institución (nota 23)" valor={l.exoneracion.institucion} onCambio={(v) => setLinea(i, { exoneracion: { ...l.exoneracion!, institucion: v } })} opciones={INSTITUCION_EXONERACION} />
                            <Texto etiqueta="Fecha de emisión" tipo="datetime-local" valor={deRfc(l.exoneracion.fechaEmision)} onCambio={(v) => setLinea(i, { exoneracion: { ...l.exoneracion!, fechaEmision: aRfc(v) } })} />
                            <Texto etiqueta="Artículo" tipo="number" valor={l.exoneracion.articulo} onCambio={(v) => setLinea(i, { exoneracion: { ...l.exoneracion!, articulo: v ? Number(v) : undefined } })} />
                          </div>
                        )}
                        <div className="grid grid-3">
                          {b.tipo !== 'TE' && b.tipo !== 'REP' && <Selector etiqueta="Tipo de transacción (nota 22)" valor={l.tipoTransaccion} vacio="— No aplica —" onCambio={(v) => setLinea(i, { tipoTransaccion: v || undefined })} opciones={TIPO_TRANSACCION} />}
                          {b.tipo === 'FEE' && <Texto etiqueta="Partida arancelaria" valor={l.partidaArancelaria} onCambio={(v) => setLinea(i, { partidaArancelaria: v.replace(/\D/g, '') || undefined })} max={12} />}
                          <Texto etiqueta="Registro de medicamento" valor={l.registroMedicamento} onCambio={(v) => setLinea(i, { registroMedicamento: v || undefined })} />
                          {l.registroMedicamento && (
                            <>
                              <Texto etiqueta="Forma farmacéutica – código Hacienda (nota 19)" valor={l.formaFarmaceutica} max={3} onCambio={(v) => setLinea(i, { formaFarmaceutica: v.trim() || undefined })} ayuda="Hasta 3 caracteres." />
                              <Selector etiqueta="Forma farmacéutica (catálogo Min. Salud)" valor={l.formaFarmaceuticaMinsa} vacio="—" onCambio={(v) => setLinea(i, { formaFarmaceuticaMinsa: v || undefined })} opciones={FORMAS_FARMACEUTICAS_MINSA} mostrarCodigo={false} ayuda="Referencia; se imprime en el PDF, no va en el XML." />
                            </>
                          )}
                          <label className="check" style={{ alignSelf: 'end' }}>
                            <input type="checkbox" checked={!!l.servicioSalud} onChange={(e) => setLinea(i, { servicioSalud: e.target.checked || undefined })} /> Servicio de salud
                          </label>
                        </div>
                      </div>
                    </details>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ---------- Otros cargos ---------- */}
          {b.tipo !== 'REP' && (
            <div className="card">
              <div className="card-head">
                <h2>Otros cargos ({b.otrosCargos.length})</h2>
                {b.otrosCargos.length < 15 && <button className="btn btn-sm" onClick={() => set({ otrosCargos: [...b.otrosCargos, { tipoDocumento: '06', detalle: 'Impuesto de servicio 10%', porcentaje: 10, monto: 0 }] })}><Plus /> Cargo</button>}
              </div>
              {b.otrosCargos.length > 0 && (
                <div className="card-body stack">
                  {b.otrosCargos.map((o, i) => (
                    <div key={i} className="row" style={{ alignItems: 'flex-end' }}>
                      <div style={{ flex: 2, minWidth: 220 }}><Selector etiqueta="Tipo (nota 16)" valor={o.tipoDocumento} onCambio={(v) => set({ otrosCargos: b.otrosCargos.map((x, j) => (j === i ? { ...x, tipoDocumento: v } : x)) })} opciones={TIPO_OTROS_CARGOS} /></div>
                      <div style={{ flex: 2, minWidth: 180 }}><Texto etiqueta="Detalle" valor={o.detalle} onCambio={(v) => set({ otrosCargos: b.otrosCargos.map((x, j) => (j === i ? { ...x, detalle: v } : x)) })} /></div>
                      <div style={{ width: 90 }}><Texto etiqueta="%" tipo="number" valor={o.porcentaje} onCambio={(v) => {
                        const pct = v ? Number(v) : undefined;
                        set({ otrosCargos: b.otrosCargos.map((x, j) => (j === i ? { ...x, porcentaje: pct, monto: pct !== undefined && r ? Math.round(r.totalVentaNeta * pct) / 100 : x.monto } : x)) });
                      }} /></div>
                      <div style={{ width: 140 }}><Texto etiqueta="Monto" tipo="number" valor={o.monto} onCambio={(v) => set({ otrosCargos: b.otrosCargos.map((x, j) => (j === i ? { ...x, monto: Number(v), porcentaje: undefined } : x)) })} /></div>
                      <button className="btn btn-ghost btn-icon btn-danger" aria-label="Quitar cargo" onClick={() => set({ otrosCargos: b.otrosCargos.filter((_, j) => j !== i) })}><Trash2 /></button>
                      {o.tipoDocumento === '04' && (
                        <div className="grid grid-3" style={{ width: '100%' }}>
                          <Selector etiqueta="Tipo id. tercero" valor={o.tercero?.identificacion.tipo ?? '02'} onCambio={(v) => set({ otrosCargos: b.otrosCargos.map((x, j) => (j === i ? { ...x, tercero: { nombre: x.tercero?.nombre ?? '', identificacion: { tipo: v, numero: x.tercero?.identificacion.numero ?? '' } } } : x)) })} opciones={TIPO_IDENTIFICACION.slice(0, 5)} />
                          <Texto etiqueta="Número tercero" valor={o.tercero?.identificacion.numero} onCambio={(v) => set({ otrosCargos: b.otrosCargos.map((x, j) => (j === i ? { ...x, tercero: { nombre: x.tercero?.nombre ?? '', identificacion: { tipo: x.tercero?.identificacion.tipo ?? '02', numero: v } } } : x)) })} />
                          <Texto etiqueta="Nombre tercero" valor={o.tercero?.nombre} onCambio={(v) => set({ otrosCargos: b.otrosCargos.map((x, j) => (j === i ? { ...x, tercero: { identificacion: x.tercero?.identificacion ?? { tipo: '02', numero: '' }, nombre: v } } : x)) })} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ---------- Medios de pago ---------- */}
          <div className="card">
            <div className="card-head">
              <h2>Medios de pago</h2>
              <div className="row">
                {b.mediosPago.length < 4 && <button className="btn btn-sm" onClick={() => set({ mediosPago: [...b.mediosPago, { tipo: '06' }] })}><Plus /> Medio de pago</button>}
                {b.mediosPago.length > 1 && r && (
                  <button className="btn btn-sm" onClick={() => {
                    const otros = b.mediosPago.slice(0, -1).reduce((s, m) => s + (m.monto ?? 0), 0);
                    set({ mediosPago: b.mediosPago.map((m, i) => (i === b.mediosPago.length - 1 ? { ...m, monto: Math.round((r.totalComprobante - otros) * 100000) / 100000 } : m)) });
                  }}>Completar saldo en el último</button>
                )}
              </div>
            </div>
            <div className="card-body stack">
              {['02', '08', '10'].includes(b.condicionVenta) && b.mediosPago.length === 0 && <p className="muted small" style={{ margin: 0 }}>Venta a crédito: el medio de pago no es obligatorio.</p>}
              {b.mediosPago.map((m, i) => (
                <div key={i} className="row" style={{ alignItems: 'flex-end' }}>
                  <div style={{ flex: 1, minWidth: 220 }}><Selector etiqueta={`Medio ${i + 1} (nota 6)`} valor={m.tipo} onCambio={(v) => set({ mediosPago: b.mediosPago.map((x, j) => (j === i ? { ...x, tipo: v } : x)) })} opciones={MEDIO_PAGO} /></div>
                  {m.tipo === '99' && <div style={{ flex: 1 }}><Texto etiqueta="Describa" valor={m.otros} onCambio={(v) => set({ mediosPago: b.mediosPago.map((x, j) => (j === i ? { ...x, otros: v } : x)) })} /></div>}
                  {b.mediosPago.length > 1 && <div style={{ width: 160 }}><Texto etiqueta="Monto" tipo="number" valor={m.monto} onCambio={(v) => set({ mediosPago: b.mediosPago.map((x, j) => (j === i ? { ...x, monto: v ? Number(v) : undefined } : x)) })} /></div>}
                  <button className="btn btn-ghost btn-icon btn-danger" aria-label="Quitar medio de pago" onClick={() => set({ mediosPago: b.mediosPago.filter((_, j) => j !== i) })}><Trash2 /></button>
                </div>
              ))}
              {b.mediosPago.some((m) => m.tipo === '06') && (
                <p className="small muted" style={{ margin: 0 }}>
                  SINPE Móvil (código 06, v4.4). Números registrados del emisor: {emisor!.telefonosSinpe.length ? emisor!.telefonosSinpe.join(', ') : 'ninguno'}.
                </p>
              )}
            </div>
          </div>

          {/* ---------- Referencias ---------- */}
          <div className="card">
            <div className="card-head">
              <h2>Información de referencia {requiereRef && <span className="badge warn">Obligatoria</span>}</h2>
              {b.referencias.length < 10 && <button className="btn btn-sm" onClick={() => set({ referencias: [...b.referencias, { tipoDoc: '01', fechaEmision: fechaEmisionCR(), codigo: '04', razon: '' }] })}><Plus /> Referencia</button>}
            </div>
            {b.referencias.length > 0 && (
              <div className="card-body stack">
                <datalist id="claves-emitidas">
                  {comprobantes.slice(0, 100).map((c) => <option key={c.clave} value={c.clave}>{c.tipo} {c.consecutivo}</option>)}
                </datalist>
                {b.referencias.map((ref, i) => {
                  const upd = (p: Partial<typeof ref>) => set({ referencias: b.referencias.map((x, j) => (j === i ? { ...x, ...p } : x)) });
                  return (
                    <div key={i} className="linea-card grid grid-3">
                      <Selector etiqueta="Tipo de documento (nota 10)" valor={ref.tipoDoc} onCambio={(v) => upd({ tipoDoc: v })} opciones={TIPO_DOC_REFERENCIA} />
                      <div className="field">
                        <label>Clave o número</label>
                        <input list="claves-emitidas" className="mono" value={ref.numero ?? ''} onChange={(e) => {
                          const numero = e.target.value.trim();
                          const c = comprobantes.find((x) => x.clave === numero);
                          upd({ numero, ...(c ? { fechaEmision: c.fechaEmision } : {}) });
                        }} />
                      </div>
                      <Texto etiqueta="Fecha de emisión" tipo="datetime-local" valor={deRfc(ref.fechaEmision)} onCambio={(v) => upd({ fechaEmision: aRfc(v) })} />
                      <Selector etiqueta="Código de referencia (nota 9)" valor={ref.codigo} onCambio={(v) => upd({ codigo: v })} opciones={CODIGO_REFERENCIA} />
                      <div style={{ gridColumn: 'span 2' }}><Texto etiqueta="Razón" valor={ref.razon} onCambio={(v) => upd({ razon: v })} max={180} /></div>
                      <div><button className="btn btn-sm btn-danger" onClick={() => set({ referencias: b.referencias.filter((_, j) => j !== i) })}><Trash2 /> Quitar</button></div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ---------- Panel lateral ---------- */}
        <div className="sticky stack">
          <div className="card">
            <div className="card-head"><h2>Resumen</h2><span className="badge">{b.moneda}</span></div>
            <div className="card-body">
              {r ? (
                <table className="totales">
                  <tbody>
                    {r.totalGravado > 0 && <tr><td>Total gravado</td><td className="num">{dinero(r.totalGravado, b.moneda)}</td></tr>}
                    {r.totalExento > 0 && <tr><td>Total exento</td><td className="num">{dinero(r.totalExento, b.moneda)}</td></tr>}
                    {r.totalExonerado > 0 && <tr><td>Total exonerado</td><td className="num">{dinero(r.totalExonerado, b.moneda)}</td></tr>}
                    {r.totalNoSujeto > 0 && <tr><td>Total no sujeto</td><td className="num">{dinero(r.totalNoSujeto, b.moneda)}</td></tr>}
                    <tr><td>Total venta</td><td className="num">{dinero(r.totalVenta, b.moneda)}</td></tr>
                    {r.totalDescuentos > 0 && <tr><td>Descuentos</td><td className="num">−{dinero(r.totalDescuentos, b.moneda)}</td></tr>}
                    <tr><td>Venta neta</td><td className="num">{dinero(r.totalVentaNeta, b.moneda)}</td></tr>
                    {r.totalDesgloseImpuesto.filter((d) => d.totalMontoImpuesto > 0).map((d) => (
                      <tr key={`${d.codigo}${d.codigoTarifaIva}`}><td className="small muted">Impuesto {d.codigo}{d.codigoTarifaIva ? ` · tarifa ${d.codigoTarifaIva}` : ''}</td><td className="num small">{dinero(d.totalMontoImpuesto, b.moneda)}</td></tr>
                    ))}
                    <tr><td>Total impuesto</td><td className="num">{dinero(r.totalImpuesto, b.moneda)}</td></tr>
                    {r.totalImpAsumEmisorFabrica > 0 && <tr><td>Impuesto asumido por el emisor</td><td className="num">{dinero(r.totalImpAsumEmisorFabrica, b.moneda)}</td></tr>}
                    {r.totalIVADevuelto > 0 && <tr><td>IVA devuelto</td><td className="num">−{dinero(r.totalIVADevuelto, b.moneda)}</td></tr>}
                    {r.totalOtrosCargos > 0 && <tr><td>Otros cargos</td><td className="num">{dinero(r.totalOtrosCargos, b.moneda)}</td></tr>}
                    <tr className="total"><td>Total</td><td className="num">{dinero(r.totalComprobante, b.moneda)}</td></tr>
                  </tbody>
                </table>
              ) : (
                <p className="muted">Sin datos suficientes para calcular.</p>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-head"><h2>Validaciones</h2><span className={`badge ${errores.length ? 'err' : 'ok'}`}>{errores.length} errores</span></div>
            <div className="card-body" style={{ maxHeight: 360, overflowY: 'auto' }}>
              <ListaValidaciones validaciones={erroresServidor.length ? erroresServidor : vista.validaciones} />
            </div>
          </div>

          <div className="card">
            <div className="card-body stack">
              <Selector etiqueta="Escenario de prueba (solo simulación)" valor={escenario} mostrarCodigo={false} vacio="Normal: validación completa del simulador" onCambio={setEscenario}
                opciones={[
                  { codigo: 'Rechazo forzado para práctica: inconsistencia detectada por el validador (escenario de prueba).', descripcion: 'Forzar rechazo de Hacienda' },
                ]} />
              <button className="btn btn-primary" onClick={emitir} disabled={enviando || errores.length > 0}>
                <Send /> {enviando ? 'Emitiendo…' : 'Emitir y enviar (simulado)'}
              </button>
              <span className="small muted">Se generará el XML v4.4 y se enviará al simulador. No se envía nada al Ministerio de Hacienda.</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
