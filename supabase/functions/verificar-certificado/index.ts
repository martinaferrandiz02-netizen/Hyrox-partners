// Pairx · Función "verificar-certificado"
// Comprueba en el servidor una carrera subida: lee el PDF, mira que esté tu nombre y el tiempo total,
// y guarda los tiempos de cada estación. Las imágenes (PNG/JPG) quedan pendientes de revisión manual.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4'
import { extractText, getDocumentProxy } from 'npm:unpdf@0.12.1'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const normalizar = (t: string) => t
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9:\s]/g, ' ').replace(/\s+/g, ' ').trim()

function contieneNombre(texto: string, nombreCompleto: string) {
  const palabrasTexto = new Set(normalizar(texto).split(' '))
  const palabras = normalizar(nombreCompleto).split(' ').filter(p => p.length >= 2)
  return palabras.length >= 2 && palabras.every(p => palabrasTexto.has(p))
}

function aSegundos(t: string) {
  const partes = t.trim().split(':').map(Number)
  if (partes.some(n => Number.isNaN(n))) return null
  if (partes.length === 3) return partes[0] * 3600 + partes[1] * 60 + partes[2]
  if (partes.length === 2) return partes[0] * 60 + partes[1]
  return null
}

function formatoTiempo(seg: number) {
  const h = Math.floor(seg / 3600)
  const m = Math.floor((seg % 3600) / 60)
  const s = seg % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const TIEMPO = /(\d{1,2})\s*:\s*(\d{2})(?:\s*:\s*(\d{2}))?/
function tiempoTras(texto: string, etiqueta: RegExp) {
  const m = etiqueta.exec(texto)
  if (!m) return null
  const resto = texto.slice(m.index + m[0].length, m.index + m[0].length + 40)
  const t = TIEMPO.exec(resto)
  return t ? aSegundos(t[0].replace(/\s+/g, '')) : null
}

const ETIQUETAS: [string, RegExp][] = [
  ['Ski erg', /SKI\s*-?\s*ERG/],
  ['Sled push', /SLED\s*PUSH/],
  ['Sled pull', /SLED\s*PULL/],
  ['Burpee broad jumps', /BURPEE/],
  ['Rowing', /\bROW(?:ING)?\b/],
  ['Farmer carry', /FARMERS?\s*CARRY/],
  ['Sandbag lunges', /LUNGES?/],
  ['Wall balls', /WALL\s*BALLS?/],
  ['Running', /(?:TOTAL\s*)?RUN(?:NING)?\s*-?\s*TIME|RUN\s*TOTAL/],
]

function parciales(texto: string) {
  const T = texto.toUpperCase()
  const out: Record<string, number> = {}
  for (const [nombre, etiqueta] of ETIQUETAS) {
    const seg = tiempoTras(T, etiqueta)
    if (seg) out[nombre] = seg
  }
  return out
}

function tiempoTotal(texto: string) {
  const marcado = tiempoTras(texto.toUpperCase(), /TOTAL\s*TIME(?!\s*-)|FINISH(?:\s*TIME)?|TIEMPO\s*TOTAL/)
  if (marcado) return marcado
  const todos = (texto.match(/\b\d{1,2}\s*:\s*\d{2}(?:\s*:\s*\d{2})?\b/g) || [])
    .map(t => aSegundos(t.replace(/\s+/g, ''))).filter((s): s is number => s !== null && s > 0)
  return todos.length ? Math.max(...todos) : null
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

  const { resultado_id } = await req.json().catch(() => ({}))
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: r } = await admin.from('resultados').select('*').eq('id', resultado_id).eq('user_id', user.id).single()
  if (!r) return responder({ error: 'Carrera no encontrada' }, 404)
  const { data: perfil } = await admin.from('profiles').select('nombre_completo').eq('id', user.id).single()

  const actualizar = async (cambios: Record<string, unknown>) => {
    await admin.from('resultados').update(cambios).eq('id', r.id)
    return responder(cambios)
  }

  // Imágenes: revisión manual
  if (!r.certificado_ruta.toLowerCase().endsWith('.pdf')) return actualizar({ estado: 'pendiente' })

  const { data: archivo, error } = await admin.storage.from('certificados').download(r.certificado_ruta)
  if (error || !archivo) return actualizar({ estado: 'pendiente' })

  let texto = ''
  try {
    const pdf = await getDocumentProxy(new Uint8Array(await archivo.arrayBuffer()))
    texto = (await extractText(pdf, { mergePages: true })).text as string
  } catch {
    return actualizar({ estado: 'pendiente' })
  }
  if (texto.replace(/\s/g, '').length < 20) return actualizar({ estado: 'pendiente' }) // PDF escaneado

  if (!contieneNombre(texto, perfil?.nombre_completo || '')) {
    return actualizar({ estado: 'rechazado', motivo: 'Tu nombre completo no aparece en el certificado.' })
  }
  const total = tiempoTotal(texto)
  if (!total) return actualizar({ estado: 'rechazado', motivo: 'No se ha encontrado el tiempo total en el certificado.' })
  if (aSegundos(r.tiempo) !== total) {
    return actualizar({ estado: 'rechazado', motivo: `El tiempo del certificado es ${formatoTiempo(total)}.` })
  }
  return actualizar({ estado: 'verificado', motivo: null, parciales: parciales(texto), tiempo: formatoTiempo(total) })
})
