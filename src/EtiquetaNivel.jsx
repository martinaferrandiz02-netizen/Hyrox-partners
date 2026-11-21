import { Check } from 'lucide-react'

// Una sola etiqueta para saber cuánto fiarte del tiempo de alguien
export function EtiquetaNivel({ verificado, compitio }) {
  if (verificado) return <span className="tag acento"><Check size={12} strokeWidth={3} /> Verificado</span>
  return <span className="tag">{compitio ? 'Ha competido · sin verificar' : 'Aún no ha competido'}</span>
}
