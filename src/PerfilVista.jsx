import { useEffect, useState } from 'react'
import { ArrowUpRight, Check, ChevronRight, CircleX, Hourglass, MapPin, Plus, Settings, UserCheck, UserPlus, Users } from 'lucide-react'
import { Avatar } from './Avatar'
import { formatoParcial } from './certificado'
import { nombreCiudad } from './ciudades'
import { borrarResultado, ESTACIONES, mejoresMarcas, useResultados } from './resultados'
import { MisVideos, VideosDe } from './Videos'
import { EntrenoFila } from './Entrenos'
import { listaSeguimientos, mejoresDeEntrenos, useContadores, useEntrenos, useSeguir } from './datosEntrenos'
import { Volver } from './Volver'

const iniciales = (n) => n.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('')
const fechaCarrera = (f) => f ? new Date(f + 'T12:00:00').toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }) : null

function EstadoCarrera({ r, esPropio }) {
  if (r.estado === 'verificado') return <span className="pv-estado ok"><Check size={14} strokeWidth={2.5} /> Verificado</span>
  if (r.estado === 'pendiente') return <span className="pv-estado"><Hourglass size={14} /> Pendiente de revisión</span>
  return <span className="pv-estado error"><CircleX size={14} /> No válido{esPropio && r.motivo ? ` · ${r.motivo}` : ''}</span>
}

