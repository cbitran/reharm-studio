import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { TrackRow } from './TrackRow'
import { genKickEvents, kickStepsForGrid } from '../core/kick-pattern'
import { playUnified, stopUnified } from '../audio/player'
import type { MidiEvent, ParsedChord, GenreDefinition, Timbre, TrackId } from '../types'
import { TPQ } from '../core/groove'

interface Props {
  pianoEvents: MidiEvent[]
  bassEvents: MidiEvent[]
  bpm: number
  genre: GenreDefinition
  genreName: string
  chords: ParsedChord[]
}

const TRACK_COLORS: Record<TrackId, string> = {
  kick:   '#e8c87a',
  chords: '#7ad1a8',
  bass:   '#8ab4f0',
}

const BAR = 4 * TPQ
const S16 = TPQ / 4

function eventsToSteps(events: MidiEvent[], bar: number): number[] {
  const steps = new Set<number>()
  const barStart = bar * BAR
  const barEnd = barStart + BAR
  events.forEach(e => {
    if (e.tick >= barStart && e.tick < barEnd) {
      const step = Math.round((e.tick - barStart) / S16)
      if (step >= 0 && step < 16) steps.add(step)
    }
  })
  return Array.from(steps)
}

export function UnifiedPlayer({ pianoEvents, bassEvents, bpm, genreName, chords }: Props) {
  const { t } = useTranslation()
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState<Set<TrackId>>(new Set())
  const [solo, setSolo] = useState<TrackId | null>(null)
  const [timbre, setTimbre] = useState<Timbre>('piano')

  const numBars = Math.max(chords.length, 1)
  const slug = genreName.toLowerCase().replace(/\s+/g, '')

  const kickEvents = useMemo(
    () => genKickEvents(genreName, numBars),
    [genreName, numBars],
  )

  const kickSteps = useMemo(() => kickStepsForGrid(genreName), [genreName])
  const chordsSteps = useMemo(() => eventsToSteps(pianoEvents, 0), [pianoEvents])
  const bassSteps = useMemo(() => eventsToSteps(bassEvents, 0), [bassEvents])

  const toggleMute = (id: TrackId) => {
    setMuted(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleSolo = (id: TrackId) => {
    setSolo(prev => prev === id ? null : id)
  }

  const handlePlay = async () => {
    if (playing) {
      stopUnified()
      setPlaying(false)
      return
    }
    if (!pianoEvents.length && !bassEvents.length) return
    setPlaying(true)
    await playUnified({
      kickEvents,
      pianoEvents,
      bassEvents,
      bpm,
      tpq: TPQ,
      muted,
      solo,
      timbre,
      onEnd: () => setPlaying(false),
    })
  }

  if (!chords.length) return null

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={handlePlay}
          className="btn-primary px-5 py-2 text-sm font-semibold rounded-xl flex items-center gap-2"
        >
          {playing ? '■' : '▶'} {playing ? 'Stop' : 'Play'}
        </button>
        <span className="font-mono text-xs" style={{ color: 'var(--color-muted)' }}>
          {bpm} BPM · {numBars} {numBars === 1 ? 'compasso' : 'compassos'}
        </span>
      </div>

      <div className="space-y-1 divide-y" style={{ borderColor: 'var(--color-border)' }}>
        <TrackRow
          id="kick"
          label={t('player.kick')}
          color={TRACK_COLORS.kick}
          muted={muted.has('kick')}
          solo={solo === 'kick'}
          onMute={() => toggleMute('kick')}
          onSolo={() => toggleSolo('kick')}
          activeSteps={kickSteps}
        />
        <TrackRow
          id="chords"
          label={t('player.chords')}
          color={TRACK_COLORS.chords}
          muted={muted.has('chords')}
          solo={solo === 'chords'}
          onMute={() => toggleMute('chords')}
          onSolo={() => toggleSolo('chords')}
          activeSteps={chordsSteps}
          timbre={timbre}
          onTimbreChange={setTimbre}
          events={pianoEvents}
          bpm={bpm}
          exportName={slug}
        />
        <TrackRow
          id="bass"
          label={t('player.bass')}
          color={TRACK_COLORS.bass}
          muted={muted.has('bass')}
          solo={solo === 'bass'}
          onMute={() => toggleMute('bass')}
          onSolo={() => toggleSolo('bass')}
          activeSteps={bassSteps}
          events={bassEvents}
          bpm={bpm}
          exportName={slug}
        />
      </div>
    </div>
  )
}
