// Prueba las migraciones, la seguridad por fila (RLS), el consecutivo atómico y la auditoría
// sobre PostgreSQL real (PGlite), simulando los roles y las funciones auth.* de Supabase.
import { beforeAll, describe, expect, it } from 'vitest';
import { crearBase } from './pg';

const ANA = '00000000-0000-0000-0000-00000000000a';
const BETO = '00000000-0000-0000-0000-00000000000b';
const emisor = { nombre: 'Servicios Contables Demo Ficticia S.A.', identificacion: { tipo: '02', numero: '3109999001' } };

let como: Awaited<ReturnType<typeof crearBase>>['como'];

let emisorId = '';

beforeAll(async () => {
  ({ como } = await crearBase());
  const [e] = await como<{ id: string }>(ANA, 'insert into emisores (propietario, miembros, datos) values ($1, array[$1]::uuid[], $2) returning id', [ANA, emisor]);
  emisorId = e.id;
});

describe('esquema y RLS', () => {
  it('el miembro ve su emisor; un usuario ajeno no', async () => {
    expect(await como(ANA, 'select id from emisores')).toHaveLength(1);
    expect(await como(BETO, 'select id from emisores')).toHaveLength(0);
  });

  it('no se puede crear un emisor a nombre de otro ni con varios miembros', async () => {
    await expect(como(BETO, 'insert into emisores (propietario, miembros, datos) values ($1, array[$1]::uuid[], $2)', [ANA, emisor])).rejects.toThrow();
    await expect(como(BETO, 'insert into emisores (propietario, miembros, datos) values ($1, array[$1, $2]::uuid[], $3)', [BETO, ANA, emisor])).rejects.toThrow();
  });

  it('no se puede alterar la membresía', async () => {
    await expect(como(ANA, 'update emisores set miembros = array[$1, $2]::uuid[] where id = $3', [ANA, BETO, emisorId])).rejects.toThrow(/membresía/);
  });

  it('valida productos: CAByS de 13 dígitos y precio positivo', async () => {
    const ok = { codigoCabys: '8222100000000', precioUnitario: 1000, codigoTarifaIva: '08', descripcion: 'Contabilidad' };
    await como(ANA, 'insert into productos (emisor_id, id, datos) values ($1, $2, $3)', [emisorId, 'p1', ok]);
    await expect(como(ANA, 'insert into productos (emisor_id, id, datos) values ($1, $2, $3)', [emisorId, 'p2', { ...ok, codigoCabys: '123' }])).rejects.toThrow();
    await expect(como(ANA, 'insert into productos (emisor_id, id, datos) values ($1, $2, $3)', [emisorId, 'p3', { ...ok, precioUnitario: -1 }])).rejects.toThrow();
    await expect(como(BETO, 'insert into productos (emisor_id, id, datos) values ($1, $2, $3)', [emisorId, 'p4', ok])).rejects.toThrow();
  });

  it('el cliente no puede escribir comprobantes, bitácora ni contadores', async () => {
    const clave = '5'.repeat(50);
    await expect(como(ANA, "insert into comprobantes (clave, emisor_id, tipo, estado, fecha_emision, datos) values ($1, $2, 'FE', 'aceptado', 'x', '{}')", [clave, emisorId])).rejects.toThrow();
    await expect(como(ANA, "insert into bitacora (emisor_id, fecha, accion) values ($1, 'x', 'falsa')", [emisorId])).rejects.toThrow();
    expect(await como(ANA, 'select * from contadores')).toHaveLength(0);
    await expect(como(ANA, "select siguiente_consecutivo($1, 'FE')", [emisorId])).rejects.toThrow();
  });

  it('service_role obtiene consecutivos atómicos y reinicia al tope', async () => {
    const n1 = await como<{ n: string }>(null, "select siguiente_consecutivo($1, 'k') as n", [emisorId]);
    const n2 = await como<{ n: string }>(null, "select siguiente_consecutivo($1, 'k') as n", [emisorId]);
    expect([Number(n1[0].n), Number(n2[0].n)]).toEqual([1, 2]);
    await como(null, "update contadores set ultimo = 9999999999 where clave = 'k'");
    expect(Number((await como<{ n: string }>(null, "select siguiente_consecutivo($1, 'k') as n", [emisorId]))[0].n)).toBe(1);
  });

  it('audita creación, modificación y eliminación con el usuario', async () => {
    await como(ANA, "insert into receptores (emisor_id, id, datos) values ($1, 'r1', $2)", [emisorId, { nombre: 'Cliente Ficticio' }]);
    await como(ANA, "update receptores set datos = $2 where emisor_id = $1 and id = 'r1'", [emisorId, { nombre: 'Cliente Ficticio 2' }]);
    await como(ANA, "delete from receptores where emisor_id = $1 and id = 'r1'", [emisorId]);
    const b = await como<{ accion: string; usuario: string }>(ANA, "select accion, usuario from bitacora where documento = 'r1' order by id");
    expect(b.map((x) => x.accion)).toEqual(['receptores-creacion', 'receptores-modificacion', 'receptores-eliminacion']);
    expect(b[0].usuario).toBe(`${ANA}@demo.test`);
    expect(await como(BETO, 'select * from bitacora')).toHaveLength(0);
  });
});
