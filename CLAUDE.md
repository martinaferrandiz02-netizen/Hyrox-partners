# Pairx — contexto del proyecto

Pairx es una app para encontrar pareja para carreras híbridas en categoría Doubles, con tiempos verificados mediante certificado oficial.
Fundadora: Martina Ferrandiz. Responsable legal en Alicante (España). Contacto: hello.pairx@gmail.com (nunca el email personal).

**Cómo trabajar con Martina:** español, tono cercano, paso a paso y orientado a la acción. Cuando hay que tocar algo en Supabase, Codemagic, Apple, etc., explicar exactamente dónde pulsar. Nunca pedir ni repetir contraseñas en el chat ni guardarlas en el repo.

## Stack

- React 19 + Vite 8, ESLint (las exportaciones que no son componentes van en archivos `.js`).
- Supabase: auth, Postgres con RLS, storage (`videos`, `certificados`, `avatares`), realtime y Edge Functions (`borrar-cuenta`, `verificar-certificado`).
- Web: Vercel → https://pairx-app.vercel.app (rama `main`).
- App móvil: Capacitor 7 (`com.pairx.app`, `webDir: dist`). Solo iOS por ahora (Android aparcado).
- Compilación iOS en Codemagic (el Mac de Martina es Intel con macOS 13, no puede usar Xcode actual). Workflow `ios` en `codemagic.yaml`, se lanza al hacer push a la rama `ios` → sube a TestFlight (grupo interno "Equipo"). iOS mínimo 15.0.
- Ramas: `main` (web), `backend`, `ios` (dispara build). Normalmente se empuja el mismo commit a las tres.
- macOS no distingue mayúsculas: nunca dos archivos que solo difieran en mayúsculas (pasó con `entrenos.js` / `Entrenos.jsx`).
- Los SQL de `supabase/*.sql` los ejecuta Martina a mano en el SQL Editor.

## Diseño

Estilo "app de running deportiva": limpio, ordenado, profesional. Fondo negro y acento lima.
Tokens: `--bg #0a0a0a`, `--accent #e8ff3c`, `--surface #141414`, `--line #242424`. Tipografías Barlow Condensed (títulos y números) e Inter. Iconos lucide-react. Listas con líneas finas (`.fila`), franja de estadísticas (`.stats`), pestañas subrayadas. La pantalla no se mueve ni en horizontal ni en vertical (layout bloqueado).

## Decisiones de producto (no cambiar sin preguntar)

**Ranking**
- Tiempos, no puntos. Solo se compara dentro de división + categoría + sexo (en Doubles mixto se ignora el sexo).
- "Top X %" solo si hay 10 o más atletas en el grupo.
- Clubs: cualquiera puede escribir su club (aparece en el buscador si ya existe). En el ranking solo salen los clubs con al menos 10 atletas verificados, ordenados por la media de sus 10 mejores tiempos. Los que no llegan simplemente no aparecen. Abajo del todo hay un aviso profesional que no dice el número mínimo.

**Carreras**
- Se añade una carrera solo subiendo el certificado: la app lee el tiempo, los parciales y cuántos atletas hay. El usuario elige la carrera de una lista del calendario (`src/data/calendario.json`) y confirma división y categoría.
- El nombre de la cuenta tiene que aparecer en el certificado (en Doubles, uno de los dos). Si no coincide, aviso claro en rojo explicando por qué.
- Perfil → pestaña Carreras: "Próximas carreras" (con opción "Busco pareja") e "Historial". Al subir el certificado de una próxima, pasa al historial automáticamente.
- El PDF del certificado es privado (bucket `certificados` privado, `supabase/certificados_privados.sql`): solo lo abren su dueño y las admins con enlace temporal; los demás ven solo los tiempos. En Doubles se avisa de que el certificado lleva el nombre de la pareja (privacidad actualizada).
- Certificados oficiales (vistos en uno real de Martina): PDF de mika:timing (Author `mikatiming.de`, Producer `TCPDF`, Title `Urkunde`, fuentes BrutalType/MartianMono, una sola revisión, CreationDate = ModDate). Solo traen nombres, TOTAL TIME, TOTAL RUN-TIME y AG RANKING: NO hay parciales por estación.
- `verificar-certificado` comprueba el origen: editado/guardado con otro programa → rechazado; formato desconocido → pendiente (revisión manual en Moderación → Certificados); oficial → verifica nombre y tiempo. Imágenes siempre pendientes. Excepción: la cuenta de prueba de Apple (hello.pairx+revision@gmail.com).
- Huella anti-duplicados = tiempos + nombres del certificado. Faltan más certificados reales (otras carreras/temporadas) para confirmar que el formato no cambia.
- Cada carrera del historial es pública o privada. El mejor tiempo verificado siempre se ve en el perfil y en el ranking.
- Al registrarse: si ya ha competido → "Añade tu carrera más reciente"; si no → "¿Cuál es tu próxima carrera?".
- Pendiente a propósito: verificación de identidad (DNI), bloquear el nombre tras verificar y "esta carrera es mía". No hacer hasta que Martina lo pida.

