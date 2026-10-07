import { useState } from 'react'
import './App.css'
import { MisVideos, VideosDe } from './Videos'

const candidatos = [
  { id:1, iniciales:'AL', color:'purple', nombre:'Ana López', ciudad:'Madrid', distancia:'3.2 km', sexo:'Mujer', categoria:'Open', compitio:true, rating:1820, club:'CrossFit Retiro', mejorTiempo:'1:14:20', carreras:[{nombre:'Madrid 2025',tipo:'Doubles Open',tiempo:'1:14:20'},{nombre:'Valencia 2025',tipo:'Individual Open',tiempo:'1:22:05'}], marcas:[{ex:'Ski erg 1000m',val:'4:05'},{ex:'Rowing 1000m',val:'4:12'},{ex:'Wall balls 100',val:'5:40'},{ex:'Run 1 km',val:'4:35'}], fortalezas:[{ex:'Ski erg',pct:88},{ex:'Lunges',pct:92},{ex:'Wall balls',pct:75}] },
  { id:2, iniciales:'JM', color:'blue', nombre:'Javi Molina', ciudad:'Madrid', distancia:'5.8 km', sexo:'Hombre', categoria:'Pro', compitio:true, rating:1795, club:'Hybrid MAD', mejorTiempo:'1:02:48', carreras:[{nombre:'Barcelona 2025',tipo:'Doubles Pro',tiempo:'1:02:48'}], marcas:[{ex:'Ski erg 1000m',val:'3:41'},{ex:'Rowing 1000m',val:'3:28'},{ex:'Sled push 50m',val:'2:10'},{ex:'Run 1 km',val:'3:55'}], fortalezas:[{ex:'Rowing',pct:95},{ex:'Sled push',pct:80},{ex:'Burpees',pct:78}] },
  { id:3, iniciales:'SR', color:'green', nombre:'Sara Ruiz', ciudad:'Madrid', distancia:'2.1 km', sexo:'Mujer', categoria:'Open', compitio:false, rating:null, club:'Sin club', mejorTiempo:null, carreras:[], marcas:[{ex:'Ski erg 1000m',val:'4:18'},{ex:'Wall balls 100',val:'5:05'},{ex:'Farmer carry 200m',val:'1:48'},{ex:'Run 1 km',val:'4:40'}], fortalezas:[{ex:'Wall balls',pct:91},{ex:'Farmer carry',pct:88},{ex:'Ski erg',pct:82}] },
  { id:6, iniciales:'DP', color:'orange', nombre:'David Pons', ciudad:'Barcelona', distancia:'1.4 km', sexo:'Hombre', categoria:'Open', compitio:true, rating:1760, club:'Hybrid BCN', mejorTiempo:'1:09:30', carreras:[{nombre:'Barcelona 2025',tipo:'Doubles Open',tiempo:'1:09:30'}], marcas:[{ex:'Sled pull 50m',val:'2:25'},{ex:'Run 1 km',val:'3:50'},{ex:'Rowing 1000m',val:'3:45'},{ex:'Lunges 100m',val:'4:30'}], fortalezas:[{ex:'Sled pull',pct:90},{ex:'Running',pct:85},{ex:'Lunges',pct:72}] },
  { id:7, iniciales:'CM', color:'teal', nombre:'Clara Martí', ciudad:'Valencia', distancia:'2.7 km', sexo:'Mujer', categoria:'Pro', compitio:true, rating:1870, club:'Valencia Hybrid', mejorTiempo:'1:05:12', carreras:[{nombre:'Valencia 2025',tipo:'Doubles Pro',tiempo:'1:05:12'},{nombre:'Madrid 2025',tipo:'Individual Pro',tiempo:'1:11:40'}], marcas:[{ex:'Run 1 km',val:'3:42'},{ex:'Rowing 1000m',val:'3:52'},{ex:'Wall balls 100',val:'4:20'},{ex:'Ski erg 1000m',val:'3:58'}], fortalezas:[{ex:'Running',pct:94},{ex:'Rowing',pct:89},{ex:'Wall balls',pct:83}] },
  { id:8, iniciales:'IV', color:'blue', nombre:'Iker Villa', ciudad:'Valencia', distancia:'6.3 km', sexo:'Hombre', categoria:'Open', compitio:false, rating:null, club:'CrossFit Turia', mejorTiempo:null, carreras:[], marcas:[{ex:'Burpee broad jumps 80m',val:'3:55'},{ex:'Sled push 50m',val:'2:30'},{ex:'Ski erg 1000m',val:'4:25'},{ex:'Run 1 km',val:'4:10'}], fortalezas:[{ex:'Burpees',pct:87},{ex:'Sled push',pct:84},{ex:'Ski erg',pct:70}] },
]

