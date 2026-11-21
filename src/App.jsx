import { useEffect, useState } from 'react'
import { Activity, ArrowUpRight, BadgeCheck, Check, ChevronLeft, ChevronRight, Flag, House, Inbox, MapPin, MessageCircle, Plus, Search, SlidersHorizontal, Ticket, Trophy, User, Users, X } from 'lucide-react'
import { Entrenos } from './Entrenos'
import { NuevaProxima } from './Carreras'
import { fechasCarrera, useBuscanPareja } from './datosCarreras'
import './App.css'
import { Acceso, FormPerfil, NuevaContrasena } from './Auth'
import { supabase } from './supabase'
import { Avatar } from './Avatar'
import { EtiquetaNivel } from './EtiquetaNivel'
import { nombreCiudad } from './ciudades'
import { ChatReal } from './ChatReal'
import { PerfilVista } from './PerfilVista'
import { AnadirCarrera } from './AnadirCarrera'
import { Ajustes } from './Ajustes'
import { MenuUsuario } from './MenuUsuario'
import { useOcultos } from './bloqueos'
import { calcularRanking, nombreGrupo, tiempoSeg, verTiempo } from './ranking'
import { fechaCorta, publicarPlaza, retirarPlaza, usePlazas } from './plazas'
import { enviarSolicitud, horaCorta, responderSolicitud, useSolicitudes, useUltimosMensajes } from './social'

const COLORES = ['purple','blue','green','orange','teal']
const iniciales = (nombre) => nombre.split(/\s+/).filter(Boolean).slice(0,2).map(p => p[0].toUpperCase()).join('')

// Convierte un perfil de la base de datos al formato de candidato
const aCandidato = (p) => ({
  id: p.id, userId: p.id, nombre: p.nombre, iniciales: iniciales(p.nombre),
  color: COLORES[[...p.id].reduce((a, ch) => a + ch.charCodeAt(0), 0) % COLORES.length],
  ciudad: nombreCiudad(p.ciudad), distancia: null, sexo: p.sexo, categoria: p.categoria,
  compitio: p.compitio, division: p.division, parejaId: p.pareja_id, club: p.club || 'Sin club', mejorTiempo: p.mejor_tiempo, certificadoUrl: p.certificado_url, verificado: p.certificado_estado === 'verificado',
  carreras: [], marcas: [], fortalezas: [], raw: p, fotoUrl: p.foto_url,
})
const FILTROS_INICIALES = { texto:'', compitio:'Todos', ciudad:'Todas', categoria:'Todas', sexo:'Todos', carrera:'Todas' }

