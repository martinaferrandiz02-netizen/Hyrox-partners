// Saca una foto (miniatura) de un vídeo para usarla como portada.
// Se hace en el navegador: carga el vídeo, salta a ~1 s y lo dibuja en un canvas.
export function crearMiniatura(archivo, segundo = 1) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(archivo)
    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    video.preload = 'auto'
    video.src = url
    const terminar = (blob) => { URL.revokeObjectURL(url); resolve(blob) }
    const tiempoMax = setTimeout(() => terminar(null), 8000)
    video.addEventListener('loadedmetadata', () => {
      video.currentTime = Math.min(segundo, (video.duration || 2) / 2)
    })
    video.addEventListener('seeked', () => {
      clearTimeout(tiempoMax)
      const ancho = 480
      const alto = Math.round(ancho * (video.videoHeight / video.videoWidth || 16 / 9))
      const canvas = document.createElement('canvas')
      canvas.width = ancho
      canvas.height = alto
      canvas.getContext('2d').drawImage(video, 0, 0, ancho, alto)
      canvas.toBlob(blob => terminar(blob), 'image/jpeg', 0.8)
    }, { once: true })
    video.addEventListener('error', () => { clearTimeout(tiempoMax); terminar(null) })
  })
}
