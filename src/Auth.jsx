import { useState } from 'react'
import { supabase } from './supabase'

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

// Solo se aceptan enlaces a la web pública de resultados
function esEnlaceOficial(url) {
  try {
    const u = new URL(url)
    return u.protocol === 'https:' && u.hostname === 'results.hyrox.com'
  } catch {
    return false
  }
}

const TIPOS_CERTIFICADO = ['application/pdf', 'image/png', 'image/jpeg']

const PERFIL_VACIO = { nombre: '', ciudad: '', sexo: 'Mujer', categoria: 'Open', club: '', compitio: false, mejor_tiempo: '', resultado_url: '' }

// Formulario de perfil: alta inicial y edición
export function FormPerfil({ userId, perfil, onGuardado, onCancelar }) {
  const [f, setF] = useState(perfil ? { ...PERFIL_VACIO, ...perfil, club: perfil.club || '', mejor_tiempo: perfil.mejor_tiempo || '', resultado_url: perfil.resultado_url || '' } : PERFIL_VACIO)
  const [estado, setEstado] = useState('')
  const [certificado, setCertificado] = useState(null)
  const set = (k, v) => setF(prev => ({ ...prev, [k]: v }))

  const elegirCertificado = (e) => {
    const archivo = e.target.files?.[0]
    if (!archivo) return
    if (!TIPOS_CERTIFICADO.includes(archivo.type)) { setEstado('El certificado tiene que ser PDF, PNG o JPG.'); return }
    if (archivo.size > 10 * 1024 * 1024) { setEstado('El certificado pesa más de 10 MB.'); return }
    setEstado('')
    setCertificado(archivo)
  }

  const guardar = async (e) => {
    e.preventDefault()
    if (!f.nombre.trim() || !f.ciudad.trim()) { setEstado('Completa tu nombre y tu ciudad.'); return }
    const enlace = f.compitio ? f.resultado_url.trim() : ''
    if (enlace && !esEnlaceOficial(enlace)) { setEstado('El enlace tiene que ser de results.hyrox.com.'); return }
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
    const fila = {
      id: userId,
      nombre: f.nombre.trim(),
      ciudad: f.ciudad.trim(),
      sexo: f.sexo,
      categoria: f.categoria,
      club: f.club.trim() || null,
      compitio: f.compitio,
      mejor_tiempo: f.compitio ? (f.mejor_tiempo.trim() || null) : null,
      resultado_url: enlace || null,
      certificado_url,
      certificado_ruta,
    }
    const { data, error } = await supabase.from('profiles').upsert(fila).select().single()
    if (error) { setEstado(`No se ha podido guardar (${error.message}).`); return }
    onGuardado(data)
  }

  return (
    <div className="screen">
      <div className="screen-title">{perfil ? 'Editar perfil' : 'Crea tu perfil'}</div>
      <div className="screen-sub">{perfil ? 'Así te verán otros atletas' : 'Para que otros atletas puedan encontrarte'}</div>
      <form className="perfil-form" onSubmit={guardar}>
        <label>Nombre<input value={f.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Ej. Laura G." maxLength={40} /></label>
        <label>Ciudad<input value={f.ciudad} onChange={e => set('ciudad', e.target.value)} placeholder="Ej. Madrid" maxLength={40} /></label>
        <label>Club <span>(opcional)</span><input value={f.club} onChange={e => set('club', e.target.value)} placeholder="Ej. CrossFit Retiro" maxLength={40} /></label>
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
        {f.compitio && <label>Mejor tiempo <span>(opcional)</span><input value={f.mejor_tiempo} onChange={e => set('mejor_tiempo', e.target.value)} placeholder="Ej. 1:12:30" maxLength={10} /></label>}
        {f.compitio && (
          <label>Enlace a tu resultado oficial <span>(recomendado)</span>
            <input value={f.resultado_url} onChange={e => set('resultado_url', e.target.value)} placeholder="https://results.hyrox.com/..." inputMode="url" />
            <span className="ayuda">Búscate en results.hyrox.com, abre tu resultado y copia aquí el enlace. Así otros atletas pueden comprobar tu tiempo.</span>
          </label>
        )}
        {f.compitio && (
          <label>Certificado de resultado <span>(PDF, PNG o JPG)</span>
            <span className="upload-drop">
              <input type="file" accept="application/pdf,image/png,image/jpeg" onChange={elegirCertificado} />
              {certificado ? `📄 ${certificado.name}` : perfil?.certificado_url ? '📄 Certificado subido · pulsa para cambiarlo' : 'Sube el certificado que descargas de la web de resultados'}
            </span>
          </label>
        )}
        {estado && <div className="acceso-estado">{estado}</div>}
        <div className="upload-actions">
          {onCancelar && <button type="button" className="btn-secondary" onClick={onCancelar}>Cancelar</button>}
          <button className="btn-match" type="submit" style={{ flex: onCancelar ? 0 : 1, padding: '8px 16px' }}>Guardar</button>
        </div>
      </form>
    </div>
  )
}
