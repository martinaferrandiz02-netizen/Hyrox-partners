import { useState } from 'react'
import { supabase } from './supabase'
import { CampoCiudad } from './Ciudad'
import { CampoClub } from './Club'
import { clubCanonico } from './clubs'
import { aSegundos, comprobarCertificado, formatoTiempo, huellaCertificado, leerCertificado, tiemposEnTexto } from './certificado'

// Pantalla de acceso: iniciar sesión o crear cuenta con email y contraseña
export function Acceso() {
  const [modo, setModo] = useState('entrar')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [estado, setEstado] = useState('')
  const [enviando, setEnviando] = useState(false)

  const enviar = async (e) => {
    e.preventDefault()
    setEnviando(true)
    setEstado('')
    if (modo === 'entrar') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setEstado(error.message.includes('Invalid') ? 'Email o contraseña incorrectos.' : `No se ha podido iniciar sesión (${error.message}).`)
    } else {
      if (password.length < 6) {
        setEstado('La contraseña debe tener al menos 6 caracteres.')
        setEnviando(false)
        return
      }
      const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } })
      if (error) {
        console.error('signUp', error)
        setEstado(error.message.includes('registered') ? 'Ya existe una cuenta con este email. Pulsa "Entra".' : `No se ha podido crear la cuenta (${error.message}).`)
      }
      else if (!data.session) setEstado('Te hemos enviado un email para confirmar tu cuenta. Ábrelo y vuelve aquí.')
    }
    setEnviando(false)
  }

  return (
    <div className="screen acceso">
      <div className="acceso-logo">PAIRX</div>
      <div className="acceso-sub">Encuentra tu pareja de Doubles</div>
      <form className="acceso-form" onSubmit={enviar}>
        <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" autoComplete="email" />
        <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Contraseña" autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'} />
        {estado && <div className="acceso-estado">{estado}</div>}
        <button className="btn-match" type="submit" disabled={enviando}>{enviando ? '…' : modo === 'entrar' ? 'Entrar' : 'Crear cuenta'}</button>
      </form>
      <button className="link-btn" onClick={() => { setModo(m => m === 'entrar' ? 'registro' : 'entrar'); setEstado('') }}>
        {modo === 'entrar' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Entra'}
      </button>
    </div>
  )
}

const TIPOS_CERTIFICADO = ['application/pdf', 'image/png', 'image/jpeg']

const PERFIL_VACIO = { nombre: '', ciudad: '', sexo: 'Mujer', categoria: 'Open', club: '', compitio: false, mejor_tiempo: '', nombre_completo: '', division: 'Doubles' }

