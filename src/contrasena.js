// Requisitos mínimos de contraseña (los mismos que hay que poner en Supabase → Authentication)
export const REQUISITOS = [
  ['Al menos 8 caracteres', (p) => p.length >= 8],
  ['Una mayúscula', (p) => /[A-ZÁÉÍÓÚÑ]/.test(p)],
  ['Una minúscula', (p) => /[a-záéíóúñ]/.test(p)],
  ['Un número', (p) => /\d/.test(p)],
]
export const contrasenaValida = (p) => REQUISITOS.every(([, ok]) => ok(p || ''))
export const MENSAJE_REQUISITOS = 'La contraseña necesita al menos 8 caracteres, una mayúscula, una minúscula y un número.'
