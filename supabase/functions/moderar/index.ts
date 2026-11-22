// Pairx · Función "moderar" (solo administradoras)
// Acciones sobre la cuenta denunciada: suspender, reactivar o borrar.
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
  const { data: esAdmin } = await admin.from('admins').select('user_id').eq('user_id', user.id).maybeSingle()
  if (!esAdmin) return responder({ error: 'Solo administradoras' }, 403)

  const { accion, userId, resultadoId, motivo } = await req.json().catch(() => ({}))

  // Revisión manual de una carrera pendiente
  if (accion === 'aprobar-carrera' || accion === 'rechazar-carrera') {
    if (!resultadoId) return responder({ error: 'Falta la carrera' }, 400)
    const cambios = accion === 'aprobar-carrera'
      ? { estado: 'verificado', motivo: null }
      : { estado: 'rechazado', motivo: motivo || 'El certificado no es válido.' }
    const { error } = await admin.from('resultados').update(cambios).eq('id', resultadoId).eq('estado', 'pendiente')
    if (error) return responder({ error: `carrera: ${error.message}` }, 500)
    return responder({ ok: true })
  }

  if (!userId || typeof userId !== 'string') return responder({ error: 'Falta la cuenta' }, 400)
  if (userId === user.id) return responder({ error: 'No puedes moderar tu propia cuenta' }, 400)

  if (accion === 'suspender' || accion === 'reactivar') {
    const suspender = accion === 'suspender'
    const { error } = await admin.from('profiles').update({ suspendido: suspender }).eq('id', userId)
    if (error) return responder({ error: `perfil: ${error.message}` }, 500)
    // Con la cuenta suspendida no puede volver a iniciar sesión
    const { error: errBan } = await admin.auth.admin.updateUserById(userId, { ban_duration: suspender ? '876000h' : 'none' })
    if (errBan) return responder({ error: `usuario: ${errBan.message}` }, 500)
    return responder({ ok: true })
  }

  if (accion === 'borrar') {
    for (const bucket of ['videos', 'certificados', 'avatares']) {
      const { data: archivos } = await admin.storage.from(bucket).list(userId, { limit: 1000 })
      const rutas = (archivos ?? []).map(a => `${userId}/${a.name}`)
      if (rutas.length) await admin.storage.from(bucket).remove(rutas)
    }
    const { error: errPerfil } = await admin.from('profiles').delete().eq('id', userId)
    if (errPerfil) return responder({ error: `perfil: ${errPerfil.message}` }, 500)
    const { error: errUsuario } = await admin.auth.admin.deleteUser(userId)
    if (errUsuario) return responder({ error: `usuario: ${errUsuario.message}` }, 500)
    return responder({ ok: true })
  }

  return responder({ error: 'Acción desconocida' }, 400)
})
