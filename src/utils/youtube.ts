/** Extrae el ID de vídeo (11 caracteres) de una URL o texto pegado. */
export function parseYouTubeVideoId(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  const patterns = [
    /(?:youtube\.com\/watch\?[^#]*v=|youtube\.com\/embed\/|youtube\.com\/shorts\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ]
  for (const p of patterns) {
    const m = trimmed.match(p)
    if (m?.[1]) return m[1]
  }
  return null
}

export function youtubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`
}
