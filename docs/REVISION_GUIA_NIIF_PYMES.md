# Revisión técnica de la *Guía de implementación NIIF para las PYMES y micropymes* (AIC-CILEA)

Documento revisado: *Guía de implementación NIIF para las PYMES y micropymes en todas las jurisdicciones*, Asociación Interamericana de Contabilidad (AIC) y Comité de Integración Latino Europa-América (CILEA), octubre de 2026, 103 páginas (archivo `Guia-Implementacion-NIIF-PYMES-Revisada-NA-PORTADAS-Rev-IE-V2`).

Referencia de contraste: texto oficial en español de la *Norma de Contabilidad NIIF para las PYMES*, tercera edición (IASB, febrero de 2025), en la carpeta `Bibliografía/NIIF PYMES/2025`. En particular: el resumen oficial de las 105 modificaciones, la Sección 35 y el Apéndice A.

Fecha de la revisión: 29 de octubre de 2026.

## 1. Conclusión

La guía es útil como **método de trabajo**. Sus seis fases, los formularios A a I, la distinción entre primera adopción y cambio de edición, y un caso práctico completo con papeles de trabajo que cuadran sirven para planificar un proyecto de implementación.

Como **fuente normativa** no es confiable sin verificación. Las listas de excepciones (35.9) y exenciones (35.10) de la Sección 35 no coinciden con la Norma. El camino para pasar de la segunda a la tercera edición se describe con la Sección 35 cuando corresponde el Apéndice A. Varias secciones se describen con cambios que la Norma no contiene. El caso práctico tiene además un error de cálculo en la depreciación y un ajuste que contradice el párrafo 35.9(c).

Recomendación: usar la guía para la metodología y los formularios, y tomar de la Norma el contenido de cada requerimiento. Así se hizo al integrarla a la APP (sección 5).

## 2. Hallazgos importantes

| N.º | Ubicación en la guía | Qué dice la guía | Qué dice la Norma | Corrección |
| --- | --- | --- | --- | --- |
| 1 | Cap. 5.4 y Formulario I (pp. 27-29, 33-34) | Enumera 18 exenciones optativas del 35.10. Incluye préstamos del gobierno, costos por préstamos, deterioro de activos no financieros, designación a valor razonable, medición inicial al precio de la transacción, subsidiarias que adoptan después que la controladora y pasivos por desmantelamiento ya reconocidos. | El 35.10 tiene 15 exenciones, de (a) a (o). Las siete citadas **no existen** en la Sección 35; vienen de la NIIF 1 de las NIIF completas o de otras fuentes. Faltan (h) impuestos diferidos de forma prospectiva, (m) operaciones sujetas a regulación de tarifas, (n) hiperinflación grave y (o) Sección 23 retroactiva o prospectiva. | Reemplazar la lista y el Formulario I por los 15 literales del 35.10. |
| 2 | Cap. 5.5 (pp. 29-30) | Excepciones obligatorias: incluye la «clasificación de instrumentos como pasivo o patrimonio» y omite otras. | El 35.9 tiene siete literales, de (a) a (g): baja en cuentas, coberturas, estimaciones contables, operaciones discontinuadas, participaciones no controladoras, **préstamos del gobierno** (que la guía presenta como exención optativa) y **contratos completados con clientes**, una excepción nueva de la tercera edición. La clasificación pasivo/patrimonio no figura. | Corregir la lista. Destacar el 35.9(g) porque afecta el ejemplo de la Sección 23. |
| 3 | Cap. 4.4 (paso 4), 9.10, Formulario E, cap. 12 (Tabla y Nota 2) | La entidad que ya aplica la segunda edición hace un balance de apertura con conciliaciones de la Sección 35, con «exenciones» para las Secciones 9, 11, 12, 19 y 23. | Quien ya aplica la Norma **no usa la Sección 35**. Aplica la tercera edición de forma retroactiva según la Sección 10, salvo lo dispuesto en el Apéndice A (párrafos A3 a A49), y revela lo que exige el 10.13. Los tratamientos alcanzan también a las Secciones 3, 15, 16, 17, 18, 26, 28, 29, 30 y 34. Varios **no son opcionales sino prospectivos**: las Secciones 12 y 19 se aplican hacia adelante, por lo que no hay elección de «no reexpresar» combinaciones anteriores. | Reescribir el paso 4 del capítulo 4, el 9.10 y el Formulario E con el Apéndice A. |
| 4 | Cap. 3.2, tabla de cambios (pp. 16-17) | «Resto (Secciones 3-8, 10, 13-14, 17-18, 21-22, 24-27, 30-35): mayormente cambios editoriales». | Según el resumen oficial, tienen cambios de fondo las Secciones 7 (conciliación de pasivos de financiación y financiación de proveedores), 26 (pagos basados en acciones), 30 (ausencia de convertibilidad) y 35. Hay aclaraciones relevantes en las Secciones 3, 4, 6, 8, 10, 14, 17, 18, 21, 22, 33 y 34. Solo las Secciones 5, 20, 24, 25 y 31 cambian únicamente la redacción, y la 32 no se modificó. | Ampliar la tabla. La APP trae la clasificación completa en `CAMBIOS_TERCERA_EDICION`. |
| 5 | Cap. 12, Anexo 4.2 (p. 81) | Depreciación de 2026 = (costo − valor residual) ÷ «vida útil restante». | Al revisar la vida útil, lo que se distribuye en la vida **restante** es el importe en libros menos el valor residual. | Edificios: (216 000 − 60 000) ÷ 40 = 3 900, no 6 000. Con la fórmula correcta, la depreciación de los activos propios baja de 42 625 a 28 825 y cambian el resultado, el impuesto diferido y las conciliaciones. |
| 6 | Cap. 12, ajuste A-04 (pp. 72, 78) | En la fecha de transición se recalcula la depreciación acumulada con vidas útiles y valores residuales nuevos (+18 000 al patrimonio). | El 35.9(c) prohíbe cambiar retroactivamente las estimaciones del marco anterior salvo evidencia objetiva de error. La guía misma lo dice en el 5.5. | Justificar el ajuste como corrección de un error o usar la exención de costo atribuido (35.10(c)). De lo contrario, el cambio va de forma prospectiva. |

