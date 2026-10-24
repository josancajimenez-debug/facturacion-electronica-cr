import { EMISOR_DEMO, construirComprobante, type LineaBorrador } from '@fe-cr/core';
import { describe, expect, it } from 'vitest';
import { generarPdf } from './pdf';

const linea = (n: number): LineaBorrador => ({
  codigoCabys: '8222100000000', detalle: `Servicio de prueba número ${n} con una descripción larga que ocupa dos renglones en la tabla`,
  cantidad: 1, unidadMedida: 'Sp', precioUnitario: 1000, descuentos: [], codigoTarifaIva: '08',
});

// El Blob de jsdom no implementa arrayBuffer(); FileReader sí.
const leerTexto = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(new TextDecoder('latin1').decode(r.result as ArrayBuffer));
    r.onerror = () => reject(r.error);
    r.readAsArrayBuffer(blob);
  });

describe('representación gráfica (PDF)', () => {
  it('en varias páginas, cada una lleva la franja de simulación y su numeración', async () => {
    const c = construirComprobante({
      emisor: EMISOR_DEMO, numero: 1, ambiente: 'simulacion',
      borrador: {
        tipo: 'FE', emisorId: EMISOR_DEMO.id, sucursal: '001', terminal: '00001', situacion: '1', codigoActividadEmisor: '6920.0',
        contraparte: { nombre: 'Distribuidora Ficticia del Valle S.A.', identificacion: { tipo: '02', numero: '3109999002' } },
        condicionVenta: '01', moneda: 'CRC', tipoCambio: 1, otrosCargos: [], referencias: [], mediosPago: [{ tipo: '01' }],
        lineas: Array.from({ length: 60 }, (_, i) => linea(i + 1)),
      },
    });
    const texto = await leerTexto(await generarPdf(c, { incluirQr: true }));
    const paginas = Number(/Página 1 de (\d+)/.exec(texto)?.[1]);
    expect(paginas).toBeGreaterThan(1);
    expect(texto.match(/ENTORNO DE SIMULACI/g)).toHaveLength(paginas);
    for (let i = 1; i <= paginas; i++) expect(texto).toContain(`Página ${i} de ${paginas}`);
  });
});
