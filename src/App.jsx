import { useState } from 'react'
import './App.css'

const candidatos = [
  { id:1, iniciales:'AL', color:'purple', nombre:'Ana López', ciudad:'Madrid · 3.2 km', rating:1820, club:'CrossFit Retiro', fortalezas:[{ex:'Ski erg',pct:88},{ex:'Lunges',pct:92},{ex:'Wall balls',pct:75}] },
  { id:2, iniciales:'JM', color:'blue', nombre:'Javi Molina', ciudad:'Madrid · 5.8 km', rating:1795, club:'Pairx MAD', fortalezas:[{ex:'Rowing',pct:95},{ex:'Sled push',pct:80},{ex:'Burpees',pct:78}] },
  { id:3, iniciales:'SR', color:'green', nombre:'Sara Ruiz', ciudad:'Madrid · 2.1 km', rating:1855, club:'Sin club', fortalezas:[{ex:'Wall balls',pct:91},{ex:'Farmer carry',pct:88},{ex:'Ski erg',pct:82}] },
]

const solicitudesRecibidas = [
  { id:4, iniciales:'PM', color:'orange', nombre:'Pablo Martín', ciudad:'Madrid · 4.5 km', rating:1810, club:'Pairx MAD', mensaje:'Hola! Vi tu perfil y creo que somos buena pareja. Tengo competición en junio.' },
  { id:5, iniciales:'LG', color:'teal', nombre:'Laura García', ciudad:'Madrid · 1.8 km', rating:1830, club:'CrossFit Retiro', mensaje:'Me complemento bien contigo en los ejercicios. ¿Hablamos?' },
]

export default function App() {
  const [pantalla, setPantalla] = useState('inicio')
  const [subPantalla, setSubPantalla] = useState('buscar')
  const [indice, setIndice] = useState(0)
  const [chats, setChats] = useState([])
  const [chatActivo, setChatActivo] = useState(null)
  const [mensajes, setMensajes] = useState({})
  const [inputMsg, setInputMsg] = useState('')
  const [pareja, setPareja] = useState(null)

  const aceptarSolicitud = (persona) => {
    if (!chats.find(c => c.id === persona.id)) {
      setChats(prev => [...prev, persona])
      setMensajes(prev => ({ ...prev, [persona.id]: [{ de:'ellos', texto: persona.mensaje }] }))
    }
    setSubPantalla('chats')
  }

  const enviarMensaje = (id) => {
    if (!inputMsg.trim()) return
    setMensajes(prev => ({
      ...prev,
      [id]: [...(prev[id] || []), { de:'yo', texto: inputMsg }]
    }))
    setInputMsg('')
  }

  const elegirPareja = (persona) => {
    setPareja(persona)
    setSubPantalla('buscar')
    setPantalla('inicio')
  }

  return (
    <div className="app">
      <div className="phone">
        <div className="notch"></div>
        {pantalla === 'inicio' && <Inicio pareja={pareja} />}
        {pantalla === 'entrenos' && <Entrenos />}
        {pantalla === 'parejas' && (
          <Parejas
            subPantalla={subPantalla}
            setSubPantalla={setSubPantalla}
            indice={indice}
            setIndice={setIndice}
            chats={chats}
            chatActivo={chatActivo}
            setChatActivo={setChatActivo}
            mensajes={mensajes}
            inputMsg={inputMsg}
            setInputMsg={setInputMsg}
            enviarMensaje={enviarMensaje}
            aceptarSolicitud={aceptarSolicitud}
            elegirPareja={elegirPareja}
            solicitudesRecibidas={solicitudesRecibidas}
            pareja={pareja}
          />
        )}
        {pantalla === 'rankings' && <Rankings />}
        {pantalla === 'perfil' && <Perfil />}
        <nav className="tab-bar">
          <button className={pantalla==='inicio'?'active':''} onClick={()=>setPantalla('inicio')}><span>⌂</span><span>Inicio</span></button>
          <button className={pantalla==='entrenos'?'active':''} onClick={()=>setPantalla('entrenos')}><span>▦</span><span>Entrenos</span></button>
          <button className={pantalla==='parejas'?'active':''} onClick={()=>{setPantalla('parejas');setSubPantalla('buscar')}}><span>⚇</span><span>Parejas</span></button>
          <button className={pantalla==='rankings'?'active':''} onClick={()=>setPantalla('rankings')}><span>🏆</span><span>Rankings</span></button>
          <button className={pantalla==='perfil'?'active':''} onClick={()=>setPantalla('perfil')}><span>◉</span><span>Perfil</span></button>
        </nav>
      </div>
    </div>
  )
}

