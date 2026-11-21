import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, Flag, ShieldOff, UserCheck, UserX } from 'lucide-react'
import { Avatar } from './Avatar'
import { Volver } from './Volver'
import { PerfilVista } from './PerfilVista'
import { nombreCiudad } from './ciudades'
import { cargarDenuncias, moderarCuenta, resolverDenuncia } from './moderacion'

const fecha = (iso) => new Date(iso).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const aPersona = (p) => ({ ...p, iniciales: p.nombre.split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0].toUpperCase()).join(''), fotoUrl: p.foto_url, color: 'purple' })

// Panel de moderación: denuncias abiertas, revisadas y cuentas suspendidas
export function Moderacion({ yoId, volver }) {
  const [pestana, setPestana] = useState('abiertas')
  const [datos, setDatos] = useState(null)
  const [viendo, setViendo] = useState(null)
  const [ocupado, setOcupado] = useState(null)
  const [aviso, setAviso] = useState('')

  const recargar = useCallback(async () => setDatos(await cargarDenuncias()), [])
  useEffect(() => { const t = setTimeout(recargar, 0); return () => clearTimeout(t) }, [recargar])

  const accion = async (tipo, persona, denunciaId) => {
    const textos = {
      suspender: `¿Suspender la cuenta de ${persona.nombre}? Desaparecerá de la app y no podrá entrar. Puedes reactivarla cuando quieras.`,
      reactivar: `¿Reactivar la cuenta de ${persona.nombre}?`,
      borrar: `¿BORRAR la cuenta de ${persona.nombre}? Se eliminan su perfil, carreras, mensajes y archivos. No se puede deshacer.`,
    }
    if (!window.confirm(textos[tipo])) return
    setOcupado(persona.id); setAviso('')
    const error = await moderarCuenta(tipo, persona.id)
    if (!error && denunciaId && tipo !== 'reactivar') await resolverDenuncia(denunciaId, 'revisada')
    setOcupado(null)
    setAviso(error ? `No se ha podido: ${error}` : { suspender: 'Cuenta suspendida.', reactivar: 'Cuenta reactivada.', borrar: 'Cuenta borrada.' }[tipo])
    setViendo(null)
    recargar()
  }
  const resolver = async (d, estado) => { if (await resolverDenuncia(d.id, estado)) recargar() }

  if (viendo) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <div className="pv-barra"><button className="icon-btn" onClick={() => setViendo(null)} aria-label="Volver"><ChevronLeft size={22} /></button></div>
        <PerfilVista perfil={viendo} verCertificados yoId={yoId} color="purple" acciones={
          viendo.suspendido
            ? <button className="btn-match" disabled={ocupado === viendo.id} onClick={() => accion('reactivar', viendo)}><UserCheck size={18} /> Reactivar cuenta</button>
            : <button className="btn-peligro" disabled={ocupado === viendo.id} onClick={() => accion('suspender', viendo)}><UserX size={18} /> Suspender cuenta</button>
        } />
      </div>
    )
  }

  const abiertas = datos?.denuncias.filter(d => d.estado === 'abierta') || []
  const cerradas = datos?.denuncias.filter(d => d.estado !== 'abierta') || []
  const lista = pestana === 'abiertas' ? abiertas : cerradas
  const pestanas = [['abiertas', 'Abiertas', abiertas.length], ['revisadas', 'Revisadas', 0], ['suspendidas', 'Suspendidas', datos?.suspendidos.length || 0]]

  return (
    <div className="screen">
      <Volver onClick={volver} />
      <div className="screen-title">Moderación</div>
      <div className="screen-sub">Revisa cada denuncia en menos de 24 horas.</div>
      <div className="parejas-tabs">
        {pestanas.map(([id, nombre, n]) => (
          <button key={id} className={pestana === id ? 'active' : ''} onClick={() => setPestana(id)}>
            {nombre}{n > 0 && id !== 'revisadas' && <span className="notif">{n}</span>}
          </button>
        ))}
      </div>
      {aviso && <div className="acceso-estado">{aviso}</div>}
      {!datos && <div className="cert-estado">Cargando…</div>}
      {datos?.error && <div className="cert-estado error">{datos.error}</div>}

      {datos && pestana !== 'suspendidas' && lista.length === 0 && (
        <div className="pareja-vacia">{pestana === 'abiertas' ? 'No hay denuncias pendientes. Todo en orden.' : 'Aún no has revisado ninguna denuncia.'}</div>
      )}
      {datos && pestana !== 'suspendidas' && lista.map(d => (
        <div className="mod-denuncia" key={d.id}>
          <div className="mod-cabecera">
            {d.contra ? <Avatar p={aPersona(d.contra)} /> : <div className="avatar purple">?</div>}
            <div className="mod-quien">
              <strong>{d.contra?.nombre || 'Cuenta borrada'}</strong>
              <span>{d.contra ? nombreCiudad(d.contra.ciudad) : ''}{d.total > 1 ? ` · ${d.total} denuncias` : ''}{d.contra?.suspendido ? ' · Suspendida' : ''}</span>
            </div>
            <span className="tag no"><Flag size={12} /> {d.motivo}</span>
          </div>
          {d.detalle && <div className="mod-detalle">“{d.detalle}”</div>}
          <div className="mod-meta">{fecha(d.created_at)} · en {d.contexto || '—'} · por {d.de?.nombre || 'cuenta borrada'}{d.estado !== 'abierta' ? ` · ${d.estado}` : ''}</div>
          {d.contra && (
            <div className="mod-acciones">
              <button className="btn-secondary btn-sm" onClick={() => setViendo(d.contra)}>Ver perfil</button>
              {d.contra.suspendido
                ? <button className="btn-secondary btn-sm" disabled={ocupado === d.contra.id} onClick={() => accion('reactivar', d.contra)}>Reactivar</button>
                : <button className="btn-peligro btn-sm" disabled={ocupado === d.contra.id} onClick={() => accion('suspender', d.contra, d.id)}>Suspender</button>}
              <button className="link-btn peligro" disabled={ocupado === d.contra.id} onClick={() => accion('borrar', d.contra, d.id)}>Borrar cuenta</button>
            </div>
          )}
          {d.estado === 'abierta' && (
            <div className="mod-resolver">
              <button className="link-btn" onClick={() => resolver(d, 'revisada')}>Marcar revisada</button>
              <button className="link-btn apagado" onClick={() => resolver(d, 'descartada')}>Descartar (no pasa nada)</button>
            </div>
          )}
        </div>
      ))}

      {datos && pestana === 'suspendidas' && (datos.suspendidos.length === 0
        ? <div className="pareja-vacia">No hay cuentas suspendidas.</div>
        : <div className="lista">{datos.suspendidos.map(p => (
            <div className="fila" key={p.id}>
              <Avatar p={aPersona(p)} />
              <div className="fila-cuerpo"><div className="fila-titulo">{p.nombre}</div><div className="fila-sub">{nombreCiudad(p.ciudad)}</div></div>
              <button className="btn-secondary btn-sm" disabled={ocupado === p.id} onClick={() => accion('reactivar', p)}>Reactivar</button>
            </div>
          ))}</div>)}
      <p className="ranking-nota"><ShieldOff size={12} /> Suspender oculta la cuenta y le impide entrar, sin borrar nada. Borrar elimina todo y no se puede deshacer.</p>
    </div>
  )
}
