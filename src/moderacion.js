// Moderación: denuncias, suspensiones y borrado de cuentas (solo administradoras)
import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export function useEsAdmin(userId) {
  const [esAdmin, setEsAdmin] = useState(false)
  useEffect(() => {
    if (!userId) return
    supabase.from('admins').select('user_id').eq('user_id', userId).maybeSingle()
      .then(({ data }) => setEsAdmin(!!data))
  }, [userId])
  return esAdmin
}

// Denuncias con los perfiles de quien denuncia y de quien es denunciado
export async function cargarDenuncias() {
  const { data, error } = await supabase.from('denuncias').select('*').order('created_at', { ascending: false }).limit(300)
  if (error) return { denuncias: [], suspendidos: [], error: error.message }
  const ids = [...new Set(data.flatMap(d => [d.denunciante, d.denunciado]).filter(Boolean))]
  const [{ data: perfiles }, { data: suspendidos }] = await Promise.all([
    ids.length ? supabase.from('profiles').select('*').in('id', ids) : Promise.resolve({ data: [] }),
    supabase.from('profiles').select('*').eq('suspendido', true).order('nombre'),
  ])
  const porId = Object.fromEntries((perfiles || []).map(p => [p.id, p]))
  const totales = {}
  for (const d of data) if (d.denunciado) totales[d.denunciado] = (totales[d.denunciado] || 0) + 1
  return {
    denuncias: data.map(d => ({ ...d, de: porId[d.denunciante] || null, contra: porId[d.denunciado] || null, total: totales[d.denunciado] || 0 })),
    suspendidos: suspendidos || [],
  }
}

export async function resolverDenuncia(id, estado) {
  const { error } = await supabase.from('denuncias').update({ estado, revisada_at: new Date().toISOString() }).eq('id', id)
  return !error
}

// accion: 'suspender' | 'reactivar' | 'borrar'
export async function moderarCuenta(accion, userId) {
  const { data, error } = await supabase.functions.invoke('moderar', { body: { accion, userId } })
  if (error) {
    let detalle = error.message
    try { detalle = (await error.context.json()).error || detalle } catch { /* sin detalle */ }
    return detalle
  }
  return data?.ok ? null : (data?.error || 'Error desconocido')
}
