import { useState } from 'react'
import { bloquear, denunciar, MOTIVOS } from './bloqueos'

// Botón ⋯ con "Denunciar" y "Bloquear" para el perfil o el chat de otra persona
export function MenuUsuario({ yoId, persona, contexto, onBloqueado }) {
  const [abierto, setAbierto] = useState(false)
  const [denunciando, setDenunciando] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [detalle, setDetalle] = useState('')
  const [tambienBloquear, setTambienBloquear] = useState(true)
  const [estado, setEstado] = useState('')
  const nombre = persona.nombre.split(' ')[0]

  const hacerBloqueo = async () => {
    if (!window.confirm(`¿Bloquear a ${persona.nombre}? No podrá escribirte ni enviarte solicitudes, y dejaréis de veros en la app. Puedes desbloquearle desde Ajustes.`)) return
    if (await bloquear(yoId, persona.userId)) { setAbierto(false); onBloqueado?.() }
    else window.alert('No se ha podido bloquear. Inténtalo de nuevo.')
  }

  const enviarDenuncia = async () => {
    if (!motivo) { setEstado('Elige un motivo.'); return }
    setEstado('Enviando…')
    const ok = await denunciar(yoId, persona.userId, motivo, detalle, contexto)
    if (!ok) { setEstado('No se ha podido enviar. Inténtalo de nuevo.'); return }
    if (tambienBloquear) await bloquear(yoId, persona.userId)
    setDenunciando(false); setAbierto(false)
    window.alert('Gracias. Hemos recibido tu denuncia y la revisaremos.')
    if (tambienBloquear) onBloqueado?.()
  }

  return (
    <>
      <button className="menu-usuario-btn" onClick={() => setAbierto(true)} aria-label="Más opciones">⋯</button>

      {abierto && !denunciando && (
        <div className="hoja-fondo" onClick={() => setAbierto(false)}>
          <div className="hoja" onClick={e => e.stopPropagation()}>
            <button className="hoja-opcion" onClick={() => { setDenunciando(true); setEstado('') }}>🚩 Denunciar a {nombre}</button>
            <button className="hoja-opcion peligro" onClick={hacerBloqueo}>⛔ Bloquear a {nombre}</button>
            <button className="hoja-opcion cancelar" onClick={() => setAbierto(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {denunciando && (
        <div className="hoja-fondo" onClick={() => setDenunciando(false)}>
          <div className="hoja" onClick={e => e.stopPropagation()}>
            <div className="hoja-titulo">Denunciar a {persona.nombre}</div>
            <div className="hoja-sub">Tu denuncia es anónima: {nombre} no sabrá quién la ha hecho.</div>
            <div className="chips" style={{ margin: '8px 0' }}>
              {MOTIVOS.map(m => <button key={m} className={motivo === m ? 'chip active' : 'chip'} onClick={() => setMotivo(m)}>{m}</button>)}
            </div>
            <textarea className="hoja-texto" value={detalle} onChange={e => setDetalle(e.target.value)} placeholder="Cuéntanos qué ha pasado (opcional)" maxLength={1000} />
            <label className="hoja-check">
              <input type="checkbox" checked={tambienBloquear} onChange={e => setTambienBloquear(e.target.checked)} /> Bloquear también a {nombre}
            </label>
            {estado && <div className="acceso-estado">{estado}</div>}
            <div className="upload-actions">
              <button className="btn-secondary" onClick={() => setDenunciando(false)}>Cancelar</button>
              <button className="btn-peligro" onClick={enviarDenuncia}>Enviar denuncia</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
