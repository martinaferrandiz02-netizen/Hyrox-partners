// Evita el error que solo sale en Mac (Codemagic): dos módulos que se llaman igual salvo mayúsculas,
// p. ej. moderacion.js y Moderacion.jsx. En macOS "./Moderacion" acaba importando el que no es.
import { readdirSync } from 'node:fs'
const modulos = readdirSync('src').filter(f => /\.(jsx?|tsx?)$/.test(f))
const vistos = new Map()
const choques = []
for (const f of modulos) {
  const clave = f.replace(/\.[^.]+$/, '').toLowerCase()
  if (vistos.has(clave)) choques.push(`${vistos.get(clave)} y ${f}`)
  else vistos.set(clave, f)
}
if (choques.length) {
  console.error(`Nombres que chocan en Mac (solo cambian mayúsculas): ${choques.join(', ')}. Renombra uno (p. ej. datosX.js).`)
  process.exit(1)
}
