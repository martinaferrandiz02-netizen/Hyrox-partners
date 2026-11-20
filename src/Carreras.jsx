import { useState } from 'react'
import { CalendarClock, Check, ChevronRight, MapPin, Search, Trash2, Upload, Users } from 'lucide-react'
import { anadirProxima, cambiarBuscaPareja, carrerasDelCalendario, hoyISO, quitarProxima, rangoFechas } from './datosCarreras'
import { Volver } from './Volver'

// Buscador de carreras del calendario. "elegida" = { evento, carrera, fecha }
export function SelectorCarrera({ cuando, elegida, onElegir, sugeridas = [] }) {
  const [texto, setTexto] = useState('')
  const [otra, setOtra] = useState(false)
  const [nombre, setNombre] = useState('')
  const [fecha, setFecha] = useState('')
  const lista = carrerasDelCalendario(cuando, texto).slice(0, texto ? 40 : 12)
  const elegirOtra = (n, f) => onElegir(n.trim().length >= 2 && f ? { evento: null, carrera: n.trim(), fecha: f } : null)

  if (elegida && !otra) {
    return (
      <div className="carrera-elegida">
        <div className="fila-cuerpo">
          <div className="fila-titulo">{elegida.carrera}</div>
          <div className="fila-sub">{elegida.rango || rangoFechas(elegida.fecha)}</div>
        </div>
        <button type="button" className="link-btn" onClick={() => onElegir(null)}>Cambiar</button>
      </div>
    )
  }
  return (
    <div className="selector-carrera">
      {sugeridas.length > 0 && !otra && (
        <div className="lista sugeridas">
          {sugeridas.map(s => (
            <button type="button" key={s.id} className="fila" onClick={() => onElegir({ evento: s.evento, carrera: s.carrera, fecha: s.fecha, rango: rangoFechas(s.fecha) })}>
              <CalendarClock size={18} className="fila-icono" />
              <div className="fila-cuerpo"><div className="fila-titulo">{s.carrera}</div><div className="fila-sub">La tenías apuntada · {rangoFechas(s.fecha)}</div></div>
              <ChevronRight size={18} className="fila-chevron" />
            </button>
          ))}
        </div>
      )}
      {!otra ? (
        <>
          <label className="campo-busqueda">
            <Search size={18} />
            <input className="buscador-input" value={texto} onChange={e => setTexto(e.target.value)} placeholder="Busca la ciudad" />
          </label>
          <div className="lista">
            {lista.map(e => (
              <button type="button" key={e.id} className="fila" onClick={() => onElegir({ evento: e.id, carrera: e.nombre, fecha: e.inicio, rango: rangoFechas(e.inicio, e.fin) })}>
                <div className="fila-cuerpo"><div className="fila-titulo">{e.nombre}</div><div className="fila-sub"><MapPin size={13} /> {e.pais} · {rangoFechas(e.inicio, e.fin)}</div></div>
                <ChevronRight size={18} className="fila-chevron" />
              </button>
            ))}
            {lista.length === 0 && <div className="pareja-vacia">No encontramos esa carrera.</div>}
          </div>
          <button type="button" className="link-btn apagado" style={{ marginTop: 12 }} onClick={() => { setOtra(true); onElegir(null) }}>Mi carrera no está en la lista</button>
        </>
      ) : (
        <div className="perfil-form" style={{ marginTop: 0 }}>
          <label>Nombre de la carrera<input value={nombre} onChange={e => { setNombre(e.target.value); elegirOtra(e.target.value, fecha) }} placeholder="Ej. Lisboa 2026" maxLength={80} /></label>
          <label>Fecha<input type="date" value={fecha} {...(cuando === 'pasadas' ? { max: hoyISO() } : { min: hoyISO() })} onChange={e => { setFecha(e.target.value); elegirOtra(nombre, e.target.value) }} /></label>
          <button type="button" className="link-btn apagado" onClick={() => { setOtra(false); onElegir(null) }}>Volver a la lista</button>
        </div>
      )}
    </div>
  )
}

// Apuntar una próxima carrera
export function NuevaProxima({ yoId, cerrar, guardado, titulo = 'Próxima carrera', subtitulo = '¿A qué carrera vas a ir? La verán otros atletas en tu perfil.', textoCerrar }) {
  const [elegida, setElegida] = useState(null)
  const [busca, setBusca] = useState(false)
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const guardar = async () => {
    if (!elegida) { setError('Elige la carrera.'); return }
    setGuardando(true)
    const err = await anadirProxima(yoId, { evento: elegida.evento, carrera: elegida.carrera, fecha: elegida.fecha, busca_pareja: busca })
    setGuardando(false)
    if (err) { setError(err); return }
    guardado()
  }
  return (
    <div className="screen">
      {textoCerrar ? <div className="topbar"><span /><button className="link-btn apagado" onClick={cerrar}>{textoCerrar}</button></div> : <Volver onClick={cerrar} />}
      <div className="screen-title">{titulo}</div>
      <div className="screen-sub">{subtitulo}</div>
      <SelectorCarrera cuando="futuras" elegida={elegida} onElegir={setElegida} />
      {elegida && (
        <>
          <button type="button" className={`vis-opcion ${busca ? 'active' : ''}`} style={{ marginTop: 18, width: '100%' }} onClick={() => setBusca(b => !b)}>
            <Users size={20} />
            <span className="fila-cuerpo"><span className="fila-titulo">Busco pareja para esta carrera</span><span className="fila-sub">Te destacamos a quien busca pareja para la misma</span></span>
            <span className="vis-radio" />
          </button>
          {error && <div className="cert-estado error" style={{ marginTop: 12 }}>{error}</div>}
          <button className="btn-match btn-block" style={{ marginTop: 18 }} disabled={guardando} onClick={guardar}>{guardando ? 'Guardando…' : 'Apuntar carrera'}</button>
        </>
      )}
    </div>
  )
}

// Fila de una próxima carrera (en el perfil)
export function ProximaFila({ p, propio, onCambio, onSubirCertificado }) {
  const [ocupado, setOcupado] = useState(false)
  const pasada = p.fecha < hoyISO()
  const accion = async (fn) => { setOcupado(true); if (await fn()) await onCambio?.(); setOcupado(false) }
  return (
    <div className="proxima">
      <div className="fila">
        <CalendarClock size={20} className="fila-icono" />
        <div className="fila-cuerpo">
          <div className="fila-titulo">{p.carrera}</div>
          <div className="fila-sub">{rangoFechas(p.fecha)}{p.busca_pareja && <> · <span className="busca-pareja">Busca pareja</span></>}</div>
        </div>
        {propio && !pasada && (
          <button className="icon-btn" disabled={ocupado} aria-label="Quitar" onClick={() => window.confirm('¿Quitar esta carrera de tus próximas?') && accion(() => quitarProxima(p.id))}><Trash2 size={17} /></button>
        )}
      </div>
      {propio && (
        <div className="proxima-acciones">
          {pasada
            ? <button className="btn-match btn-sm" onClick={() => onSubirCertificado?.(p)}><Upload size={16} /> ¿Ya la has hecho? Sube el certificado</button>
            : <button className={`chip ${p.busca_pareja ? 'active' : ''}`} disabled={ocupado} onClick={() => accion(() => cambiarBuscaPareja(p.id, !p.busca_pareja))}>{p.busca_pareja && <Check size={13} />} Busco pareja</button>}
        </div>
      )}
    </div>
  )
}
