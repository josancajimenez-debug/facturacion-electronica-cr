import { ExternalLink } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Alerta, Cargando } from './ui';

/**
 * Muestra el PDF dibujando cada página en un canvas con pdf.js. Un <iframe> depende del visor del
 * navegador: si Chrome tiene activado «Descargar archivos PDF» (o el visor está deshabilitado) solo
 * aparece un recuadro con el botón «Abrir» en lugar de la representación gráfica.
 */
export function VisorPdf({ url }: { url: string }) {
  const contenedor = useRef<HTMLDivElement>(null);
  const [estado, setEstado] = useState<'cargando' | 'listo' | 'error'>('cargando');

  useEffect(() => {
    let cancelado = false;
    const destino = contenedor.current;
    setEstado('cargando');
    (async () => {
      const pdfjs = await import('pdfjs-dist');
      const { default: worker } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
      pdfjs.GlobalWorkerOptions.workerSrc = worker;
      const doc = await pdfjs.getDocument(url).promise;
      const lienzos: HTMLCanvasElement[] = [];
      // Resolución alta para que el texto se lea nítido en pantallas de alta densidad.
      const escala = 2;
      for (let n = 1; n <= doc.numPages; n++) {
        const pagina = await doc.getPage(n);
        const vista = pagina.getViewport({ scale: escala });
        const lienzo = document.createElement('canvas');
        lienzo.width = vista.width;
        lienzo.height = vista.height;
        lienzo.className = 'pdf-pagina';
        lienzo.setAttribute('aria-label', `Página ${n} de ${doc.numPages}`);
        await pagina.render({ canvasContext: lienzo.getContext('2d')!, viewport: vista }).promise;
        lienzos.push(lienzo);
      }
      await doc.destroy();
      if (cancelado || !destino) return;
      destino.replaceChildren(...lienzos);
      setEstado('listo');
    })().catch(() => !cancelado && setEstado('error'));
    return () => {
      cancelado = true;
      destino?.replaceChildren();
    };
  }, [url]);

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <a className="btn btn-sm" href={url} target="_blank" rel="noopener"><ExternalLink /> Abrir en otra pestaña</a>
      </div>
      {estado === 'cargando' && <Cargando texto="Generando la representación gráfica…" />}
      {estado === 'error' && <Alerta tipo="err">No se pudo mostrar el PDF en la página. Use «Abrir en otra pestaña» o el botón «PDF» para descargarlo.</Alerta>}
      <div ref={contenedor} className="pdf-visor" />
    </div>
  );
}
