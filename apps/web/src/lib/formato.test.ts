import { describe, expect, it } from 'vitest';
import { csv, dinero, limpiarIdentificacion, numero } from './formato';

describe('formato', () => {
  it('el cero nunca se muestra con signo negativo', () => {
    expect(dinero(-0)).toBe(dinero(0));
    expect(dinero(-0.001)).toBe(dinero(0));
    expect(numero(-0.004)).toBe(numero(0));
    expect(dinero(-1500)).toMatch(/^-/);
  });

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
