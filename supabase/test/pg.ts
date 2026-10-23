// PostgreSQL en memoria (PGlite) con los roles y funciones auth.* que provee Supabase,
// y las migraciones del proyecto aplicadas.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const AUTH_STUB = `
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth;
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
`;

export async function crearBase() {
  const db = new PGlite();
  await db.exec(AUTH_STUB);
  const dir = resolve(__dirname, '../migrations');
  for (const f of readdirSync(dir).sort()) await db.exec(readFileSync(resolve(dir, f), 'utf8'));

  /** Ejecuta como usuario autenticado, o como service_role si uid es null. */
  async function como<T = Record<string, unknown>>(uid: string | null, sql: string, params: unknown[] = []): Promise<T[]> {
    await db.exec(
      uid
        ? `set role authenticated; select set_config('request.jwt.claim.sub', '${uid}', false); select set_config('request.jwt.claims', '{"email":"${uid}@demo.test"}', false);`
        : `set role service_role; select set_config('request.jwt.claim.sub', '', false); select set_config('request.jwt.claims', '', false);`,
    );
    try {
      return (await db.query<T>(sql, params)).rows;
    } finally {
      await db.exec('reset role;');
    }
  }
  return { db, como };
}
