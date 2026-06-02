import { useEffect, useMemo, useRef, useState } from 'react'
import { PianoRollMini } from './PianoRollMini'
import { genEvents, TPQ } from '../core/groove'
import { genArpeggioEvents, genPadEvents, genLeadEvents } from '../core/arranger'
import { genKickEvents, genClapEvents, genHihatEvents } from '../core/kick-pattern'
import { buildTrackActiveRanges, filterBySection } from '../core/density'
import type { TrackName } from '../core/density'
import { trackBytes, midiFile, downloadMidi } from '../core/midi-writer'
import { playMiniArrangement, stopMiniArrangement } from '../audio/player'
import { reVoice } from '../core/reharmonizer'
import { NOTE_NAMES } from '../core/parser'
import type { ParsedChord, Extension, GenreDefinition, MidiEvent } from '../types'
import type { SectionMarker } from './ResultsPage'

interface Props {
  chords: ParsedChord[]
  markers?: SectionMarker[]
  scale: Set<number>
  ext: Extension
  label: string
  tagline: string
  color: string
  genre: GenreDefinition
  genreName: string
  bpm: number
  isActive: boolean
  onPlay: () => void
  onStop: () => void
  onProgress?: (p: number) => void
  songSlug: string
}

export function MiniPlayer({
  chords, markers, scale, ext, label, tagline, color, genre, genreName, bpm,
  isActive, onPlay, onStop, onProgress, songSlug,
}: Props) {
  const [progress, setProgress] = useState(0)
  const [showRoll, setShowRoll] = useState(false)
  const startRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const { pe, be } = useMemo(
    () => genEvents(chords, ext, genre, 0.58, 'off'),
    [chords, ext, genre],
  )

  const ke  = useMemo(() => genKickEvents(genreName, chords.length),  [genreName, chords.length])
  const cle = useMemo(() => genClapEvents(genreName, chords.length),  [genreName, chords.length])
  const hhe = useMemo(() => genHihatEvents(genreName, chords.length), [genreName, chords.length])
  const ae  = useMemo(() => genArpeggioEvents(chords, ext, scale), [chords, ext, scale])
  const pde = useMemo(() => genPadEvents(chords, ext, scale), [chords, ext, scale])
  const le  = useMemo(() => genLeadEvents(chords, ext, scale), [chords, ext, scale])

  const totalTicks = chords.length * 4 * TPQ

  const mkFiltered = (events: MidiEvent[], track: TrackName) =>
    markers?.length
      ? filterBySection(events, buildTrackActiveRanges(markers, totalTicks, genreName, track))
      : events

  const filteredKe  = useMemo(() => mkFiltered(ke,  'kick'),     [ke,  markers, totalTicks, genreName])   // eslint-disable-line react-hooks/exhaustive-deps
  const filteredCle = useMemo(() => mkFiltered(cle, 'clap'),     [cle, markers, totalTicks, genreName])   // eslint-disable-line react-hooks/exhaustive-deps
  const filteredHhe = useMemo(() => mkFiltered(hhe, 'hihat'),    [hhe, markers, totalTicks, genreName])   // eslint-disable-line react-hooks/exhaustive-deps
  const filteredPe  = useMemo(() => mkFiltered(pe,  'piano'),    [pe,  markers, totalTicks, genreName])   // eslint-disable-line react-hooks/exhaustive-deps
  const filteredBe  = useMemo(() => mkFiltered(be,  'bass'),     [be,  markers, totalTicks, genreName])   // eslint-disable-line react-hooks/exhaustive-deps
  const filteredAe  = useMemo(() => mkFiltered(ae,  'arpeggio'), [ae,  markers, totalTicks, genreName])   // eslint-disable-line react-hooks/exhaustive-deps
  const filteredPde = useMemo(() => mkFiltered(pde, 'pad'),      [pde, markers, totalTicks, genreName])   // eslint-disable-line react-hooks/exhaustive-deps
  const filteredLe  = useMemo(() => mkFiltered(le,  'lead'),     [le,  markers, totalTicks, genreName])   // eslint-disable-line react-hooks/exhaustive-deps

  // Notas do primeiro acorde
  const noteChips = useMemo(() => {
    if (!chords.length) return []
    const first = chords[0]!
    return reVoice(first.intervals, ext).map(interval =>
      NOTE_NAMES[(first.root + interval) % 12]!,
    )
  }, [chords, ext])

  const totalMs = useMemo(() => {
    const secsPerTick = 60 / bpm / TPQ
    const all = [
      ...filteredKe, ...filteredCle, ...filteredHhe,
      ...filteredPe, ...filteredBe, ...filteredAe, ...filteredPde, ...filteredLe,
    ]
    const lastTick = all.reduce((max, e) => Math.max(max, e.tick + e.duration), 0)
    return lastTick * secsPerTick * 1000 + 300
  }, [filteredKe, filteredCle, filteredHhe, filteredPe, filteredBe, filteredAe, filteredPde, filteredLe, bpm])

  // Seção atual com base no progresso
  const currentSection = useMemo(() => {
    if (!markers?.length || progress <= 0) return null
    let current = markers[0]!
    for (const m of markers) {
      if (m.fraction <= progress) current = m
    }
    return current.name
  }, [progress, markers])

  useEffect(() => {
    if (!isActive) {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
      setProgress(0)
      return
    }

    stopMiniArrangement()
    setProgress(0)
    startRef.current = Date.now()

    playMiniArrangement({
      kickEvents: filteredKe,
      clapEvents: filteredCle,
      hihatEvents: filteredHhe,
      pianoEvents: filteredPe,
      bassEvents: filteredBe,
      arpeggioEvents: filteredAe,
      padEvents: filteredPde,
      leadEvents: filteredLe,
      bpm,
      tpq: TPQ,
      onEnd: () => {
        if (!mountedRef.current) return
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
        setProgress(0)
        onStop()
      },
    })

    timerRef.current = setInterval(() => {
      if (!mountedRef.current) return
      const elapsed = Date.now() - startRef.current
      const p = Math.min(elapsed / totalMs, 1)
      setProgress(p)
      onProgress?.(p)
    }, 80)

    return () => {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
      stopMiniArrangement()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive])

  const handleExport = () => {
    const ae = genArpeggioEvents(chords, ext, scale)
    const pde = genPadEvents(chords, ext, scale)
    const le = genLeadEvents(chords, ext, scale)
    const midi = midiFile([
      trackBytes([], bpm, 'Tempo'),
      trackBytes(pe, null, 'Piano'),
      trackBytes(be, null, 'Bass'),
      trackBytes(ae, null, 'Arpejo'),
      trackBytes(pde, null, 'Pad'),
      trackBytes(le, null, 'Lead'),
    ])
    downloadMidi(midi, `${songSlug}-${label.replaceAll(' ', '')}.mid`)
  }

  return (
    <div className="card p-5" style={{ borderLeft: `3px solid ${color}` }}>
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-baseline gap-2">
          <span className="font-sans text-xl font-bold" style={{ color }}>
            {label}
          </span>
          <span className="font-mono text-xs" style={{ color: 'var(--color-muted)' }}>
            — {tagline}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Seção atual (só quando tocando) */}
          {isActive && currentSection && (
            <span
              className="font-mono text-[10px] px-2 py-0.5 rounded-full"
              style={{ background: `${color}22`, color }}
            >
              {currentSection}
            </span>
          )}
          <button
            onClick={() => setShowRoll(v => !v)}
            className="font-mono text-xs px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
            style={{
              color: showRoll ? color : 'var(--color-muted)',
              border: '1px solid var(--color-border)',
              background: showRoll ? `${color}18` : 'var(--color-card)',
            }}
            title="Piano Roll"
          >
            ▦ Roll
          </button>
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
      </div>

      <div className="flex items-center gap-4">
        {/* Play/Stop */}
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

          {/* Barra de progresso com marcadores de seção */}
          <div
            className="relative h-2 rounded-full overflow-hidden"
            style={{ background: 'var(--color-bg)' }}
          >
            {/* Preenchimento do progresso */}
            <div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                width: `${progress * 100}%`,
                background: color,
                transition: isActive ? 'none' : 'width 0.3s ease',
              }}
            />
            {/* Marcadores verticais de seção */}
            {markers?.slice(1).map((m, i) => (
              <div
                key={i}
                className="absolute top-0 bottom-0 w-px"
                style={{
                  left: `${m.fraction * 100}%`,
                  background: 'var(--color-card)',
                  opacity: 0.7,
                  zIndex: 1,
                }}
              />
            ))}
          </div>
          {showRoll && (
            <PianoRollMini
              events={filteredPe}
              totalTicks={totalTicks}
              progress={progress}
              color={color}
            />
          )}
        </div>
      </div>
    </div>
  )
}
