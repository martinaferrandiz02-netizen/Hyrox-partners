-- Pairx · Guardar la pareja elegida
-- Ejecutar en Supabase → SQL Editor → New query → Run (se puede ejecutar más de una vez).

alter table public.profiles add column if not exists pareja_id uuid references public.profiles(id) on delete set null;

-- Solo puedes elegir como pareja a alguien con quien tienes una solicitud aceptada
create or replace function public.validar_pareja()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.pareja_id is not null and new.pareja_id is distinct from old.pareja_id then
    if new.pareja_id = new.id or not exists (
      select 1 from public.solicitudes s
      where s.estado = 'aceptada'
        and ((s.de = new.id and s.para = new.pareja_id) or (s.para = new.id and s.de = new.pareja_id))
    ) then
      raise exception 'pareja_no_valida';
    end if;
  end if;
  return new;
end; $$;

drop trigger if exists validar_pareja on public.profiles;
create trigger validar_pareja before update of pareja_id on public.profiles
  for each row execute function public.validar_pareja();
