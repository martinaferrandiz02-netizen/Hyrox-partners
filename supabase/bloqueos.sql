-- Pairx · Bloquear y denunciar usuarios
-- Ejecutar en Supabase → SQL Editor → New query → Run (se puede ejecutar más de una vez).

-- ─────────────────────────────── BLOQUEOS ───────────────────────────────
create table if not exists public.bloqueos (
  bloqueador uuid not null references public.profiles(id) on delete cascade,
  bloqueado uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (bloqueador, bloqueado),
  check (bloqueador <> bloqueado)
);
alter table public.bloqueos enable row level security;

-- Cada uno ve, crea y quita solo sus propios bloqueos (nadie sabe quién le ha bloqueado)
drop policy if exists "mis bloqueos" on public.bloqueos;
create policy "mis bloqueos" on public.bloqueos for all to authenticated
  using (bloqueador = auth.uid()) with check (bloqueador = auth.uid());

-- ¿Hay un bloqueo entre dos personas, en cualquier dirección?
create or replace function public.hay_bloqueo(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.bloqueos where (bloqueador = a and bloqueado = b) or (bloqueador = b and bloqueado = a))
$$;

-- Ids que no debo ver: a quien he bloqueado y quien me ha bloqueado
create or replace function public.ocultos_para_mi()
returns setof uuid language sql stable security definer set search_path = public as $$
  select bloqueado from public.bloqueos where bloqueador = auth.uid()
  union
  select bloqueador from public.bloqueos where bloqueado = auth.uid()
$$;

revoke execute on function public.hay_bloqueo(uuid, uuid) from public, anon;
revoke execute on function public.ocultos_para_mi() from public, anon;
grant execute on function public.hay_bloqueo(uuid, uuid) to authenticated;
grant execute on function public.ocultos_para_mi() to authenticated;

-- Con un bloqueo de por medio no se pueden enviar solicitudes ni mensajes
drop policy if exists "enviar solicitud" on public.solicitudes;
create policy "enviar solicitud" on public.solicitudes
  for insert to authenticated
  with check (de = auth.uid() and estado = 'pendiente' and not public.hay_bloqueo(de, para));

drop policy if exists "escribir mensaje" on public.mensajes;
create policy "escribir mensaje" on public.mensajes
  for insert to authenticated with check (
    de = auth.uid()
    and not public.hay_bloqueo(de, para)
    and exists (
      select 1 from public.solicitudes s
      where s.estado = 'aceptada'
        and ((s.de = auth.uid() and s.para = mensajes.para) or (s.para = auth.uid() and s.de = mensajes.para))
    )
  );

-- Al bloquear a tu pareja, deja de ser tu pareja
create or replace function public.tras_bloqueo()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set pareja_id = null
    where (id = new.bloqueador and pareja_id = new.bloqueado) or (id = new.bloqueado and pareja_id = new.bloqueador);
  return new;
end; $$;
drop trigger if exists tras_bloqueo on public.bloqueos;
create trigger tras_bloqueo after insert on public.bloqueos for each row execute function public.tras_bloqueo();

-- ─────────────────────────────── DENUNCIAS ───────────────────────────────
create table if not exists public.denuncias (
  id bigint generated always as identity primary key,
  denunciante uuid references public.profiles(id) on delete set null,
  denunciado uuid references public.profiles(id) on delete set null,
  motivo text not null check (motivo in ('Perfil falso', 'Certificado o tiempo falso', 'Acoso o mensajes ofensivos', 'Contenido inapropiado', 'Spam', 'Otro')),
  detalle text check (char_length(detalle) <= 1000),
  contexto text check (contexto in ('perfil', 'chat', 'video', 'plaza')),
  estado text not null default 'abierta' check (estado in ('abierta', 'revisada', 'descartada')),
  created_at timestamptz not null default now()
);
alter table public.denuncias enable row level security;

-- Se puede denunciar, pero solo la administradora (desde el panel) ve todas las denuncias
drop policy if exists "denunciar" on public.denuncias;
create policy "denunciar" on public.denuncias for insert to authenticated
  with check (denunciante = auth.uid() and denunciado <> auth.uid() and estado = 'abierta');
drop policy if exists "ver mis denuncias" on public.denuncias;
create policy "ver mis denuncias" on public.denuncias for select to authenticated using (denunciante = auth.uid());
