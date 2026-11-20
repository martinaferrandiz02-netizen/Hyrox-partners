import { useState } from 'react'
import { supabase } from './supabase'
import { CampoCiudad } from './Ciudad'
import { CampoClub } from './Club'
import { clubCanonico } from './clubs'
import { Volver } from './Volver'
import { CampoContrasena, RequisitosContrasena } from './CampoContrasena'
import { contrasenaValida, MENSAJE_REQUISITOS } from './contrasena'
import { URL_PRIVACIDAD, URL_TERMINOS } from './legal'

// Al abrir el enlace del email de recuperación se vuelve a la app con ?recuperar=1
const URL_RECUPERAR = 'https://pairx-app.vercel.app/?recuperar=1'

// Pantalla de acceso: iniciar sesión, crear cuenta o recuperar la contraseña
export function Acceso() {
  const [modo, setModo] = useState('entrar')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [estado, setEstado] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [acepta, setAcepta] = useState(false)

  const enviar = async (e) => {
    e.preventDefault()
    setEnviando(true)
    setEstado('')
    if (modo === 'recuperar') {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: URL_RECUPERAR })
      setEstado(error && !/rate|limit/i.test(error.message) && error.status !== 429
        ? `No se ha podido enviar el email (${error.message}).`
        : error
          ? 'Has pedido varios enlaces seguidos. Espera unos minutos y vuelve a intentarlo.'
          : 'Si hay una cuenta con ese email, te hemos enviado un enlace para crear una contraseña nueva. Revisa también la carpeta de spam.')
    } else if (modo === 'entrar') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setEstado(error.message.includes('Invalid') ? 'Email o contraseña incorrectos.' : `No se ha podido iniciar sesión (${error.message}).`)
    } else {
      if (!acepta) {
        setEstado('Para crear la cuenta tienes que aceptar los Términos y la Política de privacidad.')
        setEnviando(false)
        return
      }
      if (!contrasenaValida(password)) {
        setEstado(MENSAJE_REQUISITOS)
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
      <div className="acceso-marca">
        <div className="acceso-logo">PAIRX</div>
        <div className="acceso-sub">Encuentra tu pareja<br />de Doubles</div>
      </div>
      <form className="acceso-form" onSubmit={enviar}>
        <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" autoComplete="email" />
        {modo !== 'recuperar' && <CampoContrasena required value={password} onChange={e => setPassword(e.target.value)} placeholder="Contraseña" autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'} />}
        {modo === 'registro' && <RequisitosContrasena valor={password} />}
        {modo === 'entrar' && <button type="button" className="link-btn apagado acceso-olvido" onClick={() => { setModo('recuperar'); setEstado('') }}>¿Has olvidado tu contraseña?</button>}
        {modo === 'recuperar' && <div className="acceso-ayuda">Escribe el email de tu cuenta y te enviaremos un enlace para crear una contraseña nueva.</div>}
        {modo === 'registro' && (
          <label className="acceso-acepto">
            <input type="checkbox" checked={acepta} onChange={e => setAcepta(e.target.checked)} />
            <span>Tengo 18 años o más y acepto los <a href={URL_TERMINOS} target="_blank" rel="noreferrer">Términos de uso</a> y la <a href={URL_PRIVACIDAD} target="_blank" rel="noreferrer">Política de privacidad</a>.</span>
          </label>
        )}
        {estado && <div className="acceso-estado">{estado}</div>}
        <button className="btn-match" type="submit" disabled={enviando}>{enviando ? '…' : modo === 'entrar' ? 'Entrar' : modo === 'recuperar' ? 'Enviar enlace' : 'Crear cuenta'}</button>
      </form>
      <button className="link-btn acceso-cambio" onClick={() => { setModo(m => m === 'entrar' ? 'registro' : 'entrar'); setEstado('') }}>
        {modo === 'entrar' ? '¿No tienes cuenta? Regístrate' : modo === 'recuperar' ? 'Volver a entrar' : '¿Ya tienes cuenta? Entra'}
      </button>
      <div className="acceso-legal"><a href={URL_TERMINOS} target="_blank" rel="noreferrer">Términos</a> · <a href={URL_PRIVACIDAD} target="_blank" rel="noreferrer">Privacidad</a></div>
    </div>
  )
}

// Tras abrir el enlace del email: elegir una contraseña nueva
export function NuevaContrasena({ listo }) {
  const [p1, setP1] = useState('')
  const [p2, setP2] = useState('')
  const [estado, setEstado] = useState('')
  const [enviando, setEnviando] = useState(false)
  const guardar = async (e) => {
    e.preventDefault()
    if (!contrasenaValida(p1)) { setEstado(MENSAJE_REQUISITOS); return }
    if (p1 !== p2) { setEstado('Las dos contraseñas no coinciden.'); return }
    setEnviando(true)
    const { error } = await supabase.auth.updateUser({ password: p1 })
    setEnviando(false)
    if (error) { setEstado(/same|different/i.test(error.message) ? 'La contraseña nueva tiene que ser distinta de la anterior.' : `No se ha podido cambiar (${error.message}). Pide otro enlace si ha caducado.`); return }
    listo()
  }
  return (
    <div className="screen acceso">
      <div className="acceso-marca">
        <div className="acceso-logo">PAIRX</div>
        <div className="acceso-sub">Crea tu contraseña<br />nueva</div>
      </div>
      <form className="acceso-form" onSubmit={guardar}>
        <CampoContrasena required value={p1} onChange={e => setP1(e.target.value)} placeholder="Contraseña nueva" autoComplete="new-password" />
        <RequisitosContrasena valor={p1} />
        <CampoContrasena required value={p2} onChange={e => setP2(e.target.value)} placeholder="Repite la contraseña" autoComplete="new-password" />
        {estado && <div className="acceso-estado">{estado}</div>}
        <button className="btn-match" type="submit" disabled={enviando}>{enviando ? '…' : 'Guardar y entrar'}</button>
      </form>
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
      {onCancelar ? <Volver onClick={onCancelar} /> : <div style={{ height: 24 }} />}
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
          <button className="btn-match" type="submit" style={{ flex: 1 }}>Guardar</button>
        </div>
      </form>
    </div>
  )
}
