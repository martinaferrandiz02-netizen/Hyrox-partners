import { useEffect, useState } from 'react'
import { EtiquetaNivel } from './EtiquetaNivel'
import { ArrowUpRight, CalendarPlus, Check, ChevronRight, CircleX, Globe, Hourglass, Lock, MapPin, Plus, Settings, Upload, UserCheck, UserPlus, Users } from 'lucide-react'
import { Avatar } from './Avatar'
import { supabase } from './supabase'
import { nombreCiudad } from './ciudades'
import { borrarResultado, ESTACIONES, mejoresMarcas, useResultados } from './resultados'
import { MisVideos, VideosDe } from './Videos'
import { EntrenoFila } from './Entrenos'
import { listaSeguimientos, mejoresDeEntrenos, useContadores, useEntrenos, useSeguir } from './datosEntrenos'
import { Volver } from './Volver'
import { ProximaFila } from './Carreras'
import { cambiarVisibilidadCarrera, useProximas } from './datosCarreras'
import { aSegundos, formatoParcial } from './certificado'

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

// El certificado es privado: solo su dueño (y la administración) recibe un enlace temporal para abrirlo
function useEnlacesCertificado(resultados) {
  const [enlaces, setEnlaces] = useState({})
  const clave = resultados.map(r => r.id).join(',')
  useEffect(() => {
    const conArchivo = resultados.filter(r => r.certificado_ruta)
    if (!conArchivo.length) return
    let vivo = true
    const demo = conArchivo.filter(r => r.certificado_ruta.startsWith('demo/'))   // certificado de ejemplo de la cuenta de prueba
    const reales = conArchivo.filter(r => !r.certificado_ruta.startsWith('demo/'))
    const base = Object.fromEntries(demo.map(r => [r.id, r.certificado_url]))
    if (!reales.length) { const t = setTimeout(() => vivo && setEnlaces(base), 0); return () => { vivo = false; clearTimeout(t) } }
    supabase.storage.from('certificados').createSignedUrls(reales.map(r => r.certificado_ruta), 3600).then(({ data }) => {
      if (!vivo) return
      const porRuta = Object.fromEntries((data || []).filter(d => d.signedUrl).map(d => [d.path, d.signedUrl]))
      setEnlaces({ ...base, ...Object.fromEntries(reales.filter(r => porRuta[r.certificado_ruta]).map(r => [r.id, porRuta[r.certificado_ruta]])) })
    })
    return () => { vivo = false }
  }, [clave]) // eslint-disable-line react-hooks/exhaustive-deps
  return enlaces
}

export function PerfilVista({ perfil, esPropio, verCertificados = false, yoId, color = 'yellow', acciones, onEditar, onAnadirCarrera, onAnadirProxima, onAjustes, onCambio, onAbrirPerfil }) {
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
  const { proximas, recargar: recargarProximas } = useProximas(perfil.id)
  const proximasVisibles = esPropio ? proximas : proximas.filter(p => p.fecha >= new Date().toISOString().slice(0, 10))
  const mejorId = verificadas.length ? verificadas.reduce((m, r) => (aSegundos(r.tiempo) < aSegundos(m.tiempo) ? r : m)).id : null
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
  const enlaces = useEnlacesCertificado(esPropio || verCertificados ? visibles : [])
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
        <EtiquetaNivel verificado={verificado} compitio={perfil.compitio} />
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
          {esPropio && (
            <div className="carreras-botones">
              <button className="btn-match btn-sm" onClick={() => onAnadirCarrera?.()}><Upload size={16} /> Sube una carrera</button>
              <button className="btn-secondary btn-sm" onClick={onAnadirProxima}><CalendarPlus size={16} /> Próxima carrera</button>
            </div>
          )}

          {(esPropio || proximasVisibles.length > 0) && <div className="section-label">Próximas carreras</div>}
          {esPropio && proximas.length === 0 && <div className="pareja-vacia" style={{ paddingTop: 0 }}>Apunta las carreras a las que vas a ir: otros atletas lo verán y podrán proponerte hacer pareja.</div>}
          {proximasVisibles.length > 0 && (
            <div className="lista">{proximasVisibles.map(p => <ProximaFila key={p.id} p={p} propio={esPropio} onCambio={recargarProximas} onSubirCertificado={onAnadirCarrera} />)}</div>
          )}

          <div className="section-label">Historial</div>
          {cargando && <div className="pv-vacio">Cargando…</div>}
          {!cargando && visibles.length === 0 && (
            <div className="pareja-vacia" style={{ paddingTop: 0 }}>{esPropio ? 'Sube el certificado de tus carreras y aquí tendrás tu historial. Tu mejor tiempo aparecerá destacado.' : 'Todavía no tiene carreras verificadas públicas.'}</div>
          )}
          {visibles.map(r => (
            <div key={r.id} className="carrera">
              <div className="carrera-top">
                <div style={{ minWidth: 0 }}>
                  <div className="carrera-nombre">{r.carrera}{r.id === mejorId && <span className="tag acento tag-mejor">Mejor</span>}</div>
                  <div className="carrera-sub">{[fechaCarrera(r.fecha), r.division, r.categoria].filter(Boolean).join(' · ')}</div>
                </div>
                <div>
                  <div className="carrera-tiempo">{r.tiempo}</div>
                </div>
              </div>
              <div className="carrera-pie">
                <EstadoCarrera r={r} esPropio={esPropio} />
                <span className="carrera-acciones">
                  {esPropio && (
                    <button className="vis-toggle" disabled={borrando === r.id} onClick={async () => { if (await cambiarVisibilidadCarrera(r.id, r.visibilidad === 'privado' ? 'publico' : 'privado')) await recargar() }}>
                      {r.visibilidad === 'privado' ? <><Lock size={13} /> Solo yo</> : <><Globe size={13} /> Pública</>}
                    </button>
                  )}
                  {enlaces[r.id] && <a href={enlaces[r.id]} target="_blank" rel="noopener noreferrer">Certificado <ArrowUpRight size={14} /></a>}
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
