import { useCallback, useRef } from 'react'
import type { StoredTrack } from './db'
import { updateTrackYoutubeVideoId } from './db'
import { useAudioPlayer } from './hooks/useAudioPlayer'
import { formatTime, coverGradient } from './utils/format'
import { parseYouTubeVideoId, youtubeWatchUrl } from './utils/youtube'
import './App.css'

function IconPlay({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}

function IconPause({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
  )
}

function IconSkip({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M6 18l8.5-6L6 6v12zm8.5-6v6H18V6h-3.5v6z" />
    </svg>
  )
}

function IconPrev({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M6 6h2v12H6V6zm3.5 6l8.5 6V6l-8.5 6z" />
    </svg>
  )
}

function IconShuffle({ className, on }: { className?: string; on?: boolean }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
      opacity={on ? 1 : 0.45}
    >
      <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" strokeLinecap="round" />
    </svg>
  )
}

function IconRepeat({ className, mode }: { className?: string; mode: 'none' | 'one' | 'all' }) {
  const dim = mode === 'none' ? 0.35 : 1
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M17 1l4 4-4 4" opacity={dim} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 11V9a4 4 0 014-4h14" opacity={dim} />
      <path d="M7 23l-4-4 4-4" opacity={dim} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 13v2a4 4 0 01-4 4H3" />
      {mode === 'one' && (
        <circle cx="12" cy="12" r="3.5" fill="currentColor" stroke="none" opacity={0.9} />
      )}
    </svg>
  )
}

function IconVolume({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
    </svg>
  )
}

function IconPlus({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  )
}

function IconTrash({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M3 6h18M8 6V4h8v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" strokeLinecap="round" />
    </svg>
  )
}

function IconLink({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path
        d="M10 13a5 5 0 010-7l1-1a5 5 0 017 7l-1 1M14 11a5 5 0 010 7l-1 1a5 5 0 01-7-7l1-1"
        strokeLinecap="round"
      />
    </svg>
  )
}

type TrackRowProps = {
  t: StoredTrack
  currentId: string | undefined
  onPlay: (id: string) => void | Promise<void>
  onDelete: (id: string) => void
  onYoutube: (t: StoredTrack, e: React.MouseEvent) => void
}

