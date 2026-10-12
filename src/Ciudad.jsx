import { useEffect, useMemo, useRef, useState } from 'react'
import { normalizar } from './certificado'
import { EN_ESPANOL, nombreCiudad } from './ciudades'

let pais
try { pais = new Intl.DisplayNames(['es'], { type: 'region' }) } catch { pais = null }
const nombrePais = (cc) => (pais ? pais.of(cc) : cc)

let cache = null
function useCiudades() {
  const [lista, setLista] = useState(cache)
  useEffect(() => {
    if (cache) return
    import('./data/ciudades-europa.json').then(m => {
      cache = m.default.map(([nombre, cc]) => {
        const es = EN_ESPANOL[nombre]
        return { nombre, cc, claves: [normalizar(nombre), es ? normalizar(es) : null].filter(Boolean) }
      })
      setLista(cache)
    })
  }, [])
  return lista
}

// Buscador de ciudades europeas: sugiere mientras escribes y obliga a elegir una de la lista
export function CampoCiudad({ valor, onChange }) {
  const ciudades = useCiudades()
  const [texto, setTexto] = useState(valor ? nombreCiudad(valor) : '')
  const [abierto, setAbierto] = useState(false)
  const [activo, setActivo] = useState(0)
  const caja = useRef(null)

  const sugerencias = useMemo(() => {
    const q = normalizar(texto)
    if (!ciudades || q.length < 2) return []
    const empiezan = [], contienen = []
    for (const c of ciudades) {
      if (c.claves.some(k => k.startsWith(q))) empiezan.push(c)
      else if (q.length >= 3 && c.claves.some(k => k.includes(q))) contienen.push(c)
      if (empiezan.length >= 8) break
    }
    return [...empiezan, ...contienen].slice(0, 8)
  }, [texto, ciudades])

  useEffect(() => {
    const fuera = (e) => { if (caja.current && !caja.current.contains(e.target)) setAbierto(false) }
    document.addEventListener('mousedown', fuera)
    return () => document.removeEventListener('mousedown', fuera)
  }, [])

  const elegir = (c) => {
    setTexto(nombreCiudad(c.nombre))
    onChange(c.nombre)
    setAbierto(false)
  }

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
        value={texto}
        onChange={e => { setTexto(e.target.value); onChange(''); setAbierto(true); setActivo(0) }}
        onFocus={() => setAbierto(true)}
        onKeyDown={teclas}
        placeholder="Empieza a escribir tu ciudad…"
        autoComplete="off"
      />
      {abierto && sugerencias.length > 0 && (
        <ul className="ciudad-lista">
          {sugerencias.map((c, i) => (
            <li key={c.nombre + c.cc} className={i === activo ? 'activo' : ''} onMouseDown={e => { e.preventDefault(); elegir(c) }}>
              <span>{nombreCiudad(c.nombre)}</span><span className="ciudad-pais">{nombrePais(c.cc)}</span>
            </li>
          ))}
        </ul>
      )}
      {abierto && ciudades && normalizar(texto).length >= 2 && sugerencias.length === 0 && (
        <div className="ciudad-lista vacia">No encontramos esa ciudad en Europa</div>
      )}
    </div>
  )
}
