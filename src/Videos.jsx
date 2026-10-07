import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'

const EJERCICIOS = [
  'Ski erg', 'Sled push', 'Sled pull', 'Burpee broad jumps',
  'Rowing', 'Farmer carry', 'Sandbag lunges', 'Wall balls', 'Running',
]

const BUCKET = 'videos'
const MAX_MB = 50

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
export function MisVideos({ autor }) {
  const { videos, setVideos, cargando } = useVideos(autor)
  const [abierto, setAbierto] = useState(false)
  const [archivo, setArchivo] = useState(null)
  const [ejercicio, setEjercicio] = useState(EJERCICIOS[0])
  const [tiempo, setTiempo] = useState('')
  const [estado, setEstado] = useState('')
  const inputRef = useRef(null)

  const actualizarVistas = (id, total) =>
    setVideos(prev => prev.map(x => x.id === id ? { ...x, visualizaciones: total } : x))

  const reset = () => {
    setArchivo(null); setTiempo(''); setEstado(''); setAbierto(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  const elegirArchivo = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > MAX_MB * 1024 * 1024) {
      setEstado(`El vídeo pesa más de ${MAX_MB} MB. Prueba con un clip más corto.`)
      return
    }
    setEstado('')
    setArchivo(f)
  }

  const subir = async () => {
    if (!archivo) return
    setEstado('Subiendo…')
    const ext = archivo.name.split('.').pop() || 'mp4'
    const ruta = `${autor.replace(/\W+/g, '-').toLowerCase()}/${Date.now()}.${ext}`

    const { error: errSubida } = await supabase.storage.from(BUCKET).upload(ruta, archivo, { contentType: archivo.type })
    if (errSubida) {
      setEstado('No se ha podido subir el vídeo. Inténtalo de nuevo más tarde.')
      return
    }
    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(ruta)
    const fila = { autor, ejercicio, tiempo: tiempo.trim() || null, url: pub.publicUrl }
    const { data, error } = await supabase.from('videos').insert(fila).select().single()
    if (error) {
      setEstado('El vídeo se ha subido pero no se ha podido guardar. Inténtalo de nuevo.')
      return
    }
    setVideos(prev => [data, ...prev])
    reset()
  }

  return (
    <div className="videos-block">
      <div className="section-header">
        <div className="section-label">Mi técnica</div>
        {!abierto && <button className="link-btn" onClick={() => setAbierto(true)}>+ Subir vídeo</button>}
      </div>

      {abierto && (
        <div className="card upload-card">
          <label className="upload-drop">
            <input ref={inputRef} type="file" accept="video/*" onChange={elegirArchivo} />
            {archivo ? <span>🎬 {archivo.name}</span> : <span>Elige un vídeo (máx. {MAX_MB} MB)</span>}
          </label>
          <div className="upload-row">
            <select value={ejercicio} onChange={e => setEjercicio(e.target.value)}>
              {EJERCICIOS.map(x => <option key={x}>{x}</option>)}
            </select>
            <input value={tiempo} onChange={e => setTiempo(e.target.value)} placeholder="Tiempo (ej. 4:12)" />
          </div>
          {estado && <div className="upload-status">{estado}</div>}
          <div className="upload-actions">
            <button className="btn-secondary" onClick={reset}>Cancelar</button>
            <button className="btn-primary" disabled={!archivo || estado === 'Subiendo…'} onClick={subir}>Publicar</button>
          </div>
        </div>
      )}

      {cargando ? (
        <div className="video-empty">Cargando vídeos…</div>
      ) : videos.length === 0 && !abierto ? (
        <div className="video-empty">
          Sube un vídeo de tus ejercicios: tus compañeros verán tu técnica y, si aún no has competido, servirá para demostrar tus tiempos.
        </div>
      ) : (
        <div className="video-grid">{videos.map(v => <VideoCard key={v.id} v={v} onVista={actualizarVistas} />)}</div>
      )}
    </div>
  )
}
