-- Esquema del simulador de comprobantes electrónicos (Supabase / PostgreSQL).
--
-- Principios:
--  * Cada emisor (obligado tributario) solo es visible para sus miembros (RLS).
--  * Comprobantes, recibidos, contadores y bitácora solo los escribe la función Edge "api"
--    con la llave de servicio: el cliente no tiene políticas de escritura sobre ellos.
--  * Los cambios de receptores, productos y datos del emisor se auditan con triggers.


-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------
create table public.emisores (
  id uuid primary key default gen_random_uuid(),
  propietario uuid not null default auth.uid(),
  miembros uuid[] not null,
  datos jsonb not null,
  creado_en timestamptz not null default now(),
  constraint emisor_identificacion check (
    datos #>> '{identificacion,tipo}' in ('01', '02', '03', '04')
    and length(datos #>> '{identificacion,numero}') between 9 and 12
  ),
  constraint emisor_nombre check (length(datos ->> 'nombre') >= 5)
);

create table public.receptores (
  emisor_id uuid not null references public.emisores (id) on delete cascade,
  id text not null,
  datos jsonb not null,
  primary key (emisor_id, id),
  constraint receptor_nombre check (length(datos ->> 'nombre') >= 3)
);

create table public.productos (
  emisor_id uuid not null references public.emisores (id) on delete cascade,
  id text not null,
  datos jsonb not null,
  primary key (emisor_id, id),
  constraint producto_cabys check ((datos ->> 'codigoCabys') ~ '^[0-9]{13}$'),
  constraint producto_precio check ((datos ->> 'precioUnitario')::numeric > 0),
  constraint producto_tarifa check ((datos ->> 'codigoTarifaIva') in ('01','02','03','04','05','06','07','08','09','10','11'))
);

create table public.comprobantes (
  clave text primary key check (clave ~ '^[0-9]{50}$'),
  emisor_id uuid not null references public.emisores (id) on delete cascade,
  tipo text not null,
  estado text not null,
  fecha_emision text not null,
  datos jsonb not null,
  creado_en timestamptz not null default now()
);
create index comprobantes_emisor_fecha on public.comprobantes (emisor_id, fecha_emision desc);

create table public.recibidos (
  emisor_id uuid not null references public.emisores (id) on delete cascade,
  clave text not null check (clave ~ '^[0-9]{50}$'),
  estado text not null,
  fecha_emision text not null,
  datos jsonb not null,
  primary key (emisor_id, clave)
);

create table public.bitacora (
  id bigint generated always as identity primary key,
  emisor_id uuid not null references public.emisores (id) on delete cascade,
  fecha text not null,
  accion text not null,
  clave text,
  consecutivo text,
  documento text,
  detalle text,
  usuario text,
  ambiente text not null default 'simulacion',
  creado_en timestamptz not null default now()
);
create index bitacora_emisor on public.bitacora (emisor_id, id desc);

create table public.contadores (
  emisor_id uuid not null references public.emisores (id) on delete cascade,
  clave text not null,
  ultimo bigint not null,
  primary key (emisor_id, clave)
);

-- ---------------------------------------------------------------------------
-- Funciones auxiliares
-- ---------------------------------------------------------------------------
create or replace function public.es_miembro(p_emisor uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.emisores e where e.id = p_emisor and auth.uid() = any (e.miembros));
$$;

-- Siguiente número consecutivo de forma atómica; reinicia en 1 al llegar al tope (Nota 3).
create or replace function public.siguiente_consecutivo(p_emisor uuid, p_clave text)
returns bigint
language sql
volatile
security definer
set search_path = public
as $$
  insert into public.contadores (emisor_id, clave, ultimo)
  values (p_emisor, p_clave, 1)
  on conflict (emisor_id, clave)
  do update set ultimo = case when public.contadores.ultimo >= 9999999999 then 1 else public.contadores.ultimo + 1 end
  returning ultimo;
$$;

-- Hora de Costa Rica en formato RFC 3339 (-06:00) para la bitácora.
create or replace function public.ahora_cr()
returns text
language sql
stable
as $$
  select to_char(now() at time zone 'America/Costa_Rica', 'YYYY-MM-DD"T"HH24:MI:SS') || '-06:00';
$$;

-- ---------------------------------------------------------------------------
-- Integridad de la membresía y auditoría
-- ---------------------------------------------------------------------------
create or replace function public.proteger_membresia()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null and (new.miembros is distinct from old.miembros or new.propietario is distinct from old.propietario) then
    raise exception 'No se puede modificar la membresía ni el propietario del emisor.';
  end if;
  return new;
end;
$$;
create trigger emisores_proteger_membresia before update on public.emisores
  for each row execute function public.proteger_membresia();

create or replace function public.auditar_cambio()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_emisor uuid;
  v_documento text;
  v_accion text;
begin
  if tg_table_name = 'emisores' then
    v_emisor := coalesce(new.id, old.id);
    v_documento := v_emisor::text;
  else
    v_emisor := coalesce(new.emisor_id, old.emisor_id);
    v_documento := coalesce(new.id, old.id);
  end if;
  v_accion := tg_table_name || '-' || case tg_op when 'INSERT' then 'creacion' when 'UPDATE' then 'modificacion' else 'eliminacion' end;
  -- Al eliminar un emisor en cascada no queda dónde registrar.
  if exists (select 1 from public.emisores where id = v_emisor) then
    insert into public.bitacora (emisor_id, fecha, accion, documento, detalle, usuario)
    values (v_emisor, public.ahora_cr(), v_accion, v_documento,
            coalesce(new.datos ->> 'nombre', new.datos ->> 'descripcion', old.datos ->> 'nombre', old.datos ->> 'descripcion'),
            coalesce(auth.jwt() ->> 'email', auth.uid()::text, 'sistema'));
  end if;
  return coalesce(new, old);
end;
$$;
create trigger auditar_emisores after insert or update on public.emisores for each row execute function public.auditar_cambio();
create trigger auditar_receptores after insert or update or delete on public.receptores for each row execute function public.auditar_cambio();
create trigger auditar_productos after insert or update or delete on public.productos for each row execute function public.auditar_cambio();

-- ---------------------------------------------------------------------------
-- Seguridad por fila (RLS)
-- ---------------------------------------------------------------------------
alter table public.emisores enable row level security;
alter table public.receptores enable row level security;
alter table public.productos enable row level security;
alter table public.comprobantes enable row level security;
alter table public.recibidos enable row level security;
alter table public.bitacora enable row level security;
alter table public.contadores enable row level security;

create policy emisores_leer on public.emisores for select to authenticated using (auth.uid() = any (miembros));
create policy emisores_crear on public.emisores for insert to authenticated
  with check (propietario = auth.uid() and miembros = array[auth.uid()]);
create policy emisores_modificar on public.emisores for update to authenticated
  using (auth.uid() = any (miembros)) with check (auth.uid() = any (miembros));

create policy receptores_todo on public.receptores for all to authenticated
  using (public.es_miembro(emisor_id)) with check (public.es_miembro(emisor_id));
create policy productos_todo on public.productos for all to authenticated
  using (public.es_miembro(emisor_id)) with check (public.es_miembro(emisor_id));

-- Solo lectura para el cliente; escribe la función Edge con la llave de servicio.
create policy comprobantes_leer on public.comprobantes for select to authenticated using (public.es_miembro(emisor_id));
create policy recibidos_leer on public.recibidos for select to authenticated using (public.es_miembro(emisor_id));
create policy bitacora_leer on public.bitacora for select to authenticated using (public.es_miembro(emisor_id));
-- contadores: sin políticas (inaccesible para el cliente).

revoke execute on function public.siguiente_consecutivo(uuid, text) from public, anon, authenticated;
grant execute on function public.siguiente_consecutivo(uuid, text) to service_role;

-- ---------------------------------------------------------------------------
-- Tiempo real
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.emisores, public.receptores, public.productos,
      public.comprobantes, public.recibidos, public.bitacora;
  end if;
end;
$$;
