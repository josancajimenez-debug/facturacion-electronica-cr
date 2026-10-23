import { MONEDA, TARIFA_IVA, TIPO_CODIGO_COMERCIAL, UNIDAD_MEDIDA, descripcion, esCabysServicio, type Producto } from '@fe-cr/core';
import { Package, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { CabysBuscador } from '../components/CabysBuscador';
import { Alerta, Modal, Selector, Texto, Vacio } from '../components/ui';
import { useApp } from '../estado';
import { dinero } from '../lib/formato';

const vacio = (): Producto => ({ id: '', codigoCabys: '', descripcion: '', unidadMedida: 'Unid', precioUnitario: 0, moneda: 'CRC', codigoTarifaIva: '08', activo: true });

export function Productos() {
  const { productos, emisor, backend, avisar } = useApp();
  const [editando, setEditando] = useState<Producto | null>(null);
  const [filtro, setFiltro] = useState('');
  const lista = productos
    .filter((p) => `${p.descripcion} ${p.codigoCabys}`.toLowerCase().includes(filtro.toLowerCase()))
    .sort((a, b) => a.descripcion.localeCompare(b.descripcion));

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Productos y servicios</h1>
          <p>Catálogo propio vinculado al CAByS 2025, con unidad de medida (nota 15) y tarifa de IVA (nota 8.1).</p>
        </div>
        <button className="btn btn-primary" onClick={() => setEditando(vacio())}><Plus /> Nuevo producto</button>
      </div>
      <div className="card">
        <div className="card-head">
          <input placeholder="Buscar por descripción o CAByS" value={filtro} onChange={(e) => setFiltro(e.target.value)} style={{ maxWidth: 360 }} aria-label="Buscar producto" />
          <span className="small muted">{lista.length} registros</span>
        </div>
        {lista.length === 0 ? (
          <Vacio icono={<Package />} titulo="Sin productos" />
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Descripción</th><th>CAByS</th><th>Tipo</th><th>Unidad</th><th>Tarifa IVA</th><th className="right">Precio</th><th /></tr></thead>
              <tbody>
                {lista.map((p) => (
                  <tr key={p.id}>
                    <td>{p.descripcion}{p.servicioSalud && <span className="badge info" style={{ marginLeft: 6 }}>Salud</span>}</td>
                    <td className="mono">{p.codigoCabys}</td>
                    <td>{esCabysServicio(p.codigoCabys) ? 'Servicio' : 'Mercancía'}</td>
                    <td>{p.unidadMedida}</td>
                    <td>{descripcion(TARIFA_IVA, p.codigoTarifaIva)}</td>
                    <td className="num">{dinero(p.precioUnitario, p.moneda)}</td>
                    <td className="nowrap right">
                      <button className="btn btn-ghost btn-icon" aria-label="Editar" onClick={() => setEditando(p)}><Pencil /></button>
                      <button className="btn btn-ghost btn-icon btn-danger" aria-label="Eliminar" onClick={async () => { if (confirm('¿Eliminar producto?')) { await backend.eliminarProducto(emisor!.id, p.id); avisar('Producto eliminado.', 'ok'); } }}><Trash2 /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {editando && <FormProducto inicial={editando} onCerrar={() => setEditando(null)} />}
    </>
  );
}

function FormProducto({ inicial, onCerrar }: { inicial: Producto; onCerrar: () => void }) {
  const { emisor, backend, avisar } = useApp();
  const [p, setP] = useState<Producto>(inicial);
  const [impuestoCabys, setImpuestoCabys] = useState('');
  const set = (x: Partial<Producto>) => setP((v) => ({ ...v, ...x }));
  const errores: string[] = [];
  if (!/^\d{13}$/.test(p.codigoCabys)) errores.push('CAByS de 13 dígitos.');
  if (p.descripcion.trim().length < 3) errores.push('Descripción: mínimo 3 caracteres.');
  if (!(p.precioUnitario > 0)) errores.push('Precio mayor que cero.');
  const isc = p.impuestosAdicionales?.find((i) => i.codigo === '02');

  const guardar = async () => {
    try {
      await backend.guardarProducto(emisor!.id, p);
      avisar('Producto guardado.', 'ok');
      onCerrar();
    } catch (e) {
      avisar((e as Error).message, 'err');
    }
  };

  return (
    <Modal titulo={inicial.id ? 'Editar producto o servicio' : 'Nuevo producto o servicio'} onCerrar={onCerrar}
      pie={<><button className="btn" onClick={onCerrar}>Cancelar</button><button className="btn btn-primary" disabled={errores.length > 0} onClick={guardar}>Guardar</button></>}>
      <div className="stack">
        <CabysBuscador onElegir={(i) => { set({ codigoCabys: i.codigo, descripcion: p.descripcion || i.descripcion.slice(0, 200), codigoTarifaIva: i.codigoTarifaIva ?? p.codigoTarifaIva, unidadMedida: esCabysServicio(i.codigo) ? 'Sp' : p.unidadMedida }); setImpuestoCabys(i.impuesto); }} />
        {impuestoCabys && (
          <Alerta tipo="info">El catálogo CAByS asigna «{impuestoCabys}» a este código. Verifique la tarifa aplicable a su operación concreta (exenciones, tarifas reducidas o canasta básica).</Alerta>
        )}
        {errores.length > 0 && <Alerta tipo="warn">{errores.join(' ')}</Alerta>}
        <div className="grid grid-2">
          <Texto etiqueta="Código CAByS" valor={p.codigoCabys} onCambio={(v) => set({ codigoCabys: v.replace(/\D/g, '').slice(0, 13) })} requerido />
          <Texto etiqueta="Descripción (detalle)" valor={p.descripcion} onCambio={(v) => set({ descripcion: v })} requerido max={200} />
          <Selector etiqueta="Unidad de medida (nota 15)" valor={p.unidadMedida} onCambio={(v) => set({ unidadMedida: v })} opciones={UNIDAD_MEDIDA} />
          <Texto etiqueta="Unidad de medida comercial" valor={p.unidadMedidaComercial} onCambio={(v) => set({ unidadMedidaComercial: v || undefined })} max={20} ayuda="Ej.: «1 Tarima». Opcional." />
          <Texto etiqueta="Precio unitario (sin IVA)" tipo="number" paso="0.00001" valor={p.precioUnitario} onCambio={(v) => set({ precioUnitario: Number(v) })} requerido />
          <Selector etiqueta="Moneda" valor={p.moneda} onCambio={(v) => set({ moneda: v })} opciones={MONEDA} />
          <Selector etiqueta="Tarifa IVA (nota 8.1)" valor={p.codigoTarifaIva} onCambio={(v) => set({ codigoTarifaIva: v })} opciones={TARIFA_IVA.filter((t) => !t.soloAjustes)} />
          <Texto etiqueta="Impuesto selectivo de consumo (%)" tipo="number" valor={isc?.tarifa ?? ''} onCambio={(v) => set({ impuestosAdicionales: v ? [{ codigo: '02', tarifa: Number(v) }] : undefined })} ayuda="Código 02; integra la base imponible del IVA." />
          <Selector etiqueta="Tipo de código comercial (nota 12)" valor={p.codigoComercial?.tipo} vacio="— Sin código comercial —" onCambio={(v) => set({ codigoComercial: v ? { tipo: v, codigo: p.codigoComercial?.codigo ?? '' } : undefined })} opciones={TIPO_CODIGO_COMERCIAL} />
          <Texto etiqueta="Código comercial" valor={p.codigoComercial?.codigo} onCambio={(v) => p.codigoComercial && set({ codigoComercial: { ...p.codigoComercial, codigo: v } })} max={20} />
          <Texto etiqueta="Registro de medicamento" valor={p.registroMedicamento} onCambio={(v) => set({ registroMedicamento: v || undefined })} max={100} />
          <Texto etiqueta="Partida arancelaria (FEE)" valor={p.partidaArancelaria} onCambio={(v) => set({ partidaArancelaria: v.replace(/\D/g, '') || undefined })} max={12} ayuda="Obligatoria para mercancías en factura de exportación." />
        </div>
        <label className="check">
          <input type="checkbox" checked={!!p.servicioSalud} onChange={(e) => set({ servicioSalud: e.target.checked || undefined })} />
          Servicio de salud (cuenta para «IVA devuelto» cuando se paga con tarjeta)
        </label>
      </div>
    </Modal>
  );
}