## 3. Hallazgos de precisión técnica

1. **Sección 11 (9.2 y Formulario C).** Afirma que un instrumento se mide al costo amortizado «si aprueba la prueba SPPI y el modelo de negocio lo sustenta». La Sección 11 de las PYMES **no tiene prueba de modelo de negocio**. Clasifica con las condiciones del 11.9 y el principio complementario del 11.9ZA. El deterioro sigue el **modelo de pérdida incurrida** (11.21 a 11.26). La antigüedad de saldos es una revelación nueva (11.43) y una herramienta práctica de estimación, no el modelo.
2. **Sección 15.** Ahora se titula «Acuerdos conjuntos» y cambia «negocio conjunto» por «acuerdo conjunto». La guía mantiene «Inversiones en negocios conjuntos».
3. **Tabla 3.2.** Une en una fila las Secciones 9 y 11. El cambio de la Sección 9 es otro: nueva definición de control alineada con la NIIF 10 y medición a valor razonable de la participación retenida al perder el control.
4. **Sección 28 (9.9).** Los cambios no son «precisiones sobre provisiones». Son: profundidad del mercado de bonos por moneda, la simplificación de medición (importe actual de terminación), el momento de reconocer los beneficios por terminación y conciliaciones y revelaciones más detalladas.
5. **Sección 20, caso práctico Nota 12.** Dice que «la tercera edición exige revelar el análisis de vencimientos del pasivo» por arrendamiento. La Sección 20 solo tuvo cambios de redacción, y la revelación por plazos de los pagos mínimos ya existía.
6. **Párrafo 18.20 (A-05 y Nota 10).** El reconocimiento como gasto de las actividades de establecimiento está en el grupo de párrafos 18.14-18.15. Conviene verificar la cita.
7. **Sección 27 (6.1).** Atribuye a una «excepción obligatoria» la prohibición de usar información posterior para el deterioro. No hay una excepción específica: lo cubre la excepción de estimaciones, el 35.9(c).
8. **Sección 20 (6.1).** «Debe aplicarse la exención» sobre acuerdos que contienen un arrendamiento. El 35.10(k) es optativo.
9. **Costa Rica (cap. 10).** No menciona el oficio MH-DGT-OF-0201-2025, divulgado en el comunicado DE-0028-2025 del Colegio de Contadores Públicos el 2/06/2025. Según ese oficio, los Grandes Contribuyentes Nacionales deben llevar registros conforme a las NIIF completas para efectos fiscales. El Formulario A debería preguntarlo.
10. **Caso práctico, Nota 1.** Dice que la entidad aplica la Norma «de forma anticipada». Sin embargo, el enunciado fija 2027 como primer ejercicio obligatorio y 2026 como comparativo. La aplicación anticipada solo cabe si se emiten los estados de 2026 bajo la tercera edición.
11. **Caso práctico, datos.** La entidad inició actividades en 2024, pero la depreciación acumulada recalculada de los edificios (84 000 a 6 000 por año) equivale a 14 años de uso.

