-- Pairx · Moderación
-- Administradoras, cuentas suspendidas y panel de denuncias.
-- ANTES DE EJECUTAR: cambia TU_EMAIL (abajo del todo) por el email con el que entras en Pairx.

-- ─────────────────────────────── ADMINISTRADORAS ───────────────────────────────
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;
drop policy if exists "saber si soy admin" on public.admins;
create policy "saber si soy admin" on public.admins for select to authenticated using (user_id = auth.uid());

create or replace function public.es_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid())
$$;
revoke execute on function public.es_admin() from public, anon;
grant execute on function public.es_admin() to authenticated;

-- ─────────────────────────────── SUSPENSIONES ───────────────────────────────
alter table public.profiles add column if not exists suspendido boolean not null default false;

-- Una cuenta suspendida desaparece para los demás (solo la ven ella misma y las administradoras)
drop policy if exists "perfiles visibles para usuarios" on public.profiles;
create policy "perfiles visibles para usuarios" on public.profiles
  for select to authenticated using (not suspendido or id = auth.uid() or public.es_admin());

-- Nadie puede quitarse (ni ponerse) la suspensión a sí mismo: solo el servidor
create or replace function public.proteger_suspension()
returns trigger language plpgsql set search_path = public as $$
begin
  -- Los usuarios de la app entran como 'authenticated'; el servidor y el SQL Editor, no
  if new.suspendido is distinct from old.suspendido and current_user in ('authenticated', 'anon') then
    raise exception 'No se puede cambiar la suspensión';
  end if;
  return new;
end; $$;
drop trigger if exists proteger_suspension on public.profiles;
create trigger proteger_suspension before update on public.profiles
  for each row execute function public.proteger_suspension();

-- ─────────────────────────────── DENUNCIAS ───────────────────────────────
alter table public.denuncias add column if not exists revisada_at timestamptz;

drop policy if exists "admin ve denuncias" on public.denuncias;
create policy "admin ve denuncias" on public.denuncias for select to authenticated using (public.es_admin());
drop policy if exists "admin resuelve denuncias" on public.denuncias;
create policy "admin resuelve denuncias" on public.denuncias for update to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- ─────────────────────────────── TU CUENTA ───────────────────────────────
insert into public.admins (user_id)
  select id from auth.users where lower(email) = lower('TU_EMAIL')
on conflict do nothing;

-- Comprobación: tiene que salir una fila con tu email
select u.email from public.admins a join auth.users u on u.id = a.user_id;