const plazasIniciales = [
  { id:101, autor:{ id:101, iniciales:'MR', color:'teal', nombre:'Marcos Ríos' }, tipo:'Busco sustituto', carrera:'Madrid', fecha:'14 jun', categoria:'Doubles Open', flex:true, nota:'Mi pareja se ha lesionado. Buscamos chico ritmo ~1:15.' },
  { id:102, autor:{ id:102, iniciales:'EG', color:'purple', nombre:'Elena Gil' }, tipo:'Cedo mi plaza', carrera:'Barcelona', fecha:'22 may', categoria:'Individual Open', flex:true, nota:'No puedo ir por trabajo. Cambio de nombre con el organizador.' },
  { id:103, autor:{ id:103, iniciales:'TS', color:'orange', nombre:'Toni Serra' }, tipo:'Cedo mi plaza', carrera:'Valencia', fecha:'8 mar', categoria:'Doubles Pro', flex:false, nota:'Entrada sin Flex, consultar con antes.' },
]

const CIUDADES = [...new Set(candidatos.map(c => c.ciudad))]
const FILTROS_INICIALES = { texto:'', compitio:'Todos', ciudad:'Todas', categoria:'Todas', sexo:'Todos' }

const solicitudesRecibidas = [
  { id:4, iniciales:'PM', color:'orange', nombre:'Pablo Martín', ciudad:'Madrid · 4.5 km', rating:1810, club:'Hybrid MAD', mensaje:'Hola! Vi tu perfil y creo que somos buena pareja. Tengo competición en junio.' },
  { id:5, iniciales:'LG', color:'teal', nombre:'Laura García', ciudad:'Madrid · 1.8 km', rating:1830, club:'CrossFit Retiro', mensaje:'Me complemento bien contigo en los ejercicios. ¿Hablamos?' },
]

export default function App() {
  const [pantalla, setPantalla] = useState('inicio')
  const [subPantalla, setSubPantalla] = useState('buscar')
  const [indice, setIndice] = useState(0)
  const [filtros, setFiltros] = useState(FILTROS_INICIALES)
  const [perfilAbierto, setPerfilAbierto] = useState(null)
  const [chats, setChats] = useState([])
  const [chatActivo, setChatActivo] = useState(null)
  const [mensajes, setMensajes] = useState({})
  const [inputMsg, setInputMsg] = useState('')
  const [pareja, setPareja] = useState(null)

  const [plazas, setPlazas] = useState(plazasIniciales)

  const contactarPlaza = (plaza) => {
    const persona = plaza.autor
    if (!chats.find(c => c.id === persona.id)) {
      setChats(prev => [...prev, persona])
      setMensajes(prev => ({ ...prev, [persona.id]: [{ de:'yo', texto:`Hola! Me interesa tu plaza para ${plaza.carrera} (${plaza.categoria}, ${plaza.fecha}).` }] }))
    }
    setChatActivo(persona)
  }

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
            filtros={filtros}
            setFiltros={setFiltros}
            perfilAbierto={perfilAbierto}
            plazas={plazas}
            setPlazas={setPlazas}
            contactarPlaza={contactarPlaza}
            setPerfilAbierto={setPerfilAbierto}
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
          <button className={pantalla==='parejas'?'active':''} onClick={()=>{setPantalla('parejas');setSubPantalla('buscar');setPerfilAbierto(null)}}><span>⚇</span><span>Parejas</span></button>
          <button className={pantalla==='rankings'?'active':''} onClick={()=>setPantalla('rankings')}><span>🏆</span><span>Rankings</span></button>
          <button className={pantalla==='perfil'?'active':''} onClick={()=>setPantalla('perfil')}><span>◉</span><span>Perfil</span></button>
        </nav>
      </div>
    </div>
  )
}

