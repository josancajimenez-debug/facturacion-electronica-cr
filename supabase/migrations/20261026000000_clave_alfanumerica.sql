-- Actualización v4.4 (obligatoria desde el 1/11/2026): la cédula jurídica pasa de 10 dígitos a
-- 10 caracteres alfanuméricos, por lo que la clave de 50 posiciones puede contener letras.
alter table public.comprobantes drop constraint if exists comprobantes_clave_check;
alter table public.comprobantes add constraint comprobantes_clave_check check (clave ~ '^[0-9A-Z]{50}$');

alter table public.recibidos drop constraint if exists recibidos_clave_check;
alter table public.recibidos add constraint recibidos_clave_check check (clave ~ '^[0-9A-Z]{50}$');
