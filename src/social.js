// Solicitudes de pareja y mensajes, guardados en Supabase y en tiempo real
import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'

const CAMPOS = '*, de_perfil:profiles!solicitudes_de_fkey(*), para_perfil:profiles!solicitudes_para_fkey(*)'

// Todas mis solicitudes (enviadas y recibidas), con el perfil de la otra persona
export function useSolicitudes(meId) {
  const [solicitudes, setSolicitudes] = useState([])

  const recargar = useCallback(async () => {
    const { data } = await supabase.from('solicitudes').select(CAMPOS).order('created_at', { ascending: false })
    if (!data) return
    setSolicitudes(data.map(s => {
      const enviada = s.de === meId
      return { ...s, enviada, otro: enviada ? s.para_perfil : s.de_perfil }
    }).filter(s => s.otro))
  }, [meId])

  useEffect(() => {
    // Primera carga y avisos en tiempo real cuando alguien me envía o responde una solicitud
    const inicial = setTimeout(recargar, 0)
    const canal = supabase.channel(`solicitudes-${meId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'solicitudes' }, recargar)
      .subscribe()
    return () => { clearTimeout(inicial); supabase.removeChannel(canal) }
  }, [meId, recargar])

  return { solicitudes, recargar }
}

export async function enviarSolicitud(meId, paraId, mensaje) {
  const { error } = await supabase.from('solicitudes').insert({ de: meId, para: paraId, mensaje })
  return !error || error.code === '23505' // 23505 = ya existía
}

export async function responderSolicitud(id, estado) {
  const { error } = await supabase.from('solicitudes').update({ estado }).eq('id', id)
  return !error
}

const entre = (a, b) => `and(de.eq.${a},para.eq.${b}),and(de.eq.${b},para.eq.${a})`

// Mensajes de una conversación, con los nuevos llegando en tiempo real
export function useConversacion(meId, otroId) {
  const [mensajes, setMensajes] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let activo = true
    supabase.from('mensajes').select('*').or(entre(meId, otroId)).order('created_at')
      .then(({ data }) => { if (activo) { setMensajes(data || []); setCargando(false) } })

    const canal = supabase.channel(`chat-${meId}-${otroId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensajes' }, ({ new: m }) => {
        const deEstaConversacion = (m.de === meId && m.para === otroId) || (m.de === otroId && m.para === meId)
        if (deEstaConversacion) setMensajes(prev => prev.some(x => x.id === m.id) ? prev : [...prev, m])
      })
      .subscribe()
    return () => { activo = false; supabase.removeChannel(canal) }
  }, [meId, otroId])

  const enviar = async (texto) => {
    const limpio = texto.trim()
    if (!limpio) return false
    const { data, error } = await supabase.from('mensajes').insert({ de: meId, para: otroId, texto: limpio }).select().single()
    if (error) return false
    setMensajes(prev => prev.some(x => x.id === data.id) ? prev : [...prev, data])
    return true
  }

  return { mensajes, cargando, enviar }
}

// Último mensaje de cada conversación, para la lista de chats
export function useUltimosMensajes(meId) {
  const [ultimos, setUltimos] = useState({})

  useEffect(() => {
    const cargar = async () => {
      const { data } = await supabase.from('mensajes').select('*').order('created_at', { ascending: false }).limit(300)
      const porPersona = {}
      for (const m of data || []) {
        const otro = m.de === meId ? m.para : m.de
        if (!porPersona[otro]) porPersona[otro] = m
      }
      setUltimos(porPersona)
    }
    const inicial = setTimeout(cargar, 0)
    const canal = supabase.channel(`ultimos-${meId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensajes' }, cargar)
      .subscribe()
    return () => { clearTimeout(inicial); supabase.removeChannel(canal) }
  }, [meId])

  return ultimos
}

export function horaCorta(fecha) {
  const d = new Date(fecha)
  const hoy = new Date()
  return d.toDateString() === hoy.toDateString()
    ? d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}
