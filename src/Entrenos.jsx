import { useState } from 'react'
import { ChevronDown, Globe, Lock, Plus, Users, Watch } from 'lucide-react'
import { formatoParcial } from './certificado'
import { borrarEntreno, cambiarVisibilidad, casillasASegundos, guardarEntreno, mejoresDeEntrenos, nombreVisibilidad, TIPOS_ENTRENO, useEntrenos, VISIBILIDADES } from './entrenos'
import { ESTACIONES } from './resultados'
import { Volver } from './Volver'
import { TiempoInput } from './TiempoInput'

const ICONO_VIS = { publico: Globe, amigos: Users, privado: Lock }
const ORDEN = [...ESTACIONES, 'Running']
const fechaEntreno = (f) => new Date(f + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
const hoyISO = () => new Date().toISOString().slice(0, 10)

// Una fila de entreno, desplegable. La usan la pantalla Entrenos y el perfil.
export function EntrenoFila({ e, propio, onCambio }) {
  const [abierto, setAbierto] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const Vis = ICONO_VIS[e.visibilidad]
  const parciales = ORDEN.filter(k => e.parciales?.[k])

  const visibilidad = async (v) => {
    if (v === e.visibilidad) return
    setOcupado(true)
    if (await cambiarVisibilidad(e.id, v)) await onCambio?.()
    setOcupado(false)
  }
  const borrar = async () => {
    if (!window.confirm('¿Borrar este entreno?')) return
    setOcupado(true)
    if (await borrarEntreno(e.id)) await onCambio?.()
    else { window.alert('No se ha podido borrar. Inténtalo de nuevo.'); setOcupado(false) }
  }

  return (
    <div className="entreno">
      <button className="fila" onClick={() => setAbierto(a => !a)}>
        <div className="fila-cuerpo">
          <div className="fila-titulo">{e.titulo}</div>
          <div className="fila-sub">
            {fechaEntreno(e.fecha)} · {e.tipo}
            {propio && <> · <Vis size={13} /> {nombreVisibilidad(e.visibilidad)}</>}
          </div>
        </div>
        <div className="fila-valor">{e.total ? formatoParcial(e.total) : '—'}</div>
        <ChevronDown size={18} className={`fila-chevron ${abierto ? 'girado' : ''}`} />
      </button>
      {abierto && (
        <div className="entreno-detalle">
          {parciales.length > 0
            ? <div className="lectura-parciales">{parciales.map(k => <div key={k}><span>{k}</span><strong>{formatoParcial(e.parciales[k])}</strong></div>)}</div>
            : <div className="fila-sub">Sin tiempos por ejercicio.</div>}
          {e.notas && <div className="cita">{e.notas}</div>}
          {propio && (
            <div className="entreno-acciones">
              <div className="chips">
                {VISIBILIDADES.map(([v, nombre]) => {
                  const I = ICONO_VIS[v]
                  return <button key={v} disabled={ocupado} className={e.visibilidad === v ? 'chip active' : 'chip'} onClick={() => visibilidad(v)}><I size={13} /> {nombre}</button>
                })}
              </div>
              <button className="video-borrar" disabled={ocupado} onClick={borrar}>Borrar</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function NuevoEntreno({ yoId, cerrar, guardado }) {
  const [f, setF] = useState({ titulo: '', fecha: hoyISO(), tipo: 'Simulación', total: {}, notas: '', visibilidad: 'publico' })
  const [tiempos, setTiempos] = useState({})
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const set = (k, v) => setF(x => ({ ...x, [k]: v }))

  const guardar = async (ev) => {
    ev.preventDefault()
    if (f.titulo.trim().length < 2) { setError('Ponle un nombre al entreno.'); return }
    const total = casillasASegundos(f.total)
    if (Number.isNaN(total)) { setError('Revisa el tiempo total: los minutos y segundos van de 0 a 59.'); return }
    const parciales = {}
    for (const k of ORDEN) {
      const s = casillasASegundos(tiempos[k])
      if (Number.isNaN(s)) { setError(`Revisa el tiempo de ${k}: los segundos van de 0 a 59.`); return }
      if (s) parciales[k] = s
    }
    if (!total && Object.keys(parciales).length === 0) { setError('Añade al menos el tiempo total o el de un ejercicio.'); return }
    setGuardando(true)
    const err = await guardarEntreno(yoId, { titulo: f.titulo.trim(), fecha: f.fecha, tipo: f.tipo, total, parciales, notas: f.notas.trim() || null, visibilidad: f.visibilidad })
    setGuardando(false)
    if (err) { setError('No se ha podido guardar. Inténtalo de nuevo.'); return }
    guardado()
  }

  return (
    <form className="screen" onSubmit={guardar}>
      <Volver onClick={cerrar} />
      <div className="screen-title">Nuevo entreno</div>
      <div className="screen-sub">Apunta tus tiempos y elige quién puede verlos.</div>
      <div className="perfil-form">
        <label>Nombre<input value={f.titulo} onChange={e => set('titulo', e.target.value)} placeholder="Ej. Simulación en el box" maxLength={80} /></label>
        <label>Fecha<input type="date" value={f.fecha} max={hoyISO()} onChange={e => set('fecha', e.target.value)} /></label>
        <div className="form-grupo">
          <div className="filtro-titulo">Tipo</div>
          <div className="chips">{TIPOS_ENTRENO.map(t => <button type="button" key={t} className={f.tipo === t ? 'chip active' : 'chip'} onClick={() => set('tipo', t)}>{t}</button>)}</div>
        </div>
        <div className="form-grupo">
          <div className="filtro-titulo">Tiempo total <span className="opcional">(opcional)</span></div>
          <TiempoInput horas etiqueta="Tiempo total" valor={f.total} onChange={v => set('total', v)} />
        </div>

        <div className="form-grupo">
          <div className="filtro-titulo">Tiempos por ejercicio <span className="opcional">(opcional)</span></div>
          <div className="tiempos">
            {ORDEN.map((k, i) => (
              <div className="tiempo-fila" key={k}>
                <span className="marca-num">{k === 'Running' ? '' : String(i + 1).padStart(2, '0')}</span>
                <span className="marca-nombre">{k === 'Running' ? 'Running total' : k}</span>
                <TiempoInput horas={k === 'Running'} etiqueta={k} valor={tiempos[k]} onChange={v => setTiempos(t => ({ ...t, [k]: v }))} />
              </div>
            ))}
          </div>
        </div>

        <label>Notas <span>(opcional)</span><textarea value={f.notas} onChange={e => set('notas', e.target.value)} placeholder="Sensaciones, pesos, ritmo…" maxLength={500} /></label>

        <div className="form-grupo">
          <div className="filtro-titulo">¿Quién lo ve?</div>
          <div className="vis-opciones">
            {VISIBILIDADES.map(([v, nombre, desc]) => {
              const I = ICONO_VIS[v]
              return (
                <button type="button" key={v} className={f.visibilidad === v ? 'vis-opcion active' : 'vis-opcion'} onClick={() => set('visibilidad', v)}>
                  <I size={20} />
                  <span className="fila-cuerpo"><span className="fila-titulo">{nombre}</span><span className="fila-sub">{desc}</span></span>
                  <span className="vis-radio" />
                </button>
              )
            })}
          </div>
        </div>

        {error && <div className="cert-estado error">{error}</div>}
        <button className="btn-match btn-block" type="submit" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar entreno'}</button>
      </div>
    </form>
  )
}

export function Entrenos({ yoId }) {
  const { entrenos, cargando, recargar } = useEntrenos(yoId)
  const [nuevo, setNuevo] = useState(false)
  if (nuevo) return <NuevoEntreno yoId={yoId} cerrar={() => setNuevo(false)} guardado={async () => { await recargar(); setNuevo(false) }} />

  const mes = new Date().toISOString().slice(0, 7)
  const esteMes = entrenos.filter(e => e.fecha.startsWith(mes)).length
  const simulaciones = entrenos.filter(e => e.tipo === 'Simulación' && e.total).map(e => e.total)
  const mejorSim = simulaciones.length ? Math.min(...simulaciones) : null
  const mejores = mejoresDeEntrenos(entrenos)

  return (
    <div className="screen">
      <div className="screen-title">Entrenos</div>
      <div className="screen-sub">Registra tus entrenos y elige quién los ve.</div>
      <button className="btn-match btn-block" onClick={() => setNuevo(true)}><Plus size={18} /> Registrar entreno</button>

      {entrenos.length > 0 && (
        <div className="stats">
          <div><strong>{entrenos.length}</strong><span>Entrenos</span></div>
          <div><strong>{esteMes}</strong><span>Este mes</span></div>
          <div><strong className={mejorSim ? 'acento' : ''}>{mejorSim ? formatoParcial(mejorSim) : '—'}</strong><span>Mejor simulación</span></div>
        </div>
      )}

      <div className="section-label">Tus entrenos</div>
      {cargando && <div className="pv-vacio">Cargando…</div>}
      {!cargando && entrenos.length === 0 && (
        <div className="pareja-vacia">Aún no has registrado entrenos. Apunta tus tiempos de cada ejercicio: si todavía no has competido, es lo que verán otros atletas en tu perfil.</div>
      )}
      <div className="lista">{entrenos.map(e => <EntrenoFila key={e.id} e={e} propio onCambio={recargar} />)}</div>

      {Object.keys(mejores).length > 0 && (
        <>
          <div className="section-label">Tus mejores tiempos entrenando</div>
          <div className="marcas">
            {ORDEN.filter(k => mejores[k]).map(k => (
              <div key={k} className="marca">
                <span className="marca-nombre">{k === 'Running' ? 'Running total' : k}</span>
                <span className="marca-tiempo">{formatoParcial(mejores[k].seg)}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="pronto-mini">
        <Watch size={16} />
        <span><strong>Próximamente:</strong> sincroniza Garmin y Apple Watch y lanza retos a tu pareja.</span>
      </div>
    </div>
  )
}
