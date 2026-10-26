import { describe, expect, it } from 'vitest';
import { csv, limpiarIdentificacion } from './formato';

describe('formato', () => {
  it('la cédula jurídica conserva letras (actualización v4.4) y las pasa a mayúsculas', () => {
    expect(limpiarIdentificacion('02', '3-a01-b23456')).toBe('3A01B23456');
    expect(limpiarIdentificacion('01', '1-0234-0567')).toBe('102340567');
    expect(limpiarIdentificacion('05', 'P-AB 12345')).toBe('PAB12345');
  });

  it('el CSV entrecomilla separadores, comillas y saltos de línea (incluido \\r)', () => {
    const texto = csv([['a;b', 'dijo "hola"', 'línea\r\notra', 5]]);
    expect(texto).toBe('﻿"a;b";"dijo ""hola""";"línea\r\notra";5');
  });
});