export function Inicio({ pareja }) {
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
        <div className="race-name">Madrid · Doubles</div>
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

export function Entrenos() {
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
        <div className="reto-desc">Tú retas a Marta: <strong>menos de 3:45 min</strong></div>
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

// Fase 2: plan de carrera con IA (oculto en el MVP, no se muestra en la navegación)
export function PlanIA() {
  const splits = [
    ['Ski erg','60%','40%'],
    ['Sled push','50%','50%'],
    ['Rowing','45%','55%'],
    ['Lunges','40%','60%'],
    ['Wall balls','55%','45%'],
    ['Burpees','50%','50%'],
  ]
  return (
    <div className="screen">
      <div className="screen-title">Plan de carrera</div>
      <div className="screen-sub">Madrid · 14 jun · con Marta G.</div>
      <div className="ai-card">
        <div className="ai-header"><span className="ai-dot"></span><span className="ai-label">IA · basado en 34 sesiones</span></div>
        <div className="ai-title">Distribución óptima para vuestro dúo</div>
        <div className="split-header"><span style={{flex:1}}>Ejercicio</span><span>Tú</span><span>Marta</span></div>
        {splits.map(([ex, tu, ella]) => (
          <div className="split-row" key={ex}>
            <span style={{flex:1}}>{ex}</span>
            <span className="split-you">{tu}</span>
            <span className="split-partner">{ella}</span>
          </div>
        ))}
      </div>
      <div className="time-card">
        <div className="time-label">Tiempo estimado</div>
        <div className="time-val">1:24:30</div>
        <div className="time-sub">Top 15% de vuestra categoría</div>
      </div>
    </div>
  )
}

export function Rankings() {
  const clubRanking = [
    { pos:1, nombre:'Elite Hybrid BCN', pts:1920, miembros:12, bandera:'🥇' },
    { pos:2, nombre:'CrossFit Retiro MAD', pts:1875, miembros:18, bandera:'🥈' },
    { pos:3, nombre:'Hybrid MAD', pts:1842, miembros:9, bandera:'🥉' },
    { pos:4, nombre:'Athletic Club BIL', pts:1810, miembros:15, bandera:'' },
    { pos:5, nombre:'Valencia Hybrid', pts:1798, miembros:11, bandera:'' },
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
          <div className="rank-item"><div className="rank-pos">#4</div><div className="rank-lbl">Madrid</div></div>
          <div className="rank-divider"></div>
          <div className="rank-item"><div className="rank-pos">#47</div><div className="rank-lbl">España</div></div>
          <div className="rank-divider"></div>
          <div className="rank-item"><div className="rank-pos">#312</div><div className="rank-lbl">Global</div></div>
        </div>
      </div>
      <div className="section-label">Tu club</div>
      <div className="card" style={{marginBottom:12}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
          <div>
            <div className="partner-name">Hybrid MAD</div>
            <div className="partner-sub">9 miembros acreditados</div>
          </div>
          <div className="rating-badge">1.842 pts</div>
        </div>
        <div className="rank-levels">
          <div className="rank-item"><div className="rank-pos">#2</div><div className="rank-lbl">Madrid</div></div>
          <div className="rank-divider"></div>
          <div className="rank-item"><div className="rank-pos">#8</div><div className="rank-lbl">España</div></div>
          <div className="rank-divider"></div>
          <div className="rank-item"><div className="rank-pos">#64</div><div className="rank-lbl">Global</div></div>
        </div>
      </div>
      <div className="section-label">🏆 Ranking de clubs — España</div>
      {clubRanking.map(c => (
        <div key={c.pos} className={`ranking-row ${c.nombre === 'Hybrid MAD' ? 'my-club' : ''}`}>
          <div className="rank-num">{c.bandera || '#'+c.pos}</div>
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

export function Perfil() {
  const carreras = [
    {nombre:'Madrid 2024', tipo:'Doubles · con Marta G.', tiempo:'1:18:42', top:'Top 8%'},
    {nombre:'Barcelona 2024', tipo:'Individual', tiempo:'58:14', top:'Top 15%'},
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
          <div className="partner-sub">📍 Madrid · Hybrid MAD</div>
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
          <div className="bar-track"><div className="bar-fill" style={{width:m.pct+'%'}}></div></div>
          <span className="bar-val">{m.val}</span>
        </div>
      ))}
      <MisVideos autor="Carlos R." />
    </div>
  )
}

function Parejas({ subPantalla, setSubPantalla, indice, setIndice, filtros, setFiltros, perfilAbierto, setPerfilAbierto, plazas, setPlazas, contactarPlaza, chats, chatActivo, setChatActivo, mensajes, inputMsg, setInputMsg, enviarMensaje, aceptarSolicitud, elegirPareja, solicitudesRecibidas, pareja }) {
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
          <input value={inputMsg} onChange={e=>setInputMsg(e.target.value)} onKeyDown={e=>e.key==='Enter'&&enviarMensaje(chatActivo.id)} placeholder="Escribe un mensaje..."/>
          <button onClick={()=>enviarMensaje(chatActivo.id)}>→</button>
        </div>
      </div>
    )
  }
  if (perfilAbierto) {
    return <PerfilOtro persona={perfilAbierto} volver={()=>setPerfilAbierto(null)} solicitar={()=>{setPerfilAbierto(null);setIndice(i=>i+1)}} />
  }
  const t = filtros.texto.trim().toLowerCase()
  const lista = candidatos.filter(c =>
    (!t || c.nombre.toLowerCase().includes(t) || c.club.toLowerCase().includes(t)) &&
    (filtros.compitio === 'Todos' || (filtros.compitio === 'Ya ha competido') === c.compitio) &&
    (filtros.ciudad === 'Todas' || c.ciudad === filtros.ciudad) &&
    (filtros.categoria === 'Todas' || c.categoria === filtros.categoria) &&
    (filtros.sexo === 'Todos' || c.sexo === filtros.sexo)
  )
  const candidato = lista[indice]
  const cambiarFiltro = (campo, valor) => { setFiltros(f => ({ ...f, [campo]: valor })); setIndice(0) }
  return (
    <div className="screen">
      <div className="parejas-tabs">
        <button className={subPantalla==='buscar'?'active':''} onClick={()=>setSubPantalla('buscar')}>Buscar</button>
        <button className={subPantalla==='solicitudes'?'active':''} onClick={()=>setSubPantalla('solicitudes')}>Solicitudes {solicitudesRecibidas.length > 0 && <span className="notif">{solicitudesRecibidas.length}</span>}</button>
        <button className={subPantalla==='chats'?'active':''} onClick={()=>setSubPantalla('chats')}>Chats {chats.length > 0 && <span className="notif">{chats.length}</span>}</button>
        <button className={subPantalla==='plazas'?'active':''} onClick={()=>setSubPantalla('plazas')}>Plazas</button>
      </div>
      {subPantalla === 'buscar' && (
        <div>
          <Buscador filtros={filtros} cambiarFiltro={cambiarFiltro} total={lista.length} limpiar={()=>{setFiltros(FILTROS_INICIALES);setIndice(0)}} />
          {indice < lista.length ? (
            <div className="swipe-card">
              <div className="preficha" onClick={()=>setPerfilAbierto(candidato)}>
              <div className="swipe-avatar-wrap">
                <div className={`avatar ${candidato.color}`} style={{width:64,height:64,fontSize:22}}>{candidato.iniciales}</div>
              </div>
              <div className="swipe-name">{candidato.nombre}</div>
              <div className="swipe-sub">📍 {candidato.ciudad} · {candidato.distancia} · {candidato.club}</div>
              <div className="swipe-tags"><span>{candidato.sexo}</span><span>{candidato.categoria}</span>{candidato.mejorTiempo && <span>⏱ Mejor: {candidato.mejorTiempo}</span>}</div>
              {candidato.compitio
                ? <div className="rating-badge" style={{margin:'6px auto',display:'block',width:'fit-content'}}>{candidato.rating} pts</div>
                : <div className="badge norating" style={{margin:'6px auto',display:'block',width:'fit-content'}}>Aún no ha competido</div>}
              <div className="bars" style={{marginTop:12}}>
                {candidato.fortalezas.map(f => (
                  <div className="bar-row" key={f.ex}>
                    <span className="bar-lbl">{f.ex}</span>
                    <div className="bar-track"><div className="bar-fill" style={{width:f.pct+'%'}}></div></div>
                    <span className="bar-val">{f.pct}%</span>
                  </div>
                ))}
              </div>
              <div className="ver-perfil">Ver perfil y vídeos →</div>
              </div>
              <div className="swipe-actions">
                <button className="btn-pass" onClick={()=>setIndice(i=>Math.min(i+1,lista.length))}>✕ Pasar</button>
                <button className="btn-match" onClick={()=>setIndice(i=>Math.min(i+1,lista.length))}>Solicitar →</button>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <div style={{fontSize:32}}>🎯</div>
              <div style={{color:'#aaa',marginTop:8,fontSize:12}}>No hay más candidatos con estos filtros</div>
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
      {subPantalla === 'plazas' && <Plazas plazas={plazas} setPlazas={setPlazas} contactar={contactarPlaza} />}
      {subPantalla === 'chats' && (
        <div>
          <div className="screen-sub" style={{marginTop:8}}>Conversaciones activas</div>
          {chats.length === 0 ? (
            <div className="empty-state">
              <div style={{fontSize:32}}>💬</div>
              <div style={{color:'#aaa',marginTop:8,fontSize:12}}>Acepta solicitudes para empezar a chatear</div>
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
                  <div style={{fontSize:9,color:'#aaa'}}>ahora</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

function Buscador({ filtros, cambiarFiltro, total, limpiar }) {
  const [abierto, setAbierto] = useState(false)
  const activos = ['compitio','ciudad','categoria','sexo'].filter(k => filtros[k] !== FILTROS_INICIALES[k]).length
  return (
    <div className="buscador">
      <div className="buscador-row">
        <input className="buscador-input" value={filtros.texto} onChange={e=>cambiarFiltro('texto',e.target.value)} placeholder="🔍 Buscar por nombre o club" />
        <button className={activos?'filtro-btn active':'filtro-btn'} onClick={()=>setAbierto(a=>!a)}>⚙ Filtros{activos ? ` (${activos})` : ''}</button>
      </div>
      {abierto && (
        <div className="filtros-panel">
          <Grupo filtros={filtros} cambiarFiltro={cambiarFiltro} campo="compitio" titulo="Experiencia" opciones={['Todos','Ya ha competido','Aún no ha competido']} />
          <Grupo filtros={filtros} cambiarFiltro={cambiarFiltro} campo="ciudad" titulo="Localización" opciones={['Todas', ...CIUDADES]} />
          <Grupo filtros={filtros} cambiarFiltro={cambiarFiltro} campo="categoria" titulo="Categoría" opciones={['Todas','Open','Pro']} />
          <Grupo filtros={filtros} cambiarFiltro={cambiarFiltro} campo="sexo" titulo="Sexo" opciones={['Todos','Mujer','Hombre']} />
          <div className="filtros-footer">
            <span>{total} {total===1?'resultado':'resultados'}</span>
            <button className="link-btn" onClick={limpiar}>Limpiar filtros</button>
          </div>
        </div>
      )}
    </div>
  )
}

function Grupo({ filtros, cambiarFiltro, campo, titulo, opciones }) {
  return (
    <div className="filtro-grupo">
      <div className="filtro-titulo">{titulo}</div>
      <div className="chips">
        {opciones.map(o => (
          <button key={o} className={filtros[campo]===o?'chip active':'chip'} onClick={()=>cambiarFiltro(campo,o)}>{o}</button>
        ))}
      </div>
    </div>
  )
}

function PerfilOtro({ persona, volver, solicitar }) {
  return (
    <div className="screen">
      <button className="link-btn" style={{margin:'10px 0'}} onClick={volver}>← Volver</button>
      <div className="profile-header">
        <div className={`avatar ${persona.color} large`}>{persona.iniciales}</div>
        <div style={{flex:1}}>
          <div className="partner-name" style={{fontSize:16}}>{persona.nombre}</div>
          <div className="partner-sub">📍 {persona.ciudad} · {persona.club}</div>
        </div>
        <div style={{textAlign:'right'}}>
          {persona.compitio
            ? <div className="rating-badge">{persona.rating}</div>
            : <div className="badge norating">Sin carreras</div>}
        </div>
      </div>
      <div className="swipe-tags" style={{justifyContent:'flex-start'}}>
        <span>{persona.sexo}</span><span>{persona.categoria}</span><span>{persona.compitio ? 'Ya ha competido' : 'Aún no ha competido'}</span>
      </div>
      <div className="section-label">Puntos fuertes</div>
      {persona.fortalezas.map(f => (
        <div className="bar-row" key={f.ex}>
          <span className="bar-lbl">{f.ex}</span>
          <div className="bar-track"><div className="bar-fill" style={{width:f.pct+'%'}}></div></div>
          <span className="bar-val">{f.pct}%</span>
        </div>
      ))}
      <div className="section-label">Mejores tiempos</div>
      {persona.marcas.map(m => (
        <div className="oficial-row" key={m.ex}>
          <div style={{flex:1}} className="partner-name">{m.ex}</div>
          <div className="partner-rating">{m.val}</div>
        </div>
      ))}
      <div className="section-label">Carreras</div>
      {persona.carreras.length === 0 ? (
        <div className="video-empty">Aún no ha competido: mira sus vídeos para comprobar sus tiempos.</div>
      ) : persona.carreras.map(c => (
        <div className="oficial-row" key={c.nombre}>
          <div style={{flex:1}}>
            <div className="partner-name">{c.nombre}</div>
            <div className="partner-sub">{c.tipo}</div>
          </div>
          <div className="partner-rating">{c.tiempo}</div>
        </div>
      ))}
      <VideosDe autor={persona.nombre} />
      <button className="btn-match" style={{width:'100%',marginTop:10}} onClick={solicitar}>Solicitar como pareja →</button>
    </div>
  )
}

const CATEGORIAS_PLAZA = ['Doubles Open','Doubles Pro','Individual Open','Individual Pro','Relay']
const PLAZA_VACIA = { tipo:'Busco sustituto', carrera:'', fecha:'', categoria:'Doubles Open', flex:true, nota:'' }

function Plazas({ plazas, setPlazas, contactar }) {
  const [form, setForm] = useState(null)
  const [filtro, setFiltro] = useState('Todas')
  const yo = { id:0, iniciales:'CR', color:'yellow', nombre:'Carlos R.' }
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const publicar = () => {
    if (!form.carrera.trim() || !form.fecha.trim()) return
    setPlazas(prev => [{ ...form, id: Date.now(), autor: yo }, ...prev])
    setForm(null)
  }
  const lista = plazas.filter(p => filtro === 'Todas' || p.tipo === filtro)
  return (
    <div>
      <a className="plazas-link" href="https://hyrox.es/faqs/" target="_blank" rel="noopener noreferrer">Cómo cambiar el nombre de tu entrada ↗</a>
      {form ? (
        <div className="card upload-card">
          <div className="chips">
            {['Busco sustituto','Cedo mi plaza'].map(t => (
              <button key={t} className={form.tipo===t?'chip active':'chip'} onClick={()=>set('tipo',t)}>{t}</button>
            ))}
          </div>
          <div className="upload-row">
            <input value={form.carrera} onChange={e=>set('carrera',e.target.value)} placeholder="Carrera (ej. Madrid · Doubles)" />
            <input value={form.fecha} onChange={e=>set('fecha',e.target.value)} placeholder="Fecha" style={{maxWidth:70}} />
          </div>
          <div className="upload-row">
            <select value={form.categoria} onChange={e=>set('categoria',e.target.value)}>
              {CATEGORIAS_PLAZA.map(c => <option key={c}>{c}</option>)}
            </select>
            <select value={form.flex?'si':'no'} onChange={e=>set('flex',e.target.value==='si')}>
              <option value="si">Con Flex (cambio de nombre)</option>
              <option value="no">Sin Flex</option>
            </select>
          </div>
          <div className="upload-row">
            <input value={form.nota} onChange={e=>set('nota',e.target.value)} placeholder="Detalles (ritmo, motivo...)" />
          </div>
          <div className="upload-actions">
            <button className="btn-secondary" onClick={()=>setForm(null)}>Cancelar</button>
            <button className="btn-primary" disabled={!form.carrera.trim() || !form.fecha.trim()} onClick={publicar}>Publicar</button>
          </div>
        </div>
      ) : (
        <button className="btn-match" style={{width:'100%',margin:'6px 0'}} onClick={()=>setForm(PLAZA_VACIA)}>+ Publicar plaza</button>
      )}
      <div className="chips" style={{margin:'8px 0'}}>
        {['Todas','Busco sustituto','Cedo mi plaza'].map(t => (
          <button key={t} className={filtro===t?'chip active':'chip'} onClick={()=>setFiltro(t)}>{t}</button>
        ))}
      </div>
      {lista.map(p => (
        <div className="card plaza-card" key={p.id}>
          <div className="plaza-top">
            <span className={p.tipo==='Busco sustituto'?'badge active':'badge done'}>{p.tipo}</span>
            <span className={p.flex?'plaza-flex ok':'plaza-flex no'}>{p.flex?'✓ Flex':'Sin Flex'}</span>
          </div>
          <div className="partner-name" style={{marginTop:5}}>{p.carrera} · {p.fecha}</div>
          <div className="partner-sub">{p.categoria}</div>
          {p.nota && <div className="plaza-nota">{p.nota}</div>}
          <div className="plaza-bottom">
            <div className="partner-row" style={{gap:6}}>
              <div className={`avatar ${p.autor.color}`} style={{width:22,height:22,fontSize:8}}>{p.autor.iniciales}</div>
              <span className="partner-sub">{p.autor.nombre}</span>
            </div>
            {p.autor.id === 0
              ? <button className="link-btn" onClick={()=>setPlazas(prev=>prev.filter(x=>x.id!==p.id))}>Retirar</button>
              : <button className="btn-primary" onClick={()=>contactar(p)}>Contactar</button>}
          </div>
        </div>
      ))}
    </div>
  )
}
