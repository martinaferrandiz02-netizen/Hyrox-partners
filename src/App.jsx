import { useEffect, useState } from 'react'
import './App.css'
import { MisVideos, VideosDe } from './Videos'
import { Acceso, EstadoCertificado, FormPerfil } from './Auth'
import { supabase } from './supabase'
import { nombreCiudad } from './ciudades'
import { ChatReal } from './ChatReal'
import { fechaCorta, publicarPlaza, retirarPlaza, usePlazas } from './plazas'
import { enviarSolicitud, horaCorta, responderSolicitud, useSolicitudes, useUltimosMensajes } from './social'

const ETIQUETA_ESTADO = { verificado: '✓ Verificado', pendiente: '⏳ Pendiente de revisión', rechazado: 'Sin verificar', sin_certificado: 'Sin verificar' }
const COLORES = ['purple','blue','green','orange','teal']
const iniciales = (nombre) => nombre.split(/\s+/).filter(Boolean).slice(0,2).map(p => p[0].toUpperCase()).join('')

// Convierte un perfil de la base de datos al formato de candidato
const aCandidato = (p) => ({
  id: p.id, userId: p.id, nombre: p.nombre, iniciales: iniciales(p.nombre),
  color: COLORES[[...p.id].reduce((a, ch) => a + ch.charCodeAt(0), 0) % COLORES.length],
  ciudad: nombreCiudad(p.ciudad), distancia: null, sexo: p.sexo, categoria: p.categoria,
  compitio: p.compitio, rating: p.puntos, division: p.division, club: p.club || 'Sin club', mejorTiempo: p.mejor_tiempo, certificadoUrl: p.certificado_url, verificado: p.certificado_estado === 'verificado',
  carreras: [], marcas: [], fortalezas: [],
})
const FILTROS_INICIALES = { texto:'', compitio:'Todos', ciudad:'Todas', categoria:'Todas', sexo:'Todos' }

// Rankings a partir de los puntos verificados de todos los usuarios
function calcularRanking(perfil, otros) {
  const todos = [{ ...perfil, rating: perfil.puntos, ciudadCanon: perfil.ciudad }, ...otros.map(o => ({ ...o, ciudadCanon: null }))]
    .filter(p => p.rating || p.puntos)
  const pts = (p) => p.rating ?? p.puntos
  const misPuntos = perfil.puntos || null
  const posicion = (lista) => misPuntos ? lista.filter(p => pts(p) > misPuntos).length + 1 : null
  const global = todos
  const enCiudad = todos.filter(p => (p.ciudadCanon ? nombreCiudad(p.ciudadCanon) : p.ciudad) === nombreCiudad(perfil.ciudad))
  const enCategoria = todos.filter(p => p.categoria === perfil.categoria)
  const posGlobal = posicion(global)
  // Puntos de club: media de sus 4 mejores miembros verificados
  const porClub = {}
  for (const p of todos) {
    const club = p.id === perfil.id ? perfil.club : (p.club && p.club !== 'Sin club' ? p.club : null)
    if (club) (porClub[club] ||= []).push(pts(p))
  }
  const clubs = Object.entries(porClub).map(([nombre, lista]) => {
    const top = lista.sort((a, b) => b - a).slice(0, 4)
    return { nombre, miembros: lista.length, pts: Math.round(top.reduce((a, b) => a + b, 0) / top.length) }
  }).sort((a, b) => b.pts - a.pts).map((c, i) => ({ ...c, pos: i + 1 }))
  return {
    misPuntos,
    posGlobal,
    posCiudad: posicion(enCiudad),
    posCategoria: posicion(enCategoria),
    topPct: posGlobal ? Math.max(1, Math.round(100 * posGlobal / global.length)) : null,
    clubs,
  }
}

