import { useState } from 'react'
import { Avatar } from './Avatar'
import { formatoParcial } from './certificado'
import { nombreCiudad } from './ciudades'
import { borrarResultado, ESTACIONES, mejoresMarcas, useResultados } from './resultados'
import { MisVideos, VideosDe } from './Videos'

const iniciales = (n) => n.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('')
const fechaCarrera = (f) => f ? new Date(f + 'T12:00:00').toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }) : null

function EstadoCarrera({ r, esPropio }) {
  if (r.estado === 'verificado') return <span className="pv-estado ok">✓ Verificado</span>
  if (r.estado === 'pendiente') return <span className="pv-estado">⏳ Pendiente de revisión</span>
  return <span className="pv-estado error">✕ No válido{esPropio && r.motivo ? ` · ${r.motivo}` : ''}</span>
}

// Perfil tipo red social: el mismo diseño para el tuyo y para el de los demás
export function PerfilVista({ perfil, esPropio, color = 'yellow', acciones, onEditar, onAnadirCarrera, onAjustes }) {
  const { resultados, cargando } = useResultados(perfil.id)
  const [pestana, setPestana] = useState('marcas')
  const verificadas = resultados.filter(r => r.estado === 'verificado')
  const visibles = esPropio ? resultados : verificadas
  const marcas = mejoresMarcas(resultados)
  const verificado = perfil.certificado_estado === 'verificado'

  return (
    <div className="screen pv">
      {/* Cabecera */}
      <div className="pv-hero">
        {esPropio && <button className="pv-ajustes" onClick={onAjustes} aria-label="Ajustes">⚙</button>}
        <div className={`pv-avatar ${verificado ? 'verificado' : ''}`}>
          <Avatar p={{ fotoUrl: perfil.foto_url, color, iniciales: iniciales(perfil.nombre) }} />
          {verificado && <span className="pv-check">✓</span>}
        </div>
        <div className="pv-nombre">{perfil.nombre}</div>
        <div className="pv-sub">📍 {nombreCiudad(perfil.ciudad)}{perfil.club ? ` · ${perfil.club}` : ''}</div>
        <div className="pv-chips">
          <span>{perfil.sexo}</span>
          <span>{perfil.categoria}</span>
          {perfil.division && <span>{perfil.division}</span>}
        </div>
      </div>

      {/* Lo importante, a primera vista */}
      <div className="pv-stats">
        <div><strong className="amarillo">{perfil.puntos ?? '–'}</strong><span>Puntos</span></div>
        <div><strong>{verificado && perfil.mejor_tiempo ? perfil.mejor_tiempo : '–'}</strong><span>Mejor tiempo</span></div>
        <div><strong>{verificadas.length}</strong><span>{verificadas.length === 1 ? 'Carrera' : 'Carreras'}</span></div>
      </div>

      {esPropio ? (
        <div className="pv-acciones">
          <button className="btn-secondary" onClick={onEditar}>Editar perfil</button>
          <button className="btn-match" onClick={onAnadirCarrera}>+ Añadir carrera</button>
        </div>
      ) : acciones && <div className="pv-acciones">{acciones}</div>}

      {/* Pestañas */}
      <div className="pv-tabs">
        {[['marcas', 'Marcas'], ['carreras', 'Carreras'], ['tecnica', 'Técnica']].map(([k, l]) => (
          <button key={k} className={pestana === k ? 'active' : ''} onClick={() => setPestana(k)}>{l}</button>
        ))}
      </div>

      {pestana === 'marcas' && (
        <div>
          {Object.keys(marcas).length === 0 ? (
            <div className="pv-vacio">
              {esPropio
                ? <>Añade una carrera con su certificado y aquí aparecerán tus mejores tiempos en cada ejercicio.<button className="link-btn" onClick={onAnadirCarrera}>+ Añadir carrera</button></>
                : 'Todavía no tiene carreras verificadas.'}
            </div>
          ) : (
            <>
              <div className="pv-marcas">
                {ESTACIONES.map((e, i) => (
                  <div key={e} className={marcas[e] ? '' : 'vacia'}>
                    <span className="pv-marca-num">{i + 1}</span>
                    <span className="pv-marca-nombre">{e}</span>
                    <strong>{marcas[e] ? formatoParcial(marcas[e].seg) : '—'}</strong>
                  </div>
                ))}
              </div>
              {marcas.Running && (
                <div className="pv-running"><span>🏃 Carrera (8 km)</span><strong>{formatoParcial(marcas.Running.seg)}</strong></div>
              )}
              <div className="pv-nota">Mejores tiempos de {esPropio ? 'tus' : 'sus'} carreras verificadas</div>
            </>
          )}
        </div>
      )}

      {pestana === 'carreras' && (
        <div>
          {cargando && <div className="pv-vacio">Cargando…</div>}
          {!cargando && visibles.length === 0 && (
            <div className="pv-vacio">
              {esPropio ? <>Aún no has añadido carreras.<button className="link-btn" onClick={onAnadirCarrera}>+ Añadir carrera</button></> : 'Todavía no tiene carreras verificadas.'}
            </div>
          )}
          {visibles.map(r => (
            <div key={r.id} className="pv-carrera">
              <div className="pv-carrera-top">
                <div>
                  <div className="pv-carrera-nombre">{r.carrera}</div>
                  <div className="pv-carrera-sub">{[fechaCarrera(r.fecha), r.division, r.categoria].filter(Boolean).join(' · ')}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="pv-carrera-tiempo">{r.tiempo}</div>
                  {r.puntos && <div className="pv-carrera-sub">{r.puntos} pts</div>}
                </div>
              </div>
              <div className="pv-carrera-pie">
                <EstadoCarrera r={r} esPropio={esPropio} />
                <span>
                  <a href={r.certificado_url} target="_blank" rel="noopener noreferrer">Ver certificado ↗</a>
                  {esPropio && <button className="video-borrar" style={{ marginLeft: 10 }} onClick={() => window.confirm('¿Borrar esta carrera?') && borrarResultado(r)}>Borrar</button>}
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
