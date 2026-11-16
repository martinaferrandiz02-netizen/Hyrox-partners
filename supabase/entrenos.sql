-- Pairx · Entrenos (registro manual) y seguir a otros atletas
-- Ejecutar en Supabase → SQL Editor → New query → Run (se puede ejecutar más de una vez).

-- ─────────────────────────────── SEGUIR ───────────────────────────────
create table if not exists public.seguimientos (
  seguidor uuid not null references public.profiles(id) on delete cascade,
  seguido uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (seguidor, seguido),
  check (seguidor <> seguido)
);
create index if not exists seguimientos_seguido on public.seguimientos (seguido);
alter table public.seguimientos enable row level security;

-- Quién sigue a quién es visible para todos (para los contadores); cada uno sigue y deja de seguir por sí mismo
drop policy if exists "ver seguimientos" on public.seguimientos;
create policy "ver seguimientos" on public.seguimientos for select to authenticated using (true);
drop policy if exists "seguir" on public.seguimientos;
create policy "seguir" on public.seguimientos for insert to authenticated
  with check (seguidor = auth.uid() and not public.hay_bloqueo(seguidor, seguido));
drop policy if exists "dejar de seguir" on public.seguimientos;
create policy "dejar de seguir" on public.seguimientos for delete to authenticated using (seguidor = auth.uid());

-- Amigos = os seguís los dos
create or replace function public.son_amigos(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.seguimientos where seguidor = a and seguido = b)
     and exists (select 1 from public.seguimientos where seguidor = b and seguido = a)
$$;
revoke execute on function public.son_amigos(uuid, uuid) from public, anon;
grant execute on function public.son_amigos(uuid, uuid) to authenticated;

-- Al bloquear a alguien, dejáis de seguiros
create or replace function public.tras_bloqueo_seguir()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.seguimientos
    where (seguidor = new.bloqueador and seguido = new.bloqueado) or (seguidor = new.bloqueado and seguido = new.bloqueador);
  return new;
end; $$;
drop trigger if exists tras_bloqueo_seguir on public.bloqueos;
create trigger tras_bloqueo_seguir after insert on public.bloqueos for each row execute function public.tras_bloqueo_seguir();

-- ─────────────────────────────── ENTRENOS ───────────────────────────────
create table if not exists public.entrenos (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  titulo text not null check (char_length(titulo) between 2 and 80),
  fecha date not null default current_date,
  tipo text not null default 'Simulación' check (tipo in ('Simulación', 'Estaciones', 'Running', 'Otro')),
  total integer check (total is null or total between 1 and 86400),          -- segundos
  parciales jsonb not null default '{}',                                       -- {"Ski erg": 300, ..., "Running": 2700}
  notas text check (notas is null or char_length(notas) <= 500),
  visibilidad text not null default 'publico' check (visibilidad in ('publico', 'amigos', 'privado')),
  created_at timestamptz not null default now()
);
create index if not exists entrenos_usuario on public.entrenos (user_id, fecha desc);
alter table public.entrenos enable row level security;

-- Público: todos · Amigos: solo quien os seguís mutuamente · Privado: solo tú. Nunca con un bloqueo de por medio.
drop policy if exists "ver entrenos" on public.entrenos;
create policy "ver entrenos" on public.entrenos for select to authenticated using (
  user_id = auth.uid()
  or (not public.hay_bloqueo(auth.uid(), user_id) and (
        visibilidad = 'publico'
        or (visibilidad = 'amigos' and public.son_amigos(auth.uid(), user_id))))
);
drop policy if exists "añadir mi entreno" on public.entrenos;
create policy "añadir mi entreno" on public.entrenos for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "editar mi entreno" on public.entrenos;
create policy "editar mi entreno" on public.entrenos for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "borrar mi entreno" on public.entrenos;
create policy "borrar mi entreno" on public.entrenos for delete to authenticated using (user_id = auth.uid());
