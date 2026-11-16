import { useState } from 'react'
import { ChevronDown, Dumbbell, Footprints, Globe, Lock, Plus, Users, Watch } from 'lucide-react'
import { formatoParcial } from './certificado'
import { borrarEntreno, cambiarVisibilidad, casillasASegundos, formatoKm, formatoMetros, guardarEntreno, mejoresDeEntrenos, nombreVisibilidad, TRAMOS_RUNNING, useEntrenos, VISIBILIDADES } from './entrenos'
import { ESTACIONES } from './resultados'
import { Volver } from './Volver'
import { TiempoInput } from './TiempoInput'

const ICONO_VIS = { publico: Globe, amigos: Users, privado: Lock }
const ORDEN = [...ESTACIONES, 'Running']
const fechaEntreno = (f) => new Date(f + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
const hoyISO = () => new Date().toISOString().slice(0, 10)
const ritmo = (seg, metros) => (seg && metros ? `${formatoParcial(Math.round(seg / (metros / 1000)))} /km` : null)

// Una fila de entreno, desplegable. La usan la pantalla Entrenos y el perfil.
export function EntrenoFila({ e, propio, onCambio }) {
  const [abierto, setAbierto] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const Vis = ICONO_VIS[e.visibilidad]
  const p = e.parciales || {}
  const esRunning = e.tipo === 'Running'
  const tramos = esRunning ? (p.tramos || []) : []
  const parciales = esRunning ? [] : ORDEN.filter(k => typeof p[k] === 'number')

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
            {fechaEntreno(e.fecha)} · {esRunning && p.distancia ? formatoKm(p.distancia) : e.tipo}
            {propio && <> · <Vis size={13} /> {nombreVisibilidad(e.visibilidad)}</>}
          </div>
        </div>
        <div className="fila-valor">{e.total ? formatoParcial(e.total) : '—'}</div>
        <ChevronDown size={18} className={`fila-chevron ${abierto ? 'girado' : ''}`} />
      </button>
      {abierto && (
        <div className="entreno-detalle">
          {esRunning && tramos.length > 0 && (
            <div className="tramos-detalle">
              {tramos.map((t, i) => (
                <div key={i}><span>{String(i + 1).padStart(2, '0')}</span><span>{formatoMetros(t.m)}</span><strong>{formatoParcial(t.s)}</strong><em>{ritmo(t.s, t.m)}</em></div>
              ))}
              <div className="tramos-total"><span>Total</span><span>{formatoKm(p.distancia)}</span><strong>{formatoParcial(e.total)}</strong><em>{ritmo(e.total, p.distancia)}</em></div>
            </div>
          )}
          {!esRunning && (parciales.length > 0
            ? <div className="lectura-parciales">{parciales.map(k => <div key={k}><span>{k}</span><strong>{formatoParcial(p[k])}</strong></div>)}</div>
            : <div className="fila-sub">Sin tiempos por ejercicio.</div>)}
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

const TRAMOS_VACIOS = Array.from({ length: TRAMOS_RUNNING }, () => ({ m: '', t: {} }))

function NuevoEntreno({ yoId, cerrar, guardado }) {
  const [f, setF] = useState({ titulo: '', fecha: hoyISO(), tipo: 'Estaciones', notas: '', visibilidad: 'publico' })
  const [tiempos, setTiempos] = useState({})
  const [tramos, setTramos] = useState(TRAMOS_VACIOS)
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const set = (k, v) => setF(x => ({ ...x, [k]: v }))
  const setTramo = (i, campo, v) => setTramos(ts => ts.map((t, j) => (j === i ? { ...t, [campo]: v } : t)))

  // Totales automáticos (se ignoran las filas vacías o incompletas)
  const segEstaciones = ESTACIONES.map(k => casillasASegundos(tiempos[k])).filter(s => s > 0)
  const totalEstaciones = segEstaciones.reduce((a, b) => a + b, 0)
  const tramosOk = tramos.map(t => ({ m: Number(t.m) || 0, s: casillasASegundos(t.t) })).filter(t => t.m > 0 && t.s > 0)
  const totalMetros = tramosOk.reduce((a, t) => a + t.m, 0)
  const totalRunning = tramosOk.reduce((a, t) => a + t.s, 0)
  const incompletas = tramos.map(t => [Number(t.m) > 0, casillasASegundos(t.t) > 0]).filter(([m, s]) => m !== s).length

  const guardar = async (ev) => {
    ev.preventDefault()
    if (f.titulo.trim().length < 2) { setError('Ponle un nombre al entreno.'); return }
    let datos
    if (f.tipo === 'Estaciones') {
      const parciales = {}
      for (const k of ESTACIONES) {
        const s = casillasASegundos(tiempos[k])
        if (Number.isNaN(s)) { setError(`Revisa el tiempo de ${k}: los segundos van de 0 a 59.`); return }
        if (s) parciales[k] = s
      }
      if (!Object.keys(parciales).length) { setError('Añade el tiempo de al menos un ejercicio.'); return }
      datos = { parciales, total: totalEstaciones }
    } else {
      const lista = []
      for (let i = 0; i < tramos.length; i++) {
        const t = tramos[i]
        const m = Number(t.m) || 0
        const s = casillasASegundos(t.t)
        if (!m && !s) continue
        if (Number.isNaN(s)) { setError(`Revisa el tiempo de la fila ${i + 1}: los segundos van de 0 a 59.`); return }
        if (!m) { setError(`En la fila ${i + 1} faltan los metros.`); return }
        if (!s) { setError(`En la fila ${i + 1} falta el tiempo.`); return }
        lista.push({ m, s })
      }
      if (!lista.length) { setError('Añade al menos una fila con metros y tiempo.'); return }
      datos = { parciales: { tramos: lista, distancia: totalMetros }, total: totalRunning }
    }
    setGuardando(true)
    const err = await guardarEntreno(yoId, { titulo: f.titulo.trim(), fecha: f.fecha, tipo: f.tipo, ...datos, notas: f.notas.trim() || null, visibilidad: f.visibilidad })
    setGuardando(false)
    if (err) { setError('No se ha podido guardar. Inténtalo de nuevo.'); return }
    guardado()
  }

  return (
    <form className="screen" onSubmit={guardar}>
      <Volver onClick={cerrar} />
      <div className="screen-title">Nuevo entreno</div>
      <div className="screen-sub">Rellena solo lo que hayas hecho. El total se calcula solo.</div>
      <div className="perfil-form">
        <label>Nombre<input value={f.titulo} onChange={e => set('titulo', e.target.value)} placeholder={f.tipo === 'Running' ? 'Ej. Series de 1 km' : 'Ej. Sled y wall balls'} maxLength={80} /></label>
        <label>Fecha<input type="date" value={f.fecha} max={hoyISO()} onChange={e => set('fecha', e.target.value)} /></label>

        <div className="tipo-entreno">
          <button type="button" className={f.tipo === 'Estaciones' ? 'active' : ''} onClick={() => { set('tipo', 'Estaciones'); setError('') }}><Dumbbell size={20} /> Estaciones</button>
          <button type="button" className={f.tipo === 'Running' ? 'active' : ''} onClick={() => { set('tipo', 'Running'); setError('') }}><Footprints size={20} /> Running</button>
        </div>

        {f.tipo === 'Estaciones' ? (
          <div className="form-grupo">
            <div className="tiempos">
              {ESTACIONES.map((k, i) => (
                <div className="tiempo-fila" key={k}>
                  <span className="marca-num">{String(i + 1).padStart(2, '0')}</span>
                  <span className="marca-nombre">{k}</span>
                  <TiempoInput etiqueta={k} valor={tiempos[k]} onChange={v => setTiempos(t => ({ ...t, [k]: v }))} />
                </div>
              ))}
            </div>
            <div className="total-auto"><span>Total</span><strong>{totalEstaciones ? formatoParcial(totalEstaciones) : '—'}</strong></div>
          </div>
        ) : (
          <div className="form-grupo">
            <div className="tiempos">
              {tramos.map((t, i) => (
                <div className="tiempo-fila" key={i}>
                  <span className="marca-num">{String(i + 1).padStart(2, '0')}</span>
                  <span className="metros-input">
                    <input inputMode="numeric" pattern="[0-9]*" autoComplete="off" aria-label={`Fila ${i + 1} metros`}
                      value={t.m} placeholder="0" onChange={e => setTramo(i, 'm', e.target.value.replace(/\D/g, '').slice(0, 5))} />
                    <i>m</i>
                  </span>
                  <TiempoInput etiqueta={`Fila ${i + 1}`} valor={t.t} onChange={v => setTramo(i, 't', v)} />
                </div>
              ))}
            </div>
            <div className="total-auto">
              <span>Total</span>
              <span className="total-auto-km">{totalMetros ? formatoKm(totalMetros) : ''}{totalMetros && totalRunning ? ` · ${ritmo(totalRunning, totalMetros)}` : ''}</span>
              <strong>{totalRunning ? formatoParcial(totalRunning) : '—'}</strong>
            </div>
            {incompletas > 0 && <div className="total-aviso">Para que una fila cuente en el total, rellena los metros y el tiempo.</div>}
          </div>
        )}

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
  const kmMes = entrenos.filter(e => e.tipo === 'Running' && e.fecha.startsWith(mes)).reduce((a, e) => a + (e.parciales?.distancia || 0), 0)
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
          <div><strong className={kmMes ? 'acento' : ''}>{kmMes ? formatoKm(kmMes) : '—'}</strong><span>Km este mes</span></div>
        </div>
      )}

      <div className="section-label">Tus entrenos</div>
      {cargando && <div className="pv-vacio">Cargando…</div>}
      {!cargando && entrenos.length === 0 && (
        <div className="pareja-vacia">Aún no has registrado entrenos. Apunta tus tiempos: si todavía no has competido, es lo que verán otros atletas en tu perfil.</div>
      )}
      <div className="lista">{entrenos.map(e => <EntrenoFila key={e.id} e={e} propio onCambio={recargar} />)}</div>

      {Object.keys(mejores).length > 0 && (
        <>
          <div className="section-label">Tus mejores tiempos entrenando</div>
          <div className="marcas">
            {ORDEN.filter(k => mejores[k]).map(k => (
              <div key={k} className="marca">
                <span className="marca-nombre">{k === 'Running' ? 'Running · 8 km' : k}</span>
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