function TrackRowItem({ t, currentId, onPlay, onDelete, onYoutube }: TrackRowProps) {
  const active = currentId === t.id
  return (
    <li className={active ? 'track active' : 'track'}>
      <div className="track-card">
        <div className="track-art-frame">
          <div
            className="track-art-inner"
            style={{ background: coverGradient(t.id + t.name) }}
            aria-hidden
          />
        </div>
        <div className="track-content">
          <div className="track-topline">
            <div className="track-body">
              <span className="track-name">{t.name}</span>
              <span className="track-dur">{t.duration > 0 ? formatTime(t.duration) : '—'}</span>
            </div>
            <div className="track-top-actions">
              {!t.youtubeVideoId ? (
                <button
                  type="button"
                  className="track-add-yt"
                  onClick={(e) => onYoutube(t, e)}
                  title="Añadir enlace de YouTube"
                >
                  <IconLink className="tiny" />
                </button>
              ) : null}
              <button type="button" className="track-del" onClick={() => void onDelete(t.id)} title="Quitar">
                <IconTrash className="tiny" />
              </button>
            </div>
          </div>
          <div className="track-actions">
            <button
              type="button"
              className="track-btn track-btn-music"
              onClick={() => void onPlay(t.id)}
              title="Reproducir audio"
            >
              Música
            </button>
            {t.youtubeVideoId ? (
              <a
                href={youtubeWatchUrl(t.youtubeVideoId)}
                target="_blank"
                rel="noopener noreferrer"
                className="track-btn track-btn-yt"
                onClick={(e) => {
                  if (e.shiftKey) {
                    e.preventDefault()
                    void onYoutube(t, e)
                  }
                }}
                title="Abrir en YouTube (Mayús+clic para editar o quitar)"
              >
                Video
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </li>
  )
}

export default function App() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)

  const {
    audioRef,
    library,
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
  } = useAudioPlayer()

  const handleYoutubeButton = useCallback(
    async (t: StoredTrack, e: React.MouseEvent) => {
      if (e.shiftKey) {
        const raw = window.prompt(
          'Nueva URL de YouTube (deja vacío para quitar el enlace):',
          t.youtubeVideoId ? youtubeWatchUrl(t.youtubeVideoId) : '',
        )
        if (raw === null) return
        const trimmed = raw.trim()
        if (trimmed === '') {
          await updateTrackYoutubeVideoId(t.id, undefined)
          await refreshLibrary()
          return
        }
        const vid = parseYouTubeVideoId(trimmed)
        if (!vid) {
          window.alert('URL no válida.')
          return
        }
        await updateTrackYoutubeVideoId(t.id, vid)
        await refreshLibrary()
        return
      }
      if (t.youtubeVideoId) {
        window.open(youtubeWatchUrl(t.youtubeVideoId), '_blank', 'noopener,noreferrer')
        return
      }
      const raw = window.prompt('Pega la URL del video de YouTube para esta canción:')
      if (raw == null || raw.trim() === '') return
      const vid = parseYouTubeVideoId(raw)
      if (!vid) {
        window.alert('No se reconoce el enlace. Prueba con una URL de youtube.com o youtu.be.')
        return
      }
      await updateTrackYoutubeVideoId(t.id, vid)
      await refreshLibrary()
      window.open(youtubeWatchUrl(vid), '_blank', 'noopener,noreferrer')
    },
    [refreshLibrary],
  )

  const onProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const bar = progressRef.current
      if (!bar) return
      const rect = bar.getBoundingClientRect()
      if (rect.width <= 0) return
      const x = Math.min(Math.max(0, e.clientX - rect.left), rect.width)
      seekByRatio(x / rect.width)
    },
    [seekByRatio],
  )

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="app">
      <audio ref={audioRef} preload="auto" playsInline />

      <header className="header">
        <div className="brand">
          <img
            className="brand-mark"
            src="/kiragamers-logo.png"
            alt="KiraGamers"
            width={384}
            height={384}
            decoding="async"
            fetchPriority="high"
          />
          <div>
            <h1 className="brand-title">KiraGamers Music</h1>
            <p className="brand-tag">Tu biblioteca local</p>
          </div>
        </div>
        <div className="header-actions">
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,audio/mpeg,audio/mp3,.mp3,.m4a,.m4b,.aac,.wav,.flac,.ogg,.opus,.oga,.webm,.wma,.aif,.aiff,.caf"
            multiple
            className="visually-hidden"
            onChange={(e) => {
              const list = e.target.files
              void addFiles(list)
              e.target.value = ''
            }}
          />
          <button type="button" className="btn btn-primary" onClick={() => fileInputRef.current?.click()}>
            <IconPlus className="btn-ico" />
            Añadir música
          </button>
        </div>
      </header>

      <main className="main">
        <section className="library-panel" aria-label="Biblioteca">
          <div className="library-head">
            <div className="library-head-main">
              <h3 className="library-title">
                Biblioteca
                <span className="library-title-count">
                  · {library.length} {library.length === 1 ? 'canción' : 'canciones'}
                </span>
              </h3>
            </div>
          </div>
          {library.length === 0 && !loading && (
            <div className="empty">
              <p>No hay pistas todavía.</p>
              <p className="empty-hint">Arrastra archivos de audio aquí o usa «Añadir música».</p>
            </div>
          )}
          <div
            className="library-scroll"
            onDragOver={(e) => {
              e.preventDefault()
              e.dataTransfer.dropEffect = 'copy'
            }}
            onDrop={(e) => {
              e.preventDefault()
              void addFiles(e.dataTransfer.files)
            }}
          >
            <ul className="track-list">
              {library.map((t) => (
                <TrackRowItem
                  key={t.id}
                  t={t}
                  currentId={current?.id}
                  onPlay={playFromTrackId}
                  onDelete={deleteTrack}
                  onYoutube={handleYoutubeButton}
                />
              ))}
            </ul>
          </div>
        </section>

        <section className="now-panel" aria-label="Reproducción actual">
          <div className="cover-frame">
            <div
              className="cover"
              style={{ background: current ? coverGradient(current.id + current.name) : 'var(--cover-empty)' }}
            >
              {!current && <span className="cover-placeholder">♪</span>}
            </div>
          </div>
          <div className="now-info">
            <p className="now-label">Ahora suena</p>
            <h2 className="now-title">{current?.name ?? 'Nada en cola'}</h2>
            <p className="now-meta">{loading ? 'Cargando…' : `${library.length} tema${library.length === 1 ? '' : 's'}`}</p>

            <div
              ref={progressRef}
              className="progress"
              role="slider"
              aria-valuenow={Math.round(pct)}
              aria-valuemin={0}
              aria-valuemax={100}
              tabIndex={0}
              onClick={onProgressClick}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight') seek(currentTime + 5)
                if (e.key === 'ArrowLeft') seek(currentTime - 5)
              }}
            >
              <div className="progress-fill" style={{ width: `${pct}%` }} />
            </div>
            <div className="times">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>

            <div className="transport">
              <button type="button" className="tbtn" onClick={toggleShuffle} aria-pressed={shuffle} title="Aleatorio">
                <IconShuffle on={shuffle} className="tico" />
              </button>
              <button type="button" className="tbtn" onClick={prev} title="Anterior">
                <IconPrev className="tico" />
              </button>
              <button type="button" className="tbtn tbtn-play" onClick={togglePlay} title={playing ? 'Pausa' : 'Reproducir'}>
                {playing ? <IconPause className="tico-lg" /> : <IconPlay className="tico-lg" />}
              </button>
              <button type="button" className="tbtn" onClick={next} title="Siguiente">
                <IconSkip className="tico" />
              </button>
              <button type="button" className="tbtn" onClick={cycleRepeat} title="Repetir">
                <IconRepeat mode={repeat} className="tico" />
              </button>
            </div>

            <label className="vol">
              <IconVolume className="vol-ico" />
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
              />
            </label>
          </div>
        </section>
      </main>

      <footer className="footer">
        <p>
          Los archivos se guardan solo en este navegador (IndexedDB). No se suben a ningún servidor.
        </p>
      </footer>
    </div>
  )
}
