import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from './supabase'
import { normalizar } from './certificado'

// Clubs que ya han registrado otros usuarios, con el número de miembros
function useClubs() {
  const [clubs, setClubs] = useState([])
  useEffect(() => {
    supabase.from('profiles').select('club').not('club', 'is', null).then(({ data }) => {
      if (!data) return
      const porClave = new Map()
      for (const { club } of data) {
        const clave = normalizar(club)
        if (!clave) continue
        const actual = porClave.get(clave)
        if (actual) actual.miembros++
        else porClave.set(clave, { nombre: club, clave, miembros: 1 })
      }
      setClubs([...porClave.values()].sort((a, b) => b.miembros - a.miembros))
    })
  }, [])
  return clubs
}

// Campo de club: sugiere clubs existentes mientras escribes; si no existe, se crea con lo escrito
export function CampoClub({ valor, onChange }) {
  const clubs = useClubs()
  const [abierto, setAbierto] = useState(false)
  const [activo, setActivo] = useState(0)
  const caja = useRef(null)

  const sugerencias = useMemo(() => {
    const q = normalizar(valor || '')
    if (!q) return clubs.slice(0, 6)
    return clubs.filter(c => c.clave.includes(q) && c.clave !== q).slice(0, 6)
  }, [valor, clubs])

  useEffect(() => {
    const fuera = (e) => { if (caja.current && !caja.current.contains(e.target)) setAbierto(false) }
    document.addEventListener('mousedown', fuera)
    return () => document.removeEventListener('mousedown', fuera)
  }, [])

  const elegir = (c) => { onChange(c.nombre); setAbierto(false) }

  const teclas = (e) => {
    if (!abierto || !sugerencias.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActivo(i => Math.min(i + 1, sugerencias.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActivo(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); elegir(sugerencias[activo]) }
    else if (e.key === 'Escape') setAbierto(false)
  }

  return (
    <div className="ciudad-campo" ref={caja}>
      <input
        value={valor}
        onChange={e => { onChange(e.target.value); setAbierto(true); setActivo(0) }}
        onFocus={() => setAbierto(true)}
        onKeyDown={teclas}
        placeholder="Busca tu club o escribe uno nuevo"
        maxLength={40}
        autoComplete="off"
      />
      {abierto && sugerencias.length > 0 && (
        <ul className="ciudad-lista">
          {sugerencias.map((c, i) => (
            <li key={c.clave} className={i === activo ? 'activo' : ''} onMouseDown={e => { e.preventDefault(); elegir(c) }}>
              <span>{c.nombre}</span><span className="ciudad-pais">{c.miembros} {c.miembros === 1 ? 'miembro' : 'miembros'}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
