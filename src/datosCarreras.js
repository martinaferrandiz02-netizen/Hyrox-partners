// Calendario de carreras y próximas carreras de cada atleta
import { useCallback, useEffect, useState } from 'react'
import CALENDARIO from './data/calendario.json'
import { supabase } from './supabase'

export const hoyISO = () => new Date().toISOString().slice(0, 10)
const sinAcentos = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// Carreras ya celebradas (más recientes primero) o por venir (más próximas primero)
export function carrerasDelCalendario(cuando, texto = '') {
  const hoy = hoyISO()
  const q = sinAcentos(texto.trim())
  return CALENDARIO
    .filter(e => (cuando === 'pasadas' ? e.inicio <= hoy : e.fin >= hoy))
    .filter(e => !q || sinAcentos(`${e.nombre} ${e.pais}`).includes(q))
    .sort((a, b) => (cuando === 'pasadas' ? b.inicio.localeCompare(a.inicio) : a.inicio.localeCompare(b.inicio)))
}
export const eventoPorId = (id) => CALENDARIO.find(e => e.id === id) || null

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
// "9–11 oct 2026" o "30 sep – 4 oct 2026"
export function rangoFechas(inicio, fin) {
  const [a1, m1, d1] = inicio.split('-').map(Number)
  if (!fin || fin === inicio) return `${d1} ${MESES[m1 - 1]} ${a1}`
  const [a2, m2, d2] = fin.split('-').map(Number)
  return m1 === m2 ? `${d1}–${d2} ${MESES[m2 - 1]} ${a2}` : `${d1} ${MESES[m1 - 1]} – ${d2} ${MESES[m2 - 1]} ${a2}`
}

// Cuántos atletas firman el certificado: los nombres van antes del primer ejercicio
export function atletasEnCertificado(texto) {
  const corte = texto.search(/\d{3,4}\s*M\b|SKI\s*-?\s*ERG|TOTAL\s*TIME/i)
  const cabecera = (corte > 0 ? texto.slice(0, corte) : '').replace(/[^A-Za-zÀ-ÿ\s]/g, ' ')
  const palabras = cabecera.split(/\s+/).filter(p => p.length >= 2 && /^[A-ZÀ-Ý]/.test(p))
  return palabras.length ? Math.max(1, Math.round(palabras.length / 2)) : null
}

// ───────── Próximas carreras ─────────
export function useProximas(userId) {
  const [proximas, setProximas] = useState([])
  const recargar = useCallback(async () => {
    if (!userId) return
    const { data } = await supabase.from('proximas_carreras').select('*').eq('user_id', userId).order('fecha')
    setProximas(data || [])
  }, [userId])
  useEffect(() => {
    const t = setTimeout(recargar, 0)
    return () => clearTimeout(t)
  }, [recargar])
  return { proximas, recargar }
}

export async function anadirProxima(userId, { evento, carrera, fecha, busca_pareja }) {
  const { error } = await supabase.from('proximas_carreras').insert({ user_id: userId, evento, carrera, fecha, busca_pareja })
  if (error?.code === '23505') return 'Ya tienes esta carrera en tus próximas.'
  return error ? 'No se ha podido guardar. Inténtalo de nuevo.' : null
}
export async function quitarProxima(id) {
  const { error } = await supabase.from('proximas_carreras').delete().eq('id', id)
  return !error
}
export async function cambiarBuscaPareja(id, busca_pareja) {
  const { error } = await supabase.from('proximas_carreras').update({ busca_pareja }).eq('id', id)
  return !error
}
export async function cambiarVisibilidadCarrera(id, visibilidad) {
  const { error } = await supabase.from('resultados').update({ visibilidad }).eq('id', id)
  return !error
}

// ───────── Quién busca pareja para cada carrera ─────────
// Clave común para comparar carreras del calendario y carreras escritas a mano
export const claveCarrera = (p) => p.evento || `${p.carrera.trim().toLowerCase()}|${p.fecha}`
export const fechasCarrera = (p) => {
  const e = p.evento && eventoPorId(p.evento)
  return e ? rangoFechas(e.inicio, e.fin) : rangoFechas(p.fecha)
}

// Todas las próximas carreras (desde hoy) de la gente que busca pareja, y las mías
export function useBuscanPareja(yoId) {
  const [filas, setFilas] = useState([])
  const recargar = useCallback(async () => {
    if (!yoId) return
    const { data } = await supabase.from('proximas_carreras').select('*')
      .gte('fecha', hoyISO()).or(`busca_pareja.eq.true,user_id.eq.${yoId}`).order('fecha')
    setFilas(data || [])
  }, [yoId])
  useEffect(() => {
    const t = setTimeout(recargar, 0)
    return () => clearTimeout(t)
  }, [recargar])

  const mias = new Set(filas.filter(f => f.user_id === yoId).map(claveCarrera))
  const porUsuario = new Map()
  const carreras = new Map()
  for (const f of filas) {
    if (f.user_id === yoId || !f.busca_pareja) continue
    const clave = claveCarrera(f)
    if (!porUsuario.has(f.user_id)) porUsuario.set(f.user_id, [])
    porUsuario.get(f.user_id).push({ ...f, clave, mia: mias.has(clave) })
    if (!carreras.has(clave)) carreras.set(clave, { clave, nombre: f.carrera, fecha: f.fecha, fechas: fechasCarrera(f), mia: mias.has(clave), usuarios: new Set() })
    carreras.get(clave).usuarios.add(f.user_id)
  }
  // Primero las carreras a las que también voy yo, luego por fecha
  const listaCarreras = [...carreras.values()]
    .map(c => ({ ...c, n: c.usuarios.size }))
    .sort((a, b) => (b.mia - a.mia) || a.fecha.localeCompare(b.fecha))
  return { porUsuario, carreras: listaCarreras, recargar }
}
