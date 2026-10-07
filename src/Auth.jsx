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
      if (error) setEstado(error.message.includes('Invalid') ? 'Email o contraseña incorrectos.' : 'No se ha podido iniciar sesión. Inténtalo de nuevo.')
    } else {
      if (password.length < 6) {
        setEstado('La contraseña debe tener al menos 6 caracteres.')
        setEnviando(false)
        return
      }
      const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } })
      if (error) setEstado(error.message.includes('registered') ? 'Ya existe una cuenta con este email.' : 'No se ha podido crear la cuenta. Inténtalo de nuevo.')
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

const PERFIL_VACIO = { nombre: '', ciudad: '', sexo: 'Mujer', categoria: 'Open', club: '', compitio: false, mejor_tiempo: '' }

// Formulario de perfil: alta inicial y edición
export function FormPerfil({ userId, perfil, onGuardado, onCancelar }) {
  const [f, setF] = useState(perfil ? { ...PERFIL_VACIO, ...perfil, club: perfil.club || '', mejor_tiempo: perfil.mejor_tiempo || '' } : PERFIL_VACIO)
  const [estado, setEstado] = useState('')
  const set = (k, v) => setF(prev => ({ ...prev, [k]: v }))

  const guardar = async (e) => {
    e.preventDefault()
    if (!f.nombre.trim() || !f.ciudad.trim()) { setEstado('Completa tu nombre y tu ciudad.'); return }
    setEstado('Guardando…')
    const fila = {
      id: userId,
      nombre: f.nombre.trim(),
      ciudad: f.ciudad.trim(),
      sexo: f.sexo,
      categoria: f.categoria,
      club: f.club.trim() || null,
      compitio: f.compitio,
      mejor_tiempo: f.compitio ? (f.mejor_tiempo.trim() || null) : null,
    }
    const { data, error } = await supabase.from('profiles').upsert(fila).select().single()
    if (error) { setEstado('No se ha podido guardar. Inténtalo de nuevo.'); return }
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
        {estado && <div className="acceso-estado">{estado}</div>}
        <div className="upload-actions">
          {onCancelar && <button type="button" className="btn-secondary" onClick={onCancelar}>Cancelar</button>}
          <button className="btn-match" type="submit" style={{ flex: onCancelar ? 0 : 1, padding: '8px 16px' }}>Guardar</button>
        </div>
      </form>
    </div>
  )
}
