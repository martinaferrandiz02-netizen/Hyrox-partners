// Entrenos registrados a mano y seguimientos entre atletas
import { useCallback, useEffect, useState } from 'react'
import { aSegundos } from './certificado'
import { supabase } from './supabase'

export const TIPOS_ENTRENO = ['Simulación', 'Estaciones', 'Running', 'Otro']
export const VISIBILIDADES = [
  ['publico', 'Público', 'Lo ve cualquier atleta'],
  ['amigos', 'Amigos', 'Solo quien os seguís mutuamente'],
  ['privado', 'Privado', 'Solo tú'],
]
export const nombreVisibilidad = (v) => VISIBILIDADES.find(x => x[0] === v)?.[1] || ''

// {h, m, s} de las casillas → segundos (null si está vacío, NaN si no es válido)
export function casillasASegundos(v) {
  const { h = '', m = '', s = '' } = v || {}
  if (!h && !m && !s) return null
  const [H, M, S] = [h, m, s].map(x => Number(x || 0))
  if (S > 59 || (h !== '' && M > 59)) return NaN
  const total = H * 3600 + M * 60 + S
  return total > 0 ? total : NaN
}

// "5:35", "5.35", "1:25:30" → segundos (null si no es un tiempo válido)
export function leerTiempo(texto) {
  const t = (texto || '').trim().replace(/[.,']/g, ':').replace(/\s+/g, '')
  if (!t) return null
  if (!/^\d{1,2}(:\d{2}){1,2}$/.test(t)) return NaN
  const s = aSegundos(t)
  return s && s > 0 ? s : NaN
}

export function useEntrenos(userId) {
  const [entrenos, setEntrenos] = useState([])
  const [cargando, setCargando] = useState(Boolean(userId))
  const recargar = useCallback(async () => {
    if (!userId) return
    const { data } = await supabase.from('entrenos').select('*').eq('user_id', userId)
      .order('fecha', { ascending: false }).order('created_at', { ascending: false })
    setEntrenos(data || [])
    setCargando(false)
  }, [userId])
  useEffect(() => {
    const t = setTimeout(recargar, 0)
    return () => clearTimeout(t)
  }, [recargar])
  return { entrenos, cargando, recargar }
}

export async function guardarEntreno(userId, e) {
  const { error } = await supabase.from('entrenos').insert({ user_id: userId, ...e })
  return error
}
export async function cambiarVisibilidad(id, visibilidad) {
  const { error } = await supabase.from('entrenos').update({ visibilidad }).eq('id', id)
  return !error
}
export async function borrarEntreno(id) {
  const { data, error } = await supabase.from('entrenos').delete().eq('id', id).select('id')
  return !error && data?.length > 0
}

// Mejor tiempo de cada estación entre los entrenos visibles
export function mejoresDeEntrenos(entrenos) {
  const marcas = {}
  for (const e of entrenos) {
    for (const [estacion, seg] of Object.entries(e.parciales || {})) {
      if (seg > 0 && (!marcas[estacion] || seg < marcas[estacion].seg)) marcas[estacion] = { seg, titulo: e.titulo }
    }
  }
  return marcas
}

// Seguir: si yo le sigo y si él me sigue (amigos = los dos). Los contadores no se muestran.
export function useSeguir(yoId, otroId) {
  const [estado, setEstado] = useState({ leSigo: false, meSigue: false })
  const recargar = useCallback(async () => {
    if (!otroId || !yoId || yoId === otroId) return
    const relacion = (de, a) => supabase.from('seguimientos').select('seguidor').eq('seguidor', de).eq('seguido', a).maybeSingle()
    const [c, d] = await Promise.all([relacion(yoId, otroId), relacion(otroId, yoId)])
    setEstado({ leSigo: Boolean(c.data), meSigue: Boolean(d.data) })
  }, [yoId, otroId])
  useEffect(() => {
    const t = setTimeout(recargar, 0)
    return () => clearTimeout(t)
  }, [recargar])
  const alternar = async () => {
    const { error } = estado.leSigo
      ? await supabase.from('seguimientos').delete().eq('seguidor', yoId).eq('seguido', otroId)
      : await supabase.from('seguimientos').insert({ seguidor: yoId, seguido: otroId })
    if (!error) recargar()
    return !error
  }
  return { ...estado, alternar }
}

// Lista de seguidores o de seguidos de un atleta (sin bloqueados)
export async function listaSeguimientos(userId, tipo) {
  const [campo, otro] = tipo === 'seguidores' ? ['seguido', 'seguidor'] : ['seguidor', 'seguido']
  const [{ data }, { data: ocultos }] = await Promise.all([
    supabase.from('seguimientos').select(`${otro}, perfil:profiles!seguimientos_${otro}_fkey(*)`).eq(campo, userId).order('created_at', { ascending: false }),
    supabase.rpc('ocultos_para_mi'),
  ])
  const fuera = new Set((ocultos || []).map(o => (typeof o === 'string' ? o : Object.values(o)[0])))
  return (data || []).map(f => f.perfil).filter(p => p && !fuera.has(p.id))
}
