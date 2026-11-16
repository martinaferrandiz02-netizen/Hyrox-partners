// Campo de tiempo con casillas separadas (h) · min · seg y teclado numérico
export function TiempoInput({ valor, onChange, horas = false, etiqueta }) {
  const v = valor || {}
  const set = (k, x) => onChange({ ...v, [k]: x.replace(/\D/g, '').slice(0, k === 'h' ? 1 : 2) })
  const casilla = (k, ph) => (
    <input inputMode="numeric" pattern="[0-9]*" autoComplete="off" aria-label={`${etiqueta || 'Tiempo'} ${ph}`}
      value={v[k] || ''} placeholder={ph} onChange={e => set(k, e.target.value)} />
  )
  return (
    <span className={`tiempo-input ${horas ? 'con-horas' : ''}`}>
      {horas && <>{casilla('h', 'h')}<i>:</i></>}
      {casilla('m', 'min')}<i>:</i>{casilla('s', 'seg')}
    </span>
  )
}
