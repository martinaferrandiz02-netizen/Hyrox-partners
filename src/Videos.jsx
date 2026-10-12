import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'



// Carga los vídeos de un usuario desde Supabase
function useVideos(autor) {
  const [videos, setVideos] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let activo = true
    supabase
      .from('videos')
      .select('*')
      .eq('autor', autor)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!activo) return
        if (!error && data) setVideos(data)
        setCargando(false)
      })
    return () => { activo = false }
  }, [autor])

  return { videos, setVideos, cargando }
}

// Formato corto: 1.234 → 1,2K
function formatoVistas(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.0', '') + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'K'
  return String(n)
}

function VideoCard({ v, onVista }) {
  const contada = useRef(false)

  // Cuenta una visualización la primera vez que se reproduce
  const alReproducir = async () => {
    if (contada.current) return
    contada.current = true
    const { data, error } = await supabase.rpc('sumar_visualizacion', { video_id: v.id })
    if (!error && typeof data === 'number') onVista(v.id, data)
  }

  return (
    <div className="video-card">
      <video src={v.url} controls playsInline preload="metadata" onPlay={alReproducir} />
      <div className="video-meta">
        <span className="video-ex">{v.ejercicio}</span>
        {v.tiempo && <span className="video-time">⏱ {v.tiempo}</span>}
      </div>
      <div className="video-views">👁 {formatoVistas(v.visualizaciones || 0)} visualizaciones</div>
    </div>
  )
}

// Vídeos de otra persona (solo lectura), en su perfil
export function VideosDe({ autor }) {
  const { videos, setVideos, cargando } = useVideos(autor)
  const actualizarVistas = (id, total) =>
    setVideos(prev => prev.map(x => x.id === id ? { ...x, visualizaciones: total } : x))
  return (
    <div className="videos-block">
      <div className="section-label">Su técnica</div>
      {cargando ? (
        <div className="video-empty">Cargando vídeos…</div>
      ) : videos.length === 0 ? (
        <div className="video-empty">{autor.split(' ')[0]} todavía no ha subido vídeos.</div>
      ) : (
        <div className="video-grid">{videos.map(v => <VideoCard key={v.id} v={v} onVista={actualizarVistas} />)}</div>
      )}
    </div>
  )
}

// Vídeos propios con subida
// Las 8 estaciones en orden de carrera
const ESTACIONES = [
  { nombre: 'Ski erg', detalle: '1000 m' },
  { nombre: 'Sled push', detalle: '50 m' },
  { nombre: 'Sled pull', detalle: '50 m' },
  { nombre: 'Burpee broad jumps', detalle: '80 m' },
  { nombre: 'Rowing', detalle: '1000 m' },
  { nombre: 'Farmer carry', detalle: '200 m' },
  { nombre: 'Sandbag lunges', detalle: '100 m' },
  { nombre: 'Wall balls', detalle: '100 reps' },
]

// Demo: el vídeo se muestra en el momento (no se sube a ningún sitio)
function EstacionDemo({ ej, numero }) {
  const [video, setVideo] = useState(null)
  const elegir = (e) => {
    const f = e.target.files?.[0]
    if (f) setVideo(URL.createObjectURL(f))
    e.target.value = ''
  }
  return (
    <div className="estacion">
      <div className="estacion-cabecera">
        <span className="estacion-num">{numero}</span>
        <span className="estacion-nombre">{ej.nombre}</span>
        <span className="estacion-detalle">{ej.detalle}</span>
      </div>
      {video && (
        <div className="video-grid">
          <div className="video-card">
            <video src={video} controls playsInline preload="metadata" />
            <div className="video-meta"><span className="video-ex">{ej.nombre}</span></div>
            <div className="video-views"><span>👁 0 visualizaciones</span><button className="video-borrar" onClick={() => setVideo(null)}>Borrar</button></div>
          </div>
        </div>
      )}
      <div className="estacion-botones">
        <label className="estacion-btn">
          <input type="file" accept="video/*" capture="environment" onChange={elegir} />
          🎥 Grabar
        </label>
        <label className="estacion-btn">
          <input type="file" accept="video/*" onChange={elegir} />
          🖼 Subir de galería
        </label>
      </div>
    </div>
  )
}

export function MisVideos() {
  return (
    <div className="videos-block">
      <div className="section-header">
        <div className="section-label">Mi técnica</div>
        <span className="estacion-detalle">8 ejercicios</span>
      </div>
      <div className="video-empty">Graba o sube tu técnica en cada ejercicio. Otros atletas la verán en tu perfil y, si aún no has competido, sirve para demostrar tus tiempos.</div>
      {ESTACIONES.map((ej, i) => <EstacionDemo key={ej.nombre} ej={ej} numero={i + 1} />)}
    </div>
  )
}