function Inicio({ pareja }) {
  return (
    <div className="screen">
      <div className="hero-header">
        <div>
          <div className="greeting">Buenos días</div>
          <div className="name">Carlos R.</div>
        </div>
        <div>
          <div className="rating-badge">1.840 pts</div>
          <div className="rating-sub">Acreditado · Top 12%</div>
        </div>
      </div>
      <div className="next-race">
        <div className="race-label">Próxima carrera</div>
        <div className="race-name">HYROX Madrid · Doubles</div>
        <div className="race-meta">
          <span>📅 14 jun</span>
          <span>👥 {pareja ? pareja.nombre : 'Marta G.'}</span>
          <span>⏱ 23 días</span>
        </div>
      </div>
      <div className="section-label">Tu pareja</div>
      <div className="card">
        <div className="partner-row">
          <div className="avatar yellow">CR</div>
          <div className="partner-info">
            <div className="partner-name">Tú — Carlos R.</div>
            <div className="partner-sub">Sesión hace 1 día</div>
          </div>
          <div className="partner-rating">1.840</div>
        </div>
        <div className="divider-text">+ pareja</div>
        <div className="partner-row">
          <div className={`avatar ${pareja ? pareja.color : 'dark'}`}>{pareja ? pareja.iniciales : 'MG'}</div>
          <div className="partner-info">
            <div className="partner-name">{pareja ? pareja.nombre : 'Marta G.'}</div>
            <div className="partner-sub">Sesión hace 3 días</div>
          </div>
          <div className="partner-rating">{pareja ? pareja.rating : '1.790'}</div>
        </div>
      </div>
      <div className="section-label">Esta semana</div>
      <div className="stat-grid">
        <div className="stat-card"><div className="stat-val">6<span className="stat-unit">sess</span></div><div className="stat-lbl">Registradas</div></div>
        <div className="stat-card"><div className="stat-val">+42<span className="stat-unit">pts</span></div><div className="stat-lbl">Rating ganado</div></div>
        <div className="stat-card"><div className="stat-val">82<span className="stat-unit">kg</span></div><div className="stat-lbl">Farmer carry PR</div></div>
        <div className="stat-card"><div className="stat-val">4:12<span className="stat-unit">min</span></div><div className="stat-lbl">Ski erg 500m</div></div>
      </div>
    </div>
  )
}

function Entrenos() {
  return (
    <div className="screen">
      <div className="screen-title">Retos</div>
      <div className="screen-sub">Con Marta G.</div>
      <div className="section-label">Activos</div>
      <div className="reto-card">
        <div className="reto-header"><span className="reto-name">Ski erg 500m</span><span className="badge active">Activo</span></div>
        <div className="reto-desc">Marta te reta a bajar de <strong>4:20 min</strong></div>
        <div className="reto-footer"><span>⏱ 5 días restantes</span><span>Tu mejor: 4:28</span></div>
      </div>
      <div className="reto-card">
        <div className="reto-header"><span className="reto-name">Wall balls · 50 reps</span><span className="badge active">Activo</span></div>
        <div className="reto-desc">Tú retas a Marta: <strong>&lt;3:45 min</strong></div>
        <div className="reto-footer"><span>⏱ 2 días restantes</span><span>Mejor de Marta: 3:52</span></div>
      </div>
      <div className="section-label">Completados</div>
      <div className="reto-card faded">
        <div className="reto-header"><span className="reto-name">Rowing 500m</span><span className="badge done">Conseguido</span></div>
        <div className="reto-desc">Marta bajó de 1:58 min · hace 4 días</div>
      </div>
      <div className="btn-primary">+ Lanzar nuevo reto</div>
    </div>
  )
}