// Perfil tipo red social: el mismo diseño para el tuyo y para el de los demás
// Lista de seguidores / seguidos: cada persona lleva a su perfil
function ListaSeguimientos({ perfil, tipo, volver, onAbrirPerfil, yoId }) {
  const [personas, setPersonas] = useState(null)
  useEffect(() => { listaSeguimientos(perfil.id, tipo).then(setPersonas) }, [perfil.id, tipo])
  const nombre = perfil.nombre.split(' ')[0]
  return (
    <div className="screen">
      <Volver onClick={volver} />
      <div className="screen-title">{tipo === 'seguidores' ? 'Seguidores' : 'Siguiendo'}</div>
      <div className="screen-sub">{tipo === 'seguidores' ? `Atletas que siguen a ${perfil.id === yoId ? 'ti' : nombre}` : `Atletas a los que sigue ${perfil.id === yoId ? 'tú' : nombre}`}</div>
      {personas === null && <div className="pv-vacio">Cargando…</div>}
      {personas?.length === 0 && (
        <div className="empty-state"><Users size={36} strokeWidth={1.5} /><div>{tipo === 'seguidores' ? 'Todavía no tiene seguidores.' : 'Todavía no sigue a nadie.'}</div></div>
      )}
      {personas?.length > 0 && (
        <div className="lista">
          {personas.map(p => {
            const verif = p.certificado_estado === 'verificado' && p.mejor_tiempo
            const propio = p.id === yoId
            return (
              <button key={p.id} className="fila" disabled={propio} onClick={() => onAbrirPerfil?.(p)}>
                <Avatar p={{ fotoUrl: p.foto_url, iniciales: iniciales(p.nombre), color: 'dark' }} />
                <div className="fila-cuerpo">
                  <div className="fila-titulo">{p.nombre}{propio ? ' (tú)' : ''}</div>
                  <div className="fila-sub"><MapPin size={13} /> {[nombreCiudad(p.ciudad), p.club].filter(Boolean).join(' · ')}</div>
                </div>
                {verif && <div className="fila-valor">{p.mejor_tiempo}</div>}
                {!propio && <ChevronRight size={18} className="fila-chevron" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function PerfilVista({ perfil, esPropio, yoId, color = 'yellow', acciones, onEditar, onAnadirCarrera, onAjustes, onCambio, onAbrirPerfil }) {
  const [lista, setLista] = useState(null)
  const contadores = useContadores(perfil.id, esPropio)
  const { resultados, cargando, recargar } = useResultados(perfil.id)
  const { entrenos, recargar: recargarEntrenos } = useEntrenos(perfil.id)
  const seguir = useSeguir(yoId || perfil.id, perfil.id)
  const [siguiendoOcupado, setSiguiendoOcupado] = useState(false)
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
  const marcasEntreno = mejoresDeEntrenos(entrenos)
  const hayEntreno = ESTACIONES.some(e => !marcas[e] && marcasEntreno[e]) || (!marcas.Running && marcasEntreno.Running)
  const botonSeguir = !esPropio && yoId && (
    <button className={`btn-match btn-seguir ${seguir.leSigo ? 'siguiendo' : ''}`} disabled={siguiendoOcupado}
      onClick={async () => { setSiguiendoOcupado(true); await seguir.alternar(); setSiguiendoOcupado(false) }}>
      {seguir.leSigo ? <><UserCheck size={18} /> {seguir.meSigue ? 'Amigos' : 'Siguiendo'}</> : <><UserPlus size={18} /> {seguir.meSigue ? 'Seguir también' : 'Seguir'}</>}
    </button>
  )
  const verificado = perfil.certificado_estado === 'verificado'
  const anadir = <button className="link-btn" onClick={onAnadirCarrera}><Plus size={16} /> Añadir carrera</button>

  if (lista) return <ListaSeguimientos perfil={perfil} tipo={lista} yoId={yoId || (esPropio ? perfil.id : null)} volver={() => setLista(null)} onAbrirPerfil={onAbrirPerfil} />

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
          <div className="pv-seguir">
            <button onClick={() => setLista('seguidores')}>{esPropio && contadores.seguidores !== null && <strong>{contadores.seguidores} </strong>}Seguidores</button>
            <span>·</span>
            <button onClick={() => setLista('siguiendo')}>{esPropio && contadores.siguiendo !== null && <strong>{contadores.siguiendo} </strong>}Siguiendo</button>
          </div>
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
        <div><strong className={verificado && perfil.mejor_tiempo ? 'acento' : ''}>{verificado && perfil.mejor_tiempo ? perfil.mejor_tiempo : '—'}</strong><span>Mejor tiempo</span></div>
        <div><strong>{verificado && perfil.division ? perfil.division : '—'}</strong><span>División</span></div>
        <div><strong>{verificadas.length}</strong><span>{verificadas.length === 1 ? 'Carrera' : 'Carreras'}</span></div>
      </div>

      {esPropio ? (
        <div className="pv-acciones">
          <button className="btn-secondary" onClick={onEditar}>Editar perfil</button>
          <button className="btn-match" onClick={onAnadirCarrera}><Plus size={18} /> Carrera</button>
        </div>
      ) : (acciones || botonSeguir) && <div className="pv-acciones">{botonSeguir}{acciones}</div>}

      {/* Pestañas */}
      <div className="pv-tabs">
        {[['marcas', 'Marcas'], ['entrenos', 'Entrenos'], ['carreras', 'Carreras'], ['tecnica', 'Técnica']].map(([k, l]) => (
          <button key={k} className={pestana === k ? 'active' : ''} onClick={() => setPestana(k)}>{l}</button>
        ))}
      </div>

      {pestana === 'marcas' && (
        Object.keys(marcas).length === 0 && Object.keys(marcasEntreno).length === 0 ? (
          <div className="pv-vacio">
            {esPropio ? <>Añade una carrera con su certificado, o registra entrenos, y aquí aparecerán tus mejores tiempos en cada ejercicio.{anadir}</> : 'Todavía no tiene carreras verificadas ni entrenos visibles.'}
          </div>
        ) : (
          <div className="marcas">
            {ESTACIONES.map((e, i) => {
              const m = marcas[e] || marcasEntreno[e]
              const deEntreno = !marcas[e] && marcasEntreno[e]
              return (
                <div key={e} className={`marca ${m ? '' : 'vacia'} ${deEntreno ? 'entreno-marca' : ''}`}>
                  <span className="marca-num">{String(i + 1).padStart(2, '0')}</span>
                  <span className="marca-nombre">{e}</span>
                  {deEntreno && <span className="marca-origen">Entreno</span>}
                  <span className="marca-tiempo">{m ? formatoParcial(m.seg) : '—'}</span>
                </div>
              )
            })}
            {(marcas.Running || marcasEntreno.Running) && (
              <div className={`marca running ${marcas.Running ? '' : 'entreno-marca'}`}>
                <span className="marca-nombre">Running · 8 km</span>
                {!marcas.Running && <span className="marca-origen">Entreno</span>}
                <span className="marca-tiempo">{formatoParcial((marcas.Running || marcasEntreno.Running).seg)}</span>
              </div>
            )}
            <div className="pv-nota">{hayEntreno
              ? <>En blanco, tiempos de carreras verificadas. Con la etiqueta <span className="marca-origen">Entreno</span>, tiempos de entrenamiento apuntados por {esPropio ? 'ti' : 'el atleta'}, sin verificar.</>
              : <>Mejores tiempos de {esPropio ? 'tus' : 'sus'} carreras verificadas.</>}</div>
          </div>
        )
      )}

      {pestana === 'entrenos' && (
        entrenos.length === 0
          ? <div className="pv-vacio">{esPropio ? 'Aún no has registrado entrenos. Hazlo desde la pestaña Entrenos de abajo.' : 'No tiene entrenos que puedas ver.'}</div>
          : <div className="lista">{entrenos.map(e => <EntrenoFila key={e.id} e={e} propio={esPropio} onCambio={recargarEntrenos} />)}</div>
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
