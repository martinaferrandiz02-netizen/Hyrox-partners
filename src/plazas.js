// Plazas disponibles guardadas en Supabase, con avisos en tiempo real
import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'

export function usePlazas() {
  const [plazas, setPlazas] = useState([])

  const recargar = useCallback(async () => {
    const hoy = new Date().toISOString().slice(0, 10)
    const { data } = await supabase.from('plazas')
      .select('*, autor_perfil:profiles!plazas_user_id_fkey(*)')
      .gte('fecha', hoy)
      .order('fecha')
    if (data) setPlazas(data.filter(p => p.autor_perfil))
  }, [])

  useEffect(() => {
    const inicial = setTimeout(recargar, 0)
    const canal = supabase.channel('plazas')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'plazas' }, recargar)
      .subscribe()
    return () => { clearTimeout(inicial); supabase.removeChannel(canal) }
  }, [recargar])

  return { plazas, recargar }
}

export async function publicarPlaza(userId, form) {
  const { error } = await supabase.from('plazas').insert({
    user_id: userId,
    tipo: form.tipo,
    carrera: form.carrera.trim(),
    fecha: form.fecha,
    categoria: form.categoria,
    flex: form.flex,
    nota: form.nota.trim() || null,
  })
  return error ? error.message : null
}

export async function retirarPlaza(id) {
  const { error } = await supabase.from('plazas').delete().eq('id', id)
  return !error
}

export function fechaCorta(iso) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}
