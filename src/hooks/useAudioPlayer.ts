import { useCallback, useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import type { StoredTrack } from '../db'
import {
  addTrackFromFile,
  getAllTracksOrdered,
  getTrackBlob,
  removeTrack,
  updateTrackDuration,
} from '../db'

export type RepeatMode = 'none' | 'one' | 'all'

function shuffleArray<T>(arr: T[]): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export function useAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const objectUrlRef = useRef<string | null>(null)
  const transportRef = useRef({ queueIndex: 0, queue: [] as StoredTrack[], repeat: 'all' as RepeatMode })

  const [library, setLibrary] = useState<StoredTrack[]>([])
  const [queue, setQueue] = useState<StoredTrack[]>([])
  const [queueIndex, setQueueIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.85)
  /** Evita que cambiar el volumen recree loadTrackIntoAudio y recargue el audio entero */
  const volumeRef = useRef(volume)
  volumeRef.current = volume
  const playingRef = useRef(playing)
  playingRef.current = playing
  /** Evita doble carga en useEffect cuando el usuario dispara play desde un clic (necesario en móvil). */
  const gestureLoadInProgressRef = useRef(false)
  const [shuffle, setShuffle] = useState(false)
  const [repeat, setRepeat] = useState<RepeatMode>('all')
  const [loading, setLoading] = useState(true)

  const current = queue[queueIndex] ?? null

  useEffect(() => {
    transportRef.current = { queueIndex, queue, repeat }
  }, [queueIndex, queue, repeat])

  const refreshLibrary = useCallback(async () => {
    const rows = await getAllTracksOrdered()
    setLibrary(rows)
    if (rows.length === 0) {
      setQueue([])
      setQueueIndex(0)
      setPlaying(false)
      return
    }
    setQueue((prevQ) => {
      if (prevQ.length === 0 && !shuffle) {
        setQueueIndex(0)
        return [...rows]
      }
      return prevQ
    })
  }, [shuffle])

  const refreshLibraryRef = useRef(refreshLibrary)
  refreshLibraryRef.current = refreshLibrary

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      await refreshLibrary()
      if (!cancelled) setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [refreshLibrary])

  /** Desbloquea audio en iOS/Safari: primer toque en la página. */
  useEffect(() => {
    const unlock = () => {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (AC) {
        const ctx = new AC()
        if (ctx.state === 'suspended') void ctx.resume()
        void ctx.close()
      }
    }
    window.addEventListener('touchend', unlock, { once: true, passive: true })
    window.addEventListener('click', unlock, { once: true })
  }, [])

  const revokeUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
  }, [])

  const loadTrackIntoAudio = useCallback(
    async (track: StoredTrack | null) => {
      const el = audioRef.current
      if (!el) return
      revokeUrl()
      el.pause()
      if (!track) {
        el.removeAttribute('src')
        setDuration(0)
        setCurrentTime(0)
        return
      }
      const blob = await getTrackBlob(track.id)
      if (!blob) return
      const url = URL.createObjectURL(blob)
      objectUrlRef.current = url
      el.src = url
      el.volume = volumeRef.current
      await new Promise<void>((resolve, reject) => {
        const onMeta = () => {
          el.removeEventListener('loadedmetadata', onMeta)
          el.removeEventListener('error', onErr)
          const d = el.duration
          if (Number.isFinite(d) && d > 0 && track.duration === 0) {
            void updateTrackDuration(track.id, d)
            void refreshLibraryRef.current()
          }
          setDuration(Number.isFinite(d) && d > 0 ? d : 0)
          resolve()
        }
        const onErr = () => {
          el.removeEventListener('loadedmetadata', onMeta)
          el.removeEventListener('error', onErr)
          reject(new Error('load failed'))
        }
        el.addEventListener('loadedmetadata', onMeta)
        el.addEventListener('error', onErr)
        el.load()
      }).catch(() => {
        setDuration(0)
      })
    },
    [revokeUrl],
  )

  const buildQueueFromLibrary = useCallback(
    (startId: string | null) => {
      const base = shuffle ? shuffleArray(library) : [...library]
      if (base.length === 0) {
        setQueue([])
        setQueueIndex(0)
        return
      }
      let idx = 0
      if (startId) {
        const found = base.findIndex((t) => t.id === startId)
        if (found >= 0) idx = found
      }
      setQueue(base)
      setQueueIndex(idx)
    },
    [library, shuffle],
  )

  useEffect(() => {
    const el = audioRef.current
    if (!el) return

    const onTime = () => setCurrentTime(el.currentTime)
    const onDurationChange = () => {
      const d = el.duration
      if (Number.isFinite(d) && d > 0) setDuration(d)
    }
    const onEnded = () => {
      const { queueIndex: qi, queue: q, repeat: r } = transportRef.current
      if (r === 'one') {
        el.currentTime = 0
        void el.play().then(() => setPlaying(true))
        return
      }
      if (qi < q.length - 1) {
        setQueueIndex(qi + 1)
        setPlaying(true)
      } else if (r === 'all' && q.length > 0) {
        setQueueIndex(0)
        setPlaying(true)
      } else {
        setPlaying(false)
      }
    }
    el.addEventListener('timeupdate', onTime)
    el.addEventListener('durationchange', onDurationChange)
    el.addEventListener('ended', onEnded)
    return () => {
      el.removeEventListener('timeupdate', onTime)
      el.removeEventListener('durationchange', onDurationChange)
      el.removeEventListener('ended', onEnded)
    }
  }, [])

  useEffect(() => {
    if (gestureLoadInProgressRef.current) {
      return
    }
    if (queue.length === 0 || !current) {
      void loadTrackIntoAudio(null)
      return
    }
    let alive = true
    ;(async () => {
      await loadTrackIntoAudio(current)
      if (!alive || !audioRef.current) return
      if (playingRef.current) {
        await audioRef.current.play().catch(() => setPlaying(false))
      }
    })()
    return () => {
      alive = false
    }
    // playing intentionally omitted: toggling pause must not reload blob URL
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, queue.length, loadTrackIntoAudio])

  useEffect(() => {
    const el = audioRef.current
    if (el) el.volume = volume
  }, [volume, current?.id])

  /** Cola + carga + play en la misma cadena iniciada por un clic/tap (requisito móvil). */
  const playFromTrackId = useCallback(
    async (id: string) => {
      const track = library.find((t) => t.id === id)
      if (!track) return
      gestureLoadInProgressRef.current = true
      try {
        flushSync(() => {
          buildQueueFromLibrary(id)
          setPlaying(true)
        })
        await loadTrackIntoAudio(track)
        const el = audioRef.current
        if (el) {
          await el.play().catch(() => setPlaying(false))
        }
      } finally {
        gestureLoadInProgressRef.current = false
      }
    },
    [library, buildQueueFromLibrary, loadTrackIntoAudio],
  )

  const togglePlay = useCallback(() => {
    if (queue.length === 0 && library.length > 0) {
      void playFromTrackId(library[0].id)
      return
    }
    setPlaying((p) => !p)
  }, [queue.length, library, playFromTrackId])

  useEffect(() => {
    const el = audioRef.current
    if (!el || !current) return
    if (playing) {
      void el.play().catch(() => setPlaying(false))
    } else {
      el.pause()
    }
    // current?.id identifies track; full current object not needed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, current?.id])

  const seek = useCallback((t: number) => {
    const el = audioRef.current
    if (!el) return
    const cap =
      Number.isFinite(el.duration) && el.duration > 0 ? el.duration : Number.POSITIVE_INFINITY
    el.currentTime = Math.max(0, Math.min(t, cap))
    setCurrentTime(el.currentTime)
  }, [])

  /** Salto por posición 0–1; usa la duración del elemento audio (si el estado aún no refleja duration). */
  const seekByRatio = useCallback((ratio: number) => {
    const el = audioRef.current
    if (!el) return
    const d = el.duration
    if (!Number.isFinite(d) || d <= 0) return
    el.currentTime = Math.max(0, Math.min(1, ratio)) * d
    setCurrentTime(el.currentTime)
  }, [])

  const next = useCallback(() => {
    if (queue.length === 0) return
    if (queueIndex < queue.length - 1) setQueueIndex((i) => i + 1)
    else if (repeat === 'all') setQueueIndex(0)
  }, [queue.length, queueIndex, repeat])

  const prev = useCallback(() => {
    const el = audioRef.current
    if (el && el.currentTime > 3) {
      el.currentTime = 0
      setCurrentTime(0)
      return
    }
    if (queue.length === 0) return
    if (queueIndex > 0) setQueueIndex((i) => i - 1)
    else if (repeat === 'all') setQueueIndex(queue.length - 1)
  }, [queue.length, queueIndex, repeat])

  const cycleRepeat = useCallback(() => {
    setRepeat((r) => (r === 'none' ? 'all' : r === 'all' ? 'one' : 'none'))
  }, [])

  const toggleShuffle = useCallback(() => {
    setShuffle((s) => !s)
  }, [])

  const addFiles = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return
      /** MIME vacío o raro en móviles; priorizar extensión */
      const audioExt =
        /\.(mp3|m4a|m4b|aac|ogg|oga|opus|wav|flac|aiff?|caf|wma|mp2|mpc|webm)$/i
      let added = 0
      const failures: string[] = []
      for (let i = 0; i < files.length; i++) {
        const f = files[i]
        const type = (f.type || '').toLowerCase()
        const byName = audioExt.test(f.name)
        const byType =
          type.startsWith('audio/') ||
          type === 'application/ogg' ||
          (type === 'application/octet-stream' && byName)
        if (!byType && !byName) continue
        try {
          await addTrackFromFile(f)
          added++
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e)
          failures.push(`${f.name}: ${msg}`)
          console.error('KiraGamersMusic: no se guardó el archivo', f.name, e)
        }
      }
      await refreshLibrary()
      if (files.length > 0 && added === 0 && failures.length === 0) {
        window.alert(
          'No se importó ningún archivo reconocido como audio.\n\n' +
            'Prueba con MP3, M4A, WAV, FLAC, OGG… Si vienen del móvil, asegúrate de elegir archivos de música.',
        )
      } else if (failures.length > 0) {
        window.alert(
          `No se pudieron guardar ${failures.length} archivo(s) (espacio lleno o navegador privado).\n\n` +
            failures.slice(0, 3).join('\n') +
            (failures.length > 3 ? `\n…y ${failures.length - 3} más` : ''),
        )
      }
    },
    [refreshLibrary],
  )

  const deleteTrack = useCallback(
    async (id: string) => {
      if (current?.id === id) {
        setPlaying(false)
        revokeUrl()
      }
      await removeTrack(id)
      setQueue((q) => {
        const i = q.findIndex((t) => t.id === id)
        if (i < 0) return q
        const nextQ = q.filter((t) => t.id !== id)
        setQueueIndex((qi) => {
          if (nextQ.length === 0) return 0
          if (i === qi) return Math.min(qi, nextQ.length - 1)
          if (i < qi) return qi - 1
          return qi
        })
        return nextQ
      })
      await refreshLibrary()
    },
    [current?.id, refreshLibrary, revokeUrl],
  )

  return {
    audioRef,
    library,
    queue,
    queueIndex,
    current,
    playing,
    currentTime,
    duration,
    volume,
    setVolume,
    shuffle,
    toggleShuffle,
    repeat,
    cycleRepeat,
    loading,
    playFromTrackId,
    togglePlay,
    seek,
    seekByRatio,
    next,
    prev,
    addFiles,
    deleteTrack,
    refreshLibrary,
  }
}
