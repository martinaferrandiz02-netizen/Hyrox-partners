import { useState } from 'react'
import { ArrowUpRight, Check, CircleX, Hourglass, MapPin, Plus, Settings } from 'lucide-react'
import { Avatar } from './Avatar'
import { formatoParcial } from './certificado'
import { nombreCiudad } from './ciudades'
import { borrarResultado, ESTACIONES, mejoresMarcas, useResultados } from './resultados'
import { MisVideos, VideosDe } from './Videos'

const iniciales = (n) => n.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('')
const fechaCarrera = (f) => f ? new Date(f + 'T12:00:00').toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }) : null

function EstadoCarrera({ r, esPropio }) {
  if (r.estado === 'verificado') return <span className="pv-estado ok"><Check size={14} strokeWidth={2.5} /> Verificado</span>
  if (r.estado === 'pendiente') return <span className="pv-estado"><Hourglass size={14} /> Pendiente de revisión</span>
  return <span className="pv-estado error"><CircleX size={14} /> No válido{esPropio && r.motivo ? ` · ${r.motivo}` : ''}</span>
}

// Perfil tipo red social: el mismo diseño para el tuyo y para el de los demás
export function PerfilVista({ perfil, esPropio, color = 'yellow', acciones, onEditar, onAnadirCarrera, onAjustes, onCambio }) {
  const { resultados, cargando, recargar } = useResultados(perfil.id)
  const [borrando, setBorrando] = useState(null)

  const borrar = async (r) => {
    if (!window.confirm('¿Borrar esta carrera?')) return
    setBorrando(r.id)
    const ok = await borrarResultado(r)
    setBorrando(null)
    if (!ok) { window.alert('No se ha podido borrar la carrera. Inténtalo de nuevo.'); return }
    await recargar()
    onCambio?.()
  }
  const [pestana, setPestana] = useState('marcas')
  const verificadas = resultados.filter(r => r.estado === 'verificado')
  const visibles = esPropio ? resultados : verificadas
  const marcas = mejoresMarcas(resultados)
  const verificado = perfil.certificado_estado === 'verificado'
  const anadir = <button className="link-btn" onClick={onAnadirCarrera}><Plus size={16} /> Añadir carrera</button>

  return (
    <div className="screen pv">
      {esPropio && (
        <div className="pv-hero-top">
          <button className="pv-ajustes" onClick={onAjustes} aria-label="Ajustes"><Settings size={20} /></button>
        </div>
      )}

      {/* Cabecera */}
      <div className="pv-hero">
        <div className={`pv-avatar ${verificado ? 'verificado' : ''}`}>
          <Avatar p={{ fotoUrl: perfil.foto_url, color, iniciales: iniciales(perfil.nombre) }} />
          {verificado && <span className="pv-check"><Check size={14} strokeWidth={3} /></span>}
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="pv-nombre">{perfil.nombre}</div>
          <div className="pv-sub"><MapPin size={14} /> {nombreCiudad(perfil.ciudad)}{perfil.club ? ` · ${perfil.club}` : ''}</div>
        </div>
      </div>
      <div className="pv-chips">
        <span className="tag">{perfil.sexo}</span>
        <span className="tag">{perfil.categoria}</span>
        {perfil.division && <span className="tag">{perfil.division}</span>}
        {verificado && <span className="tag acento"><Check size={12} strokeWidth={3} /> Verificado</span>}
      </div>

      {/* Lo importante, a primera vista */}
      <div className="stats">
        <div><strong className={perfil.puntos ? 'acento' : ''}>{perfil.puntos ?? '—'}</strong><span>Puntos</span></div>
        <div><strong>{verificado && perfil.mejor_tiempo ? perfil.mejor_tiempo : '—'}</strong><span>Mejor tiempo</span></div>
        <div><strong>{verificadas.length}</strong><span>{verificadas.length === 1 ? 'Carrera' : 'Carreras'}</span></div>
      </div>

      {esPropio ? (
        <div className="pv-acciones">
          <button className="btn-secondary" onClick={onEditar}>Editar perfil</button>
          <button className="btn-match" onClick={onAnadirCarrera}><Plus size={18} /> Carrera</button>
        </div>
      ) : acciones && <div className="pv-acciones">{acciones}</div>}

      {/* Pestañas */}
      <div className="pv-tabs">
        {[['marcas', 'Marcas'], ['carreras', 'Carreras'], ['tecnica', 'Técnica']].map(([k, l]) => (
          <button key={k} className={pestana === k ? 'active' : ''} onClick={() => setPestana(k)}>{l}</button>
        ))}
      </div>

      {pestana === 'marcas' && (
        Object.keys(marcas).length === 0 ? (
          <div className="pv-vacio">
            {esPropio ? <>Añade una carrera con su certificado y aquí aparecerán tus mejores tiempos en cada ejercicio.{anadir}</> : 'Todavía no tiene carreras verificadas.'}
          </div>
        ) : (
          <div className="marcas">
            {ESTACIONES.map((e, i) => (
              <div key={e} className={`marca ${marcas[e] ? '' : 'vacia'}`}>
                <span className="marca-num">{String(i + 1).padStart(2, '0')}</span>
                <span className="marca-nombre">{e}</span>
                <span className="marca-tiempo">{marcas[e] ? formatoParcial(marcas[e].seg) : '—'}</span>
              </div>
            ))}
            {marcas.Running && (
              <div className="marca running">
                <span className="marca-nombre">Running · 8 km</span>
                <span className="marca-tiempo">{formatoParcial(marcas.Running.seg)}</span>
              </div>
            )}
            <div className="pv-nota">Mejores tiempos de {esPropio ? 'tus' : 'sus'} carreras verificadas.</div>
          </div>
        )
      )}

      {pestana === 'carreras' && (
        <div>
          {cargando && <div className="pv-vacio">Cargando…</div>}
          {!cargando && visibles.length === 0 && (
            <div className="pv-vacio">{esPropio ? <>Aún no has añadido carreras.{anadir}</> : 'Todavía no tiene carreras verificadas.'}</div>
          )}
          {visibles.map(r => (
            <div key={r.id} className="carrera">
              <div className="carrera-top">
                <div style={{ minWidth: 0 }}>
                  <div className="carrera-nombre">{r.carrera}</div>
                  <div className="carrera-sub">{[fechaCarrera(r.fecha), r.division, r.categoria].filter(Boolean).join(' · ')}</div>
                </div>
                <div>
                  <div className="carrera-tiempo">{r.tiempo}</div>
                  {r.puntos && <div className="carrera-pts">{r.puntos} pts</div>}
                </div>
              </div>
              <div className="carrera-pie">
                <EstadoCarrera r={r} esPropio={esPropio} />
                <span className="carrera-acciones">
                  <a href={r.certificado_url} target="_blank" rel="noopener noreferrer">Certificado <ArrowUpRight size={14} /></a>
                  {esPropio && <button className="video-borrar" disabled={borrando === r.id} onClick={() => borrar(r)}>{borrando === r.id ? 'Borrando…' : 'Borrar'}</button>}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {pestana === 'tecnica' && (esPropio ? <MisVideos userId={perfil.id} /> : <VideosDe userId={perfil.id} nombre={perfil.nombre} />)}
    </div>
  )
}
