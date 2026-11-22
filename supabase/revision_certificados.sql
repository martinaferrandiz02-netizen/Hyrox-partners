-- Pairx · Revisión manual de certificados
-- Las administradoras ven las carreras pendientes (imágenes o PDF de formato desconocido) para aprobarlas o rechazarlas.
drop policy if exists "admin ve resultados" on public.resultados;
create policy "admin ve resultados" on public.resultados for select to authenticated using (public.es_admin());
