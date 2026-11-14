import { Avatar } from './Avatar'
import { useEffect, useRef, useState } from 'react'
import { horaCorta, useConversacion } from './social'
import { ChevronLeft, Send } from 'lucide-react'
import { MenuUsuario } from './MenuUsuario'

// Chat con otro usuario real, en tiempo real
export function ChatReal({ yo, otro, volver, elegirPareja, abrirPerfil, trasBloquear }) {
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
    <div className="screen chat">
      <div className="chat-header">
        <button className="back-btn" onClick={volver} aria-label="Volver"><ChevronLeft size={22} /></button>
        <Avatar p={otro} onClick={abrirPerfil} />
        <div className="fila-cuerpo" style={{ cursor: 'pointer' }} onClick={abrirPerfil}>
          <div className="fila-titulo">{otro.nombre}</div>
          <div className="fila-sub">{otro.verificado && otro.mejorTiempo ? `Mejor: ${otro.mejorTiempo}` : otro.ciudad}</div>
        </div>
        <button className="btn-elegir" onClick={() => elegirPareja(otro)}>Elegir</button>
        <MenuUsuario yoId={yo.id} persona={otro} contexto="chat" onBloqueado={trasBloquear} />
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
      {error && <div className="acceso-estado">{error}</div>}
      <div className="chat-input">
        <input value={texto} onChange={e => setTexto(e.target.value)} onKeyDown={e => e.key === 'Enter' && mandar()} placeholder="Escribe un mensaje..." maxLength={2000} />
        <button onClick={mandar} aria-label="Enviar"><Send size={20} /></button>
      </div>
    </div>
  )
}
