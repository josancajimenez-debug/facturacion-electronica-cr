import {
  CODIGO_REFERENCIA,
  CODIGO_SUSTITUTO,
  CONDICION_VENTA,
  MEDIO_PAGO,
  NOMBRE_COMPROBANTE,
  TARIFA_IVA,
  TIPO_DOC_REFERENCIA,
  descomponerClave,
  descripcion,
  nombresArchivo,
  periodoContable,
  referenciaErrorMaterial as refErrorMaterial,
  respuestaApiSimulada,
  type BorradorComprobante,
  type Comprobante,
  type Referencia,
} from '@fe-cr/core';
import { ArrowLeft, Download, FileMinus, FilePlus, FileText, RefreshCcw, Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Alerta, Cargando, Estado, VisorXml } from '../components/ui';
import { useApp } from '../estado';
import { descargar, dinero, fechaHora } from '../lib/formato';
import { generarPdf } from '../lib/pdf';

/** Tipo de documento de referencia (nota 10) que corresponde a un comprobante emitido. */
function tipoDocRef(c: Comprobante, para: 'NC' | 'ND' | 'REP' | 'sustituir'): string {
  if (c.tipo === 'FEC') return para === 'NC' ? '17' : para === 'ND' ? '18' : '15';
  if (c.tipo === 'FEE' && para === 'sustituir') return '12';
  return { FE: '01', ND: '02', NC: '03', TE: '04', FEE: '19', REP: '20' }[c.tipo] ?? '99';
}

