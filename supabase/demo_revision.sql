-- Pairx · Datos para la cuenta de prueba del revisor de Apple
-- 1. Antes, crea la cuenta desde la app con el email hello.pairx+revision@gmail.com
--    y el nombre "Alex Romero" (Madrid, Hombre, Open, "Ya he competido").
-- 2. Luego ejecuta esto entero en el SQL Editor.
do $$
declare uid uuid;
begin
  select id into uid from auth.users where lower(email) = 'hello.pairx+revision@gmail.com';
  if uid is null then raise exception 'Primero crea la cuenta hello.pairx+revision@gmail.com desde la app'; end if;

  -- Una carrera ya verificada, con su certificado de ejemplo
  delete from public.resultados where user_id = uid;
  insert into public.resultados (user_id, carrera, fecha, evento, division, categoria, tiempo, parciales, certificado_url, certificado_ruta, huella, estado, visibilidad)
  values (uid, 'Valencia 2026', '2026-10-15', 'valencia-2026-10-15', 'Doubles', 'Open', '1:29:44',
    '{"Running": 2840}',
    'https://pairx-app.vercel.app/demo/certificado-demo-1.pdf', 'demo/certificado-demo-1.pdf', 'demo-revision-valencia-2026', 'verificado', 'publico');

  -- Próximas carreras: una buscando pareja
  delete from public.proximas_carreras where user_id = uid;
  insert into public.proximas_carreras (user_id, evento, carrera, fecha, busca_pareja) values
    (uid, 'madrid-2027-03-17', 'Madrid 2027', '2027-03-17', true),
    (uid, 'milán-2026-12-04', 'Milán 2026', '2026-12-04', false);

  -- Tres entrenos con distinta visibilidad
  delete from public.entrenos where user_id = uid;
  insert into public.entrenos (user_id, titulo, fecha, tipo, total, parciales, notas, visibilidad) values
    (uid, 'Simulación media carrera', '2026-11-19', 'Estaciones', 1432,
      '{"Ski erg": 262, "Sled push": 106, "Sled pull": 205, "Burpee broad jumps": 240, "Rowing": 270, "Farmer carry": 96, "Wall balls": 253}', 'Wall balls sin parar', 'publico'),
    (uid, 'Series de 1 km', '2026-11-17', 'Running', 1962,
      '{"distancia": 8000, "tramos": [{"m":1000,"s":238},{"m":1000,"s":241},{"m":1000,"s":244},{"m":1000,"s":246},{"m":1000,"s":247},{"m":1000,"s":249},{"m":1000,"s":248},{"m":1000,"s":249}]}', null, 'amigos'),
    (uid, 'Trineo pesado + remo', '2026-11-14', 'Estaciones', 732,
      '{"Sled push": 98, "Sled pull": 192, "Rowing": 262, "Farmer carry": 180}', null, 'privado');
end $$;

-- Comprobación: tiene que salir 1:29:44 y verificado
select p.nombre, p.mejor_tiempo, p.certificado_estado
from public.profiles p join auth.users u on u.id = p.id
where lower(u.email) = 'hello.pairx+revision@gmail.com';
