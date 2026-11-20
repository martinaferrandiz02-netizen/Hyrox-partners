import { useState } from 'react'
import { FileCheck, Globe, Lock, Upload } from 'lucide-react'
import { supabase } from './supabase'
import { comprobarCertificado, formatoParcial, formatoTiempo, huellaCertificado, leerCertificado, parcialesEnTexto } from './certificado'
import { atletasEnCertificado, hoyISO, rangoFechas, useProximas } from './datosCarreras'
import { casillasASegundos } from './datosEntrenos'
import { ESTACIONES, guardarResultado } from './resultados'
import { SelectorCarrera } from './Carreras'
import { TiempoInput } from './TiempoInput'
import { Volver } from './Volver'

const TIPOS = ['application/pdf', 'image/png', 'image/jpeg']

// Añadir una carrera: subes el certificado y la app lee el tiempo, los parciales y cuántos sois.
// Solo hay que elegir qué carrera era (de la lista) y confirmar división y categoría.
export function AnadirCarrera({ perfil, setPerfil, cerrar, sugerida = null, titulo = 'Sube una carrera', subtitulo = 'Sube el certificado y nosotros leemos tus tiempos.', textoCerrar }) {
  const nombreCompleto = perfil.nombre   // siempre el nombre de la cuenta
  const { proximas } = useProximas(perfil.id)
  const [archivo, setArchivo] = useState(null)
  const [texto, setTexto] = useState(null)
  const [leyendo, setLeyendo] = useState(false)
  const [manual, setManual] = useState(false)   // no se pudo leer: tiempo a mano y revisión manual
  const [tiempoManual, setTiempoManual] = useState({})
  const [elegida, setElegida] = useState(sugerida ? { evento: sugerida.evento, carrera: sugerida.carrera, fecha: sugerida.fecha, rango: rangoFechas(sugerida.fecha) } : null)
  const [division, setDivision] = useState('Doubles')
  const [categoria, setCategoria] = useState(perfil.categoria || 'Open')
  const [visibilidad, setVisibilidad] = useState('publico')
  const [estado, setEstado] = useState('')
  const [guardando, setGuardando] = useState(false)

  const comprobacion = texto !== null ? comprobarCertificado(texto, nombreCompleto, '') : null
  const parciales = texto ? parcialesEnTexto(texto) : {}
  const total = comprobacion?.tiempoTotal
  const listo = archivo && !leyendo && (manual || comprobacion?.ok)
  // Próximas que ya han pasado: seguramente es una de ellas
  const sugeridas = sugerida ? [] : proximas.filter(p => p.fecha <= hoyISO())

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
      if (!comprobarCertificado(t, nombreCompleto, '').tiempoTotal) setManual(true)
      const n = atletasEnCertificado(t)
      if (n) setDivision(n === 1 ? 'Individual' : 'Doubles')
    } catch (err) {
      console.error('leerCertificado', err)
      setManual(true)
      setEstado('No hemos podido leer el certificado automáticamente. Escribe tu tiempo total y lo revisaremos a mano.')
    }
    setLeyendo(false)
  }

  const guardar = async () => {
    if (!archivo) { setEstado('Sube el certificado.'); return }
    if (!elegida) { setEstado('Elige qué carrera era.'); return }
    const segManual = manual ? casillasASegundos(tiempoManual) : null
    if (manual && !(segManual > 0)) { setEstado('Escribe tu tiempo total (horas, minutos y segundos).'); return }
    if (!manual && !comprobacion?.ok) { setEstado(comprobacion?.motivo || 'Sube el certificado.'); return }
    setGuardando(true); setEstado('Guardando…')
    if (nombreCompleto !== (perfil.nombre_completo || '')) {
      const { data } = await supabase.from('profiles').update({ nombre_completo: nombreCompleto }).eq('id', perfil.id).select().single()
      if (data) setPerfil(data)
    }
    const { error } = await guardarResultado({
      userId: perfil.id,
      archivo,
      datos: {
        carrera: elegida.carrera,
        fecha: elegida.fecha,
        evento: elegida.evento,
        visibilidad,
        division,
        categoria,
        tiempo: manual ? formatoTiempo(segManual) : formatoTiempo(total),
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

  const nombreNoCoincide = comprobacion && !comprobacion.ok && /nombre/i.test(comprobacion.motivo || '')

  return (
    <div className="screen">
      {textoCerrar ? <div className="topbar"><span /><button className="link-btn apagado" onClick={cerrar}>{textoCerrar}</button></div> : <Volver onClick={cerrar} />}
      <div className="screen-title">{titulo}</div>
      <div className="screen-sub">{subtitulo}</div>
      <div className="perfil-form">
        {/* 1. Certificado */}
        <div className="form-grupo">
          <div className="filtro-titulo">1 · Certificado <span className="opcional">(PDF, PNG o JPG)</span></div>
          <label className="upload-drop">
            <input type="file" accept="application/pdf,image/png,image/jpeg" onChange={elegir} />
            {archivo ? <FileCheck size={26} strokeWidth={1.5} /> : <Upload size={26} strokeWidth={1.5} />}
            {archivo ? archivo.name : 'Sube el certificado que descargas de la web de resultados'}
          </label>
        </div>

        {leyendo && <div className="cert-estado">Leyendo el certificado…</div>}
        {!leyendo && nombreNoCoincide && (
          <div className="aviso-nombre">
            <strong>Tu nombre no aparece en este certificado</strong>
            <span>Para verificar la carrera, el certificado tiene que incluir el nombre de tu cuenta: <b>{nombreCompleto}</b>. Solo puedes subir carreras en las que hayas competido tú. Si en el certificado tu nombre está escrito de otra forma, cámbialo en Editar perfil y vuelve a subirlo.</span>
          </div>
        )}
        {!leyendo && !manual && comprobacion && !nombreNoCoincide && !comprobacion.ok && <div className="cert-estado error">{comprobacion.motivo}</div>}
        {!leyendo && !manual && comprobacion?.ok && (
          <div className="lectura">
            <div className="lectura-total"><span>{nombreCompleto} · tiempo total</span><strong>{formatoTiempo(total)}</strong></div>
            <div className="lectura-parciales">
              {ESTACIONES.map(e => <div key={e}><span>{e}</span><strong>{parciales[e] ? formatoParcial(parciales[e]) : '—'}</strong></div>)}
              {parciales.Running && <div><span>Running (8 km)</span><strong>{formatoParcial(parciales.Running)}</strong></div>}
            </div>
          </div>
        )}
        {!leyendo && manual && (
          <div className="form-grupo">
            <div className="filtro-titulo">Tiempo total <span className="opcional">(lo revisaremos a mano)</span></div>
            <TiempoInput horas etiqueta="Tiempo total" valor={tiempoManual} onChange={setTiempoManual} />
          </div>
        )}

        {/* 2. Qué carrera era */}
        {listo && (
          <div className="form-grupo">
            <div className="filtro-titulo">2 · ¿Qué carrera era?</div>
            <SelectorCarrera cuando="pasadas" elegida={elegida} onElegir={setElegida} sugeridas={sugeridas} />
          </div>
        )}

        {/* 3. Confirmar */}
        {listo && elegida && (
          <>
            <div className="form-grupo">
              <div className="filtro-titulo">3 · División y categoría</div>
              <div className="chips">{['Individual', 'Doubles', 'Doubles mixto'].map(o => <button type="button" key={o} className={division === o ? 'chip active' : 'chip'} onClick={() => setDivision(o)}>{o}</button>)}</div>
              <div className="chips" style={{ marginTop: 8 }}>{['Open', 'Pro'].map(o => <button type="button" key={o} className={categoria === o ? 'chip active' : 'chip'} onClick={() => setCategoria(o)}>{o}</button>)}</div>
            </div>
            <div className="form-grupo">
              <div className="filtro-titulo">¿Quién ve esta carrera?</div>
              <div className="chips">
                <button type="button" className={visibilidad === 'publico' ? 'chip active' : 'chip'} onClick={() => setVisibilidad('publico')}><Globe size={13} /> Pública</button>
                <button type="button" className={visibilidad === 'privado' ? 'chip active' : 'chip'} onClick={() => setVisibilidad('privado')}><Lock size={13} /> Solo yo</button>
              </div>
              <span className="ayuda">Tu mejor tiempo verificado se muestra siempre en tu perfil y en el ranking.</span>
            </div>
          </>
        )}

        {estado && <div className="acceso-estado">{estado}</div>}
        {listo && elegida && (
          <button className="btn-match btn-block" disabled={guardando} onClick={guardar}>{guardando ? 'Guardando…' : 'Guardar carrera'}</button>
        )}
      </div>
    </div>
  )
}
