import { PROVINCIA, cantonesDe, distritosDe, type Ubicacion } from '@fe-cr/core';
import { Selector, Texto } from './ui';

/** Provincia → cantón → distrito según la División Territorial Administrativa 2022 (nota 14). */
export function UbicacionCampos({ valor, onCambio, maxSenas = 250 }: { valor: Ubicacion; onCambio: (u: Ubicacion) => void; maxSenas?: number }) {
  const cantones = cantonesDe(valor.provincia);
  const distritos = distritosDe(valor.provincia, valor.canton);
  const set = (p: Partial<Ubicacion>) => onCambio({ ...valor, ...p });
  return (
    <>
      <Selector etiqueta="Provincia" valor={valor.provincia} onCambio={(v) => {
        const c = cantonesDe(v)[0];
        set({ provincia: v, canton: c?.codigo ?? '01', distrito: c?.distritos[0]?.codigo ?? '01' });
      }} opciones={PROVINCIA} />
      <Selector etiqueta="Cantón" valor={valor.canton} onCambio={(v) => set({ canton: v, distrito: distritosDe(valor.provincia, v)[0]?.codigo ?? '01' })}
        opciones={cantones.map((c) => ({ codigo: c.codigo, descripcion: c.nombre }))} />
      <Selector etiqueta="Distrito" valor={valor.distrito} onCambio={(v) => set({ distrito: v })}
        opciones={distritos.map((d) => ({ codigo: d.codigo, descripcion: d.nombre }))}
        ayuda="Fuente: DTA 2022, Registro Nacional – IGN." />
      <Texto etiqueta="Barrio" valor={valor.barrio} onCambio={(v) => set({ barrio: v || undefined })} max={50} />
      <div style={{ gridColumn: 'span 2' }}>
        <Texto etiqueta="Otras señas" valor={valor.otrasSenas} onCambio={(v) => set({ otrasSenas: v })} max={maxSenas} requerido />
      </div>
    </>
  );
}
