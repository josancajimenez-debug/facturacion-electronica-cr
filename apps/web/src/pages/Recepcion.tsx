import { CONDICION_IMPUESTO, MENSAJE, limiteConfirmacionReceptor, nombresArchivo, type Validacion } from '@fe-cr/core';
import { Download, Inbox, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { ErrorConValidaciones, type DatosConfirmacion, type Recibido } from '../backend/tipos';
import { Alerta, Estado, ListaValidaciones, Modal, Selector, Texto, Vacio, VisorXml } from '../components/ui';
import { useApp } from '../estado';
import { descargar, dinero, fecha, fechaHora, hoyCR } from '../lib/formato';

const TAMANO_MAXIMO_XML = 1_000_000;

export function Recepcion() {
  const { recibidos, emisor, backend, avisar, preferencias } = useApp();
  // Un registro con fecha inválida no debe romper toda la página: se usa el límite guardado.
  const limite = (r: Recibido) => {
    const d = new Date(r.fechaEmision);
    return Number.isNaN(d.getTime()) ? r.limiteConfirmacion : limiteConfirmacionReceptor(d, preferencias.feriados);
  };
  const [confirmando, setConfirmando] = useState<Recibido | null>(null);
  const [viendo, setViendo] = useState<Recibido | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const archivoRef = useRef<HTMLInputElement>(null);
  const hoy = hoyCR();

  const simular = async () => {
    setOcupado(true);
    try {
      await backend.simularRecepcion(emisor!.id);
      avisar('Se recibió un comprobante simulado de un proveedor ficticio.', 'ok');
    } catch (e) {
      avisar((e as Error).message, 'err');
    } finally {
      setOcupado(false);
    }
  };

  const cargarXml = async (archivo: File | undefined) => {
    if (!archivo) return;
    if (archivo.size > TAMANO_MAXIMO_XML) {
      avisar('El archivo supera 1 MB; no parece un comprobante electrónico.', 'err');
      return;
    }
    setOcupado(true);
    try {
      await backend.registrarRecibidoXml(emisor!.id, await archivo.text());
      avisar('XML registrado para confirmación.', 'ok');
    } catch (e) {
      avisar((e as Error).message, 'err');
    } finally {
      setOcupado(false);
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Recepción de comprobantes</h1>
          <p>Mensaje de confirmación del receptor: aceptación total (05), parcial (06) o rechazo (07) — art. 10 MH-DGT-RES-0027-2024.</p>
        </div>
        <div className="row">
          {/* Botón real (enfocable con el teclado) que abre el selector de archivos oculto. */}
          <button className="btn" disabled={ocupado} onClick={() => archivoRef.current?.click()}><Upload /> Cargar XML</button>
          <input ref={archivoRef} type="file" accept=".xml,text/xml,application/xml" hidden aria-hidden onChange={(e) => { void cargarXml(e.target.files?.[0]); e.target.value = ''; }} />
          <button className="btn btn-primary" onClick={simular} disabled={ocupado}><Inbox /> Simular comprobante de proveedor</button>
        </div>
      </div>
      <Alerta tipo="info">
        Plazo: 8 días hábiles contados desde el primer día del mes siguiente a la transacción. Si no se confirma y no hay beneficio fiscal, se presume aceptado totalmente.
        El procedimiento no aplica al consumidor final.
      </Alerta>
      <div className="card" style={{ marginTop: 16 }}>
        {recibidos.length === 0 ? (
          <Vacio icono={<Inbox />} titulo="No hay comprobantes recibidos">Use «Simular comprobante de proveedor» o cargue un XML.</Vacio>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Fecha</th><th>Emisor</th><th>Clave</th><th className="right">Impuesto</th><th className="right">Total</th><th>Plazo</th><th>Estado</th><th /></tr></thead>
              <tbody>
                {recibidos.map((r) => (
                  <tr key={r.clave}>
                    <td className="nowrap">{fechaHora(r.fechaEmision)}</td>
                    <td>{r.nombreEmisor}<div className="small muted">{r.identificacionEmisor.numero}</div></td>
                    <td className="mono small">{r.clave.slice(0, 21)}…</td>
                    <td className="num">{dinero(r.totalImpuesto, r.moneda ?? 'CRC')}</td>
                    <td className="num">{dinero(r.totalComprobante, r.moneda ?? 'CRC')}</td>
                    <td className="small nowrap">{r.estado === 'pendiente' ? <span className={`badge ${hoy > limite(r) ? 'err' : 'warn'}`}>{hoy > limite(r) ? 'Vencido ' : 'Vence '}{fecha(limite(r))}</span> : '—'}</td>
                    <td><Estado estado={r.estado} /></td>
                    <td className="nowrap right">
                      <button className="btn btn-sm" onClick={() => setViendo(r)}>Ver</button>{' '}
                      {r.estado === 'pendiente' && <button className="btn btn-sm btn-primary" onClick={() => setConfirmando(r)}>Confirmar</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {confirmando && <FormConfirmacion recibido={confirmando} onCerrar={() => setConfirmando(null)} />}
      {viendo && (
        <Modal titulo="Comprobante recibido" onCerrar={() => setViendo(null)}
          pie={<>
            {viendo.xml && <button className="btn" onClick={() => descargar(nombresArchivo.xml(viendo.clave), viendo.xml!)}><Download /> XML recibido</button>}
            {viendo.confirmacion && <button className="btn" onClick={() => descargar(nombresArchivo.confirmacion(viendo.clave, viendo.confirmacion!.consecutivo), viendo.confirmacion!.xml)}><Download /> Mensaje receptor</button>}
          </>}>
          <div className="stack">
            {viendo.confirmacion && <Alerta tipo="ok">Confirmación {viendo.confirmacion.tipo} · consecutivo <span className="mono">{viendo.confirmacion.consecutivo}</span> · respuesta Hacienda: {viendo.confirmacion.respuestaHacienda}</Alerta>}
            {viendo.confirmacion?.advertencias?.map((a, i) => <Alerta key={i} tipo="warn">{a}</Alerta>)}
            <VisorXml xml={viendo.confirmacion?.xml ?? viendo.xml ?? ''} />
          </div>
        </Modal>
      )}
    </>
  );
}

function FormConfirmacion({ recibido, onCerrar }: { recibido: Recibido; onCerrar: () => void }) {
  const { emisor, backend, avisar, preferencias } = useApp();
  const principal = emisor!.actividades.find((a) => a.principal)?.codigo ?? emisor!.actividades[0]?.codigo;
  const [d, setD] = useState<DatosConfirmacion>({ clave: recibido.clave, mensaje: '1', condicionImpuesto: '01', codigoActividad: principal, montoTotalImpuestoAcreditar: recibido.totalImpuesto });
  const [validaciones, setValidaciones] = useState<Validacion[]>([]);
  const [enviando, setEnviando] = useState(false);
  const set = (p: Partial<DatosConfirmacion>) => setD((x) => ({ ...x, ...p }));

  const enviar = async () => {
    setEnviando(true);
    setValidaciones([]);
    try {
      const r = await backend.confirmar(emisor!.id, {
        ...d,
        feriados: preferencias.feriados,
        codigoActividad: d.condicionImpuesto === '05' ? undefined : d.codigoActividad,
        montoTotalImpuestoAcreditar: d.mensaje === '3' ? undefined : d.montoTotalImpuestoAcreditar,
        montoTotalDeGastoAplicable: d.mensaje === '3' ? undefined : d.montoTotalDeGastoAplicable,
      });
      avisar(`Confirmación enviada (simulada). Consecutivo ${r.consecutivo}.`, 'ok');
      onCerrar();
    } catch (e) {
      if (e instanceof ErrorConValidaciones) setValidaciones(e.validaciones);
      avisar((e as Error).message, 'err');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal titulo="Confirmar comprobante recibido" onCerrar={onCerrar}
      pie={<><button className="btn" onClick={onCerrar}>Cancelar</button><button className="btn btn-primary" onClick={enviar} disabled={enviando}>{enviando ? 'Generando…' : 'Generar mensaje'}</button></>}>
      <div className="stack">
        <p className="small muted" style={{ margin: 0 }}>{recibido.nombreEmisor} · Total {dinero(recibido.totalComprobante, recibido.moneda ?? 'CRC')} · Impuesto {dinero(recibido.totalImpuesto, recibido.moneda ?? 'CRC')}</p>
        <div className="grid grid-2">
          <Selector etiqueta="Mensaje (nota 11)" valor={d.mensaje} onCambio={(v) => set({ mensaje: v as DatosConfirmacion['mensaje'] })} opciones={MENSAJE} />
          {d.mensaje !== '3' && <Selector etiqueta="Condición del IVA (nota 18)" valor={d.condicionImpuesto} onCambio={(v) => set({ condicionImpuesto: v })} opciones={CONDICION_IMPUESTO} />}
          {d.mensaje !== '3' && d.condicionImpuesto !== '05' && <Selector etiqueta="Actividad a la que se aplica el crédito" valor={d.codigoActividad} onCambio={(v) => set({ codigoActividad: v })} opciones={emisor!.actividades} />}
          {d.mensaje !== '3' && <Texto etiqueta="Impuesto a acreditar" tipo="number" valor={d.montoTotalImpuestoAcreditar} onCambio={(v) => set({ montoTotalImpuestoAcreditar: v === '' ? undefined : Number(v) })} />}
          {d.mensaje !== '3' && <Texto etiqueta="Gasto aplicable" tipo="number" valor={d.montoTotalDeGastoAplicable} onCambio={(v) => set({ montoTotalDeGastoAplicable: v === '' ? undefined : Number(v) })} />}
        </div>
        <Texto etiqueta={`Detalle del mensaje${d.mensaje === '1' ? ' (opcional)' : ' *'}`} valor={d.detalleMensaje} onCambio={(v) => set({ detalleMensaje: v || undefined })} max={160} ayuda="Obligatorio en aceptación parcial o rechazo (5 a 160 caracteres)." />
        {d.mensaje !== '1' && <Alerta tipo="info">Con aceptación parcial o rechazo, el emisor debe emitir de inmediato la nota de crédito o débito correspondiente (art. 10 RES-0027).</Alerta>}
        {validaciones.length > 0 && <ListaValidaciones validaciones={validaciones} />}
      </div>
    </Modal>
  );
}
