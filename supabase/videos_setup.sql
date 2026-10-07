-- Pairx · Vídeos de técnica
-- Ejecutar una sola vez en Supabase → SQL Editor → New query → Run

-- 1. Tabla con los vídeos
create table if not exists public.videos (
  id bigint generated always as identity primary key,
  autor text not null,
  ejercicio text not null,
  tiempo text,
  url text not null,
  created_at timestamptz not null default now()
);

alter table public.videos enable row level security;

-- MVP sin login: cualquiera puede ver y subir. Restringir cuando haya usuarios registrados.
create policy "videos lectura publica" on public.videos for select using (true);
create policy "videos subida publica" on public.videos for insert with check (true);

-- 2. Almacenamiento de los archivos (público, máx. 50 MB, solo vídeo)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('videos', 'videos', true, 52428800, array['video/*'])
on conflict (id) do nothing;

create policy "videos archivos lectura" on storage.objects for select using (bucket_id = 'videos');
create policy "videos archivos subida" on storage.objects for insert with check (bucket_id = 'videos');

-- 3. Visualizaciones públicas
alter table public.videos add column if not exists visualizaciones integer not null default 0;

-- Suma 1 visualización y devuelve el total (los usuarios no pueden editar el número directamente)
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

grant execute on function public.sumar_visualizacion(bigint) to anon, authenticated;
