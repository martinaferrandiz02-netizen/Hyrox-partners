import { useState } from 'react'
import { MisVideos, VideosDe } from './Videos'

// ─── Demo: el mismo perfil que la versión definitiva, con datos de ejemplo ───

const ESTACIONES = ['Ski erg', 'Sled push', 'Sled pull', 'Burpee broad jumps', 'Rowing', 'Farmer carry', 'Sandbag lunges', 'Wall balls']
// Reparto típico del tiempo total (8 estaciones + carrera + transiciones), para generar parciales de ejemplo
const REPARTO = { 'Ski erg': .061, 'Sled push': .022, 'Sled pull': .043, 'Burpee broad jumps': .059, 'Rowing': .060, 'Farmer carry': .021, 'Sandbag lunges': .043, 'Wall balls': .053, Running: .543 }
const REFERENCIA = { 'Individual|Pro|Hombre': 56, 'Individual|Pro|Mujer': 60, 'Individual|Open|Hombre': 58, 'Individual|Open|Mujer': 62, 'Doubles|Pro|Hombre': 53, 'Doubles|Pro|Mujer': 58, 'Doubles|Open|Hombre': 54, 'Doubles|Open|Mujer': 59 }

const aSeg = (t) => { const p = t.split(':').map(Number); return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1] }
const formato = (s) => s >= 3600 ? `${Math.floor(s / 3600)}:${String(Math.floor(s % 3600 / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

// Convierte las carreras de ejemplo en "resultados" verificados con parciales y puntos
function resultadosDemo(persona) {
  return (persona.carreras || []).map((c, i) => {
    const [division, categoria] = c.tipo.replace(' · con Marta G.', '').split(' ')
    const seg = aSeg(c.tiempo)
    const ref = REFERENCIA[`${division}|${categoria || 'Open'}|${persona.sexo}`] || 60
    const variacion = (k) => 1 + (((persona.id || 1) * 7 + i * 3 + k.length) % 9 - 4) / 100
    const parciales = Object.fromEntries(Object.entries(REPARTO).map(([k, f]) => [k, Math.round(seg * f * variacion(k))]))
    return { id: `${persona.id}-${i}`, carrera: c.nombre, fecha: c.fecha || null, division, categoria: categoria || 'Open', tiempo: c.tiempo, parciales, puntos: Math.round(1000 * ref * 60 / seg) }
  })
}

const mejores = (res) => {
  const m = {}
  for (const r of res) for (const [k, s] of Object.entries(r.parciales)) if (!m[k] || s < m[k]) m[k] = s
  return m
}

export function PerfilDemo({ persona, esPropio, acciones }) {
  const [pestana, setPestana] = useState('marcas')
  const resultados = resultadosDemo(persona)
  const marcas = mejores(resultados)
  const mejor = resultados.reduce((a, r) => (!a || r.puntos > a.puntos ? r : a), null)
  const avisoDemo = () => window.alert('Esto es una demo: en la versión real aquí subes el certificado de tu carrera y se verifica.')

  return (
    <div className="screen pv">
      <div className="pv-hero">
        <div className={`pv-avatar ${mejor ? 'verificado' : ''}`}>
          <div className={`avatar ${persona.color}`}>{persona.iniciales}</div>
          {mejor && <span className="pv-check">✓</span>}
        </div>
        <div className="pv-nombre">{persona.nombre}</div>
        <div className="pv-sub">📍 {persona.ciudad}{persona.club && persona.club !== 'Sin club' ? ` · ${persona.club}` : ''}</div>
        <div className="pv-chips">
          <span>{persona.sexo}</span>
          <span>{persona.categoria}</span>
          {mejor && <span>{mejor.division}</span>}
        </div>
      </div>

      <div className="pv-stats">
        <div><strong className="amarillo">{mejor ? mejor.puntos : '–'}</strong><span>Puntos</span></div>
        <div><strong>{mejor ? mejor.tiempo : '–'}</strong><span>Mejor tiempo</span></div>
        <div><strong>{resultados.length}</strong><span>{resultados.length === 1 ? 'Carrera' : 'Carreras'}</span></div>
      </div>

      {esPropio ? (
        <div className="pv-acciones">
          <button className="btn-secondary" onClick={avisoDemo}>Editar perfil</button>
          <button className="btn-match" onClick={avisoDemo}>+ Añadir carrera</button>
        </div>
      ) : acciones && <div className="pv-acciones">{acciones}</div>}

      <div className="pv-tabs">
        {[['marcas', 'Marcas'], ['carreras', 'Carreras'], ['tecnica', 'Técnica']].map(([k, l]) => (
          <button key={k} className={pestana === k ? 'active' : ''} onClick={() => setPestana(k)}>{l}</button>
        ))}
      </div>

      {pestana === 'marcas' && (resultados.length === 0 ? (
        <div className="pv-vacio">Todavía no tiene carreras verificadas. Mira sus vídeos de técnica para ver su nivel.</div>
      ) : (
        <div>
          <div className="pv-marcas">
            {ESTACIONES.map((e, i) => (
              <div key={e}>
                <span className="pv-marca-num">{i + 1}</span>
                <span className="pv-marca-nombre">{e}</span>
                <strong>{formato(marcas[e])}</strong>
              </div>
            ))}
          </div>
          <div className="pv-running"><span>🏃 Carrera (8 km)</span><strong>{formato(marcas.Running)}</strong></div>
          <div className="pv-nota">Mejores tiempos de {esPropio ? 'tus' : 'sus'} carreras verificadas</div>
        </div>
      ))}

      {pestana === 'carreras' && (resultados.length === 0 ? (
        <div className="pv-vacio">Todavía no tiene carreras verificadas.</div>
      ) : resultados.map(r => (
        <div key={r.id} className="pv-carrera">
          <div className="pv-carrera-top">
            <div>
              <div className="pv-carrera-nombre">{r.carrera}</div>
              <div className="pv-carrera-sub">{r.division} · {r.categoria}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="pv-carrera-tiempo">{r.tiempo}</div>
              <div className="pv-carrera-sub">{r.puntos} pts</div>
            </div>
          </div>
          <div className="pv-carrera-pie">
            <span className="pv-estado ok">✓ Verificado</span>
            <a href="#" onClick={e => { e.preventDefault(); window.alert('Esto es una demo: en la versión real aquí se abre el certificado oficial.') }}>Ver certificado ↗</a>
          </div>
        </div>
      )))}

      {pestana === 'tecnica' && (esPropio ? <MisVideos /> : <VideosDe autor={persona.nombre} />)}
    </div>
  )
}
