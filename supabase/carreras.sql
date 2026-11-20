-- Pairx · Historial de carreras (público o privado) y próximas carreras
-- Ejecutar en Supabase → SQL Editor → New query → Run (se puede ejecutar más de una vez).

-- ─────────────────────────── HISTORIAL: visibilidad ───────────────────────────
alter table public.resultados add column if not exists visibilidad text not null default 'publico';
alter table public.resultados drop constraint if exists resultados_visibilidad_valida;
alter table public.resultados add constraint resultados_visibilidad_valida check (visibilidad in ('publico', 'privado'));
alter table public.resultados add column if not exists evento text;   -- id de la carrera en el calendario de la app

-- Los demás solo ven tus carreras verificadas y públicas (y nunca con un bloqueo de por medio)
drop policy if exists "ver resultados" on public.resultados;
create policy "ver resultados" on public.resultados for select to authenticated using (
  user_id = auth.uid()
  or (estado = 'verificado' and visibilidad = 'publico' and not public.hay_bloqueo(auth.uid(), user_id))
);

-- Cambiar si una carrera es pública o privada (solo eso: el resto lo fija el servidor)
drop policy if exists "cambiar visibilidad de mi resultado" on public.resultados;
create policy "cambiar visibilidad de mi resultado" on public.resultados for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.solo_visibilidad_resultado()
returns trigger language plpgsql as $$
begin
  if current_user in ('authenticated', 'anon') then
    if (to_jsonb(new) - 'visibilidad') is distinct from (to_jsonb(old) - 'visibilidad') then
      raise exception 'solo_se_puede_cambiar_la_visibilidad';
    end if;
  end if;
  return new;
end; $$;
drop trigger if exists solo_visibilidad_resultado on public.resultados;
create trigger solo_visibilidad_resultado before update on public.resultados
  for each row execute function public.solo_visibilidad_resultado();

-- ─────────────────────────── PRÓXIMAS CARRERAS ───────────────────────────
create table if not exists public.proximas_carreras (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  evento text,                                    -- id del calendario (null si no está en la lista)
  carrera text not null check (char_length(carrera) between 2 and 80),
  fecha date not null,
  busca_pareja boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, carrera, fecha)
);
create index if not exists proximas_por_fecha on public.proximas_carreras (fecha);
alter table public.proximas_carreras enable row level security;

drop policy if exists "ver proximas" on public.proximas_carreras;
create policy "ver proximas" on public.proximas_carreras for select to authenticated using (
  user_id = auth.uid() or not public.hay_bloqueo(auth.uid(), user_id)
);
drop policy if exists "añadir mi proxima" on public.proximas_carreras;
create policy "añadir mi proxima" on public.proximas_carreras for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "editar mi proxima" on public.proximas_carreras;
create policy "editar mi proxima" on public.proximas_carreras for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "borrar mi proxima" on public.proximas_carreras;
create policy "borrar mi proxima" on public.proximas_carreras for delete to authenticated using (user_id = auth.uid());

-- Al subir el certificado de una carrera que tenías como próxima, pasa al historial (sale de próximas)
create or replace function public.proxima_a_historial()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.proximas_carreras
    where user_id = new.user_id
      and ((new.evento is not null and evento = new.evento) or lower(carrera) = lower(new.carrera));
  return new;
end; $$;
drop trigger if exists proxima_a_historial on public.resultados;
create trigger proxima_a_historial after insert on public.resultados
  for each row execute function public.proxima_a_historial();