## 4. Hallazgos de forma

- Referencias cruzadas rotas en el 6.1 y los formularios. «Apartado 7.2» debe ser 9.2, «7.8» debe ser 9.8, «8.4» debe ser 5.4, «8.5» debe ser 5.5 y «7.3» (Formulario H) debe ser 8.3. Además, el Formulario I se cita en el «Anexo 11.2» pero está en el 6.2.
- Numeración duplicada «11.2.6» para los Formularios F y G. Errata: «Lista de control t».
- Cifra de jurisdicciones: el cap. 1 dice «más de 80» y el 3.1 dice 85.
- Redondeos de un céntimo. El total de activos del ESFA es 1 329 141,93, pero la suma de sus partidas da 1 329 141,92. El haber del diario de ajustes suma 223 821,47 frente a 223 821,46 en el debe: el arrendamiento figura como 2 177,65 en el patrimonio y 30 925,17 en el pasivo.

## 5. Cálculos verificados del caso práctico

Se recalcularon y **son correctos**:

- El valor presente del arrendamiento: 12 000 × 3,99271 = 47 912,52. También la depreciación de dos años (19 165,01) y el pasivo al 1/01/2026: 30 925,17, con una porción corriente de 9 525,99.
- El impuesto diferido al 25 %:
  - Pasivo: (18 000 + 28 747,51 + 45 000) × 25 % = 22 936,88.
  - Activo: (12 700 + 8 500 + 30 925,16 + 8 000 + 46 000) × 25 % = 26 531,29.
- La conciliación tributaria: base imponible 47 635,73; impuesto corriente 11 908,93; gasto total 16 266,05.
- La conciliación del patrimonio: 816 000,00 − 19 783,24 = 796 216,76.
- El estado de flujos de efectivo: disminución neta de 36 000, de 85 000 a 49 000.

Los totales cuadran con los datos que usa el caso. El error del hallazgo 5 está en el dato de depreciación, no en la aritmética.

## 6. Qué se integró en la APP

Página **Transición NIIF PYMES** en el menú Contabilidad, programada en `core/transicion.ts`:

1. **Clasificación y camino.** Primera adopción (Sección 35) o cambio de edición (Apéndice A), con las fechas clave. Incluye la obligación pública de rendir cuentas y el criterio de Grandes Contribuyentes Nacionales.
2. **Primera adopción.** Muestra las 7 excepciones del 35.9 y las 15 exenciones del 35.10. Cada exención se decide con su justificación.
3. **Cambio de edición.** Lista los tratamientos del Apéndice A por sección (retroactivo, prospectivo o a elección) y ofrece la elección de la Sección 23 (A27).
4. **Matriz de brechas.** Cubre las 35 secciones, cada una con la naturaleza del cambio según el resumen oficial. Corresponde al Formulario B de la guía.
5. **Conciliación del patrimonio.** Corresponde al 35.13 o al 10.13. Advierte cuando un ajuste rehace estimaciones, que es el caso del hallazgo 6, y cuando se usan exenciones del 35.10 en un cambio de edición.

Las pruebas automáticas reproducen la conciliación del caso Comercial Andina (796 216,76) y la advertencia sobre el ajuste A-04.
