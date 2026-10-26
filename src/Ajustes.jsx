import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { Avatar } from './Avatar'
import { URL_PRIVACIDAD, URL_TERMINOS } from './legal'
import { desbloquear, misBloqueados } from './bloqueos'

const iniciales = (n) => n.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('')

// Reduce la foto a 400×400 (recorte cuadrado centrado) para que cargue rápido
async function prepararFoto(archivo) {
  const bmp = await createImageBitmap(archivo)
  const lado = Math.min(bmp.width, bmp.height)
  const c = document.createElement('canvas')
  c.width = c.height = 400
  c.getContext('2d').drawImage(bmp, (bmp.width - lado) / 2, (bmp.height - lado) / 2, lado, lado, 0, 0, 400, 400)
  return new Promise(res => c.toBlob(res, 'image/jpeg', 0.85))
}

function Fila({ icono, titulo, valor, onClick, peligro }) {
  return (
    <button className={`aj-fila ${peligro ? 'peligro' : ''}`} onClick={onClick}>
      <span className="aj-icono">{icono}</span>
      <span className="aj-titulo">{titulo}</span>
      {valor && <span className="aj-valor">{valor}</span>}
      <span className="aj-flecha">›</span>
    </button>
  )
}

export function Ajustes({ perfil, setPerfil, volver, editarPerfil }) {
  const [vista, setVista] = useState(null)
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('')
  const [estado, setEstado] = useState('')
  const [campo1, setCampo1] = useState('')
  const [campo2, setCampo2] = useState('')
  const [bloqueados, setBloqueados] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email || ''))
    supabase.from('datos_privados').select('telefono').eq('id', perfil.id).maybeSingle()
      .then(({ data }) => setTelefono(data?.telefono || ''))
  }, [perfil.id])

  const abrir = (v, inicial = '') => { setVista(v); setEstado(''); setCampo1(inicial); setCampo2('') }

  const cambiarFoto = async (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setEstado('Subiendo foto…')
    try {
      const blob = await prepararFoto(f)
      const ruta = `${perfil.id}/${Date.now()}.jpg`
      const { error } = await supabase.storage.from('avatares').upload(ruta, blob, { contentType: 'image/jpeg' })
      if (error) throw error
      const url = supabase.storage.from('avatares').getPublicUrl(ruta).data.publicUrl
      const anterior = perfil.foto_url?.split('/avatares/')[1]
      const { data } = await supabase.from('profiles').update({ foto_url: url }).eq('id', perfil.id).select().single()
      if (data) setPerfil(data)
      if (anterior) await supabase.storage.from('avatares').remove([anterior])
      setEstado('')
    } catch {
      setEstado('No se ha podido subir la foto. Prueba con otra imagen.')
    }
  }

  const quitarFoto = async () => {
    const anterior = perfil.foto_url?.split('/avatares/')[1]
    const { data } = await supabase.from('profiles').update({ foto_url: null }).eq('id', perfil.id).select().single()
    if (data) setPerfil(data)
    if (anterior) await supabase.storage.from('avatares').remove([anterior])
  }

  const guardarEmail = async () => {
    const nuevo = campo1.trim()
    if (!/^\S+@\S+\.\S+$/.test(nuevo)) { setEstado('Escribe un email válido.'); return }
    const { error } = await supabase.auth.updateUser({ email: nuevo }, { emailRedirectTo: window.location.origin })
    setEstado(error ? `No se ha podido cambiar (${error.message}).` : 'Te hemos enviado un email al nuevo correo para confirmar el cambio.')
  }

  const guardarPassword = async () => {
    if (campo1.length < 6) { setEstado('La contraseña debe tener al menos 6 caracteres.'); return }
    if (campo1 !== campo2) { setEstado('Las contraseñas no coinciden.'); return }
    const { error } = await supabase.auth.updateUser({ password: campo1 })
    if (error) { setEstado(`No se ha podido cambiar (${error.message}).`); return }
    setEstado('✓ Contraseña cambiada.'); setCampo1(''); setCampo2('')
  }

  const guardarTelefono = async () => {
    const tel = campo1.trim()
    if (tel && !/^\+?[0-9 ]{6,20}$/.test(tel)) { setEstado('Escribe el teléfono con prefijo, por ejemplo +41 79 123 45 67.'); return }
    const { error } = await supabase.from('datos_privados').upsert({ id: perfil.id, telefono: tel || null, updated_at: new Date().toISOString() })
    if (error) { setEstado('No se ha podido guardar. Inténtalo de nuevo.'); return }
    setTelefono(tel); setVista(null)
  }

  const borrarCuenta = async () => {
    if (campo1.trim().toUpperCase() !== 'BORRAR') { setEstado('Escribe BORRAR para confirmar.'); return }
    setEstado('Borrando cuenta…')
    const { error } = await supabase.rpc('borrar_mi_cuenta')
    if (error) { setEstado('No se ha podido borrar la cuenta. Inténtalo de nuevo.'); return }
    await supabase.auth.signOut()
  }

  const abrirBloqueados = async () => { abrir('bloqueados'); setBloqueados(await misBloqueados(perfil.id)) }
  const quitarBloqueo = async (b) => {
    if (!window.confirm(`¿Desbloquear a ${b.perfil.nombre}?`)) return
    if (await desbloquear(perfil.id, b.bloqueado)) setBloqueados(prev => prev.filter(x => x.bloqueado !== b.bloqueado))
  }

  if (vista) {
    const titulos = { email: 'Cambiar email', password: 'Cambiar contraseña', telefono: 'Teléfono', borrar: 'Borrar cuenta', bloqueados: 'Usuarios bloqueados' }
    return (
      <div className="screen">
        <button className="link-btn" style={{ margin: '10px 0' }} onClick={() => setVista(null)}>← Ajustes</button>
        <div className="screen-title">{titulos[vista]}</div>
        <div className="perfil-form">
          {vista === 'email' && <>
            <div className="ayuda-form">Email actual: {email}</div>
            <label>Nuevo email<input type="email" value={campo1} onChange={e => setCampo1(e.target.value)} autoComplete="email" /></label>
            <button className="btn-match" onClick={guardarEmail}>Guardar</button>
          </>}
          {vista === 'password' && <>
            <label>Nueva contraseña<input type="password" value={campo1} onChange={e => setCampo1(e.target.value)} autoComplete="new-password" /></label>
            <label>Repite la contraseña<input type="password" value={campo2} onChange={e => setCampo2(e.target.value)} autoComplete="new-password" /></label>
            <button className="btn-match" onClick={guardarPassword}>Guardar</button>
          </>}
          {vista === 'telefono' && <>
            <div className="ayuda-form">🔒 Tu teléfono es privado: no lo ve ningún otro usuario.</div>
            <label>Teléfono móvil<input type="tel" value={campo1} onChange={e => setCampo1(e.target.value)} placeholder="+41 79 123 45 67" autoComplete="tel" /></label>
            <button className="btn-match" onClick={guardarTelefono}>Guardar</button>
          </>}
          {vista === 'bloqueados' && <>
            {bloqueados === null && <div className="ayuda-form">Cargando…</div>}
            {bloqueados?.length === 0 && <div className="ayuda-form">No has bloqueado a nadie.</div>}
            {bloqueados?.map(b => (
              <div key={b.bloqueado} className="aj-fila" style={{ cursor: 'default' }}>
                <Avatar p={{ fotoUrl: b.perfil.foto_url, color: 'dark', iniciales: iniciales(b.perfil.nombre) }} style={{ width: 28, height: 28, fontSize: 10 }} />
                <span className="aj-titulo">{b.perfil.nombre}</span>
                <button className="link-btn" onClick={() => quitarBloqueo(b)}>Desbloquear</button>
              </div>
            ))}
          </>}
          {vista === 'borrar' && <>
            <div className="ayuda-form">Se borrarán para siempre tu perfil, tus carreras, vídeos, mensajes, solicitudes y plazas. No se puede deshacer.</div>
            <label>Escribe BORRAR para confirmar<input value={campo1} onChange={e => setCampo1(e.target.value)} /></label>
            <button className="btn-peligro" onClick={borrarCuenta}>Borrar mi cuenta</button>
          </>}
          {estado && <div className="acceso-estado">{estado}</div>}
        </div>
      </div>
    )
  }

  return (
    <div className="screen">
      <button className="link-btn" style={{ margin: '10px 0' }} onClick={volver}>← Perfil</button>
      <div className="screen-title">Ajustes</div>

      <div className="aj-foto">
        <Avatar p={{ fotoUrl: perfil.foto_url, color: 'yellow', iniciales: iniciales(perfil.nombre) }} style={{ width: 72, height: 72, fontSize: 24 }} />
        <div className="aj-foto-botones">
          <label className="btn-secondary">
            <input type="file" accept="image/*" onChange={cambiarFoto} style={{ display: 'none' }} />
            {perfil.foto_url ? 'Cambiar foto' : 'Añadir foto'}
          </label>
          {perfil.foto_url && <button className="link-btn" style={{ color: '#888' }} onClick={quitarFoto}>Quitar</button>}
        </div>
      </div>
      {estado && <div className="acceso-estado" style={{ textAlign: 'center' }}>{estado}</div>}

      <div className="aj-grupo">Perfil</div>
      <Fila icono="✏️" titulo="Datos del perfil" valor="Nombre, ciudad, club…" onClick={editarPerfil} />

      <div className="aj-grupo">Cuenta</div>
      <Fila icono="✉️" titulo="Email" valor={email} onClick={() => abrir('email')} />
      <Fila icono="🔑" titulo="Contraseña" valor="••••••" onClick={() => abrir('password')} />
      <Fila icono="📱" titulo="Teléfono" valor={telefono || 'Añadir'} onClick={() => abrir('telefono', telefono)} />

      <div className="aj-grupo">Privacidad y seguridad</div>
      <Fila icono="⛔" titulo="Usuarios bloqueados" onClick={abrirBloqueados} />
      <Fila icono="📄" titulo="Política de privacidad" onClick={() => window.open(URL_PRIVACIDAD, '_blank')} />
      <Fila icono="📜" titulo="Términos de uso" onClick={() => window.open(URL_TERMINOS, '_blank')} />

      <button className="aj-salir" onClick={() => supabase.auth.signOut()}>Cerrar sesión</button>
      <Fila icono="🗑" titulo="Borrar cuenta" onClick={() => abrir('borrar')} peligro />
    </div>
  )
}
