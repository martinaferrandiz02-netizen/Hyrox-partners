-- Pairx · Verificación de certificados en el servidor
-- Ejecutar en Supabase → SQL Editor → New query → Run (se puede ejecutar más de una vez).

-- Columnas necesarias
alter table public.profiles add column if not exists nombre_completo text;
alter table public.profiles add column if not exists certificado_url text;
alter table public.profiles add column if not exists certificado_ruta text;
alter table public.profiles add column if not exists certificado_estado text not null default 'sin_certificado';
alter table public.profiles add column if not exists certificado_motivo text;
alter table public.profiles drop column if exists certificado_verificado;

alter table public.profiles drop constraint if exists certificado_estado_valido;
alter table public.profiles add constraint certificado_estado_valido
  check (certificado_estado in ('sin_certificado', 'pendiente', 'verificado', 'rechazado'));

-- Los usuarios NO pueden cambiar el estado de verificación.
-- Solo el servidor (función verificar-certificado) o tú desde el panel de Supabase.
create or replace function public.proteger_verificacion()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT'
       or new.certificado_ruta is distinct from old.certificado_ruta
       or new.nombre_completo is distinct from old.nombre_completo
       or new.mejor_tiempo is distinct from old.mejor_tiempo then
      -- Cambió algo que afecta a la verificación: vuelve a empezar
      new.certificado_estado := case when new.certificado_ruta is null then 'sin_certificado' else 'pendiente' end;
      new.certificado_motivo := null;
    else
      new.certificado_estado := old.certificado_estado;
      new.certificado_motivo := old.certificado_motivo;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists proteger_verificacion on public.profiles;
create trigger proteger_verificacion
  before insert or update on public.profiles
  for each row execute function public.proteger_verificacion();

-- Almacenamiento de certificados (PDF, PNG, JPG · máx. 10 MB)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('certificados', 'certificados', true, 10485760, array['application/pdf','image/png','image/jpeg'])
on conflict (id) do update set public = true, file_size_limit = 10485760, allowed_mime_types = array['application/pdf','image/png','image/jpeg'];

drop policy if exists "subir mi certificado" on storage.objects;
drop policy if exists "borrar mi certificado" on storage.objects;

create policy "subir mi certificado" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'certificados' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "borrar mi certificado" on storage.objects
  for delete to authenticated
  using (bucket_id = 'certificados' and (storage.foldername(name))[1] = auth.uid()::text);

-- ───────── Un certificado solo lo pueden usar 2 personas (pareja de Doubles) ─────────
alter table public.profiles add column if not exists certificado_huella text;
create index if not exists profiles_certificado_huella on public.profiles (certificado_huella);

create or replace function public.limitar_certificado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.certificado_huella is not null and
     (select count(*) from public.profiles where certificado_huella = new.certificado_huella and id <> new.id) >= 2 then
    raise exception 'certificado_ya_usado';
  end if;
  return new;
end;
$$;

drop trigger if exists limitar_certificado on public.profiles;
create trigger limitar_certificado
  before insert or update of certificado_huella on public.profiles
  for each row execute function public.limitar_certificado();