export function DetalleComprobante() {
  const { clave } = useParams();
  const { comprobantes, comprobantesListos, preferencias, avisar } = useApp();
  const navegar = useNavigate();
  const [pestana, setPestana] = useState<'resumen' | 'xml' | 'respuesta' | 'api' | 'pdf'>('resumen');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [generandoPdf, setGenerandoPdf] = useState(false);

  // Al cambiar de comprobante (p. ej. desde una referencia) se vuelve al resumen y se libera el PDF anterior.
  useEffect(() => {
    setPestana('resumen');
    setPdfUrl(null);
  }, [clave]);
  useEffect(() => () => {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
  }, [pdfUrl]);

  const c = comprobantes.find((x) => x.clave === clave);
  if (!c) {
    if (!comprobantesListos) return <Cargando texto="Cargando comprobante…" />;
    return <Alerta tipo="warn">Comprobante no encontrado. <Link to="/comprobantes">Volver</Link></Alerta>;
  }
  const partes = descomponerClave(c.clave)!;
  const m = c.resumen.codigoMoneda;

  const base = (tipo: BorradorComprobante['tipo'], extra: Partial<BorradorComprobante>): Partial<BorradorComprobante> => ({
    ...c.borrador,
    tipo,
    situacion: '1',
    referencias: [],
    ...extra,
  });

  const notaCredito = (errorMaterial = false) =>
    navegar('/emitir', {
      state: {
        borrador: base('NC', {
          referencias: [errorMaterial
            ? { tipoDoc: tipoDocRef(c, 'NC'), numero: c.clave, fechaEmision: c.fechaEmision, codigo: '13', razon: 'Anula documento de referencia por error material' }
            : { tipoDoc: tipoDocRef(c, 'NC'), numero: c.clave, fechaEmision: c.fechaEmision, codigo: '01', razon: 'Anula documento de referencia' }],
        }),
      },
    });
  const notaDebito = () =>
    navegar('/emitir', {
      state: {
        borrador: base('ND', {
          lineas: [],
          referencias: [{ tipoDoc: tipoDocRef(c, 'ND'), numero: c.clave, fechaEmision: c.fechaEmision, codigo: '02', razon: 'Corrige monto' }],
        }),
      },
    });
  // Las referencias propias del comprobante (p. ej. el tipo 16 de una FEC a un no domiciliado) se conservan
  // detrás de la referencia de sustitución, sin superar el máximo de 10.
  const conReferencia = (nueva: Referencia, previas: Referencia[]) =>
    [nueva, ...previas.filter((r) => r.numero !== nueva.numero || r.codigo !== nueva.codigo)].slice(0, 10);
  // Art. 19 Decreto 44739-H: el comprobante rechazado carece de validez; se emite uno nuevo que lo sustituye, sin nota de crédito.
  // FE, TE, FEC y FEE usan el tipo 10 con el código 16 (nota 9, obligatorio desde el 1/11/2026). Las NC, ND y REP no
  // admiten el código 16: el sustituto repite las referencias del rechazado (el documento que ajusta o paga).
  const sustituir = () =>
    navegar('/emitir', {
      state: {
        borrador: base(c.tipo, {
          referencias: ['NC', 'ND', 'REP'].includes(c.tipo)
            ? c.borrador.referencias
            : conReferencia({ tipoDoc: '10', numero: c.clave, fechaEmision: c.fechaEmision, codigo: '16', razon: 'Sustituye comprobante electrónico rechazado' }, c.borrador.referencias),
        }),
      },
    });
  // Nota 9: anulado un comprobante con NC, el nuevo que lo reemplaza lleva el código 07 (si se anuló con 01)
  // o el 15 (si se anuló por error material con 13).
  const sustituirAnulado = (original: Comprobante, codigoAnulacion: string) =>
    navegar('/emitir', {
      state: {
        borrador: {
          ...original.borrador,
          situacion: '1',
          referencias: conReferencia({
            tipoDoc: tipoDocRef(original, 'sustituir'), numero: original.clave, fechaEmision: original.fechaEmision, codigo: CODIGO_SUSTITUTO[codigoAnulacion],
            razon: codigoAnulacion === '13' ? 'Sustituye comprobante electrónico por error material' : 'Sustituye comprobante electrónico',
          }, original.borrador.referencias),
        },
      },
    });
  const reciboPago = () =>
    navegar('/emitir', {
      state: {
        borrador: base('REP', {
          condicionVenta: c.borrador.condicionVenta === '08' ? '09' : '11',
          mediosPago: [{ tipo: '04' }],
          otrosCargos: [],
          lineas: c.lineas.map((l) => ({ codigoCabys: l.codigoCabys, detalle: `Pago cuota 1 – ${l.detalle}`.slice(0, 200), cantidad: 1, unidadMedida: l.unidadMedida, precioUnitario: l.subTotal, descuentos: [], codigoTarifaIva: l.impuestos[0]?.codigoTarifaIva ?? '08' })),
          referencias: [{ tipoDoc: '01', numero: c.clave, fechaEmision: c.fechaEmision, codigo: '17', razon: 'Pago a comprobante electrónico' }],
        }),
      },
    });

  const verPdf = async () => {
    setPestana('pdf');
    setGenerandoPdf(true);
    try {
      const blob = await generarPdf(c, { incluirQr: preferencias.incluirQr });
      setPdfUrl(URL.createObjectURL(blob));
    } catch (e) {
      avisar(`No se pudo generar el PDF: ${(e as Error).message}`, 'err');
      setPestana('resumen');
    } finally {
      setGenerandoPdf(false);
    }
  };
  const bajarPdf = async () => {
    setGenerandoPdf(true);
    try {
      descargar(nombresArchivo.pdf(c.clave), await generarPdf(c, { incluirQr: preferencias.incluirQr }));
    } catch (e) {
      avisar(`No se pudo generar el PDF: ${(e as Error).message}`, 'err');
    } finally {
      setGenerandoPdf(false);
    }
  };

  const aceptado = c.estado === 'aceptado';
  const esCreditoIva = ['08', '10'].includes(c.borrador.condicionVenta) && c.tipo === 'FE';
  // Anulación con NC (código 01 o 13): desde la NC se llega al original, y desde el original a su NC.
  const anula = (r: { codigo?: string }) => r.codigo === '01' || r.codigo === '13';
  const refAnulacion = c.tipo === 'NC' ? c.borrador.referencias.find(anula) : undefined;
  const anulado = refAnulacion ? comprobantes.find((x) => x.clave === refAnulacion.numero) : undefined;
  const ncAnulacion = c.tipo !== 'NC'
    ? comprobantes.find((x) => x.tipo === 'NC' && x.estado === 'aceptado' && x.borrador.referencias.some((r) => anula(r) && r.numero === c.clave))
    : undefined;
  const original = aceptado && anulado ? anulado : ncAnulacion ? c : undefined;
  const codigoAnulacion = (refAnulacion ?? ncAnulacion?.borrador.referencias.find((r) => anula(r) && r.numero === c.clave))?.codigo ?? '01';
  const codigoSustituto = CODIGO_SUSTITUTO[codigoAnulacion];
  const sustituto = original && comprobantes.find((x) => x.estado !== 'rechazado' && x.borrador.referencias.some((r) => r.codigo === codigoSustituto && r.numero === original.clave));
  const periodoAjuste = refErrorMaterial(c);

  return (
    <>
      <div className="page-head">
        <div>
          <Link to="/comprobantes" className="small"><ArrowLeft size={14} /> Comprobantes</Link>
          <h1 style={{ marginTop: 6 }}>{NOMBRE_COMPROBANTE[c.tipo]} <Estado estado={c.estado} /></h1>
          <p className="mono">Consecutivo {c.consecutivo}</p>
        </div>
        <div className="row">
          <button className="btn" onClick={() => descargar(nombresArchivo.xml(c.clave), c.xml)}><Download /> XML</button>
          {c.respuestaHacienda && <button className="btn" onClick={() => descargar(nombresArchivo.respuesta(c.clave), c.respuestaHacienda!.xml)}><Download /> Respuesta</button>}
          <button className="btn" onClick={bajarPdf} disabled={generandoPdf}><Download /> PDF</button>
        </div>
      </div>

      {c.estado === 'rechazado' && (
        <Alerta tipo="err">
          <strong>Rechazado por el validador (simulado).</strong> Según el art. 9 de la RES-0027 y el art. 19 del Decreto 44739-H, un comprobante rechazado carece de validez:
          no se anula con nota de crédito; se emite uno nuevo que indique cuál sustituye.
          <div style={{ marginTop: 8 }}><button className="btn btn-sm" onClick={sustituir}><RefreshCcw /> Emitir comprobante sustituto</button></div>
        </Alerta>
      )}
      {c.estado === 'error' && (
        <Alerta tipo="err">
          <strong>El simulador no pudo completar la validación.</strong> {c.historial.at(-1)?.detalle} El comprobante no tiene respuesta de Hacienda (simulada);
          puede emitir uno nuevo que lo sustituya.
          <div style={{ marginTop: 8 }}><button className="btn btn-sm" onClick={sustituir}><RefreshCcw /> Emitir comprobante sustituto</button></div>
        </Alerta>
      )}
      {original && (
        <Alerta tipo={sustituto ? 'info' : 'warn'}>
          <strong>{codigoAnulacion === '13' ? 'Anulado por error material (código 13).' : 'Anulado con nota de crédito (código 01).'}</strong>{' '}
          {sustituto
            ? <>El comprobante sustituto ya fue emitido: <Link to={`/comprobantes/${sustituto.clave}`}>ver</Link>.</>
            : <>Si corresponde emitir un comprobante nuevo, debe referenciar al anulado con el código {codigoSustituto} «{descripcion(CODIGO_REFERENCIA, codigoSustituto)}» (nota 9).</>}
          {!sustituto && <div style={{ marginTop: 8 }}><button className="btn btn-sm" onClick={() => sustituirAnulado(original, codigoAnulacion)}><RefreshCcw /> Emitir sustituto (código {codigoSustituto})</button></div>}
        </Alerta>
      )}
      {periodoAjuste && (
        <Alerta tipo="info">
          Ajuste con código {periodoAjuste.codigo}: su efecto contable se refleja en el período <strong>{periodoContable(c)}</strong> del comprobante que modifica, no en el de emisión de la nota.
        </Alerta>
      )}
      {aceptado && c.tipo !== 'NC' && c.tipo !== 'REP' && !ncAnulacion && (
        <div className="row" style={{ margin: '0 0 16px' }}>
          <button className="btn" onClick={() => notaCredito()}><FileMinus /> Nota de crédito</button>
          <button className="btn" onClick={() => notaCredito(true)} title="Código 13: anula por error material; luego emita el sustituto con el código 15"><FileMinus /> Anular por error material</button>
          <button className="btn" onClick={notaDebito}><FilePlus /> Nota de débito</button>
          {esCreditoIva && <button className="btn" onClick={reciboPago}><Wallet /> Registrar pago (REP)</button>}
        </div>
      )}

      <div className="split">
        <div className="card">
          <div className="tabs" role="tablist">
            {(['resumen', 'xml', 'respuesta', 'api', 'pdf'] as const).map((p) => (
              <button key={p} role="tab" aria-selected={pestana === p} className={pestana === p ? 'on' : ''} onClick={() => (p === 'pdf' ? verPdf() : setPestana(p))}>
                {{ resumen: 'Resumen', xml: 'XML comprobante', respuesta: 'Mensaje Hacienda', api: 'API (JSON)', pdf: 'Representación gráfica' }[p]}
              </button>
            ))}
          </div>
          <div className="card-body">
            {pestana === 'resumen' && (
              <div className="stack">
                <div className="grid grid-2">
                  <div>
                    <h3>{c.tipo === 'FEC' ? 'Vendedor' : 'Receptor'}</h3>
                    <p style={{ margin: '4px 0' }}>{c.contraparte?.nombre ?? 'Consumidor final'}</p>
                    <p className="small muted" style={{ margin: 0 }}>{c.contraparte?.identificacion?.numero}</p>
                  </div>
                  <div>
                    <h3>Condiciones</h3>
                    <p className="small" style={{ margin: '4px 0' }}>{descripcion(CONDICION_VENTA, c.borrador.condicionVenta)}{c.borrador.plazoCredito ? ` · ${c.borrador.plazoCredito} días` : ''}</p>
                    <p className="small" style={{ margin: 0 }}>{c.resumen.mediosPago.map((mp) => `${descripcion(MEDIO_PAGO, mp.tipo)}${mp.monto !== undefined ? ` ${dinero(mp.monto, m)}` : ''}`).join(' · ') || 'Sin medio de pago (crédito)'}</p>
                  </div>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>#</th><th>CAByS</th><th>Detalle</th><th className="right">Cant.</th><th className="right">Subtotal</th><th>IVA</th><th className="right">Impuesto neto</th><th className="right">Total</th></tr></thead>
                    <tbody>
                      {c.lineas.map((l) => (
                        <tr key={l.numeroLinea}>
                          <td>{l.numeroLinea}</td>
                          <td className="mono">{l.codigoCabys}</td>
                          <td>{l.detalle}{l.impuestos[0]?.exoneracion && <span className="badge info" style={{ marginLeft: 6 }}>Exonerado {l.impuestos[0].exoneracion.tarifaExonerada}%</span>}</td>
                          <td className="num">{l.cantidad}</td>
                          <td className="num">{dinero(l.subTotal, m)}</td>
                          <td className="small">{descripcion(TARIFA_IVA, l.impuestos[0]?.codigoTarifaIva)}</td>
                          <td className="num">{dinero(l.impuestoNeto, m)}</td>
                          <td className="num">{dinero(l.montoTotalLinea, m)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {c.borrador.referencias.length > 0 && (
                  <div>
                    <h3>Referencias</h3>
                    {c.borrador.referencias.map((r, i) => (
                      <p key={i} className="small" style={{ margin: '4px 0' }}>
                        {descripcion(TIPO_DOC_REFERENCIA, r.tipoDoc)} · <span className="mono">{r.numero}</span> · {r.razon}{' '}
                        {comprobantes.some((x) => x.clave === r.numero) && <Link to={`/comprobantes/${r.numero}`}>ver</Link>}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}
            {pestana === 'xml' && <VisorXml xml={c.xml} />}
            {pestana === 'respuesta' && (c.respuestaHacienda ? (
              <div className="stack">
                {c.respuestaHacienda.advertencias.map((a, i) => <Alerta key={i} tipo="warn">{a}</Alerta>)}
                <VisorXml xml={c.respuestaHacienda.xml} />
              </div>
            ) : <p className="muted">Aún no hay respuesta del simulador.</p>)}
            {pestana === 'api' && (
              <div className="stack">
                <p className="small muted" style={{ margin: 0 }}>Cuerpo JSON simulado del GET /recepcion/{'{clave}'} o del callback, con los campos del ejemplo del Anexo 3.</p>
                <VisorXml xml={JSON.stringify(respuestaApiSimulada(c.clave, c.estado, c.respuestaHacienda?.xml), null, 2)} />
              </div>
            )}
            {pestana === 'pdf' && (pdfUrl ? (
              <iframe title="Representación gráfica" src={pdfUrl} style={{ width: '100%', height: 640, border: '1px solid var(--border)', borderRadius: 8 }} />
            ) : <Cargando texto="Generando la representación gráfica…" />)}
          </div>
        </div>

        <div className="stack sticky">
          <div className="card">
            <div className="card-head"><h2>Totales</h2></div>
            <div className="card-body">
              <table className="totales"><tbody>
                <tr><td>Venta neta</td><td className="num">{dinero(c.resumen.totalVentaNeta, m)}</td></tr>
                <tr><td>Impuesto</td><td className="num">{dinero(c.resumen.totalImpuesto, m)}</td></tr>
                {c.resumen.totalOtrosCargos > 0 && <tr><td>Otros cargos</td><td className="num">{dinero(c.resumen.totalOtrosCargos, m)}</td></tr>}
                {c.resumen.totalIVADevuelto > 0 && <tr><td>IVA devuelto</td><td className="num">−{dinero(c.resumen.totalIVADevuelto, m)}</td></tr>}
                <tr className="total"><td>Total</td><td className="num">{dinero(c.resumen.totalComprobante, m)}</td></tr>
              </tbody></table>
            </div>
          </div>
          <div className="card">
            <div className="card-head"><h2>Clave numérica</h2></div>
            <div className="card-body">
              <table className="small"><tbody>
                <tr><td>País</td><td className="mono">{partes.pais}</td></tr>
                <tr><td>Día/mes/año</td><td className="mono">{partes.dia}/{partes.mes}/{partes.anio}</td></tr>
                <tr><td>Identificación (12)</td><td className="mono">{partes.identificacion}</td></tr>
                <tr><td>Consecutivo (20)</td><td className="mono">{partes.consecutivo}</td></tr>
                <tr><td>Situación</td><td className="mono">{partes.situacion}</td></tr>
                <tr><td>Código de seguridad</td><td className="mono">{partes.codigoSeguridad}</td></tr>
              </tbody></table>
            </div>
          </div>
          <div className="card">
            <div className="card-head"><h2>Trazabilidad</h2><FileText size={16} /></div>
            <div className="card-body">
              <ul className="timeline">
                {c.historial.map((h, i) => (
                  <li key={i}>
                    <Estado estado={h.estado} /> <span className="small muted">{fechaHora(h.fecha)}</span>
                    {h.detalle && <div className="small" style={{ marginTop: 2, wordBreak: 'break-word' }}>{h.detalle}</div>}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
