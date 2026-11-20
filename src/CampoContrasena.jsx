import { useState } from 'react'
import { Check, Eye, EyeOff } from 'lucide-react'
import { REQUISITOS } from './contrasena'

// Campo de contraseña con el ojo para verla u ocultarla
export function CampoContrasena({ value, onChange, placeholder, autoComplete, required }) {
  const [ver, setVer] = useState(false)
  return (
    <span className="campo-contrasena">
      <input type={ver ? 'text' : 'password'} value={value} onChange={onChange} placeholder={placeholder}
        autoComplete={autoComplete} required={required} autoCapitalize="none" autoCorrect="off" spellCheck={false} />
      <button type="button" onClick={() => setVer(v => !v)} aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
        {ver ? <EyeOff size={20} /> : <Eye size={20} />}
      </button>
    </span>
  )
}

// Lista de requisitos que se van marcando mientras escribes
export function RequisitosContrasena({ valor }) {
  return (
    <ul className="requisitos">
      {REQUISITOS.map(([texto, ok]) => (
        <li key={texto} className={ok(valor || '') ? 'ok' : ''}><Check size={13} strokeWidth={3} /> {texto}</li>
      ))}
    </ul>
  )
}
