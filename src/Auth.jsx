import { useState } from 'react'
import { supabase } from './supabase'
import { CampoCiudad } from './Ciudad'
import { CampoClub } from './Club'
import { clubCanonico } from './clubs'

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

const PERFIL_VACIO = { nombre: '', ciudad: '', sexo: 'Mujer', categoria: 'Open', club: '', compitio: false }

// Formulario de perfil: alta inicial y edición. Las carreras se añaden aparte, desde el perfil.
export function FormPerfil({ userId, perfil, onGuardado, onCancelar }) {
  const [f, setF] = useState(perfil ? { ...PERFIL_VACIO, ...perfil, club: perfil.club || '' } : PERFIL_VACIO)
  const [estado, setEstado] = useState('')
  const set = (k, v) => setF(prev => ({ ...prev, [k]: v }))

  const guardar = async (e) => {
    e.preventDefault()
    if (!f.nombre.trim()) { setEstado('Escribe tu nombre.'); return }
    if (!f.ciudad.trim()) { setEstado('Elige tu ciudad de la lista.'); return }
    setEstado('Guardando…')
    const fila = {
      id: userId,
      nombre: f.nombre.trim(),
      ciudad: f.ciudad.trim(),
      sexo: f.sexo,
      categoria: f.categoria,
      club: await clubCanonico(f.club),
      compitio: f.compitio,
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
        {f.compitio && <div className="ayuda-form">Después, desde tu perfil, pulsa "+ Añadir carrera" y sube tu certificado para verificar tus tiempos.</div>}
        {estado && <div className="acceso-estado">{estado}</div>}
        <div className="upload-actions">
          {onCancelar && <button type="button" className="btn-secondary" onClick={onCancelar}>Cancelar</button>}
          <button className="btn-match" type="submit" style={{ flex: onCancelar ? 0 : 1, padding: '8px 16px' }}>Guardar</button>
        </div>
      </form>
    </div>
  )
}
