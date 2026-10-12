import { useState } from 'react'
import { supabase } from './supabase'
import { aSegundos, comprobarCertificado, formatoParcial, formatoTiempo, huellaCertificado, leerCertificado, parcialesEnTexto } from './certificado'
import { ESTACIONES, guardarResultado } from './resultados'

const TIPOS = ['application/pdf', 'image/png', 'image/jpeg']

// Añadir una carrera nueva: sube el certificado, la app lee nombre, tiempo total y parciales
export function AnadirCarrera({ perfil, setPerfil, cerrar }) {
  const [nombreCompleto, setNombreCompleto] = useState(perfil.nombre_completo || '')
  const [carrera, setCarrera] = useState('')
  const [fecha, setFecha] = useState('')
  const [division, setDivision] = useState('Doubles')
  const [categoria, setCategoria] = useState(perfil.categoria || 'Open')
  const [archivo, setArchivo] = useState(null)
  const [texto, setTexto] = useState(null)
  const [leyendo, setLeyendo] = useState(false)
  const [estado, setEstado] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [manual, setManual] = useState(false)   // no se pudo leer: tiempo a mano y revisión manual
  const [tiempoManual, setTiempoManual] = useState('')

  const comprobacion = texto !== null && nombreCompleto.trim() ? comprobarCertificado(texto, nombreCompleto, '') : null
  const parciales = texto ? parcialesEnTexto(texto) : {}
  const total = comprobacion?.tiempoTotal

  const elegir = async (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (!TIPOS.includes(f.type)) { setEstado('El certificado tiene que ser PDF, PNG o JPG.'); return }
    if (f.size > 10 * 1024 * 1024) { setEstado('El certificado pesa más de 10 MB.'); return }
    setEstado(''); setArchivo(f); setTexto(null); setManual(false); setLeyendo(true)
    try {
      const t = await leerCertificado(f)
      setTexto(t)
      if (!comprobarCertificado(t, nombreCompleto || 'x x', '').tiempoTotal) setManual(true)
    } catch (err) {
      console.error('leerCertificado', err)
      setManual(true)
      setEstado(`No hemos podido leer el certificado automáticamente (${err?.message || err}). Escribe tu tiempo total y lo revisaremos a mano.`)
    }
    setLeyendo(false)
  }

  const guardar = async () => {
    if (!carrera.trim()) { setEstado('Escribe el nombre de la carrera (ej. Ginebra 2026).'); return }
    if (!archivo) { setEstado('Sube el certificado.'); return }
    if (!nombreCompleto.trim()) { setEstado('Escribe tu nombre completo tal y como aparece en el certificado.'); return }
    if (manual) {
      if (aSegundos(tiempoManual) === null) { setEstado('Escribe tu tiempo total con el formato 1:31:56.'); return }
    } else if (!comprobacion?.ok) { setEstado(comprobacion?.motivo || 'Sube el certificado y escribe tu nombre completo.'); return }
    setGuardando(true); setEstado('Guardando…')
    if (nombreCompleto.trim() !== (perfil.nombre_completo || '')) {
      const { data } = await supabase.from('profiles').update({ nombre_completo: nombreCompleto.trim() }).eq('id', perfil.id).select().single()
      if (data) setPerfil(data)
    }
    const { error } = await guardarResultado({
      userId: perfil.id,
      archivo,
      datos: {
        carrera: carrera.trim(),
        fecha: fecha || null,
        division,
        categoria,
        tiempo: manual ? formatoTiempo(aSegundos(tiempoManual)) : formatoTiempo(total),
        parciales: manual ? {} : parciales,
        huella: manual ? null : huellaCertificado(texto),
      },
    })
    setGuardando(false)
    if (error) { setEstado(error); return }
    const { data: actualizado } = await supabase.from('profiles').select('*').eq('id', perfil.id).single()
    if (actualizado) setPerfil(actualizado)
    cerrar()
  }

  return (
    <div className="screen">
      <button className="link-btn" style={{ margin: '10px 0' }} onClick={cerrar}>← Volver</button>
      <div className="screen-title">Añadir carrera</div>
      <div className="screen-sub">Sube el certificado de tu resultado y lo verificamos</div>
      <div className="perfil-form">
        <label>Carrera<input value={carrera} onChange={e => setCarrera(e.target.value)} placeholder="Ej. Ginebra 2026" maxLength={80} /></label>
        <label>Fecha <span>(opcional)</span><input type="date" value={fecha} onChange={e => setFecha(e.target.value)} /></label>
        <div className="form-grupo">
          <div className="filtro-titulo">División</div>
          <div className="chips">{['Individual', 'Doubles', 'Doubles mixto'].map(o => <button type="button" key={o} className={division === o ? 'chip active' : 'chip'} onClick={() => setDivision(o)}>{o}</button>)}</div>
        </div>
        <div className="form-grupo">
          <div className="filtro-titulo">Categoría</div>
          <div className="chips">{['Open', 'Pro'].map(o => <button type="button" key={o} className={categoria === o ? 'chip active' : 'chip'} onClick={() => setCategoria(o)}>{o}</button>)}</div>
        </div>
        <label>Tu nombre completo <span>(como aparece en el certificado)</span>
          <input value={nombreCompleto} onChange={e => setNombreCompleto(e.target.value)} placeholder="Ej. Laura García López" maxLength={80} />
        </label>
        <label>Certificado <span>(PDF, PNG o JPG)</span>
          <span className="upload-drop">
            <input type="file" accept="application/pdf,image/png,image/jpeg" onChange={elegir} />
            {archivo ? `📄 ${archivo.name}` : 'Sube el certificado que descargas de la web de resultados'}
          </span>
        </label>

        {leyendo && <div className="cert-estado">⏳ Leyendo el certificado…</div>}
        {!leyendo && manual && (
          <label>Tiempo total <span>(lo revisaremos a mano)</span>
            <input value={tiempoManual} onChange={e => setTiempoManual(e.target.value)} placeholder="Ej. 1:31:56" maxLength={10} />
          </label>
        )}
        {!leyendo && !manual && comprobacion && (comprobacion.ok
          ? <div className="cert-estado ok">✓ Tu nombre aparece en el certificado</div>
          : <div className="cert-estado error">✕ {comprobacion.motivo}</div>)}

        {!leyendo && texto && total && (
          <div className="lectura">
            <div className="lectura-total"><span>Tiempo total</span><strong>{formatoTiempo(total)}</strong></div>
            <div className="lectura-parciales">
              {ESTACIONES.map(e => (
                <div key={e}><span>{e}</span><strong>{parciales[e] ? formatoParcial(parciales[e]) : '—'}</strong></div>
              ))}
              {parciales.Running && <div><span>Carrera (8 km)</span><strong>{formatoParcial(parciales.Running)}</strong></div>}
            </div>
          </div>
        )}

        {estado && <div className="acceso-estado">{estado}</div>}
        <div className="upload-actions">
          <button className="btn-secondary" onClick={cerrar}>Cancelar</button>
          <button className="btn-match" style={{ padding: '8px 16px' }} disabled={leyendo || guardando || (!manual && !comprobacion?.ok)} onClick={guardar}>Guardar carrera</button>
        </div>
      </div>
    </div>
  )
}

