import { useEffect, useRef, useState } from 'react'
import { horaCorta, useConversacion } from './social'

// Chat con otro usuario real, en tiempo real
export function ChatReal({ yo, otro, volver, elegirPareja, abrirPerfil }) {
  const { mensajes, cargando, enviar } = useConversacion(yo.id, otro.userId)
  const [texto, setTexto] = useState('')
  const [error, setError] = useState('')
  const final = useRef(null)

  useEffect(() => { final.current?.scrollIntoView({ block: 'end' }) }, [mensajes.length])

  const mandar = async () => {
    if (!texto.trim()) return
    const t = texto
    setTexto('')
    const ok = await enviar(t)
    if (!ok) { setTexto(t); setError('No se ha podido enviar. Inténtalo de nuevo.') } else setError('')
  }

  return (
    <div className="screen" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="chat-header">
        <button className="back-btn" onClick={volver}>←</button>
        <div className={`avatar ${otro.color}`} style={{ width: 28, height: 28, fontSize: 10, cursor: 'pointer' }} onClick={abrirPerfil}>{otro.iniciales}</div>
        <div style={{ flex: 1, cursor: 'pointer' }} onClick={abrirPerfil}>
          <div className="partner-name" style={{ fontSize: 12 }}>{otro.nombre}</div>
          <div className="partner-sub">{otro.mejorTiempo ? `⏱ ${otro.mejorTiempo}${otro.verificado ? ' ✓' : ''}` : otro.ciudad}</div>
        </div>
        <button className="btn-elegir" onClick={() => elegirPareja(otro)}>Elegir pareja ⚡</button>
      </div>
      <div className="chat-messages">
        {cargando && <div className="video-empty">Cargando…</div>}
        {!cargando && mensajes.length === 0 && <div className="video-empty">Aún no hay mensajes. ¡Rompe el hielo!</div>}
        {mensajes.map(m => (
          <div key={m.id} className={`msg ${m.de === yo.id ? 'msg-yo' : 'msg-ellos'}`}>
            {m.texto}
            <span className="msg-hora">{horaCorta(m.created_at)}</span>
          </div>
        ))}
        <div ref={final} />
      </div>
      {error && <div className="acceso-estado" style={{ padding: '0 8px' }}>{error}</div>}
      <div className="chat-input">
        <input value={texto} onChange={e => setTexto(e.target.value)} onKeyDown={e => e.key === 'Enter' && mandar()} placeholder="Escribe un mensaje..." maxLength={2000} />
        <button onClick={mandar}>→</button>
      </div>
    </div>
  )
}
