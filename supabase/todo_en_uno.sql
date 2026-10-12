-- Pairx · Puntos + historial de carreras (todo en uno, se puede ejecutar más de una vez)

-- Columnas que deberían existir de pasos anteriores (por si alguno no se ejecutó)
alter table public.profiles add column if not exists nombre_completo text;
alter table public.profiles add column if not exists certificado_url text;
alter table public.profiles add column if not exists certificado_ruta text;
alter table public.profiles add column if not exists certificado_estado text not null default 'sin_certificado';
alter table public.profiles add column if not exists certificado_motivo text;
alter table public.profiles add column if not exists certificado_huella text;


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


create table if not exists public.resultados (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  carrera text not null check (char_length(carrera) between 2 and 80),
  fecha date,
  division text not null check (division in ('Individual', 'Doubles', 'Doubles mixto')),
  categoria text not null check (categoria in ('Open', 'Pro')),
  tiempo text not null,                 -- tiempo total, "1:31:56"
  parciales jsonb not null default '{}',  -- {"Ski erg": 335, "Sled push": 119, ..., "Running": 2996} en segundos
  certificado_url text not null,
  certificado_ruta text not null,
  huella text,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'verificado', 'rechazado')),
  motivo text,
  puntos integer,
  created_at timestamptz not null default now()
);

create index if not exists resultados_usuario on public.resultados (user_id);
create index if not exists resultados_huella on public.resultados (huella);

alter table public.resultados enable row level security;

-- Todos pueden ver las carreras (es un perfil público dentro de la app)
drop policy if exists "ver resultados" on public.resultados;
create policy "ver resultados" on public.resultados for select to authenticated using (true);

-- Cada uno añade y borra las suyas. Nadie las edita: el estado lo pone el servidor o la administradora.
drop policy if exists "añadir mi resultado" on public.resultados;
create policy "añadir mi resultado" on public.resultados for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "borrar mi resultado" on public.resultados;
create policy "borrar mi resultado" on public.resultados for delete to authenticated using (user_id = auth.uid());

-- Al añadirla, siempre empieza pendiente; y un certificado sirve como mucho a 2 personas
-- (sin "security definer" a propósito: así current_user es el usuario real y no puede saltarse el estado)
create or replace function public.preparar_resultado()
returns trigger language plpgsql set search_path = public as $$
declare ref integer; seg integer;
begin
  if tg_op = 'INSERT' and current_user in ('authenticated', 'anon') then
    new.estado := 'pendiente';
    new.motivo := null;
  end if;

  if tg_op = 'INSERT' and new.huella is not null then
    if exists (select 1 from public.resultados where huella = new.huella and user_id = new.user_id) then
      raise exception 'resultado_duplicado';
    end if;
    if (select count(distinct user_id) from public.resultados where huella = new.huella) >= 2 then
      raise exception 'certificado_ya_usado';
    end if;
  end if;

  -- Puntos solo con resultado verificado
  new.puntos := null;
  if new.estado = 'verificado' then
    select segundos into ref from public.tiempos_referencia r
      join public.profiles p on p.id = new.user_id
      where r.division = new.division and r.categoria = new.categoria
        and r.sexo = case when new.division = 'Doubles mixto' then 'Mixto' else p.sexo end;
    seg := public.tiempo_a_segundos(new.tiempo);
    if ref is not null and seg is not null and seg > 0 then
      new.puntos := round(1000.0 * ref / seg);
    end if;
  end if;
  return new;
end; $$;

drop trigger if exists preparar_resultado on public.resultados;
create trigger preparar_resultado before insert or update on public.resultados
  for each row execute function public.preparar_resultado();

-- El perfil muestra siempre el mejor resultado verificado (y si no hay, el estado del último)
create or replace function public.resumir_resultados(uid uuid)
returns void language plpgsql security definer set search_path = public as $$
declare mejor public.resultados; ultimo public.resultados;
begin
  select * into mejor from public.resultados where user_id = uid and estado = 'verificado' order by puntos desc nulls last, created_at desc limit 1;
  select * into ultimo from public.resultados where user_id = uid order by created_at desc limit 1;
  update public.profiles set
    compitio = (ultimo.id is not null) or compitio,
    mejor_tiempo = coalesce(mejor.tiempo, ultimo.tiempo),
    division = coalesce(mejor.division, ultimo.division),
    puntos = mejor.puntos,
    certificado_estado = case when mejor.id is not null then 'verificado' when ultimo.id is not null then ultimo.estado else 'sin_certificado' end,
    certificado_motivo = case when mejor.id is null then ultimo.motivo end,
    certificado_url = coalesce(mejor.certificado_url, ultimo.certificado_url),
    certificado_ruta = coalesce(mejor.certificado_ruta, ultimo.certificado_ruta)
  where id = uid;
end; $$;

create or replace function public.tras_cambio_resultado()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.resumir_resultados(coalesce(new.user_id, old.user_id));
  return null;
end; $$;

drop trigger if exists tras_cambio_resultado on public.resultados;
create trigger tras_cambio_resultado after insert or update or delete on public.resultados
  for each row execute function public.tras_cambio_resultado();

-- En el perfil, los datos de verificación y puntos ya no los escribe el usuario: salen de sus carreras
create or replace function public.proteger_verificacion()
returns trigger language plpgsql as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.certificado_estado := 'sin_certificado'; new.certificado_motivo := null; new.puntos := null;
      new.mejor_tiempo := null; new.division := null; new.certificado_url := null; new.certificado_ruta := null;
    else
      new.certificado_estado := old.certificado_estado; new.certificado_motivo := old.certificado_motivo;
      new.puntos := old.puntos; new.mejor_tiempo := old.mejor_tiempo; new.division := old.division;
      new.certificado_url := old.certificado_url; new.certificado_ruta := old.certificado_ruta;
    end if;
  end if;
  return new;
end; $$;

drop trigger if exists zz_calcular_puntos on public.profiles;
drop trigger if exists limitar_certificado on public.profiles;

-- Pasar el certificado que ya tenía cada perfil a su historial de carreras (una sola vez)
insert into public.resultados (user_id, carrera, division, categoria, tiempo, certificado_url, certificado_ruta, huella, estado)
select p.id, 'Mi carrera', coalesce(p.division, 'Doubles'), p.categoria, p.mejor_tiempo, p.certificado_url, p.certificado_ruta, p.certificado_huella,
       case when p.certificado_estado in ('verificado', 'rechazado') then p.certificado_estado else 'pendiente' end
from public.profiles p
where p.certificado_ruta is not null and p.mejor_tiempo is not null
  and not exists (select 1 from public.resultados r where r.user_id = p.id);

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'resultados') then
    alter publication supabase_realtime add table public.resultados;
  end if;
end $$;
