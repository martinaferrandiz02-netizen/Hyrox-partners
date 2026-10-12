import { supabase } from './supabase'
import { normalizar } from './certificado'

// Si lo escrito coincide con un club existente (sin importar mayúsculas o tildes), usa ese nombre
export async function clubCanonico(texto) {
  const limpio = (texto || '').trim()
  if (!limpio) return null
  const { data } = await supabase.from('profiles').select('club').not('club', 'is', null)
  const existente = data?.find(d => normalizar(d.club) === normalizar(limpio))
  return existente ? existente.club : limpio
}
