// Pairx · Función "verificar-certificado"
// Lee el certificado del usuario (PDF) en el servidor y comprueba nombre y tiempo.
// Las imágenes (PNG/JPG) quedan "pendiente" para revisión manual.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4'
import { extractText, getDocumentProxy } from 'npm:unpdf@0.12.1'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ───────────── Comprobación (misma lógica que la app) ─────────────
export const normalizar = (t: string) => t
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9:\s]/g, ' ').replace(/\s+/g, ' ').trim()

export function contieneNombre(texto: string, nombreCompleto: string) {
  const palabrasTexto = new Set(normalizar(texto).split(' '))
  const palabras = normalizar(nombreCompleto).split(' ').filter(p => p.length >= 2)
  return palabras.length >= 2 && palabras.every(p => palabrasTexto.has(p))
}

export function aSegundos(t: string) {
  const partes = t.trim().split(':').map(Number)
  if (partes.some(n => Number.isNaN(n))) return null
  if (partes.length === 3) return partes[0] * 3600 + partes[1] * 60 + partes[2]
  if (partes.length === 2) return partes[0] * 60 + partes[1]
  return null
}

export function formatoTiempo(seg: number) {
  const h = Math.floor(seg / 3600)
  const m = Math.floor((seg % 3600) / 60)
  const s = seg % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function comprobar(texto: string, nombreCompleto: string, tiempoDeclarado: string) {
  const encontrados = texto.match(/\b\d{1,2}:\d{2}(?::\d{2})?\b/g) || []
  const tiempos = [...new Set(encontrados.map(aSegundos).filter((s): s is number => s !== null && s > 0))]
  const total = tiempos.length ? Math.max(...tiempos) : null
  if (!contieneNombre(texto, nombreCompleto)) return { ok: false, motivo: 'El nombre completo no aparece en el certificado.' }
  if (!total) return { ok: false, motivo: 'No se ha encontrado ningún tiempo en el certificado.' }
  const declarado = aSegundos(tiempoDeclarado || '')
  if (declarado !== total) return { ok: false, motivo: `El tiempo del certificado es ${formatoTiempo(total)}.` }
  return { ok: true, motivo: null }
}

export async function textoDePdf(bytes: Uint8Array) {
  const pdf = await getDocumentProxy(bytes)
  const { text } = await extractText(pdf, { mergePages: true })
  return text as string
}

// ───────────── Servidor ─────────────
async function manejar(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const responder = (cuerpo: unknown, status = 200) =>
    new Response(JSON.stringify(cuerpo), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

  // Quién llama (con su sesión)
  const url = Deno.env.get('SUPABASE_URL')!
  const usuario = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  })
  const { data: { user } } = await usuario.auth.getUser()
  if (!user) return responder({ error: 'No autorizado' }, 401)

  // Con permisos de servidor para leer el archivo y escribir el estado
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: perfil } = await admin.from('profiles').select('*').eq('id', user.id).single()
  if (!perfil?.certificado_ruta) return responder({ estado: 'sin_certificado', motivo: null })

  const actualizar = async (estado: string, motivo: string | null) => {
    await admin.from('profiles').update({ certificado_estado: estado, certificado_motivo: motivo }).eq('id', user.id)
    return responder({ estado, motivo })
  }

  // Imágenes: revisión manual
  if (!perfil.certificado_ruta.toLowerCase().endsWith('.pdf')) return actualizar('pendiente', null)

  const { data: archivo, error } = await admin.storage.from('certificados').download(perfil.certificado_ruta)
  if (error || !archivo) return actualizar('pendiente', null)

  let texto = ''
  try {
    texto = await textoDePdf(new Uint8Array(await archivo.arrayBuffer()))
  } catch {
    return actualizar('pendiente', null)
  }
  // PDF escaneado (sin texto): a revisión manual
  if (texto.replace(/\s/g, '').length < 20) return actualizar('pendiente', null)

  const r = comprobar(texto, perfil.nombre_completo || '', perfil.mejor_tiempo || '')
  return actualizar(r.ok ? 'verificado' : 'rechazado', r.motivo)
}

Deno.serve(manejar)
