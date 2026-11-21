-- Pairx · Certificados privados
-- El PDF del certificado solo lo pueden abrir su dueño y las administradoras.
-- Los demás atletas ven los tiempos, nunca el documento (lleva el diseño del organizador y el nombre de la pareja).
-- Nota: schema.sql y verificacion.sql antiguos dejaban este bucket público; si se vuelven a ejecutar, ejecuta este después.

update storage.buckets set public = false where id = 'certificados';

drop policy if exists "ver mi certificado" on storage.objects;
create policy "ver mi certificado" on storage.objects
  for select to authenticated
  using (bucket_id = 'certificados' and ((storage.foldername(name))[1] = auth.uid()::text or public.es_admin()));

-- Comprobación: tiene que salir public = false
select id, public from storage.buckets where id = 'certificados';
