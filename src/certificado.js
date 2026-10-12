// Lectura y comprobación del certificado de resultado (PDF o imagen).
// Todo se hace en el navegador: PDF con pdf.js, imágenes con OCR (tesseract.js).
// Las librerías se cargan solo cuando alguien sube un certificado.

async function textoDePdf(archivo) {
  const pdfjs = await import('pdfjs-dist')
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default
  const pdf = await pdfjs.getDocument({ data: await archivo.arrayBuffer() }).promise
  let texto = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const pagina = await pdf.getPage(i)
    const contenido = await pagina.getTextContent()
    texto += contenido.items.map(it => it.str).join(' ') + '\n'
  }
  // PDF escaneado sin texto: se convierte la primera página en imagen y se pasa por OCR
  if (texto.replace(/\s/g, '').length < 20) {
    const pagina = await pdf.getPage(1)
    const vista = pagina.getViewport({ scale: 2.5 })
    const canvas = document.createElement('canvas')
    canvas.width = vista.width
    canvas.height = vista.height
    await pagina.render({ canvasContext: canvas.getContext('2d'), viewport: vista }).promise
    texto = await textoDeImagen(canvas)
  }
  return texto
}

// Pinta la imagen sobre un fondo sólido. Muchos certificados son PNG con letras
// blancas sobre fondo transparente: sobre negro y con colores invertidos quedan
// letras negras sobre blanco, que es lo que mejor lee el OCR.
async function versionesDeImagen(archivo) {
  const bmp = await createImageBitmap(archivo)
  const escala = Math.max(1, Math.min(3, 2000 / bmp.width))
  const crear = (fondo, invertir) => {
    const c = document.createElement('canvas')
    c.width = Math.round(bmp.width * escala)
    c.height = Math.round(bmp.height * escala)
    const ctx = c.getContext('2d')
    ctx.fillStyle = fondo
    ctx.fillRect(0, 0, c.width, c.height)
    ctx.drawImage(bmp, 0, 0, c.width, c.height)
    if (invertir) {
      ctx.globalCompositeOperation = 'difference'
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, c.width, c.height)
    }
    return c
  }
  return [crear('#fff', false), crear('#000', true)]
}

async function textoDeImagen(imagen) {
  const { default: Tesseract } = await import('tesseract.js')
  const lienzos = imagen instanceof HTMLCanvasElement ? [imagen] : await versionesDeImagen(imagen)
  let texto = ''
  for (const lienzo of lienzos) {
    const { data } = await Tesseract.recognize(lienzo, 'eng+spa')
    texto += data.text + '\n'
  }
  return texto
}

export async function leerCertificado(archivo) {
  return archivo.type === 'application/pdf' ? textoDePdf(archivo) : textoDeImagen(archivo)
}

// Quita tildes, mayúsculas y signos para comparar nombres
export const normalizar = (t) => t
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9:\s]/g, ' ').replace(/\s+/g, ' ').trim()

// El nombre coincide si todas sus palabras (de 2+ letras) aparecen en el certificado.
// Sirve igual con una persona o con dos (Doubles): basta con que una sea la tuya.
export function contieneNombre(texto, nombreCompleto) {
  const palabrasTexto = new Set(normalizar(texto).split(' '))
  const palabras = normalizar(nombreCompleto).split(' ').filter(p => p.length >= 2)
  return palabras.length >= 2 && palabras.every(p => palabrasTexto.has(p))
}

// Pasa "1:05:12", "01:05:12" o "65:12" a segundos
export function aSegundos(t) {
  const partes = t.trim().split(':').map(Number)
  if (partes.some(n => Number.isNaN(n))) return null
  if (partes.length === 3) return partes[0] * 3600 + partes[1] * 60 + partes[2]
  if (partes.length === 2) return partes[0] * 60 + partes[1]
  return null
}

export function formatoTiempo(seg) {
  const h = Math.floor(seg / 3600)
  const m = Math.floor((seg % 3600) / 60)
  const s = seg % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// Todos los tiempos que aparecen en el certificado (total y parciales)
// Acepta "01:31:56" y también "01: 31: 56" (con espacios, como en algunos certificados)
export function tiemposEnTexto(texto) {
  const encontrados = texto.match(/\b\d{1,2}\s*:\s*\d{2}(?:\s*:\s*\d{2})?\b/g) || []
  return [...new Set(encontrados.map(t => aSegundos(t.replace(/\s+/g, ''))).filter(s => s !== null && s > 0))]
}

// Comprueba nombre y tiempo. Devuelve { ok, motivo, tiempoTotal }
export function comprobarCertificado(texto, nombreCompleto, tiempoDeclarado) {
  const tiempos = tiemposEnTexto(texto)
  // El tiempo final es el más largo de los que aparecen (los demás son parciales)
  const tiempoTotal = tiempos.length ? Math.max(...tiempos) : null

  if (!contieneNombre(texto, nombreCompleto)) {
    return { ok: false, motivo: 'Tu nombre completo no aparece en el certificado. Escríbelo tal y como sale en él.', tiempoTotal }
  }
  if (!tiempoTotal) {
    return { ok: false, motivo: 'No hemos encontrado ningún tiempo en el certificado. Prueba con un archivo más nítido.', tiempoTotal }
  }
  if (tiempoDeclarado) {
    const declarado = aSegundos(tiempoDeclarado)
    if (declarado === null) return { ok: false, motivo: 'Escribe el tiempo con el formato 1:12:30.', tiempoTotal }
    if (declarado !== tiempoTotal) {
      return { ok: false, motivo: `El tiempo del certificado es ${formatoTiempo(tiempoTotal)}, no ${tiempoDeclarado}.`, tiempoTotal }
    }
  }
  return { ok: true, motivo: '', tiempoTotal }
}

// "Huella" del certificado: la lista ordenada de todos sus tiempos (total y parciales).
// Es prácticamente única por resultado, aunque el archivo sea una captura distinta.
export function huellaCertificado(texto) {
  const tiempos = tiemposEnTexto(texto).sort((a, b) => a - b)
  return tiempos.length >= 3 ? tiempos.join('-') : null
}