export default function App() {
  const [sesion, setSesion] = useState(undefined)
  const [perfil, setPerfil] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSesion(data.session))
    const { data } = supabase.auth.onAuthStateChange((_evento, s) => setSesion(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const userId = sesion?.user?.id
  useEffect(() => {
    if (!userId) return
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
      .then(({ data }) => setPerfil(data ?? null))
  }, [userId])

  let contenido
  if (sesion === undefined || (sesion && (perfil === undefined || (perfil && perfil.id !== userId)))) contenido = <div className="screen cargando">Cargando…</div>
  else if (!sesion) contenido = <Acceso />
  else if (!perfil) contenido = <FormPerfil userId={userId} onGuardado={setPerfil} />
  else return <Pairx perfil={perfil} setPerfil={setPerfil} />

  return <div className="app"><div className="phone"><div className="notch"></div>{contenido}</div></div>
}

function Pairx({ perfil, setPerfil }) {
  const [pantalla, setPantalla] = useState('inicio')
  const [subPantalla, setSubPantalla] = useState('buscar')
  const [indice, setIndice] = useState(0)
  const [filtros, setFiltros] = useState(FILTROS_INICIALES)
  const [perfilAbierto, setPerfilAbierto] = useState(null)
  const [chatActivo, setChatActivo] = useState(null)
  const [pareja, setPareja] = useState(null)

  const [candidatosReales, setCandidatosReales] = useState([])

  useEffect(() => {
    supabase.from('profiles').select('*').neq('id', perfil.id).order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setCandidatosReales(data.map(aCandidato)) })
  }, [perfil.id])
  const candidatos = candidatosReales

  // Solicitudes y chats reales
  const { solicitudes, recargar } = useSolicitudes(perfil.id)
  const ultimos = useUltimosMensajes(perfil.id)
  const recibidasReales = solicitudes.filter(s => !s.enviada && s.estado === 'pendiente')
  const conversaciones = solicitudes.filter(s => s.estado === 'aceptada').map(s => aCandidato(s.otro))
  const estadoCon = (userId) => solicitudes.find(s => s.otro.id === userId)

  const solicitar = async (persona) => {
    if (!persona.userId) return true
    const ok = await enviarSolicitud(perfil.id, persona.userId, `¡Hola! Soy ${perfil.nombre}. Me encaja tu perfil, ¿hacemos pareja de Doubles?`)
    if (ok) recargar()
    return ok
  }

  const responder = async (s, estado) => {
    if (await responderSolicitud(s.id, estado)) {
      await recargar()
      if (estado === 'aceptada') { setSubPantalla('chats'); setChatActivo(aCandidato(s.otro)) }
    }
  }
  const yo = { id: perfil.id, iniciales: iniciales(perfil.nombre), color: 'yellow', nombre: perfil.nombre }
  const ranking = calcularRanking(perfil, candidatosReales)

  const { plazas: plazasReales, recargar: recargarPlazas } = usePlazas()
  const listaPlazas = plazasReales.map(p => ({ ...p, real: true, autor: aCandidato(p.autor_perfil) }))

  const contactarPlaza = async (plaza) => {
    const autor = plaza.autor
    const rel = estadoCon(autor.userId)
    if (rel?.estado === 'aceptada') { setChatActivo(autor); return }
    if (rel) return
    await enviarSolicitud(perfil.id, autor.userId,
      `¡Hola! Me interesa tu plaza: ${plaza.carrera} (${plaza.categoria}, ${fechaCorta(plaza.fecha)}).`)
    recargar()
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
        {pantalla === 'inicio' && <Inicio pareja={pareja} yo={yo} ranking={ranking} />}
        {pantalla === 'entrenos' && <Entrenos />}
        {pantalla === 'parejas' && (
          <Parejas
            subPantalla={subPantalla}
            setSubPantalla={setSubPantalla}
            indice={indice}
            filtros={filtros}
            setFiltros={setFiltros}
            perfilAbierto={perfilAbierto}
            plazas={listaPlazas}
            recargarPlazas={recargarPlazas}
            candidatos={candidatos}
            yo={yo}
            recibidasReales={recibidasReales}
            conversaciones={conversaciones}
            ultimos={ultimos}
            estadoCon={estadoCon}
            solicitar={solicitar}
            responder={responder}
            contactarPlaza={contactarPlaza}
            setPerfilAbierto={setPerfilAbierto}
            setIndice={setIndice}
            chatActivo={chatActivo}
            setChatActivo={setChatActivo}
            elegirPareja={elegirPareja}
            pareja={pareja}
          />
        )}
        {pantalla === 'rankings' && <Rankings yo={yo} perfil={perfil} ranking={ranking} />}
        {pantalla === 'perfil' && <Perfil perfil={perfil} setPerfil={setPerfil} />}
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

export function Inicio({ pareja, yo, ranking }) {
  return (
    <div className="screen">
      <div className="hero-header">
        <div>
          <div className="greeting">Buenos días</div>
          <div className="name">{yo.nombre}</div>
        </div>
        <div>
          {ranking.misPuntos
            ? <><div className="rating-badge">{ranking.misPuntos} pts</div><div className="rating-sub">✓ Verificado · Top {ranking.topPct}%</div></>
            : <><div className="badge norating">Sin puntos</div><div className="rating-sub">Verifica tu tiempo en Perfil</div></>}
        </div>
      </div>
      <div className="section-label">Tu pareja</div>
      <div className="card">
        <div className="partner-row">
          <div className="avatar yellow">{yo.iniciales}</div>
          <div className="partner-info">
            <div className="partner-name">Tú — {yo.nombre}</div>
            <div className="partner-sub">{ranking.misPuntos ? '✓ Tiempo verificado' : 'Sin tiempo verificado'}</div>
          </div>
          <div className="partner-rating">{ranking.misPuntos || '–'}</div>
        </div>
        <div className="divider-text">+ pareja</div>
        {pareja ? (
          <div className="partner-row">
            <div className={`avatar ${pareja.color}`}>{pareja.iniciales}</div>
            <div className="partner-info">
              <div className="partner-name">{pareja.nombre}</div>
              <div className="partner-sub">📍 {pareja.ciudad}</div>
            </div>
            <div className="partner-rating">{pareja.rating || '–'}</div>
          </div>
        ) : (
          <div className="video-empty" style={{textAlign:'center'}}>Aún no tienes pareja. Búscala en <strong>Parejas</strong> y elígela desde el chat.</div>
        )}
      </div>
    </div>
  )
}

export function Entrenos() {
  return (
    <div className="screen">
      <div className="screen-title">Entrenos</div>
      <div className="empty-state">
        <div style={{fontSize:32}}>⌚</div>
        <div style={{color:'#aaa',marginTop:8,fontSize:12,lineHeight:1.5}}>Muy pronto podrás guardar tus entrenos conectando tu Garmin o Apple Watch, y lanzar retos a tu pareja.</div>
      </div>
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

function Posicion({ pos, lbl }) {
  return <div className="rank-item"><div className="rank-pos">{pos ? '#'+pos : '–'}</div><div className="rank-lbl">{lbl}</div></div>
}

export function Rankings({ yo, perfil, ranking }) {
  const miClub = ranking.clubs.find(c => c.nombre === perfil.club)
  return (
    <div className="screen">
      <div className="screen-title">Rankings</div>
      <div className="rating-sub" style={{textAlign:'left',marginBottom:6}}>Puntos = 1.000 × tiempo de referencia de tu división ÷ tu tiempo. Solo cuentan tiempos verificados.</div>
      <div className="section-label">Tu posición personal</div>
      <div className="card">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
          <div className="partner-name">{yo.nombre}</div>
          {ranking.misPuntos ? <div className="rating-badge">{ranking.misPuntos} pts</div> : <div className="badge norating">Sin puntos</div>}
        </div>
        {ranking.misPuntos ? (
          <div className="rank-levels">
            <Posicion pos={ranking.posCiudad} lbl={nombreCiudad(perfil.ciudad)} />
            <div className="rank-divider"></div>
            <Posicion pos={ranking.posCategoria} lbl={perfil.categoria} />
            <div className="rank-divider"></div>
            <Posicion pos={ranking.posGlobal} lbl="Global" />
          </div>
        ) : <div className="video-empty">Sube tu certificado en Perfil y, cuando esté verificado, entrarás en el ranking.</div>}
      </div>
      {perfil.club && (
        <>
          <div className="section-label">Tu club</div>
          <div className="card" style={{marginBottom:12}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div className="partner-name">{perfil.club}</div>
                <div className="partner-sub">{miClub ? `${miClub.miembros} ${miClub.miembros === 1 ? 'miembro verificado' : 'miembros verificados'} · #${miClub.pos}` : 'Aún sin miembros verificados'}</div>
              </div>
              {miClub && <div className="rating-badge">{miClub.pts} pts</div>}
            </div>
          </div>
        </>
      )}
      <div className="section-label">🏆 Ranking de clubs</div>
      {ranking.clubs.length === 0 && <div className="video-empty">Todavía no hay clubs con miembros verificados.</div>}
      {ranking.clubs.slice(0, 20).map(c => (
        <div key={c.nombre} className={`ranking-row ${c.nombre === perfil.club ? 'my-club' : ''}`}>
          <div className="rank-num">{['🥇','🥈','🥉'][c.pos-1] || '#'+c.pos}</div>
          <div className="partner-info">
            <div className="partner-name" style={{fontSize:11}}>{c.nombre}</div>
            <div className="partner-sub">{c.miembros} {c.miembros === 1 ? 'miembro verificado' : 'miembros verificados'}</div>
          </div>
          <div className="partner-rating">{c.pts}</div>
        </div>
      ))}
    </div>
  )
}

export function Perfil({ perfil, setPerfil }) {
  const [editando, setEditando] = useState(false)
  if (editando) {
    return <FormPerfil userId={perfil.id} perfil={perfil} onGuardado={(p)=>{setPerfil(p);setEditando(false)}} onCancelar={()=>setEditando(false)} />
  }
  return (
    <div className="screen">
      <div className="profile-header">
        <div className="avatar yellow large">{iniciales(perfil.nombre)}</div>
        <div style={{flex:1}}>
          <div className="partner-name" style={{fontSize:16}}>{perfil.nombre}</div>
          <div className="partner-sub">📍 {nombreCiudad(perfil.ciudad)}{perfil.club ? ` · ${perfil.club}` : ''}</div>
        </div>
        <div style={{textAlign:'right'}}>
          {perfil.compitio && perfil.mejor_tiempo
            ? <><div className="rating-badge">⏱ {perfil.mejor_tiempo}</div><div className="rating-sub">{ETIQUETA_ESTADO[perfil.certificado_estado] || 'Sin verificar'}{perfil.puntos ? ` · ${perfil.puntos} pts` : ''}</div></>
            : <div className="badge norating">{perfil.compitio ? 'Ha competido' : 'Aún sin carreras'}</div>}
        </div>
      </div>
      <div className="swipe-tags" style={{justifyContent:'flex-start'}}>
        <span>{perfil.sexo}</span><span>{perfil.categoria}</span><span>{perfil.compitio ? 'Ya ha competido' : 'Aún no ha competido'}</span>
      </div>
      {perfil.certificado_estado === 'rechazado' && <EstadoCertificado estado="rechazado" motivo={perfil.certificado_motivo} />}
      {perfil.certificado_url ? (
        <div className="resultado-links">
          <a className="resultado-link" href={perfil.certificado_url} target="_blank" rel="noopener noreferrer">Ver certificado ↗</a>
        </div>
      ) : perfil.compitio && <div className="video-empty">Sube tu certificado en "Editar perfil" para verificar tu tiempo.</div>}
      <div className="perfil-acciones">
        <button className="btn-secondary" onClick={()=>setEditando(true)}>Editar perfil</button>
        <button className="btn-secondary" onClick={()=>supabase.auth.signOut()}>Cerrar sesión</button>
      </div>
      <MisVideos userId={perfil.id} />
    </div>
  )
}

function Parejas({ subPantalla, setSubPantalla, indice, setIndice, filtros, setFiltros, perfilAbierto, setPerfilAbierto, plazas, recargarPlazas, contactarPlaza, candidatos, yo, recibidasReales, conversaciones, ultimos, estadoCon, solicitar, responder, chatActivo, setChatActivo, elegirPareja }) {
  if (chatActivo?.userId) {
    return <ChatReal yo={yo} otro={chatActivo} volver={()=>setChatActivo(null)} elegirPareja={elegirPareja} abrirPerfil={()=>{setPerfilAbierto(chatActivo);setChatActivo(null)}} />
  }
  if (perfilAbierto) {
    const rel = perfilAbierto.userId ? estadoCon(perfilAbierto.userId) : null
    return <PerfilOtro persona={perfilAbierto} relacion={rel} volver={()=>setPerfilAbierto(null)}
      chatear={()=>{setChatActivo(perfilAbierto);setPerfilAbierto(null)}}
      solicitar={()=>solicitar(perfilAbierto)} />
  }
  const ciudades = [...new Set(candidatos.map(c => c.ciudad))]
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
        <button className={subPantalla==='solicitudes'?'active':''} onClick={()=>setSubPantalla('solicitudes')}>Solicitudes {recibidasReales.length > 0 && <span className="notif">{recibidasReales.length}</span>}</button>
        <button className={subPantalla==='chats'?'active':''} onClick={()=>setSubPantalla('chats')}>Chats {conversaciones.length > 0 && <span className="notif">{conversaciones.length}</span>}</button>
        <button className={subPantalla==='plazas'?'active':''} onClick={()=>setSubPantalla('plazas')}>Plazas</button>
      </div>
      {subPantalla === 'buscar' && (
        <div>
          <Buscador filtros={filtros} cambiarFiltro={cambiarFiltro} ciudades={ciudades} total={lista.length} limpiar={()=>{setFiltros(FILTROS_INICIALES);setIndice(0)}} />
          {indice < lista.length ? (
            <div className="swipe-card">
              <div className="preficha" onClick={()=>setPerfilAbierto(candidato)}>
              <div className="swipe-avatar-wrap">
                <div className={`avatar ${candidato.color}`} style={{width:64,height:64,fontSize:22}}>{candidato.iniciales}</div>
              </div>
              <div className="swipe-name">{candidato.nombre}</div>
              <div className="swipe-sub">📍 {[candidato.ciudad, candidato.distancia, candidato.club].filter(Boolean).join(' · ')}</div>
              <div className="swipe-tags"><span>{candidato.sexo}</span><span>{candidato.categoria}</span>{candidato.mejorTiempo && <span>⏱ Mejor: {candidato.mejorTiempo}{candidato.verificado ? ' ✓' : ''}</span>}</div>
              {candidato.compitio && candidato.rating
                ? <div className="rating-badge" style={{margin:'6px auto',display:'block',width:'fit-content'}}>{candidato.rating} pts</div>
                : <div className="badge norating" style={{margin:'6px auto',display:'block',width:'fit-content'}}>{candidato.compitio ? 'Ha competido' : 'Aún no ha competido'}</div>}
              {candidato.fortalezas.length > 0 && <div className="bars" style={{marginTop:12}}>
                {candidato.fortalezas.map(f => (
                  <div className="bar-row" key={f.ex}>
                    <span className="bar-lbl">{f.ex}</span>
                    <div className="bar-track"><div className="bar-fill" style={{width:f.pct+'%'}}></div></div>
                    <span className="bar-val">{f.pct}%</span>
                  </div>
                ))}
              </div>}
              <div className="ver-perfil">Ver perfil y vídeos →</div>
              </div>
              <div className="swipe-actions">
                <button className="btn-pass" onClick={()=>setIndice(i=>Math.min(i+1,lista.length))}>✕ Pasar</button>
                {estadoCon(candidato.userId)
                  ? <button className="btn-match" disabled style={{opacity:.5}}>{estadoCon(candidato.userId).estado === 'aceptada' ? 'Ya conectados ✓' : 'Solicitud enviada ✓'}</button>
                  : <button className="btn-match" onClick={async()=>{ if (await solicitar(candidato)) setIndice(i=>Math.min(i+1,lista.length)) }}>Solicitar →</button>}
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <div style={{fontSize:32}}>🎯</div>
              <div style={{color:'#aaa',marginTop:8,fontSize:12}}>No hay más atletas con estos filtros. Cuantos más se registren, más opciones tendrás.</div>
              <button className="btn-primary" style={{marginTop:12}} onClick={()=>setIndice(0)}>Volver a empezar</button>
            </div>
          )}
        </div>
      )}
      {subPantalla === 'solicitudes' && (
        <div>
          <div className="screen-sub" style={{marginTop:8}}>Personas interesadas en ser tu pareja</div>
          {recibidasReales.map(s => {
            const p = aCandidato(s.otro)
            return (
              <div className="card" key={'r'+s.id}>
                <div className="partner-row" style={{marginBottom:8,cursor:'pointer'}} onClick={()=>setPerfilAbierto(p)}>
                  <div className={`avatar ${p.color}`}>{p.iniciales}</div>
                  <div className="partner-info">
                    <div className="partner-name">{p.nombre}</div>
                    <div className="partner-sub">📍 {p.ciudad}{p.mejorTiempo ? ` · ⏱ ${p.mejorTiempo}${p.verificado ? ' ✓' : ''}` : ''}</div>
                  </div>
                  <div style={{fontSize:9,color:'#aaa'}}>{horaCorta(s.created_at)}</div>
                </div>
                {s.mensaje && <div className="reto-desc" style={{marginBottom:10}}>"{s.mensaje}"</div>}
                <div className="match-actions">
                  <button className="btn-pass" onClick={()=>responder(s,'rechazada')}>Rechazar</button>
                  <button className="btn-match" onClick={()=>responder(s,'aceptada')}>Aceptar y chatear →</button>
                </div>
              </div>
            )
          })}
          {recibidasReales.length === 0 && (
            <div className="empty-state">
              <div style={{fontSize:32}}>📩</div>
              <div style={{color:'#aaa',marginTop:8,fontSize:12}}>Aún no tienes solicitudes. Cuando alguien quiera ser tu pareja, aparecerá aquí.</div>
            </div>
          )}
        </div>
      )}
      {subPantalla === 'plazas' && <Plazas plazas={plazas} recargar={recargarPlazas} contactar={contactarPlaza} estadoCon={estadoCon} yo={yo} />}
      {subPantalla === 'chats' && (
        <div>
          <div className="screen-sub" style={{marginTop:8}}>Conversaciones activas</div>
          {conversaciones.map(c => {
            const u = ultimos[c.userId]
            return (
              <div className="card" key={'c'+c.userId} onClick={()=>setChatActivo(c)} style={{cursor:'pointer'}}>
                <div className="partner-row">
                  <div className={`avatar ${c.color}`}>{c.iniciales}</div>
                  <div className="partner-info">
                    <div className="partner-name">{c.nombre}</div>
                    <div className="partner-sub">{u ? `${u.de === yo.id ? 'Tú: ' : ''}${u.texto}` : 'Conectados · escribe el primer mensaje'}</div>
                  </div>
                  <div style={{fontSize:9,color:'#aaa'}}>{u ? horaCorta(u.created_at) : ''}</div>
                </div>
              </div>
            )
          })}
          {conversaciones.length === 0 && (
            <div className="empty-state">
              <div style={{fontSize:32}}>💬</div>
              <div style={{color:'#aaa',marginTop:8,fontSize:12}}>Acepta solicitudes para empezar a chatear</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Buscador({ filtros, cambiarFiltro, ciudades, total, limpiar }) {
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
          <Grupo filtros={filtros} cambiarFiltro={cambiarFiltro} campo="ciudad" titulo="Localización" opciones={['Todas', ...ciudades]} />
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

function PerfilOtro({ persona, relacion, volver, solicitar, chatear }) {
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
          {persona.rating
            ? <div className="rating-badge">{persona.rating}</div>
            : persona.mejorTiempo ? <><div className="rating-badge">⏱ {persona.mejorTiempo}</div><div className="rating-sub">{persona.verificado ? '✓ Verificado' : 'Sin verificar'}</div></> : <div className="badge norating">Sin carreras</div>}
        </div>
      </div>
      <div className="swipe-tags" style={{justifyContent:'flex-start'}}>
        <span>{persona.sexo}</span><span>{persona.categoria}</span><span>{persona.compitio ? 'Ya ha competido' : 'Aún no ha competido'}</span>
      </div>
      {persona.certificadoUrl && (
        <div className="resultado-links">
          <a className="resultado-link" href={persona.certificadoUrl} target="_blank" rel="noopener noreferrer">Ver certificado ↗</a>
        </div>
      )}
      {persona.fortalezas.length > 0 && <div className="section-label">Puntos fuertes</div>}
      {persona.fortalezas.map(f => (
        <div className="bar-row" key={f.ex}>
          <span className="bar-lbl">{f.ex}</span>
          <div className="bar-track"><div className="bar-fill" style={{width:f.pct+'%'}}></div></div>
          <span className="bar-val">{f.pct}%</span>
        </div>
      ))}
      {persona.marcas.length > 0 && <div className="section-label">Mejores tiempos</div>}
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
      <VideosDe userId={persona.userId} nombre={persona.nombre} />
      {relacion?.estado === 'aceptada'
        ? <button className="btn-match" style={{width:'100%',marginTop:10}} onClick={chatear}>Abrir chat →</button>
        : relacion
          ? <button className="btn-match" disabled style={{width:'100%',marginTop:10,opacity:.5}}>{relacion.enviada ? (relacion.estado === 'rechazada' ? 'Solicitud no aceptada' : 'Solicitud enviada ✓') : 'Te ha enviado una solicitud · mírala en Solicitudes'}</button>
          : <button className="btn-match" style={{width:'100%',marginTop:10}} onClick={solicitar}>Solicitar como pareja →</button>}
    </div>
  )
}

const CATEGORIAS_PLAZA = ['Doubles Open','Doubles Pro','Individual Open','Individual Pro','Relay']
const PLAZA_VACIA = { tipo:'Busco sustituto', carrera:'', fecha:'', categoria:'Doubles Open', flex:true, nota:'' }
const hoyISO = () => new Date().toISOString().slice(0, 10)

function Plazas({ plazas, recargar, contactar, estadoCon, yo }) {
  const [form, setForm] = useState(null)
  const [filtro, setFiltro] = useState('Todas')
  const [error, setError] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const publicar = async () => {
    if (!form.carrera.trim() || !form.fecha) return
    const err = await publicarPlaza(yo.id, form)
    if (err) { setError('No se ha podido publicar. Revisa los datos e inténtalo de nuevo.'); return }
    setError(''); setForm(null); recargar()
  }
  const retirar = async (p) => {
    if (!window.confirm('¿Retirar esta plaza?')) return
    if (await retirarPlaza(p.id)) recargar()
  }
  const botonContacto = (p) => {
    const rel = estadoCon(p.autor.userId)
    if (rel?.estado === 'aceptada') return <button className="btn-primary" onClick={()=>contactar(p)}>Abrir chat</button>
    if (rel) return <button className="btn-primary" disabled style={{opacity:.5}}>{rel.enviada ? 'Solicitud enviada ✓' : 'Te ha escrito · ver Solicitudes'}</button>
    return <button className="btn-primary" onClick={()=>contactar(p)}>Contactar</button>
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
            <input type="date" value={form.fecha} min={hoyISO()} onChange={e=>set('fecha',e.target.value)} style={{maxWidth:120}} />
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
            <button className="btn-primary" disabled={!form.carrera.trim() || !form.fecha} onClick={publicar}>Publicar</button>
          </div>
          {error && <div className="upload-status">{error}</div>}
        </div>
      ) : (
        <button className="btn-match" style={{width:'100%',margin:'6px 0'}} onClick={()=>setForm(PLAZA_VACIA)}>+ Publicar plaza</button>
      )}
      <div className="chips" style={{margin:'8px 0'}}>
        {['Todas','Busco sustituto','Cedo mi plaza'].map(t => (
          <button key={t} className={filtro===t?'chip active':'chip'} onClick={()=>setFiltro(t)}>{t}</button>
        ))}
      </div>
      {lista.length === 0 && <div className="video-empty">No hay plazas publicadas ahora mismo.</div>}
      {lista.map(p => (
        <div className="card plaza-card" key={p.id}>
          <div className="plaza-top">
            <span className={p.tipo==='Busco sustituto'?'badge active':'badge done'}>{p.tipo}</span>
            <span className={p.flex?'plaza-flex ok':'plaza-flex no'}>{p.flex?'✓ Flex':'Sin Flex'}</span>
          </div>
          <div className="partner-name" style={{marginTop:5}}>{p.carrera} · {fechaCorta(p.fecha)}</div>
          <div className="partner-sub">{p.categoria}</div>
          {p.nota && <div className="plaza-nota">{p.nota}</div>}
          <div className="plaza-bottom">
            <div className="partner-row" style={{gap:6}}>
              <div className={`avatar ${p.autor.color}`} style={{width:22,height:22,fontSize:8}}>{p.autor.iniciales}</div>
              <span className="partner-sub">{p.autor.nombre}</span>
            </div>
            {p.user_id === yo.id
              ? <button className="link-btn" onClick={()=>retirar(p)}>Retirar</button>
              : botonContacto(p)}
          </div>
        </div>
      ))}
    </div>
  )
}
