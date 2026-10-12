-- Pairx · Solicitudes de pareja y chats
-- Ejecutar en Supabase → SQL Editor → New query → Run (se puede ejecutar más de una vez).

-- ─────────────────────────────── SOLICITUDES ───────────────────────────────
create table if not exists public.solicitudes (
  id bigint generated always as identity primary key,
  de uuid not null references public.profiles(id) on delete cascade,
  para uuid not null references public.profiles(id) on delete cascade,
  mensaje text check (char_length(mensaje) <= 300),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'aceptada', 'rechazada')),
  created_at timestamptz not null default now(),
  unique (de, para),
  check (de <> para)
);

alter table public.solicitudes enable row level security;

drop policy if exists "ver mis solicitudes" on public.solicitudes;
create policy "ver mis solicitudes" on public.solicitudes
  for select to authenticated using (de = auth.uid() or para = auth.uid());

drop policy if exists "enviar solicitud" on public.solicitudes;
create policy "enviar solicitud" on public.solicitudes
  for insert to authenticated with check (de = auth.uid() and estado = 'pendiente');

-- Solo quien la recibe puede aceptarla o rechazarla
drop policy if exists "responder solicitud" on public.solicitudes;
create policy "responder solicitud" on public.solicitudes
  for update to authenticated using (para = auth.uid()) with check (para = auth.uid());

-- Quien la envía puede retirarla
drop policy if exists "retirar solicitud" on public.solicitudes;
create policy "retirar solicitud" on public.solicitudes
  for delete to authenticated using (de = auth.uid());

-- Al responder solo se puede cambiar el estado
create or replace function public.solo_cambiar_estado()
returns trigger language plpgsql as $$
begin
  if current_user in ('authenticated', 'anon') then
    new.de := old.de;
    new.para := old.para;
    new.mensaje := old.mensaje;
    new.created_at := old.created_at;
  end if;
  return new;
end; $$;

drop trigger if exists solo_cambiar_estado on public.solicitudes;
create trigger solo_cambiar_estado before update on public.solicitudes
  for each row execute function public.solo_cambiar_estado();

-- ─────────────────────────────── MENSAJES ───────────────────────────────
create table if not exists public.mensajes (
  id bigint generated always as identity primary key,
  de uuid not null references public.profiles(id) on delete cascade,
  para uuid not null references public.profiles(id) on delete cascade,
  texto text not null check (char_length(texto) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists mensajes_conversacion on public.mensajes (least(de, para), greatest(de, para), created_at);

alter table public.mensajes enable row level security;

drop policy if exists "ver mis mensajes" on public.mensajes;
create policy "ver mis mensajes" on public.mensajes
  for select to authenticated using (de = auth.uid() or para = auth.uid());

-- Solo se puede escribir a alguien con quien hay una solicitud aceptada
drop policy if exists "escribir mensaje" on public.mensajes;
create policy "escribir mensaje" on public.mensajes
  for insert to authenticated with check (
    de = auth.uid() and exists (
      select 1 from public.solicitudes s
      where s.estado = 'aceptada'
        and ((s.de = auth.uid() and s.para = mensajes.para) or (s.para = auth.uid() and s.de = mensajes.para))
    )
  );

-- ─────────────────────────────── TIEMPO REAL ───────────────────────────────
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'mensajes') then
    alter publication supabase_realtime add table public.mensajes;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'solicitudes') then
    alter publication supabase_realtime add table public.solicitudes;
  end if;
end $$;
