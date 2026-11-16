// Ranking por tiempos verificados.
// Solo se comparan atletas de la misma división, categoría y sexo (en Doubles mixto, sin sexo).
import { aSegundos, formatoTiempo } from './certificado'
import { nombreCiudad } from './ciudades'

export const MIN_CLUB = 10   // atletas con tiempo verificado para que un club entre en el ranking
export const TOP_CLUB = 10   // el tiempo del club es la media de sus 10 mejores

export const claveGrupo = (p) => p.division === 'Doubles mixto' ? `Doubles mixto|${p.categoria}` : `${p.division}|${p.categoria}|${p.sexo}`
export function nombreGrupo(clave) {
  const [division, categoria, sexo] = clave.split('|')
  return sexo ? `${division} ${categoria} · ${sexo === 'Mujer' ? 'Mujeres' : 'Hombres'}` : `${division} ${categoria}`
}
export const tiempoSeg = (t) => (t ? aSegundos(t) : null)
export const verTiempo = (seg) => (seg ? formatoTiempo(seg) : '—')

// perfil: el mío (fila de profiles). otros: candidatos ya convertidos (aCandidato).
export function calcularRanking(perfil, otros) {
  const yo = {
    id: perfil.id, ciudad: nombreCiudad(perfil.ciudad), club: perfil.club || null,
    division: perfil.division, categoria: perfil.categoria, sexo: perfil.sexo,
    seg: perfil.certificado_estado === 'verificado' ? tiempoSeg(perfil.mejor_tiempo) : null,
  }
  const resto = otros.map(o => ({
    id: o.userId, ciudad: o.ciudad, club: o.club && o.club !== 'Sin club' ? o.club : null,
    division: o.division, categoria: o.categoria, sexo: o.sexo,
    seg: o.verificado ? tiempoSeg(o.mejorTiempo) : null,
  }))
  const todos = [yo, ...resto].filter(p => p.seg && p.division && p.categoria)
  const miSeg = yo.seg && yo.division ? yo.seg : null
  const miGrupo = miSeg ? claveGrupo(yo) : null
  const delGrupo = miGrupo ? todos.filter(p => claveGrupo(p) === miGrupo) : []
  const posicion = (lista) => (miSeg ? lista.filter(p => p.seg < miSeg).length + 1 : null)
  const posGrupo = posicion(delGrupo)

  // Clubs de un grupo: mínimo 10 verificados, media de sus 10 mejores tiempos
  const clubsDe = (clave) => {
    const porClub = {}
    for (const p of todos) if (p.club && claveGrupo(p) === clave) (porClub[p.club] ||= []).push(p.seg)
    const lista = Object.entries(porClub).map(([nombre, tiempos]) => {
      const top = tiempos.sort((a, b) => a - b).slice(0, TOP_CLUB)
      return { nombre, miembros: tiempos.length, seg: Math.round(top.reduce((a, b) => a + b, 0) / top.length) }
    })
    const enRanking = lista.filter(c => c.miembros >= MIN_CLUB).sort((a, b) => a.seg - b.seg).map((c, i) => ({ ...c, pos: i + 1 }))
    return { enRanking, todos: lista }
  }
  const grupos = [...new Set(todos.map(claveGrupo))].sort()

  return {
    miSeg, miGrupo,
    posGrupo, totalGrupo: delGrupo.length,
    posCiudad: posicion(delGrupo.filter(p => p.ciudad === yo.ciudad)),
    posClub: yo.club ? posicion(delGrupo.filter(p => p.club === yo.club)) : null,
    topPct: posGrupo ? Math.max(1, Math.round(100 * posGrupo / delGrupo.length)) : null,
    grupos, clubsDe,
  }
}
