import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'
import { crearMiniatura } from './miniatura'

// Las 8 estaciones en orden de carrera
const EJERCICIOS = [
  { nombre: 'Ski erg', detalle: '1000 m' },
  { nombre: 'Sled push', detalle: '50 m' },
  { nombre: 'Sled pull', detalle: '50 m' },
  { nombre: 'Burpee broad jumps', detalle: '80 m' },
  { nombre: 'Rowing', detalle: '1000 m' },
  { nombre: 'Farmer carry', detalle: '200 m' },
  { nombre: 'Sandbag lunges', detalle: '100 m' },
  { nombre: 'Wall balls', detalle: '100 reps' },
]

const BUCKET = 'videos'
const MAX_MB = 50

// Carga los vídeos de un usuario desde Supabase (sin id = perfil de ejemplo, sin vídeos)
function useVideos(userId) {
  const [videos, setVideos] = useState([])
  const [cargando, setCargando] = useState(Boolean(userId))

  useEffect(() => {
    if (!userId) return
    let activo = true
    supabase
      .from('videos')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!activo) return
        if (!error && data) setVideos(data)
        setCargando(false)
      })
    return () => { activo = false }
  }, [userId])

  return { videos, setVideos, cargando }
}

// Formato corto: 1.234 → 1,2K
function formatoVistas(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.0', '') + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'K'
  return String(n)
}

function VideoCard({ v, onVista, onBorrar }) {
  const contada = useRef(false)

  // Cuenta una visualización la primera vez que se reproduce
  const alReproducir = async () => {
    if (contada.current) return
    contada.current = true
    const { data, error } = await supabase.rpc('sumar_visualizacion', { video_id: v.id })
    if (!error && typeof data === 'number') onVista(v.id, data)
  }

  const [reproduciendo, setReproduciendo] = useState(false)

  return (
    <div className="video-card">
      {reproduciendo ? (
        <video src={v.url} controls autoPlay playsInline onPlay={alReproducir} />
      ) : (
        <button className="video-portada" onClick={() => setReproduciendo(true)} aria-label={`Reproducir ${v.ejercicio}`}>
          {v.poster_url
            ? <img src={v.poster_url} alt="" loading="lazy" />
            : <video src={`${v.url}#t=1`} muted playsInline preload="metadata" tabIndex={-1} />}
          <span className="video-play">▶</span>
          <span className="video-overlay">
            <span className="video-ex">{v.ejercicio}</span>
            {v.tiempo && <span className="video-time">⏱ {v.tiempo}</span>}
          </span>
        </button>
      )}
      <div className="video-views">
        <span>👁 {formatoVistas(v.visualizaciones || 0)} visualizaciones</span>
        {onBorrar && <button className="video-borrar" onClick={() => onBorrar(v)}>Borrar</button>}
      </div>
    </div>
  )
}

// Vídeos de otra persona (solo lectura), en su perfil
export function VideosDe({ userId, nombre }) {
  const { videos, setVideos, cargando } = useVideos(userId)
  const actualizarVistas = (id, total) =>
    setVideos(prev => prev.map(x => x.id === id ? { ...x, visualizaciones: total } : x))
  return (
    <div className="videos-block">
      <div className="section-label">Su técnica</div>
      {cargando ? (
        <div className="video-empty">Cargando vídeos…</div>
      ) : videos.length === 0 ? (
        <div className="video-empty">{nombre.split(' ')[0]} todavía no ha subido vídeos.</div>
      ) : (
        EJERCICIOS.filter(ej => videos.some(v => v.ejercicio === ej.nombre)).map(ej => (
          <div className="estacion" key={ej.nombre}>
            <div className="estacion-cabecera">
              <span className="estacion-nombre">{ej.nombre}</span>
              <span className="estacion-detalle">{ej.detalle}</span>
            </div>
            <div className="video-grid">{videos.filter(v => v.ejercicio === ej.nombre).map(v => <VideoCard key={v.id} v={v} onVista={actualizarVistas} />)}</div>
          </div>
        ))
      )}
    </div>
  )
}

