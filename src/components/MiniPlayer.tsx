import { useEffect, useMemo, useRef, useState } from 'react'
import { genEvents, TPQ } from '../core/groove'
import { trackBytes, midiFile, downloadMidi } from '../core/midi-writer'
import { playEvents, stopAll } from '../audio/player'
import { reVoice } from '../core/reharmonizer'
import { NOTE_NAMES } from '../core/parser'
import type { ParsedChord, Extension, GenreDefinition } from '../types'

interface Props {
  chords: ParsedChord[]
  ext: Extension
  label: string
  tagline: string
  color: string
  genre: GenreDefinition
  bpm: number
  isActive: boolean
  onPlay: () => void
  onStop: () => void
  songSlug: string
}

export function MiniPlayer({
  chords, ext, label, tagline, color, genre, bpm,
  isActive, onPlay, onStop, songSlug,
}: Props) {
  const [progress, setProgress] = useState(0)
  const startRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const { pe, be } = useMemo(
    () => genEvents(chords, ext, genre, 0.58, 'antecip'),
    [chords, ext, genre],
  )

  // Notas do primeiro acorde para exibição visual
  const noteChips = useMemo(() => {
    if (!chords.length) return []
    const first = chords[0]!
    return reVoice(first.intervals, ext).map(interval =>
      NOTE_NAMES[(first.root + interval) % 12]!,
    )
  }, [chords, ext])

  const totalMs = useMemo(() => {
    const secsPerTick = 60 / bpm / TPQ
    const all = [...pe, ...be]
    const lastTick = all.reduce((max, e) => Math.max(max, e.tick + e.duration), 0)
    return lastTick * secsPerTick * 1000 + 300
  }, [pe, be, bpm])

  useEffect(() => {
    if (!isActive) {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
      setProgress(0)
      return
    }

    stopAll()
    setProgress(0)
    startRef.current = Date.now()

    playEvents(pe, be, bpm, TPQ, () => {
      if (!mountedRef.current) return
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
      setProgress(0)
      onStop()
    })

    timerRef.current = setInterval(() => {
      if (!mountedRef.current) return
      const elapsed = Date.now() - startRef.current
      setProgress(Math.min(elapsed / totalMs, 1))
    }, 80)

    return () => {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
      stopAll()
    }
    // pe/be/bpm/totalMs/onStop stable from parent; only isActive triggers restart
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive])

  const handleExport = () => {
    const midi = midiFile([
      trackBytes([], bpm, 'Tempo'),
      trackBytes(pe, null, 'Piano'),
      trackBytes(be, null, 'Bass'),
    ])
    downloadMidi(midi, `${songSlug}-${ext}.mid`)
  }

  return (
    <div
      className="card p-5"
      style={{
        borderLeft: `3px solid ${color}`,
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-baseline gap-2">
          <span className="font-sans text-xl font-bold" style={{ color }}>
            {label}
          </span>
          <span className="font-mono text-xs" style={{ color: 'var(--color-muted)' }}>
            — {tagline}
          </span>
        </div>
        <button
          onClick={handleExport}
          className="font-mono text-xs px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
          style={{
            color: 'var(--color-primary)',
            border: '1px solid var(--color-border)',
            background: 'var(--color-card)',
          }}
        >
          ↓ MIDI
        </button>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={isActive ? onStop : onPlay}
          className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 font-semibold text-base transition-all"
          style={{
            background: isActive ? color : 'var(--color-card-hi)',
            color: isActive ? '#111' : 'var(--color-ink)',
            boxShadow: isActive ? `0 0 16px ${color}55` : 'none',
          }}
        >
          {isActive ? '■' : '▶'}
        </button>

        <div className="flex-1 flex flex-col gap-2">
          {/* Notas do primeiro acorde */}
          <div className="flex flex-wrap gap-1.5">
            {noteChips.map((note, i) => (
              <span
                key={i}
                className="font-mono text-[11px] px-2 py-0.5 rounded-md"
                style={{
                  background: `${color}22`,
                  color,
                  border: `1px solid ${color}44`,
                }}
              >
                {note}
              </span>
            ))}
          </div>

          {/* Barra de progresso */}
          <div
            className="h-1.5 rounded-full overflow-hidden"
            style={{ background: 'var(--color-bg)' }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${progress * 100}%`,
                background: color,
                transition: isActive ? 'none' : 'width 0.3s ease',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
