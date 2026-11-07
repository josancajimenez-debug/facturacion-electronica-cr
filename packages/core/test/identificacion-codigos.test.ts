import { describe, expect, it } from 'vitest';
import { CODIGO_TIPO_DOCUMENTO, CONDICION_VENTA, NOMBRE_COMPROBANTE, codigoComprobante, comprobantePorCodigo, conCodigo } from '../src';

describe('Identificación de los códigos en pantalla y en el PDF', () => {
  it('conCodigo muestra el código junto con su descripción', () => {
    expect(conCodigo(CONDICION_VENTA, '01')).toBe('01 – Contado');
    expect(conCodigo(CONDICION_VENTA, 'ZZ')).toBe('ZZ');
    expect(conCodigo(CONDICION_VENTA, undefined)).toBe('');
  });

  it('cada tipo de comprobante expone su código de la nota 3 y su sigla', () => {
    for (const tipo of Object.keys(NOMBRE_COMPROBANTE) as (keyof typeof NOMBRE_COMPROBANTE)[]) {
      expect(codigoComprobante(tipo)).toBe(`${CODIGO_TIPO_DOCUMENTO[tipo]} – ${NOMBRE_COMPROBANTE[tipo]} (${tipo})`);
      expect(comprobantePorCodigo(CODIGO_TIPO_DOCUMENTO[tipo])).toBe(codigoComprobante(tipo));
    }
    expect(codigoComprobante('CCE')).toBe('05 – Confirmación de aceptación (CCE)');
    expect(comprobantePorCodigo('07')).toBe('07 – Confirmación de rechazo (RCE)');
    expect(comprobantePorCodigo('99')).toBe('99');
  });
});
