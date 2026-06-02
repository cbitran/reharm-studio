import { useState, useMemo, useCallback, useEffect } from 'react'
import { zipSync } from 'fflate'
import { parseProg } from '../core/parser'
import { genEvents } from '../core/groove'
import { trackBytes, midiFile } from '../core/midi-writer'
import { warmupAudio } from '../audio/player'
import { GENRES } from '../genres'
import { MiniPlayer } from './MiniPlayer'
import type { Extension, ParsedChord } from '../types'
import type { SongAnalysis } from './SongSearch'
import type { SimpleWizardSong } from './SimpleWizard'

interface Props {
  analysis: SongAnalysis
  song: SimpleWizardSong
  genreName: string
  bpm: number
  onAdvanced: () => void
  onBack: () => void
}

export interface SectionMarker {
  name: string
  fraction: number  // posição 0-1 na música completa
}

const EXT_CONFIGS: { ext: Extension; label: string; tagline: string; color: string }[] = [
  { ext: 'tri', label: '3 notas', tagline: 'Clean',    color: '#7ad1a8' },
  { ext: '7',   label: '4 notas', tagline: 'Quente',   color: '#8ab4f0' },
  { ext: '9',   label: '5 notas', tagline: 'Rico',     color: '#c084fc' },
  { ext: '11',  label: '6 notas', tagline: 'Completo', color: '#f0a84a' },
]

const MAX_BARS = 96  // cap para não gerar MIDI gigante (~4 min a 120 BPM)

export function ResultsPage({ analysis, song, genreName, bpm, onAdvanced, onBack }: Props) {
  const [activeExt, setActiveExt] = useState<Extension | null>(null)

  useEffect(() => { warmupAudio().catch(() => {}) }, [])

  const genre = GENRES[genreName] ?? GENRES['House']!

  const songSlug = useMemo(
    () =>
      `${song.title} ${song.artist}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, ''),
    [song],
  )

  // Monta a música completa a partir das seções retornadas pela IA
  const fullSong = useMemo(() => {
    const rawSections = analysis.sections?.length
      ? analysis.sections
      : [{ name: 'Main', progression: analysis.progression, repeats: 2 }]

    const allChords: ParsedChord[] = []
    const rawMarkers: { name: string; barIndex: number }[] = []

    for (const sec of rawSections) {
      const { chords: secChords } = parseProg(sec.progression)
      if (!secChords.length) continue
      if (allChords.length >= MAX_BARS) break

      rawMarkers.push({ name: sec.name, barIndex: allChords.length })
      const repeats = Math.min(sec.repeats, 8)
      for (let r = 0; r < repeats; r++) {
        for (const c of secChords) {
          if (allChords.length >= MAX_BARS) break
          allChords.push(c)
        }
      }
    }

    const total = allChords.length
    const markers: SectionMarker[] = rawMarkers.map(m => ({
      name: m.name,
      fraction: total > 0 ? m.barIndex / total : 0,
    }))

    const durationSecs = total * 4 * (60 / bpm)

    return { chords: allChords, markers, durationSecs }
  }, [analysis, bpm])

  const handlePlay = useCallback((ext: Extension) => setActiveExt(ext), [])
  const handleStop = useCallback(() => setActiveExt(null), [])

  const handleDownloadAll = () => {
    const files: Record<string, Uint8Array> = {}
    for (const { ext, label } of EXT_CONFIGS) {
      const { pe, be } = genEvents(fullSong.chords, ext, genre, 0.58, 'antecip')
      const midi = midiFile([
        trackBytes([], bpm, 'Tempo'),
        trackBytes(pe, null, 'Piano'),
        trackBytes(be, null, 'Bass'),
      ])
      files[`${songSlug}-${label.replace(' ', '')}.mid`] = new Uint8Array(midi)
    }
    const zipped = zipSync(files)
    const url = URL.createObjectURL(new Blob([zipped], { type: 'application/zip' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `${songSlug}-chordflip.zip`
    a.click()
    URL.revokeObjectURL(url)
  }

  const durationLabel = useMemo(() => {
    const s = Math.round(fullSong.durationSecs)
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  }, [fullSong.durationSecs])

  if (!fullSong.chords.length) {
    return (
      <div
        className="max-w-[860px] mx-auto px-6 py-10"
        style={{ background: 'var(--color-bg)', minHeight: '100vh' }}
      >
        <p className="text-sm mb-4" style={{ color: 'var(--color-muted)' }}>
          Não foi possível analisar a progressão.
        </p>
        <button onClick={onBack} className="font-mono text-xs" style={{ color: 'var(--color-primary)' }}>
          ← Voltar
        </button>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--color-bg)', minHeight: '100vh' }}>
      <div className="max-w-[860px] mx-auto px-6 py-10">
        {/* Voltar */}
        <button
          onClick={onBack}
          className="font-mono text-xs mb-6 flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity"
          style={{ color: 'var(--color-muted)' }}
        >
          ← Voltar
        </button>

        {/* Song header */}
        <div className="flex items-center gap-4 mb-6">
          {song.cover && (
            <img src={song.cover} alt="" className="w-16 h-16 rounded-2xl object-cover shrink-0" />
          )}
          <div>
            <h2 className="font-sans text-2xl font-bold" style={{ color: 'var(--color-ink)' }}>
              {song.title}
            </h2>
            <p className="font-mono text-xs mt-1" style={{ color: 'var(--color-muted)' }}>
              {song.artist} · {genreName} · {bpm} BPM
            </p>
          </div>
        </div>

        {/* Seções */}
        {fullSong.markers.length > 1 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {fullSong.markers.map((m, i) => (
              <span
                key={i}
                className="font-mono text-[11px] px-2.5 py-1 rounded-full"
                style={{
                  background: 'var(--color-card)',
                  color: 'var(--color-muted)',
                  border: '1px solid var(--color-border)',
                }}
              >
                {m.name}
              </span>
            ))}
            <span className="font-mono text-[11px] px-2.5 py-1 rounded-full ml-auto"
              style={{ color: 'var(--color-muted)' }}>
              {durationLabel}
            </span>
          </div>
        )}

        {/* 4 MiniPlayers */}
        <div className="space-y-4 mb-8">
          {EXT_CONFIGS.map(({ ext, label, tagline, color }) => (
            <MiniPlayer
              key={ext}
              chords={fullSong.chords}
              markers={fullSong.markers}
              ext={ext}
              label={label}
              tagline={tagline}
              color={color}
              genre={genre}
              bpm={bpm}
              isActive={activeExt === ext}
              onPlay={() => handlePlay(ext)}
              onStop={handleStop}
              songSlug={songSlug}
            />
          ))}
        </div>

        {/* Download all */}
        <button
          onClick={handleDownloadAll}
          className="w-full py-4 rounded-2xl font-semibold text-sm mb-6 transition-opacity hover:opacity-80"
          style={{
            background: 'var(--color-card)',
            color: 'var(--color-primary)',
            border: '1px solid var(--color-border)',
          }}
        >
          ↓ Baixar os 4 MIDIs — música completa (.zip)
        </button>

        {/* Modo avançado */}
        <div className="text-center">
          <button
            onClick={onAdvanced}
            className="font-mono text-xs opacity-60 hover:opacity-100 transition-opacity"
            style={{ color: 'var(--color-muted)' }}
          >
            → Modo avançado
          </button>
        </div>
      </div>
    </div>
  )
}
