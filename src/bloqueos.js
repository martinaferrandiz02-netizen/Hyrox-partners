// Bloquear y denunciar usuarios
import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'

export const MOTIVOS = ['Perfil falso', 'Certificado o tiempo falso', 'Acoso o mensajes ofensivos', 'Contenido inapropiado', 'Spam', 'Otro']

// Personas que no debo ver: las que he bloqueado y las que me han bloqueado
export function useOcultos() {
  const [ocultos, setOcultos] = useState(new Set())
  const recargar = useCallback(async () => {
    const { data } = await supabase.rpc('ocultos_para_mi')
    setOcultos(new Set((data || []).map(x => (typeof x === 'string' ? x : x.ocultos_para_mi))))
  }, [])
  useEffect(() => { const t = setTimeout(recargar, 0); return () => clearTimeout(t) }, [recargar])
  return { ocultos, recargar }
}

export async function bloquear(meId, otroId) {
  const { error } = await supabase.from('bloqueos').insert({ bloqueador: meId, bloqueado: otroId })
  return !error || error.code === '23505'
}

export async function desbloquear(meId, otroId) {
  const { error } = await supabase.from('bloqueos').delete().eq('bloqueador', meId).eq('bloqueado', otroId)
  return !error
}

export async function denunciar(meId, otroId, motivo, detalle, contexto) {
  const { error } = await supabase.from('denuncias')
    .insert({ denunciante: meId, denunciado: otroId, motivo, detalle: detalle.trim() || null, contexto })
  return !error
}

// Lista de mis bloqueados, con su perfil, para Ajustes
export async function misBloqueados(meId) {
  const { data } = await supabase.from('bloqueos')
    .select('bloqueado, perfil:profiles!bloqueos_bloqueado_fkey(id, nombre, ciudad, foto_url)')
    .eq('bloqueador', meId).order('created_at', { ascending: false })
  return (data || []).filter(b => b.perfil)
}