function Parejas({ subPantalla, setSubPantalla, indice, setIndice, chats, chatActivo, setChatActivo, mensajes, inputMsg, setInputMsg, enviarMensaje, aceptarSolicitud, elegirPareja, solicitudesRecibidas, pareja }) {

  if (chatActivo) {
    const msgs = mensajes[chatActivo.id] || []
    return (
      <div className="screen" style={{display:'flex',flexDirection:'column',height:'100%'}}>
        <div className="chat-header">
          <button className="back-btn" onClick={()=>setChatActivo(null)}>←</button>
          <div className={`avatar ${chatActivo.color}`} style={{width:28,height:28,fontSize:10}}>{chatActivo.iniciales}</div>
          <div style={{flex:1}}>
            <div className="partner-name" style={{fontSize:12}}>{chatActivo.nombre}</div>
            <div className="partner-sub">Rating {chatActivo.rating}</div>
          </div>
          <button className="btn-elegir" onClick={()=>elegirPareja(chatActivo)}>Elegir pareja ⚡</button>
        </div>
        <div className="chat-messages">
          {msgs.map((m,i) => (
            <div key={i} className={`msg ${m.de==='yo'?'msg-yo':'msg-ellos'}`}>{m.texto}</div>
          ))}
        </div>
        <div className="chat-input">
          <input
            value={inputMsg}
            onChange={e=>setInputMsg(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&enviarMensaje(chatActivo.id)}
            placeholder="Escribe un mensaje..."
          />
          <button onClick={()=>enviarMensaje(chatActivo.id)}>→</button>
        </div>
      </div>
    )
  }

  const candidato = candidatos[indice]

  return (
    <div className="screen">
      <div className="parejas-tabs">
        <button className={subPantalla==='buscar'?'active':''} onClick={()=>setSubPantalla('buscar')}>Buscar</button>
        <button className={subPantalla==='solicitudes'?'active':''} onClick={()=>setSubPantalla('solicitudes')}>
          Solicitudes {solicitudesRecibidas.length > 0 && <span className="notif">{solicitudesRecibidas.length}</span>}
        </button>
        <button className={subPantalla==='chats'?'active':''} onClick={()=>setSubPantalla('chats')}>
          Chats {chats.length > 0 && <span className="notif">{chats.length}</span>}
        </button>
      </div>

      {subPantalla === 'buscar' && (
        <div>
          {indice < candidatos.length ? (
            <div className="swipe-card">
              <div className="swipe-avatar-wrap">
                <div className={`avatar ${candidato.color}`} style={{width:64,height:64,fontSize:22}}>{candidato.iniciales}</div>
              </div>
              <div className="swipe-name">{candidato.nombre}</div>
              <div className="swipe-sub">📍 {candidato.ciudad} · {candidato.club}</div>
              <div className="rating-badge" style={{margin:'6px auto',display:'block',width:'fit-content'}}>{candidato.rating} pts</div>
              <div className="bars" style={{marginTop:12}}>
                {candidato.fortalezas.map(f => (
                  <div className="bar-row" key={f.ex}>
                    <span className="bar-lbl">{f.ex}</span>
                    <div className="bar-track"><div className="bar-fill" style={{width:`${f.pct}%`}}></div></div>
                    <span className="bar-val">{f.pct}%</span>
                  </div>
                ))}
              </div>
              <div className="swipe-actions">
                <button className="btn-pass" onClick={()=>setIndice(i=>Math.min(i+1,candidatos.length))}>✕ Pasar</button>
                <button className="btn-match" onClick={()=>setIndice(i=>Math.min(i+1,candidatos.length))}>Solicitar →</button>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <div style={{fontSize:32}}>🎯</div>
              <div style={{color:'#555',marginTop:8,fontSize:12}}>No hay más candidatos por ahora</div>
              <button className="btn-primary" style={{marginTop:12}} onClick={()=>setIndice(0)}>Volver a empezar</button>
            </div>
          )}
        </div>
      )}

      {subPantalla === 'solicitudes' && (
        <div>
          <div className="screen-sub" style={{marginTop:8}}>Personas interesadas en ser tu pareja</div>
          {solicitudesRecibidas.map(s => (
            <div className="card" key={s.id}>
              <div className="partner-row" style={{marginBottom:8}}>
                <div className={`avatar ${s.color}`}>{s.iniciales}</div>
                <div className="partner-info">
                  <div className="partner-name">{s.nombre}</div>
                  <div className="partner-sub">📍 {s.ciudad} · {s.rating} pts</div>
                </div>
              </div>
              <div className="reto-desc" style={{marginBottom:10}}>"{s.mensaje}"</div>
              <div className="match-actions">
                <button className="btn-pass">Rechazar</button>
                <button className="btn-match" onClick={()=>aceptarSolicitud(s)}>Aceptar y chatear →</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {subPantalla === 'chats' && (
        <div>
          <div className="screen-sub" style={{marginTop:8}}>Conversaciones activas</div>
          {chats.length === 0 ? (
            <div className="empty-state">
              <div style={{fontSize:32}}>💬</div>
              <div style={{color:'#555',marginTop:8,fontSize:12}}>Acepta solicitudes para empezar a chatear</div>
            </div>
          ) : (
            chats.map(c => (
              <div className="card" key={c.id} onClick={()=>setChatActivo(c)} style={{cursor:'pointer'}}>
                <div className="partner-row">
                  <div className={`avatar ${c.color}`}>{c.iniciales}</div>
                  <div className="partner-info">
                    <div className="partner-name">{c.nombre}</div>
                    <div className="partner-sub">{(mensajes[c.id]||[]).slice(-1)[0]?.texto || 'Sin mensajes'}</div>
                  </div>
                  <div style={{fontSize:9,color:'#444'}}>ahora</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

function Rankings() {
  const clubRanking = [
    { pos:1, nombre:'Pairx Elite BCN', pts:1920, miembros:12, bandera:'🥇' },
    { pos:2, nombre:'CrossFit Retiro MAD', pts:1875, miembros:18, bandera:'🥈' },
    { pos:3, nombre:'Pairx MAD', pts:1842, miembros:9, bandera:'🥉' },
    { pos:4, nombre:'Athletic Club BIL', pts:1810, miembros:15, bandera:'' },
    { pos:5, nombre:'Valencia Pairx', pts:1798, miembros:11, bandera:'' },
  ]

  return (
    <div className="screen">
      <div className="screen-title">Rankings</div>

      <div className="section-label">Tu posición personal</div>
      <div className="card">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
          <div className="partner-name">Carlos R.</div>
          <div className="rating-badge">1.840 pts</div>
        </div>
        <div className="rank-levels">
          <div className="rank-item">
            <div className="rank-pos">#4</div>
            <div className="rank-lbl">Madrid</div>
          </div>
          <div className="rank-divider"></div>
          <div className="rank-item">
            <div className="rank-pos">#47</div>
            <div className="rank-lbl">España</div>
          </div>
          <div className="rank-divider"></div>
          <div className="rank-item">
            <div className="rank-pos">#312</div>
            <div className="rank-lbl">Global</div>
          </div>
        </div>
      </div>

      <div className="section-label">Tu club</div>
      <div className="card" style={{marginBottom:12}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
          <div>
            <div className="partner-name">Pairx MAD</div>
            <div className="partner-sub">9 miembros acreditados</div>
          </div>
          <div className="rating-badge">1.842 pts</div>
        </div>
        <div className="rank-levels">
          <div className="rank-item">
            <div className="rank-pos">#2</div>
            <div className="rank-lbl">Madrid</div>
          </div>
          <div className="rank-divider"></div>
          <div className="rank-item">
            <div className="rank-pos">#8</div>
            <div className="rank-lbl">España</div>
          </div>
          <div className="rank-divider"></div>
          <div className="rank-item">
            <div className="rank-pos">#64</div>
            <div className="rank-lbl">Global</div>
          </div>
        </div>
      </div>

      <div className="section-label">🏆 Ranking de clubs — España</div>
      {clubRanking.map(c => (
        <div key={c.pos} className={`ranking-row ${c.nombre === 'Pairx MAD' ? 'my-club' : ''}`}>
          <div className="rank-num">{c.bandera || `#${c.pos}`}</div>
          <div className="partner-info">
            <div className="partner-name" style={{fontSize:11}}>{c.nombre}</div>
            <div className="partner-sub">{c.miembros} miembros acreditados</div>
          </div>
          <div className="partner-rating">{c.pts}</div>
        </div>
      ))}
    </div>
  )
}

function Perfil() {
  const carreras = [
    {nombre:'HYROX Madrid 2024', tipo:'Doubles · con Marta G.', tiempo:'1:18:42', top:'Top 8%'},
    {nombre:'Pairx Barcelona 2024', tipo:'Individual', tiempo:'58:14', top:'Top 15%'},
    {nombre:'CrossFit Open 2023', tipo:'Prueba acreditada', tiempo:'Acreditado', top:''},
  ]
  const marcas = [
    {ex:'Ski erg', val:'4:12', pct:84},
    {ex:'Rowing', val:'1:52', pct:91},
    {ex:'Wall balls', val:'3:48', pct:76},
    {ex:'Lunges', val:'4:55', pct:68},
  ]
  return (
    <div className="screen">
      <div className="profile-header">
        <div className="avatar yellow large">CR</div>
        <div style={{flex:1}}>
          <div className="partner-name" style={{fontSize:16}}>Carlos R.</div>
          <div className="partner-sub">📍 Madrid · Pairx MAD</div>
        </div>
        <div style={{textAlign:'right'}}>
          <div className="rating-badge">1.840</div>
          <div className="rating-sub">Top 12% nacional</div>
        </div>
      </div>
      <div className="stat-grid">
        <div className="stat-card"><div className="stat-val">8</div><div className="stat-lbl">Carreras oficiales</div></div>
        <div className="stat-card"><div className="stat-val">3</div><div className="stat-lbl">En Doubles</div></div>
        <div className="stat-card"><div className="stat-val">1:18<span className="stat-unit">h</span></div><div className="stat-lbl">Mejor tiempo</div></div>
      </div>
      <div className="section-label">Historial acreditado</div>
      {carreras.map(c => (
        <div className="oficial-row" key={c.nombre}>
          <div style={{flex:1}}>
            <div className="partner-name">{c.nombre}</div>
            <div className="partner-sub">{c.tipo}</div>
          </div>
          <div style={{textAlign:'right'}}>
            <div className="partner-rating">{c.tiempo}</div>
            <div className="partner-sub">{c.top}</div>
          </div>
        </div>
      ))}
      <div className="section-label">Mejores marcas</div>
      {marcas.map(m => (
        <div className="bar-row" key={m.ex}>
          <span className="bar-lbl">{m.ex}</span>
          <div className="bar-track"><div className="bar-fill" style={{width:`${m.pct}%`}}></div></div>
          <span className="bar-val">{m.val}</span>
        </div>
      ))}
    </div>
  )
}
