// Pairx · Función "borrar-cuenta"
// Borra la cuenta de quien la llama: sus archivos (vídeos, certificados, foto),
// su perfil (y con él carreras, solicitudes, mensajes, plazas…) y su usuario.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const responder = (cuerpo: unknown, status = 200) =>
    new Response(JSON.stringify(cuerpo), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

  const url = Deno.env.get('SUPABASE_URL')!
  const usuario = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  })
  const { data: { user } } = await usuario.auth.getUser()
  if (!user) return responder({ error: 'No autorizado' }, 401)

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  // 1. Archivos: cada usuario guarda los suyos en una carpeta con su id
  for (const bucket of ['videos', 'certificados', 'avatares']) {
    const { data: archivos } = await admin.storage.from(bucket).list(user.id, { limit: 1000 })
    const rutas = (archivos ?? []).map(a => `${user.id}/${a.name}`)
    if (rutas.length) await admin.storage.from(bucket).remove(rutas)
  }

  // 2. Perfil: al borrarlo se borran en cascada carreras, vídeos, solicitudes, mensajes, plazas y bloqueos
  const { error: errPerfil } = await admin.from('profiles').delete().eq('id', user.id)
  if (errPerfil) return responder({ error: `perfil: ${errPerfil.message}` }, 500)

  // 3. Usuario (email y contraseña)
  const { error: errUsuario } = await admin.auth.admin.deleteUser(user.id)
  if (errUsuario) return responder({ error: `usuario: ${errUsuario.message}` }, 500)

  return responder({ ok: true })
})