// Una estación en "Mi técnica": su vídeo, o los botones para grabarlo o subirlo de la galería
function Estacion({ ej, numero, videos, userId, onSubido, onVista, onBorrar }) {
  const [archivo, setArchivo] = useState(null)
  const [tiempo, setTiempo] = useState('')
  const [estado, setEstado] = useState('')
  const camara = useRef(null)
  const galeria = useRef(null)

  const reset = () => {
    setArchivo(null); setTiempo(''); setEstado('')
    if (camara.current) camara.current.value = ''
    if (galeria.current) galeria.current.value = ''
  }

  const elegir = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > MAX_MB * 1024 * 1024) { setEstado(`El vídeo pesa más de ${MAX_MB} MB. Prueba con un clip más corto.`); return }
    setEstado('')
    setArchivo(f)
  }

  const subir = async () => {
    if (!archivo) return
    setEstado('Subiendo…')
    const ext = (archivo.name.split('.').pop() || 'mp4').toLowerCase()
    const ruta = `${userId}/${Date.now()}.${ext}`
    const { error: errSubida } = await supabase.storage.from(BUCKET).upload(ruta, archivo, { contentType: archivo.type || 'video/mp4' })
    if (errSubida) { setEstado('No se ha podido subir el vídeo. Inténtalo de nuevo.'); return }
    const url = supabase.storage.from(BUCKET).getPublicUrl(ruta).data.publicUrl
    // Portada: una foto del vídeo para que se vea bonito en el perfil
    let poster_url = null, poster_ruta = null
    const miniatura = await crearMiniatura(archivo)
    if (miniatura) {
      const rutaPoster = `${userId}/${Date.now()}-portada.jpg`
      const { error: errPoster } = await supabase.storage.from(BUCKET).upload(rutaPoster, miniatura, { contentType: 'image/jpeg' })
      if (!errPoster) {
        poster_ruta = rutaPoster
        poster_url = supabase.storage.from(BUCKET).getPublicUrl(rutaPoster).data.publicUrl
      }
    }
    const { data, error } = await supabase.from('videos')
      .insert({ user_id: userId, ejercicio: ej.nombre, tiempo: tiempo.trim() || null, url, ruta, poster_url, poster_ruta }).select().single()
    if (error) {
      await supabase.storage.from(BUCKET).remove([ruta, poster_ruta].filter(Boolean))
      setEstado('No se ha podido guardar el vídeo. Inténtalo de nuevo.')
      return
    }
    onSubido(data)
    reset()
  }

  return (
    <div className="estacion">
      <div className="estacion-cabecera">
        <span className="estacion-num">{numero}</span>
        <span className="estacion-nombre">{ej.nombre}</span>
        <span className="estacion-detalle">{ej.detalle}</span>
      </div>

      {videos.length > 0 && (
        <div className="video-grid">{videos.map(v => <VideoCard key={v.id} v={v} onVista={onVista} onBorrar={onBorrar} />)}</div>
      )}

      {archivo ? (
        <div className="estacion-subida">
          <div className="video-empty">🎬 {archivo.name}</div>
          <input value={tiempo} onChange={e => setTiempo(e.target.value)} placeholder="Tu tiempo (opcional, ej. 4:12)" />
          {estado && <div className="upload-status">{estado}</div>}
          <div className="upload-actions">
            <button className="btn-secondary" onClick={reset}>Cancelar</button>
            <button className="btn-primary" disabled={estado === 'Subiendo…'} onClick={subir}>Publicar</button>
          </div>
        </div>
      ) : (
        <div className="estacion-botones">
          <label className="estacion-btn">
            <input ref={camara} type="file" accept="video/*" capture="environment" onChange={elegir} />
            🎥 Grabar
          </label>
          <label className="estacion-btn">
            <input ref={galeria} type="file" accept="video/*" onChange={elegir} />
            🖼 Subir de galería
          </label>
          {estado && <div className="upload-status">{estado}</div>}
        </div>
      )}
    </div>
  )
}

// Vídeos propios: una tarjeta por cada estación
export function MisVideos({ userId }) {
  const { videos, setVideos, cargando } = useVideos(userId)

  const actualizarVistas = (id, total) =>
    setVideos(prev => prev.map(x => x.id === id ? { ...x, visualizaciones: total } : x))

  const borrar = async (v) => {
    if (!window.confirm('¿Borrar este vídeo?')) return
    const { error } = await supabase.from('videos').delete().eq('id', v.id)
    if (error) return
    await supabase.storage.from(BUCKET).remove([v.ruta, v.poster_ruta].filter(Boolean))
    setVideos(prev => prev.filter(x => x.id !== v.id))
  }

  const hechas = EJERCICIOS.filter(ej => videos.some(v => v.ejercicio === ej.nombre)).length

  return (
    <div className="videos-block">
      <div className="section-header">
        <div className="section-label">Mi técnica</div>
        <span className="estacion-detalle">{hechas}/{EJERCICIOS.length} ejercicios</span>
      </div>
      <div className="video-empty">Graba o sube tu técnica en cada ejercicio. Otros atletas la verán en tu perfil y, si aún no has competido, sirve para demostrar tus tiempos.</div>
      {cargando ? <div className="video-empty">Cargando vídeos…</div> : EJERCICIOS.map((ej, i) => (
        <Estacion key={ej.nombre} ej={ej} numero={i + 1} userId={userId}
          videos={videos.filter(v => v.ejercicio === ej.nombre)}
          onSubido={v => setVideos(prev => [v, ...prev])}
          onVista={actualizarVistas} onBorrar={borrar} />
      ))}
    </div>
  )
}
