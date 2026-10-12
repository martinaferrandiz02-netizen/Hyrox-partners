-- Pairx · Plazas disponibles (busco sustituto / cedo mi plaza)
-- Ejecutar en Supabase → SQL Editor → New query → Run (se puede ejecutar más de una vez).

create table if not exists public.plazas (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  tipo text not null check (tipo in ('Busco sustituto', 'Cedo mi plaza')),
  carrera text not null check (char_length(carrera) between 2 and 80),
  fecha date not null,
  categoria text not null check (categoria in ('Doubles Open', 'Doubles Pro', 'Individual Open', 'Individual Pro', 'Relay')),
  flex boolean not null default true,
  nota text check (char_length(nota) <= 300),
  created_at timestamptz not null default now()
);

create index if not exists plazas_fecha on public.plazas (fecha);

alter table public.plazas enable row level security;

drop policy if exists "ver plazas" on public.plazas;
create policy "ver plazas" on public.plazas
  for select to authenticated using (true);

drop policy if exists "publicar mi plaza" on public.plazas;
create policy "publicar mi plaza" on public.plazas
  for insert to authenticated with check (user_id = auth.uid() and fecha >= current_date);

drop policy if exists "retirar mi plaza" on public.plazas;
create policy "retirar mi plaza" on public.plazas
  for delete to authenticated using (user_id = auth.uid());

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'plazas') then
    alter publication supabase_realtime add table public.plazas;
  end if;
end $$;
