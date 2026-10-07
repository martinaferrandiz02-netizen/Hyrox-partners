-- Pairx · Base de datos (fase 1: usuarios, perfiles y vídeos)
-- Ejecutar en Supabase → SQL Editor → New query → Run.
-- Sustituye al antiguo videos_setup.sql: si lo llegaste a ejecutar, la tabla de vídeos de prueba se borra y se crea de nuevo.

-- ─────────────────────────────── PERFILES ───────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  ciudad text not null,
  sexo text not null check (sexo in ('Mujer','Hombre')),
  categoria text not null check (categoria in ('Open','Pro')),
  club text,
  compitio boolean not null default false,
  mejor_tiempo text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "perfiles visibles para usuarios" on public.profiles;
create policy "perfiles visibles para usuarios" on public.profiles
  for select to authenticated using (true);

drop policy if exists "crear mi perfil" on public.profiles;
create policy "crear mi perfil" on public.profiles
  for insert to authenticated with check (id = auth.uid());

drop policy if exists "editar mi perfil" on public.profiles;
create policy "editar mi perfil" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- ─────────────────────────────── VÍDEOS ───────────────────────────────
drop table if exists public.videos cascade;

create table public.videos (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  ejercicio text not null,
  tiempo text,
  url text not null,
  ruta text not null,
  visualizaciones integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.videos enable row level security;

create policy "videos visibles para usuarios" on public.videos
  for select to authenticated using (true);
create policy "subir mis videos" on public.videos
  for insert to authenticated with check (user_id = auth.uid());
create policy "borrar mis videos" on public.videos
  for delete to authenticated using (user_id = auth.uid());

-- Suma 1 visualización y devuelve el total (nadie puede editar el número a mano)
create or replace function public.sumar_visualizacion(video_id bigint)
returns integer
language sql
security definer
set search_path = public
as $$
  update public.videos set visualizaciones = visualizaciones + 1
  where id = video_id
  returning visualizaciones;
$$;

revoke execute on function public.sumar_visualizacion(bigint) from public, anon;
grant execute on function public.sumar_visualizacion(bigint) to authenticated;

-- ─────────────────────── ALMACENAMIENTO DE VÍDEOS ───────────────────────
-- Cada usuario sube a su propia carpeta: videos/<su id>/archivo.mp4
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('videos', 'videos', true, 52428800, array['video/*'])
on conflict (id) do update set public = true, file_size_limit = 52428800, allowed_mime_types = array['video/*'];

drop policy if exists "videos archivos lectura" on storage.objects;
drop policy if exists "videos archivos subida" on storage.objects;
drop policy if exists "subir a mi carpeta de videos" on storage.objects;
drop policy if exists "borrar de mi carpeta de videos" on storage.objects;

create policy "subir a mi carpeta de videos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "borrar de mi carpeta de videos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text);