export default function App() {
  const [sesion, setSesion] = useState(undefined)
  const [perfil, setPerfil] = useState(undefined)
  // Recién registrado: 'carrera' (ya ha competido) o 'proxima' (aún no)
  const [bienvenida, setBienvenida] = useState(null)
  // Viene del enlace "he olvidado mi contraseña"
  const [recuperando, setRecuperando] = useState(() => /[?&]recuperar=1|type=recovery/.test(window.location.search + window.location.hash))

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSesion(data.session))
    const { data } = supabase.auth.onAuthStateChange((evento, s) => {
      setSesion(s)
      if (evento === 'PASSWORD_RECOVERY') setRecuperando(true)
    })
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
  else if (sesion && recuperando) contenido = <NuevaContrasena listo={() => { setRecuperando(false); window.history.replaceState(null, '', '/') }} />
  else if (!sesion) contenido = <Acceso />
  else if (!perfil) contenido = <FormPerfil userId={userId} onGuardado={(p) => { setPerfil(p); setBienvenida(p.compitio ? 'carrera' : 'proxima') }} />
  else if (bienvenida === 'carrera') contenido = <AnadirCarrera perfil={perfil} setPerfil={setPerfil} cerrar={() => setBienvenida(null)} textoCerrar="Ahora no"
    titulo="Añade tu carrera más reciente" subtitulo="Sube el certificado y nosotros leemos tus tiempos. Así tu perfil tendrá tu marca verificada desde el primer día." />
  else if (bienvenida === 'proxima') contenido = <NuevaProxima yoId={perfil.id} cerrar={() => setBienvenida(null)} guardado={() => setBienvenida(null)} textoCerrar="Ahora no"
    titulo="¿Cuál es tu próxima carrera?" subtitulo="Apúntala y otros atletas que van a la misma podrán encontrarte para hacer pareja." />
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

  const [candidatosReales, setCandidatosReales] = useState([])

  useEffect(() => {
    supabase.from('profiles').select('*').neq('id', perfil.id).order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setCandidatosReales(data.map(aCandidato)) })
  }, [perfil.id])
  // Bloqueos: quien he bloqueado o me ha bloqueado desaparece de toda la app
  const { ocultos, recargar: recargarOcultos } = useOcultos()
  const visible = (id) => !ocultos.has(id)
  // Próximas carreras de la gente que busca pareja: salen primero quienes van a una carrera a la que también vas tú
  const { porUsuario, carreras: carrerasPareja, recargar: recargarBuscan } = useBuscanPareja(perfil.id)
  const prioridad = (c) => (c.buscaPara.some(b => b.mia) ? 2 : c.buscaPara.length ? 1 : 0)
  const candidatos = candidatosReales.filter(c => visible(c.userId))
    .map(c => ({ ...c, buscaPara: porUsuario.get(c.userId) || [] }))
    .sort((a, b) => prioridad(b) - prioridad(a))

  // Solicitudes y chats reales
  const { solicitudes, recargar } = useSolicitudes(perfil.id)
  const ultimos = useUltimosMensajes(perfil.id)
  const recibidasReales = solicitudes.filter(s => !s.enviada && s.estado === 'pendiente' && visible(s.otro.id))
  const conversaciones = solicitudes.filter(s => s.estado === 'aceptada' && visible(s.otro.id)).map(s => aCandidato(s.otro))
  const estadoCon = (userId) => solicitudes.find(s => s.otro.id === userId)

  const solicitar = async (persona, carrera = null) => {
    if (!persona.userId) return true
    const texto = carrera
      ? `¡Hola! Soy ${perfil.nombre}. He visto que buscas pareja para ${carrera.carrera}, ¿la corremos juntos en Doubles?`
      : `¡Hola! Soy ${perfil.nombre}. Me encaja tu perfil, ¿hacemos pareja de Doubles?`
    const ok = await enviarSolicitud(perfil.id, persona.userId, texto)
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
  const listaPlazas = plazasReales.filter(p => visible(p.user_id)).map(p => ({ ...p, real: true, autor: aCandidato(p.autor_perfil) }))

  const contactarPlaza = async (plaza) => {
    const autor = plaza.autor
    const rel = estadoCon(autor.userId)
    if (rel?.estado === 'aceptada') { setChatActivo(autor); return }
    if (rel) return
    await enviarSolicitud(perfil.id, autor.userId,
      `¡Hola! Me interesa tu plaza: ${plaza.carrera} (${plaza.categoria}, ${fechaCorta(plaza.fecha)}).`)
    recargar()
  }

  // Pareja guardada en el perfil (solo alguien con quien tienes solicitud aceptada)
  const parejaPerfil = perfil.pareja_id ? candidatosReales.find(c => c.userId === perfil.pareja_id) : null
  const pareja = parejaPerfil ? { ...parejaPerfil, mutua: parejaPerfil.parejaId === perfil.id } : null

  const elegirPareja = async (persona) => {
    if (!window.confirm(`¿Elegir a ${persona.nombre} como tu pareja de Doubles?`)) return
    const { data, error } = await supabase.from('profiles').update({ pareja_id: persona.userId }).eq('id', perfil.id).select().single()
    if (error) { window.alert('No se ha podido guardar la pareja. Inténtalo de nuevo.'); return }
    setPerfil(data)
    setChatActivo(null)
    setSubPantalla('buscar')
    setPantalla('inicio')
  }

  const dejarPareja = async () => {
    if (!window.confirm('¿Dejar de tener pareja asignada?')) return
    const { data, error } = await supabase.from('profiles').update({ pareja_id: null }).eq('id', perfil.id).select().single()
    if (!error) setPerfil(data)
  }

  const TABS = [['inicio', 'Inicio', House], ['entrenos', 'Entrenos', Activity], ['parejas', 'Parejas', Users], ['rankings', 'Ranking', Trophy], ['perfil', 'Perfil', User]]
  const irA = (p) => { setPantalla(p); if (p === 'parejas') { setSubPantalla('buscar'); setPerfilAbierto(null); recargarBuscan() } }

  return (
    <div className="app">
      <div className="phone">
        <div className="notch"></div>
        {pantalla === 'inicio' && <Inicio pareja={pareja} yo={yo} perfil={perfil} ranking={ranking} dejarPareja={dejarPareja} buscarPareja={()=>irA('parejas')} />}
        {pantalla === 'entrenos' && <Entrenos yoId={perfil.id} />}
        {pantalla === 'parejas' && (
          <Parejas
            subPantalla={subPantalla}
            setSubPantalla={setSubPantalla}
            indice={indice}
            filtros={filtros}
            setFiltros={setFiltros}
            perfilAbierto={perfilAbierto}
            trasBloquear={async()=>{ await recargarOcultos(); setChatActivo(null); setPerfilAbierto(null); recargar() }}
            plazas={listaPlazas}
            recargarPlazas={recargarPlazas}
            candidatos={candidatos}
            carrerasPareja={carrerasPareja}
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
        {pantalla === 'rankings' && <Rankings perfil={perfil} ranking={ranking} />}
        {pantalla === 'perfil' && <Perfil perfil={perfil} setPerfil={setPerfil} abrirPerfil={(p) => { setPantalla('parejas'); setSubPantalla('buscar'); setChatActivo(null); setPerfilAbierto(aCandidato(p)) }} />}
        <nav className="tab-bar">
          {TABS.map(([id, nombre, Icono]) => (
            <button key={id} className={pantalla === id ? 'active' : ''} onClick={() => irA(id)}>
              <Icono size={22} strokeWidth={1.75} />
              <span>{nombre}</span>
              {id === 'parejas' && recibidasReales.length > 0 && <span className="notif tab-notif">{recibidasReales.length}</span>}
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}

const saludoHora = () => { const h = new Date().getHours(); return h < 14 ? 'Buenos días' : h < 21 ? 'Buenas tardes' : 'Buenas noches' }
const pos = (n) => n ? `#${n}` : '—'

export function Inicio({ pareja, yo, perfil, ranking, dejarPareja, buscarPareja }) {
  const tParejaSeg = pareja?.verificado ? tiempoSeg(pareja.mejorTiempo) : null
  return (
    <div className="screen">
      <div className="saludo">
        <div className="eyebrow">{saludoHora()}</div>
        <div className="display">{yo.nombre.split(' ')[0]}</div>
      </div>

      <div className="section-label">Tu mejor tiempo</div>
      <div className="kpi">
        <div className="kpi-valor tiempo">{verTiempo(ranking.miSeg)}</div>
        <div className="kpi-etiqueta">
          {ranking.miSeg
            ? <span className="verificado"><BadgeCheck size={16} /> Verificado · {nombreGrupo(ranking.miGrupo)}</span>
            : <span className="fila-sub">Añade una carrera en tu perfil para tener tu tiempo verificado</span>}
        </div>
      </div>
      <div className="stats">
        <div><strong>{pos(ranking.posGrupo)}</strong><span>Tu división</span></div>
        <div><strong>{pos(ranking.posCiudad)}</strong><span>{nombreCiudad(perfil.ciudad)}</span></div>
        <div><strong className={ranking.topPct ? 'acento' : ''}>{ranking.topPct ? `${ranking.topPct}%` : '—'}</strong><span>Top</span></div>
      </div>

      <div className="section-label">Tu pareja de Doubles</div>
      <div className="lista">
        <div className="fila">
          <Avatar p={{ ...yo, fotoUrl: perfil.foto_url }} />
          <div className="fila-cuerpo">
            <div className="fila-titulo">{yo.nombre}</div>
            <div className="fila-sub">Tú</div>
          </div>
          <div className="fila-valor">{verTiempo(ranking.miSeg)}</div>
        </div>
        {pareja ? (
          <div className="fila">
            <Avatar p={pareja} />
            <div className="fila-cuerpo">
              <div className="fila-titulo">{pareja.nombre}</div>
              <div className="fila-sub">{pareja.mutua ? <><Check size={14} /> Pareja confirmada</> : `Esperando a que ${pareja.nombre.split(' ')[0]} te elija`}</div>
            </div>
            <div className="fila-valor">{verTiempo(tParejaSeg)}</div>
          </div>
        ) : (
          <div className="pareja-vacia">Aún no tienes pareja. Búscala en <strong>Parejas</strong> y elígela desde el chat.</div>
        )}
      </div>
      {pareja
        ? <button className="link-btn apagado" style={{ marginTop: 18 }} onClick={dejarPareja}>Cambiar de pareja</button>
        : <button className="btn-match btn-block" style={{ marginTop: 18 }} onClick={buscarPareja}><Search size={18} /> Buscar pareja</button>}
    </div>
  )
}

// Fase 2: plan de carrera con IA (oculto en el MVP, no se muestra en la navegación)
export function PlanIA() {
  return <div className="screen"><div className="screen-title">Plan de carrera</div></div>
}

export function Rankings({ perfil, ranking }) {
  const [grupo, setGrupo] = useState(ranking.miGrupo || ranking.grupos[0] || null)
  const { enRanking, todos } = grupo ? ranking.clubsDe(grupo) : { enRanking: [], todos: [] }
  const miClub = perfil.club ? todos.find(c => c.nombre === perfil.club) : null
  const miClubPos = miClub ? enRanking.find(c => c.nombre === perfil.club) : null
  const atletas = (n) => `${n} ${n === 1 ? 'atleta verificado' : 'atletas verificados'}`
  return (
    <div className="screen">
      <div className="screen-title">Ranking</div>

      <div className="section-label">Tu mejor tiempo</div>
      <div className="kpi">
        <div className="kpi-valor tiempo">{verTiempo(ranking.miSeg)}</div>
        {ranking.miSeg && <div className="kpi-etiqueta"><span className="fila-sub">{nombreGrupo(ranking.miGrupo)}</span></div>}
      </div>
      {ranking.miSeg ? (
        <div className="stats">
          <div><strong>{pos(ranking.posCiudad)}</strong><span>{nombreCiudad(perfil.ciudad)}</span></div>
          <div><strong>{pos(ranking.posClub)}</strong><span>{perfil.club || 'Tu club'}</span></div>
          <div><strong className="acento">{pos(ranking.posGrupo)}</strong><span>de {ranking.totalGrupo}</span></div>
        </div>
      ) : <div className="pareja-vacia">Sube tu certificado en Perfil y, cuando esté verificado, entrarás en el ranking.</div>}

      <div className="section-label">Ranking de clubs</div>
      {ranking.grupos.length > 0 && (
        <div className="chips" style={{ marginBottom: 14 }}>
          {ranking.grupos.map(g => <button key={g} className={grupo === g ? 'chip active' : 'chip'} onClick={() => setGrupo(g)}>{nombreGrupo(g)}</button>)}
        </div>
      )}
      {perfil.club && grupo && miClubPos && (
        <div className="lista" style={{ marginBottom: 14 }}>
          <div className="fila mia">
            <div className="fila-pos">{miClubPos.pos}</div>
            <div className="fila-cuerpo">
              <div className="fila-titulo">{perfil.club}</div>
              <div className="fila-sub">{atletas(miClub.miembros)}</div>
            </div>
            <div className="fila-valor">{verTiempo(miClubPos.seg)}</div>
          </div>
        </div>
      )}
      {enRanking.length === 0
        ? <div className="pareja-vacia">Todavía ningún club cumple los requisitos para aparecer en el ranking{grupo ? ` de ${nombreGrupo(grupo)}` : ''}.</div>
        : <div className="lista">
            {enRanking.slice(0, 30).map(c => (
              <div key={c.nombre} className={`fila ${c.nombre === perfil.club ? 'mia' : ''}`}>
                <div className="fila-pos">{c.pos}</div>
                <div className="fila-cuerpo">
                  <div className="fila-titulo">{c.nombre}</div>
                  <div className="fila-sub">{atletas(c.miembros)}</div>
                </div>
                <div className="fila-valor">{verTiempo(c.seg)}</div>
              </div>
            ))}
          </div>}
      <p className="ranking-nota">Solo se tienen en cuenta tiempos verificados con certificado oficial. Tu posición se calcula frente a atletas de tu misma división, categoría y sexo. En el ranking de clubs aparecen únicamente los clubs que alcanzan el número mínimo de atletas verificados en cada división; el tiempo de cada club es la media de sus mejores marcas.</p>
    </div>
  )
}

export function Perfil({ perfil, setPerfil, abrirPerfil }) {
  const [modo, setModo] = useState(null)
  const [sugerida, setSugerida] = useState(null)
  if (modo === 'editar') {
    return <FormPerfil userId={perfil.id} perfil={perfil} onGuardado={(p)=>{setPerfil(p);setModo(null)}} onCancelar={()=>setModo(null)} />
  }
  if (modo === 'carrera') return <AnadirCarrera perfil={perfil} setPerfil={setPerfil} sugerida={sugerida} cerrar={()=>{setModo(null);setSugerida(null)}} />
  if (modo === 'proxima') return <NuevaProxima yoId={perfil.id} cerrar={()=>setModo(null)} guardado={()=>setModo(null)} />
  if (modo === 'ajustes') return <Ajustes perfil={perfil} setPerfil={setPerfil} volver={()=>setModo(null)} editarPerfil={()=>setModo('editar')} />
  return <PerfilVista perfil={perfil} esPropio yoId={perfil.id} onAbrirPerfil={abrirPerfil} onEditar={()=>setModo('editar')} onAnadirCarrera={(p)=>{setSugerida(p?.carrera ? p : null);setModo('carrera')}} onAnadirProxima={()=>setModo('proxima')} onAjustes={()=>setModo('ajustes')} onCambio={async()=>{ const { data } = await supabase.from('profiles').select('*').eq('id', perfil.id).single(); if (data) setPerfil(data) }} />
}

function Vacio({ icono: Icono, titulo, children }) {
  return (
    <div className="empty-state">
      <Icono size={36} strokeWidth={1.5} />
      <div className="empty-titulo">{titulo}</div>
      <div>{children}</div>
    </div>
  )
}

function Parejas({ subPantalla, setSubPantalla, indice, setIndice, filtros, setFiltros, perfilAbierto, setPerfilAbierto, plazas, recargarPlazas, contactarPlaza, candidatos, yo, recibidasReales, conversaciones, ultimos, estadoCon, solicitar, responder, chatActivo, setChatActivo, elegirPareja , trasBloquear, carrerasPareja = []}) {
  if (chatActivo?.userId) {
    return <ChatReal yo={yo} otro={chatActivo} trasBloquear={trasBloquear} volver={()=>setChatActivo(null)} elegirPareja={elegirPareja} abrirPerfil={()=>{setPerfilAbierto(chatActivo);setChatActivo(null)}} />
  }
  if (perfilAbierto) {
    const rel = perfilAbierto.userId ? estadoCon(perfilAbierto.userId) : null
    return <PerfilOtro key={perfilAbierto.userId} persona={perfilAbierto} relacion={rel} yoId={yo.id} trasBloquear={trasBloquear} volver={()=>setPerfilAbierto(null)} abrirOtro={(p)=>setPerfilAbierto(aCandidato(p))}
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
    (filtros.sexo === 'Todos' || c.sexo === filtros.sexo) &&
    (filtros.carrera === 'Todas' || c.buscaPara.some(b => b.clave === filtros.carrera))
  )
  const candidato = lista[indice]
  // La carrera que enseñamos en la tarjeta: la del filtro, una a la que también vas tú, o la más próxima
  const buscaEn = candidato && (candidato.buscaPara.find(b => b.clave === filtros.carrera) || candidato.buscaPara.find(b => b.mia) || candidato.buscaPara[0])
  const cambiarFiltro = (campo, valor) => { setFiltros(f => ({ ...f, [campo]: valor })); setIndice(0) }
  const pestanas = [['buscar', 'Buscar', 0], ['solicitudes', 'Solicitudes', recibidasReales.length], ['chats', 'Chats', 0], ['plazas', 'Plazas', 0]]
  return (
    <div className="screen">
      <div className="screen-title">Parejas</div>
      <div className="parejas-tabs">
        {pestanas.map(([id, nombre, n]) => (
          <button key={id} className={subPantalla === id ? 'active' : ''} onClick={() => setSubPantalla(id)}>
            {nombre}{n > 0 && <span className="notif">{n}</span>}
          </button>
        ))}
      </div>

      {subPantalla === 'buscar' && (
        <div>
          <Buscador filtros={filtros} cambiarFiltro={cambiarFiltro} ciudades={ciudades} total={lista.length} limpiar={()=>{setFiltros(FILTROS_INICIALES);setIndice(0)}} />
          {carrerasPareja.length > 0 && <CarrerasPareja carreras={carrerasPareja} elegida={filtros.carrera} elegir={(c)=>cambiarFiltro('carrera', filtros.carrera === c ? 'Todas' : c)} />}
          {candidato ? (
            <div className="atleta">
              <div className="atleta-tocable" onClick={()=>setPerfilAbierto(candidato)}>
                <div className="atleta-cabecera">
                  <Avatar p={candidato} />
                  <div style={{ minWidth: 0 }}>
                    <div className="atleta-nombre">{candidato.nombre}</div>
                    <div className="atleta-meta"><MapPin size={14} /> {[candidato.ciudad, candidato.club !== 'Sin club' && candidato.club].filter(Boolean).join(' · ')}</div>
                  </div>
                </div>
                {buscaEn && (
                  <div className="busca-en">
                    <Flag size={15} />
                    <span>Busca pareja para <strong>{buscaEn.carrera}</strong> · {fechasCarrera(buscaEn)}{buscaEn.mia && <em> · Tú también vas</em>}</span>
                  </div>
                )}
                <div className="stats">
                  <div><strong className={candidato.verificado && candidato.mejorTiempo ? 'acento' : ''}>{candidato.verificado && candidato.mejorTiempo ? candidato.mejorTiempo : '—'}</strong><span>Mejor tiempo</span></div>
                  <div><strong>{candidato.division || '—'}</strong><span>División</span></div>
                  <div><strong>{candidato.categoria}</strong><span>Categoría</span></div>
                </div>
                <div className="atleta-tags">
                  <span className="tag">{candidato.sexo}</span>
                  {candidato.division && <span className="tag">{candidato.division}</span>}
                  <EtiquetaNivel verificado={candidato.verificado} compitio={candidato.compitio} />
                </div>
                <div className="ver-perfil">Ver perfil y vídeos <ChevronRight size={20} /></div>
              </div>
              <div className="swipe-actions">
                <button className="btn-pass" onClick={()=>setIndice(i=>Math.min(i+1,lista.length))}><X size={18} /> Pasar</button>
                {estadoCon(candidato.userId)
                  ? <button className="btn-match" disabled>{estadoCon(candidato.userId).estado === 'aceptada' ? 'Ya conectados' : 'Solicitud enviada'}</button>
                  : <button className="btn-match" onClick={async()=>{ if (await solicitar(candidato, buscaEn)) setIndice(i=>Math.min(i+1,lista.length)) }}>Solicitar</button>}
              </div>
              <div className="contador">{indice + 1} de {lista.length}</div>
            </div>
          ) : (
            <Vacio icono={Search} titulo="No hay más atletas">
              Prueba con otros filtros. Cuantos más atletas se registren, más opciones tendrás.
              {lista.length > 0 && <div style={{ marginTop: 16 }}><button className="btn-secondary" onClick={()=>setIndice(0)}>Volver a empezar</button></div>}
            </Vacio>
          )}
        </div>
      )}

      {subPantalla === 'solicitudes' && (
        recibidasReales.length === 0
          ? <Vacio icono={Inbox} titulo="Sin solicitudes">Cuando alguien quiera ser tu pareja, aparecerá aquí.</Vacio>
          : <div className="lista">
              {recibidasReales.map(s => {
                const p = aCandidato(s.otro)
                return (
                  <div className="solicitud" key={'r'+s.id}>
                    <div className="fila tocable" onClick={()=>setPerfilAbierto(p)}>
                      <Avatar p={p} />
                      <div className="fila-cuerpo">
                        <div className="fila-titulo">{p.nombre}</div>
                        <div className="fila-sub"><MapPin size={13} /> {p.ciudad}{p.verificado && p.mejorTiempo ? ` · ${p.mejorTiempo}` : ''}</div>
                      </div>
                      <div className="fila-meta">{horaCorta(s.created_at)}</div>
                      <ChevronRight size={18} className="fila-chevron" />
                    </div>
                    {s.mensaje && <div className="cita">{s.mensaje}</div>}
                    <div className="match-actions">
                      <button className="btn-pass btn-sm" onClick={()=>responder(s,'rechazada')}>Rechazar</button>
                      <button className="btn-match btn-sm" onClick={()=>responder(s,'aceptada')}>Aceptar</button>
                    </div>
                  </div>
                )
              })}
            </div>
      )}

      {subPantalla === 'plazas' && <Plazas plazas={plazas} recargar={recargarPlazas} contactar={contactarPlaza} estadoCon={estadoCon} yo={yo} />}

      {subPantalla === 'chats' && (
        conversaciones.length === 0
          ? <Vacio icono={MessageCircle} titulo="Sin conversaciones">Acepta una solicitud para empezar a chatear.</Vacio>
          : <div className="lista">
              {conversaciones.map(c => {
                const u = ultimos[c.userId]
                return (
                  <button className="fila" key={'c'+c.userId} onClick={()=>setChatActivo(c)}>
                    <Avatar p={c} />
                    <div className="fila-cuerpo">
                      <div className="fila-titulo">{c.nombre}</div>
                      <div className="fila-sub">{u ? `${u.de === yo.id ? 'Tú: ' : ''}${u.texto}` : 'Escribe el primer mensaje'}</div>
                    </div>
                    <div className="fila-meta">{u ? horaCorta(u.created_at) : ''}</div>
                  </button>
                )
              })}
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
        <label className="campo-busqueda">
          <Search size={18} />
          <input className="buscador-input" value={filtros.texto} onChange={e=>cambiarFiltro('texto',e.target.value)} placeholder="Nombre o club" />
        </label>
        <button className={activos || abierto ? 'filtro-btn active' : 'filtro-btn'} onClick={()=>setAbierto(a=>!a)} aria-label="Filtros">
          <SlidersHorizontal size={20} />
          {activos > 0 && <span className="notif">{activos}</span>}
        </button>
      </div>
      {abierto && (
        <div className="filtros-panel">
          <Grupo filtros={filtros} cambiarFiltro={cambiarFiltro} campo="compitio" titulo="Experiencia" opciones={['Todos','Ya ha competido','Aún no ha competido']} />
          <Grupo filtros={filtros} cambiarFiltro={cambiarFiltro} campo="ciudad" titulo="Ciudad" opciones={['Todas', ...ciudades]} />
          <Grupo filtros={filtros} cambiarFiltro={cambiarFiltro} campo="categoria" titulo="Categoría" opciones={['Todas','Open','Pro']} />
          <Grupo filtros={filtros} cambiarFiltro={cambiarFiltro} campo="sexo" titulo="Sexo" opciones={['Todos','Mujer','Hombre']} />
          <div className="filtros-footer">
            <span>{total} {total===1?'atleta':'atletas'}</span>
            <button className="link-btn" onClick={limpiar}>Limpiar</button>
          </div>
        </div>
      )}
    </div>
  )
}

// Fila de carreras con gente buscando pareja: pulsas una y solo ves a quienes buscan para esa carrera
function CarrerasPareja({ carreras, elegida, elegir }) {
  return (
    <div className="carreras-pareja">
      <div className="filtro-titulo">Buscan pareja para</div>
      <div className="carreras-pareja-fila">
        {carreras.map(c => (
          <button key={c.clave} className={elegida === c.clave ? 'cp-chip active' : 'cp-chip'} onClick={() => elegir(c.clave)}>
            <span className="cp-nombre">{c.nombre}{c.mia && <Check size={12} strokeWidth={3} />}</span>
            <span className="cp-meta">{c.fechas} · {c.n} {c.n === 1 ? 'atleta' : 'atletas'}</span>
          </button>
        ))}
      </div>
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

function PerfilOtro({ persona, relacion, yoId, trasBloquear, volver, solicitar, chatear, abrirOtro }) {
  const boton = relacion?.estado === 'aceptada'
    ? <button className="btn-match" onClick={chatear}><MessageCircle size={18} /> Abrir chat</button>
    : relacion
      ? <button className="btn-match" disabled>{relacion.enviada ? (relacion.estado === 'rechazada' ? 'Solicitud no aceptada' : 'Solicitud enviada') : 'Solicitud recibida'}</button>
      : <button className="btn-match" onClick={solicitar}>Solicitar como pareja</button>
  return (
    <div style={{display:'flex',flexDirection:'column',flex:1,minHeight:0}}>
      <div className="pv-barra">
        <button className="icon-btn" onClick={volver} aria-label="Volver"><ChevronLeft size={22} /></button>
        <MenuUsuario yoId={yoId} persona={persona} contexto="perfil" onBloqueado={trasBloquear} />
      </div>
      <PerfilVista perfil={persona.raw} color={persona.color} yoId={yoId} acciones={boton} onAbrirPerfil={abrirOtro} />
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
    if (rel?.estado === 'aceptada') return <button className="btn-match btn-sm" onClick={()=>contactar(p)}>Abrir chat</button>
    if (rel) return <button className="btn-match btn-sm" disabled>{rel.enviada ? 'Enviado' : 'Ver solicitudes'}</button>
    return <button className="btn-match btn-sm" onClick={()=>contactar(p)}>Contactar</button>
  }
  const lista = plazas.filter(p => filtro === 'Todas' || p.tipo === filtro)
  return (
    <div>
      {form ? (
        <div className="form-bloque">
          <div className="chips">
            {['Busco sustituto','Cedo mi plaza'].map(t => (
              <button key={t} className={form.tipo===t?'chip active':'chip'} onClick={()=>set('tipo',t)}>{t}</button>
            ))}
          </div>
          <input value={form.carrera} onChange={e=>set('carrera',e.target.value)} placeholder="Carrera (ej. Madrid · Doubles)" />
          <div className="upload-row">
            <input type="date" value={form.fecha} min={hoyISO()} onChange={e=>set('fecha',e.target.value)} />
            <select value={form.categoria} onChange={e=>set('categoria',e.target.value)}>
              {CATEGORIAS_PLAZA.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <select value={form.flex?'si':'no'} onChange={e=>set('flex',e.target.value==='si')}>
            <option value="si">Con Flex (cambio de nombre)</option>
            <option value="no">Sin Flex</option>
          </select>
          <input value={form.nota} onChange={e=>set('nota',e.target.value)} placeholder="Detalles (ritmo, motivo…)" />
          {error && <div className="upload-status">{error}</div>}
          <div className="match-actions">
            <button className="btn-secondary" onClick={()=>setForm(null)}>Cancelar</button>
            <button className="btn-primary" disabled={!form.carrera.trim() || !form.fecha} onClick={publicar}>Publicar</button>
          </div>
        </div>
      ) : (
        <button className="btn-match btn-block" onClick={()=>setForm(PLAZA_VACIA)}><Plus size={18} /> Publicar plaza</button>
      )}
      <a className="plazas-link" href="https://hyrox.es/faqs/" target="_blank" rel="noopener noreferrer">Cómo cambiar el nombre de tu entrada <ArrowUpRight size={18} /></a>
      <div className="chips" style={{ margin: '16px 0 4px' }}>
        {['Todas','Busco sustituto','Cedo mi plaza'].map(t => (
          <button key={t} className={filtro===t?'chip active':'chip'} onClick={()=>setFiltro(t)}>{t}</button>
        ))}
      </div>
      {lista.length === 0 && <Vacio icono={Ticket} titulo="Sin plazas">No hay plazas publicadas ahora mismo.</Vacio>}
      {lista.map(p => (
        <div className="plaza" key={p.id}>
          <div className="plaza-top">
            <span className={p.tipo==='Busco sustituto'?'tag acento':'tag'}>{p.tipo}</span>
            <span className={p.flex?'tag ok':'tag no'}>{p.flex?'Con Flex':'Sin Flex'}</span>
          </div>
          <div className="plaza-titulo">{p.carrera}</div>
          <div className="plaza-sub">{fechaCorta(p.fecha)} · {p.categoria}</div>
          {p.nota && <div className="plaza-nota">{p.nota}</div>}
          <div className="plaza-bottom">
            <div className="plaza-autor">
              <Avatar p={p.autor} />
              <span>{p.autor.nombre}</span>
            </div>
            {p.user_id === yo.id
              ? <button className="link-btn apagado" onClick={()=>retirar(p)}>Retirar</button>
              : botonContacto(p)}
          </div>
        </div>
      ))}
    </div>
  )
}