// Formulario de perfil: alta inicial y edición
export function FormPerfil({ userId, perfil, onGuardado, onCancelar }) {
  const [f, setF] = useState(perfil
    ? { ...PERFIL_VACIO, ...perfil, club: perfil.club || '', mejor_tiempo: perfil.mejor_tiempo || '', nombre_completo: perfil.nombre_completo || '', division: perfil.division || 'Doubles' }
    : PERFIL_VACIO)
  const [estado, setEstado] = useState('')
  const [certificado, setCertificado] = useState(null)
  const [textoCert, setTextoCert] = useState(null)
  const [leyendo, setLeyendo] = useState(false)
  const set = (k, v) => setF(prev => ({ ...prev, [k]: v }))

  // Comprobación en vivo en cuanto hay certificado y nombre completo
  const comprobacion = textoCert !== null && f.nombre_completo.trim()
    ? comprobarCertificado(textoCert, f.nombre_completo, f.mejor_tiempo.trim())
    : null

  // Si no se tocan certificado, nombre completo ni tiempo, el estado se mantiene
  const sinCambios = !certificado &&
    f.nombre_completo.trim() === (perfil?.nombre_completo || '') && f.mejor_tiempo.trim() === (perfil?.mejor_tiempo || '') && f.division === (perfil?.division || 'Doubles')
  const estadoActual = sinCambios ? (perfil?.certificado_estado || 'sin_certificado') : null

  const elegirCertificado = async (e) => {
    const archivo = e.target.files?.[0]
    if (!archivo) return
    if (!TIPOS_CERTIFICADO.includes(archivo.type)) { setEstado('El certificado tiene que ser PDF, PNG o JPG.'); return }
    if (archivo.size > 10 * 1024 * 1024) { setEstado('El certificado pesa más de 10 MB.'); return }
    setEstado('')
    setCertificado(archivo)
    setTextoCert(null)
    setLeyendo(true)
    try {
      const texto = await leerCertificado(archivo)
      setTextoCert(texto)
      // Si aún no ha escrito el tiempo, lo rellenamos con el del certificado
      const tiempos = tiemposEnTexto(texto)
      if (tiempos.length && !f.mejor_tiempo.trim()) set('mejor_tiempo', formatoTiempo(Math.max(...tiempos)))
    } catch (err) {
      console.error('leerCertificado', err)
      setEstado('No hemos podido leer el certificado. Prueba con otro archivo.')
      setCertificado(null)
    }
    setLeyendo(false)
  }

  const guardar = async (e) => {
    e.preventDefault()
    if (!f.nombre.trim()) { setEstado('Escribe tu nombre.'); return }
    if (!f.ciudad.trim()) { setEstado('Elige tu ciudad de la lista.'); return }
    if (leyendo) { setEstado('Espera a que terminemos de leer el certificado.'); return }
    if (f.compitio && certificado) {
      if (!f.nombre_completo.trim()) { setEstado('Escribe tu nombre completo tal y como aparece en el certificado.'); return }
      if (!comprobacion?.ok) { setEstado(comprobacion?.motivo || 'No hemos podido comprobar el certificado.'); return }
      // Un mismo certificado solo lo pueden usar 2 personas (la pareja de Doubles)
      const huella = huellaCertificado(textoCert)
      if (huella) {
        const { count } = await supabase.from('profiles').select('id', { count: 'exact', head: true })
          .eq('certificado_huella', huella).neq('id', userId)
        if ((count ?? 0) >= 2) { setEstado('Este certificado ya lo están usando 2 personas.'); return }
      }
    }
    setEstado('Guardando…')
    let certificado_url = f.compitio ? (perfil?.certificado_url || null) : null
    let certificado_ruta = f.compitio ? (perfil?.certificado_ruta || null) : null
    if (f.compitio && certificado) {
      const ext = certificado.name.split('.').pop().toLowerCase()
      const ruta = `${userId}/${Date.now()}.${ext}`
      const { error: errSubida } = await supabase.storage.from('certificados').upload(ruta, certificado, { contentType: certificado.type })
      if (errSubida) { setEstado(`No se ha podido subir el certificado (${errSubida.message}).`); return }
      if (perfil?.certificado_ruta) await supabase.storage.from('certificados').remove([perfil.certificado_ruta])
      certificado_ruta = ruta
      certificado_url = supabase.storage.from('certificados').getPublicUrl(ruta).data.publicUrl
    }
    const tiempo = f.mejor_tiempo.trim()
    const fila = {
      id: userId,
      nombre: f.nombre.trim(),
      ciudad: f.ciudad.trim(),
      sexo: f.sexo,
      categoria: f.categoria,
      club: await clubCanonico(f.club),
      compitio: f.compitio,
      nombre_completo: f.compitio ? (f.nombre_completo.trim() || null) : null,
      division: f.compitio ? f.division : null,
      mejor_tiempo: f.compitio && tiempo ? (aSegundos(tiempo) !== null ? formatoTiempo(aSegundos(tiempo)) : tiempo) : null,
      certificado_url,
      certificado_ruta,
      ...(f.compitio && certificado ? { certificado_huella: huellaCertificado(textoCert) } : {}),
      ...(!f.compitio ? { certificado_huella: null } : {}),
    }
    const { data, error } = await supabase.from('profiles').upsert(fila).select().single()
    if (error) {
      if (certificado_ruta && certificado && certificado_ruta !== perfil?.certificado_ruta) await supabase.storage.from('certificados').remove([certificado_ruta])
      setEstado(error.message.includes('certificado_ya_usado') ? 'Este certificado ya lo están usando 2 personas.' : `No se ha podido guardar (${error.message}).`)
      return
    }
    // El servidor comprueba el certificado y decide el estado (verificado / pendiente / rechazado)
    if (data.certificado_estado === 'pendiente') {
      setEstado('Verificando certificado…')
      const { error: errFn } = await supabase.functions.invoke('verificar-certificado')
      if (!errFn) {
        const { data: actualizado } = await supabase.from('profiles').select('*').eq('id', userId).single()
        if (actualizado) { onGuardado(actualizado); return }
      }
    }
    onGuardado(data)
  }

  return (
    <div className="screen">
      <div className="screen-title">{perfil ? 'Editar perfil' : 'Crea tu perfil'}</div>
      <div className="screen-sub">{perfil ? 'Así te verán otros atletas' : 'Para que otros atletas puedan encontrarte'}</div>
      <form className="perfil-form" onSubmit={guardar}>
        <label>Nombre<input value={f.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Ej. Laura G." maxLength={40} /></label>
        <label>Ciudad<CampoCiudad valor={f.ciudad} onChange={v => set('ciudad', v)} /></label>
        <label>Club <span>(opcional)</span><CampoClub valor={f.club} onChange={v => set('club', v)} /></label>
        <div className="form-grupo">
          <div className="filtro-titulo">Sexo</div>
          <div className="chips">{['Mujer', 'Hombre'].map(o => <button type="button" key={o} className={f.sexo === o ? 'chip active' : 'chip'} onClick={() => set('sexo', o)}>{o}</button>)}</div>
        </div>
        <div className="form-grupo">
          <div className="filtro-titulo">Categoría</div>
          <div className="chips">{['Open', 'Pro'].map(o => <button type="button" key={o} className={f.categoria === o ? 'chip active' : 'chip'} onClick={() => set('categoria', o)}>{o}</button>)}</div>
        </div>
        <div className="form-grupo">
          <div className="filtro-titulo">¿Has competido ya?</div>
          <div className="chips">{[['Sí', true], ['Todavía no', false]].map(([l, v]) => <button type="button" key={l} className={f.compitio === v ? 'chip active' : 'chip'} onClick={() => set('compitio', v)}>{l}</button>)}</div>
        </div>
        {f.compitio && (
          <>
            <div className="form-grupo">
              <div className="filtro-titulo">División del certificado</div>
              <div className="chips">{['Individual', 'Doubles', 'Doubles mixto'].map(o => <button type="button" key={o} className={f.division === o ? 'chip active' : 'chip'} onClick={() => set('division', o)}>{o}</button>)}</div>
            </div>
            <label>Nombre completo <span>(como aparece en el certificado)</span>
              <input value={f.nombre_completo} onChange={e => set('nombre_completo', e.target.value)} placeholder="Ej. Laura García López" maxLength={80} />
            </label>
            <label>Certificado de resultado <span>(PDF, PNG o JPG)</span>
              <span className="upload-drop">
                <input type="file" accept="application/pdf,image/png,image/jpeg" onChange={elegirCertificado} />
                {certificado ? `📄 ${certificado.name}` : perfil?.certificado_url ? '📄 Certificado subido · pulsa para cambiarlo' : 'Sube el certificado que descargas de la web de resultados'}
              </span>
            </label>
            <label>Tiempo final
              <input value={f.mejor_tiempo} onChange={e => set('mejor_tiempo', e.target.value)} placeholder="Ej. 1:12:30" maxLength={10} />
            </label>
            {leyendo && <div className="cert-estado">⏳ Leyendo el certificado…</div>}
            {!leyendo && comprobacion && (comprobacion.ok
              ? <div className="cert-estado ok">✓ Nombre y tiempo coinciden con el certificado</div>
              : <div className="cert-estado error">✕ {comprobacion.motivo}</div>)}
            {!leyendo && !certificado && estadoActual && <EstadoCertificado estado={estadoActual} motivo={perfil?.certificado_motivo} />}
            {!leyendo && !certificado && !perfil?.certificado_url && <div className="ayuda-form">Sin certificado, tu tiempo aparecerá como "sin verificar".</div>}
          </>
        )}
        {estado && <div className="acceso-estado">{estado}</div>}
        <div className="upload-actions">
          {onCancelar && <button type="button" className="btn-secondary" onClick={onCancelar}>Cancelar</button>}
          <button className="btn-match" type="submit" disabled={leyendo} style={{ flex: onCancelar ? 0 : 1, padding: '8px 16px' }}>Guardar</button>
        </div>
      </form>
    </div>
  )
}

export function EstadoCertificado({ estado, motivo }) {
  if (estado === 'verificado') return <div className="cert-estado ok">✓ Tiempo verificado con certificado</div>
  if (estado === 'pendiente') return <div className="cert-estado">⏳ En revisión: el equipo de Pairx revisará tu certificado (las imágenes se revisan a mano)</div>
  if (estado === 'rechazado') return <div className="cert-estado error">✕ Certificado no válido{motivo ? `: ${motivo}` : ''}</div>
  return null
}
