// Historial de carreras de un usuario y sus mejores marcas
import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'

export const ESTACIONES = ['Ski erg', 'Sled push', 'Sled pull', 'Burpee broad jumps', 'Rowing', 'Farmer carry', 'Sandbag lunges', 'Wall balls']

export function useResultados(userId) {
  const [resultados, setResultados] = useState([])
  const [cargando, setCargando] = useState(Boolean(userId))

  const recargar = useCallback(async () => {
    if (!userId) return
    const { data } = await supabase.from('resultados').select('*').eq('user_id', userId)
      .order('fecha', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false })
    setResultados(data || [])
    setCargando(false)
  }, [userId])

  useEffect(() => {
    if (!userId) return
    const inicial = setTimeout(recargar, 0)
    const canal = supabase.channel(`resultados-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resultados', filter: `user_id=eq.${userId}` }, recargar)
      .subscribe()
    return () => { clearTimeout(inicial); supabase.removeChannel(canal) }
  }, [userId, recargar])

  return { resultados, cargando, recargar }
}

// Mejor tiempo de cada estación entre todas las carreras verificadas
export function mejoresMarcas(resultados) {
  const marcas = {}
  for (const r of resultados) {
    if (r.estado !== 'verificado') continue
    for (const [estacion, seg] of Object.entries(r.parciales || {})) {
      if (!marcas[estacion] || seg < marcas[estacion].seg) marcas[estacion] = { seg, carrera: r.carrera }
    }
  }
  return marcas
}

export async function guardarResultado({ userId, archivo, datos }) {
  const ext = archivo.name.split('.').pop().toLowerCase()
  const ruta = `${userId}/${Date.now()}.${ext}`
  const { error: errSubida } = await supabase.storage.from('certificados').upload(ruta, archivo, { contentType: archivo.type })
  if (errSubida) return { error: 'No se ha podido subir el certificado. Inténtalo de nuevo.' }
  const url = supabase.storage.from('certificados').getPublicUrl(ruta).data.publicUrl

  const { data, error } = await supabase.from('resultados')
    .insert({ user_id: userId, ...datos, certificado_url: url, certificado_ruta: ruta }).select().single()
  if (error) {
    await supabase.storage.from('certificados').remove([ruta])
    if (error.message.includes('certificado_ya_usado')) return { error: 'Este certificado ya lo están usando 2 personas.' }
    if (error.message.includes('resultado_duplicado')) return { error: 'Ya habías subido este certificado.' }
    return { error: 'No se ha podido guardar la carrera. Inténtalo de nuevo.' }
  }
  // El servidor comprueba el certificado (los PDF al momento; las imágenes quedan para revisión)
  await supabase.functions.invoke('verificar-certificado', { body: { resultado_id: data.id } })
  return { resultado: data }
}

export async function borrarResultado(r) {
  const { error } = await supabase.from('resultados').delete().eq('id', r.id)
  if (!error) await supabase.storage.from('certificados').remove([r.certificado_ruta])
  return !error
}
