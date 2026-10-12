-- Pairx · Ajustes: foto de perfil, teléfono privado y borrar cuenta
-- Ejecutar en Supabase → SQL Editor → New query → Run (se puede ejecutar más de una vez).

-- Foto de perfil
alter table public.profiles add column if not exists foto_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatares', 'avatares', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "subir mi foto" on storage.objects;
drop policy if exists "borrar mi foto" on storage.objects;
create policy "subir mi foto" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "borrar mi foto" on storage.objects for delete to authenticated
  using (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text);

-- Datos privados (solo los ve su dueño): el teléfono NO va en el perfil público
create table if not exists public.datos_privados (
  id uuid primary key references public.profiles(id) on delete cascade,
  telefono text check (telefono is null or telefono ~ '^\+?[0-9 ]{6,20}$'),
  updated_at timestamptz not null default now()
);
alter table public.datos_privados enable row level security;
drop policy if exists "mis datos privados" on public.datos_privados;
create policy "mis datos privados" on public.datos_privados for all to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Borrar mi cuenta (obligatorio para publicar en la App Store). Borra el usuario y, en cascada,
-- su perfil, carreras, vídeos, solicitudes, mensajes y plazas.
create or replace function public.borrar_mi_cuenta()
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  delete from storage.objects where bucket_id in ('videos', 'certificados', 'avatares')
    and (storage.foldername(name))[1] = auth.uid()::text;
  delete from auth.users where id = auth.uid();
end; $$;

revoke execute on function public.borrar_mi_cuenta() from public, anon;
grant execute on function public.borrar_mi_cuenta() to authenticated;
