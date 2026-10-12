-- Pairx · Puntos a partir del tiempo verificado
-- Puntos = 1000 × (tiempo de referencia de tu división ÷ tu tiempo)
-- Ejecutar en Supabase → SQL Editor → New query → Run (se puede ejecutar más de una vez).

-- División del certificado
alter table public.profiles add column if not exists division text;
alter table public.profiles drop constraint if exists division_valida;
alter table public.profiles add constraint division_valida
  check (division is null or division in ('Individual', 'Doubles', 'Doubles mixto'));
alter table public.profiles add column if not exists puntos integer;

-- Tiempos de referencia (en segundos). Se pueden ajustar desde el Table Editor.
create table if not exists public.tiempos_referencia (
  division text not null,
  categoria text not null,
  sexo text not null,         -- 'Mujer', 'Hombre' o 'Mixto'
  segundos integer not null check (segundos > 0),
  primary key (division, categoria, sexo)
);
alter table public.tiempos_referencia enable row level security;
drop policy if exists "referencias visibles" on public.tiempos_referencia;
create policy "referencias visibles" on public.tiempos_referencia for select to authenticated using (true);

insert into public.tiempos_referencia (division, categoria, sexo, segundos) values
  ('Individual',    'Pro',  'Hombre', 56*60),
  ('Individual',    'Pro',  'Mujer',  60*60),
  ('Individual',    'Open', 'Hombre', 58*60),
  ('Individual',    'Open', 'Mujer',  62*60),
  ('Doubles',       'Pro',  'Hombre', 53*60),
  ('Doubles',       'Pro',  'Mujer',  58*60),
  ('Doubles',       'Open', 'Hombre', 54*60),
  ('Doubles',       'Open', 'Mujer',  59*60),
  ('Doubles mixto', 'Pro',  'Mixto',  55*60),
  ('Doubles mixto', 'Open', 'Mixto',  56*60)
on conflict (division, categoria, sexo) do nothing;

-- "1:31:56" → 5516
create or replace function public.tiempo_a_segundos(t text)
returns integer language sql immutable as $$
  select case
    when t ~ '^\d{1,2}:\d{2}:\d{2}$' then split_part(t, ':', 1)::int * 3600 + split_part(t, ':', 2)::int * 60 + split_part(t, ':', 3)::int
    when t ~ '^\d{1,3}:\d{2}$' then split_part(t, ':', 1)::int * 60 + split_part(t, ':', 2)::int
    else null end
$$;

-- Cambiar la división también obliga a verificar de nuevo
create or replace function public.proteger_verificacion()
returns trigger language plpgsql as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT'
       or new.certificado_ruta is distinct from old.certificado_ruta
       or new.nombre_completo is distinct from old.nombre_completo
       or new.mejor_tiempo is distinct from old.mejor_tiempo
       or new.division is distinct from old.division then
      new.certificado_estado := case when new.certificado_ruta is null then 'sin_certificado' else 'pendiente' end;
      new.certificado_motivo := null;
    else
      new.certificado_estado := old.certificado_estado;
      new.certificado_motivo := old.certificado_motivo;
    end if;
  end if;
  return new;
end; $$;

-- Los puntos los calcula siempre la base de datos (nadie puede escribirlos a mano).
-- El nombre empieza por "zz_" para que se ejecute después de los demás triggers.
create or replace function public.calcular_puntos()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  ref integer;
  seg integer;
begin
  new.puntos := null;
  if new.certificado_estado = 'verificado' and new.division is not null and new.mejor_tiempo is not null then
    select segundos into ref from public.tiempos_referencia
      where division = new.division and categoria = new.categoria
        and sexo = case when new.division = 'Doubles mixto' then 'Mixto' else new.sexo end;
    seg := public.tiempo_a_segundos(new.mejor_tiempo);
    if ref is not null and seg is not null and seg > 0 then
      new.puntos := round(1000.0 * ref / seg);
    end if;
  end if;
  return new;
end; $$;

drop trigger if exists zz_calcular_puntos on public.profiles;
create trigger zz_calcular_puntos before insert or update on public.profiles
  for each row execute function public.calcular_puntos();

-- Recalcular los perfiles que ya existen
update public.profiles set puntos = null;
