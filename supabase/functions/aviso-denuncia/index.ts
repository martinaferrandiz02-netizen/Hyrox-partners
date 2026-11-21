// Pairx · Función "aviso-denuncia"
// La llama la app justo después de que alguien denuncie. Manda un email a la administración.
// Necesita dos secretos en Supabase: GMAIL_USER (la cuenta de Gmail) y GMAIL_APP_PASSWORD (contraseña de aplicación).
import { createClient } from 'npm:@supabase/supabase-js@2.45.4'
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts'

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

  const { id } = await req.json().catch(() => ({}))
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  // Solo avisa de una denuncia que acaba de hacer quien llama (evita que se use para mandar correos)
  const { data: d } = await admin.from('denuncias').select('*').eq('id', id).eq('denunciante', user.id).maybeSingle()
  if (!d) return responder({ error: 'Denuncia no encontrada' }, 404)
  if (Date.now() - new Date(d.created_at).getTime() > 5 * 60 * 1000) return responder({ ok: true, aviso: 'antigua' })

  const ids = [d.denunciante, d.denunciado].filter(Boolean)
  const { data: perfiles } = await admin.from('profiles').select('id, nombre, ciudad').in('id', ids)
  const nombre = (pid: string) => perfiles?.find(p => p.id === pid)?.nombre ?? '(cuenta borrada)'
  const { count } = await admin.from('denuncias').select('id', { count: 'exact', head: true }).eq('denunciado', d.denunciado)

  const gmail = Deno.env.get('GMAIL_USER')
  const clave = Deno.env.get('GMAIL_APP_PASSWORD')
  if (!gmail || !clave) return responder({ error: 'Faltan los secretos del correo' }, 500)

  const texto = [
    `Nueva denuncia en Pairx (nº ${d.id})`,
    '',
    `Denunciada: ${nombre(d.denunciado)}`,
    `Motivo: ${d.motivo}`,
    d.detalle ? `Detalle: ${d.detalle}` : null,
    `Dónde: ${d.contexto ?? '—'}`,
    `Denunciada por: ${nombre(d.denunciante)}`,
    `Denuncias totales contra esta cuenta: ${count ?? 1}`,
    '',
    'Revísala en la app: Perfil → Ajustes → Moderación. Tienes 24 horas.',
  ].filter(x => x !== null).join('\n')

  const smtp = new SMTPClient({ connection: { hostname: 'smtp.gmail.com', port: 465, tls: true, auth: { username: gmail, password: clave } } })
  try {
    await smtp.send({ from: `Pairx <${gmail}>`, to: gmail, subject: `⚠️ Denuncia: ${d.motivo} · ${nombre(d.denunciado)}`, content: texto })
  } catch (e) {
    return responder({ error: `correo: ${(e as Error).message}` }, 500)
  } finally {
    await smtp.close().catch(() => {})
  }
  return responder({ ok: true })
})
