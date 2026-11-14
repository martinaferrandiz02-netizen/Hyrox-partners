import { ChevronLeft } from 'lucide-react'

// Barra superior de las pantallas internas: botón de volver (y algo a la derecha, si hace falta)
export function Volver({ onClick, children }) {
  return (
    <div className="topbar">
      <button className="icon-btn" onClick={onClick} aria-label="Volver"><ChevronLeft size={22} /></button>
      {children}
    </div>
  )
}
