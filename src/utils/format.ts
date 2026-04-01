export function formatTime(t: number): string {
  if (!Number.isFinite(t) || t < 0) return '0:00'
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function coverGradient(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h << 5) - h + seed.charCodeAt(i)
  const hue1 = Math.abs(h) % 360
  const hue2 = (hue1 + 48) % 360
  return `linear-gradient(145deg, hsl(${hue1} 72% 42%), hsl(${hue2} 65% 28%))`
}