**Entrenos**
- Registro manual. Dos tipos: Running (8 filas: metros con "m" + tiempo) y Estaciones (8 estaciones). No hace falta rellenarlo todo; los totales son automáticos.
- En Running una fila solo cuenta si tiene metros Y tiempo (si falta algo, aviso). Decisión firme: no hacer los metros opcionales.
- Tiempos con casillas min / seg (no con dos puntos).
- Visibilidad: público / amigos (se siguen mutuamente) / privado.
- "Próximamente" abajo y pequeño.
- Si alguien no tiene carreras verificadas, sus marcas se rellenan con sus mejores entrenos (etiqueta "Entreno").

**Social**
- Seguir a gente. En perfiles ajenos no se ve el número de seguidores; en el tuyo sí. "Seguidores" y "Siguiendo" se pueden pulsar para ver la lista y abrir perfiles.
- Al recibir una solicitud de pareja se puede abrir el perfil y ver sus tiempos.
- Parejas → Buscar: fila "Buscan pareja para" con las próximas carreras donde alguien busca pareja (primero las carreras a las que también vas tú, marcadas con ✓). Pulsar una filtra a esa gente. En la tarjeta sale "Busca pareja para X" y, si coincide, "Tú también vas". Quien busca pareja para una de tus carreras sale primero. La solicitud menciona la carrera.
- Una sola etiqueta de nivel: "✓ Verificado" (certificado subido), "Ha competido · sin verificar" o "Aún no ha competido".

**Cuenta**
- Recuperar contraseña desde el login (correo vía SMTP de Gmail de hello.pairx@gmail.com). Contraseña mínima: 8 caracteres, mayúscula, minúscula y número, con icono de ojo.
- Borrar cuenta vía Edge Function `borrar-cuenta` (borra archivos, perfil y usuario).
- Legal: privacidad y términos según la ley española (`public/legal/`). Ayuda y contacto en `public/legal/soporte.html` (URL de soporte de la App Store).

## App Store

- Ficha preparada en el doc "Pairx · Ficha de la App Store": 18+, Salud y forma física / Deportes, gratis. No usar la marca de la competición en textos ni palabras clave.
- Compromiso en las notas de revisión: las denuncias se revisan en menos de 24 h.

## Moderación

- `supabase/moderacion.sql`: tabla `admins`, `es_admin()`, `profiles.suspendido` (cuenta suspendida invisible para los demás; solo el servidor puede cambiarlo), las admins ven y resuelven `denuncias`.
- Edge Function `moderar` (suspender / reactivar / borrar cuenta, solo admins; suspender también banea el login) y `aviso-denuncia` (email a GMAIL_USER al denunciar; secretos GMAIL_USER y GMAIL_APP_PASSWORD).
- Panel en Ajustes → Moderación (solo admins): denuncias abiertas / revisadas / cuentas suspendidas. Una cuenta suspendida que aún tenga sesión ve la pantalla "Cuenta suspendida".

## Ideas ofrecidas y aún no aprobadas

- Plantillas de correo en español (recuperar contraseña, confirmar registro).
