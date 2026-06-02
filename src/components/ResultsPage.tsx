import { useState, useMemo, useCallback, useEffect } from 'react'
import { zipSync } from 'fflate'
import { parseProg } from '../core/parser'
import { genEvents } from '../core/groove'
import { trackBytes, midiFile } from '../core/midi-writer'
import { warmupAudio } from '../audio/player'
import { GENRES } from '../genres'
import { MiniPlayer } from './MiniPlayer'
import type { Extension } from '../types'
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

const EXT_CONFIGS: { ext: Extension; label: string; tagline: string; color: string }[] = [
  { ext: 'tri', label: '3 notas', tagline: 'Clean',    color: '#7ad1a8' },
  { ext: '7',   label: '4 notas', tagline: 'Quente',   color: '#8ab4f0' },
  { ext: '9',   label: '5 notas', tagline: 'Rico',     color: '#c084fc' },
  { ext: '11',  label: '6 notas', tagline: 'Completo', color: '#f0a84a' },
]

export function ResultsPage({ analysis, song, genreName, bpm, onAdvanced, onBack }: Props) {
  const [activeExt, setActiveExt] = useState<Extension | null>(null)

  // Pré-aquece synths logo que a tela monta — elimina delay no primeiro play
  useEffect(() => { warmupAudio().catch(() => {}) }, [])

  const genre = GENRES[genreName] ?? GENRES['House']!
  const { chords } = useMemo(() => parseProg(analysis.progression), [analysis.progression])

  const songSlug = useMemo(
    () =>
      `${song.title} ${song.artist}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, ''),
    [song],
  )

  const handlePlay = useCallback((ext: Extension) => setActiveExt(ext), [])
  const handleStop = useCallback(() => setActiveExt(null), [])

  const handleDownloadAll = () => {
    const files: Record<string, Uint8Array> = {}
    for (const { ext, label } of EXT_CONFIGS) {
      const { pe, be } = genEvents(chords, ext, genre, 0.58, 'antecip')
      const midi = midiFile([
        trackBytes([], bpm, 'Tempo'),
        trackBytes(pe, null, 'Piano'),
        trackBytes(be, null, 'Bass'),
      ])
      const slug = label.replace(' ', '')
      files[`${songSlug}-${slug}.mid`] = new Uint8Array(midi)
    }
    const zipped = zipSync(files)
    const url = URL.createObjectURL(new Blob([zipped], { type: 'application/zip' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `${songSlug}-chordflip.zip`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!chords.length) {
    return (
      <div
        className="max-w-[860px] mx-auto px-6 py-10"
        style={{ background: 'var(--color-bg)', minHeight: '100vh' }}
      >
        <p className="text-sm mb-4" style={{ color: 'var(--color-muted)' }}>
          Não foi possível analisar a progressão.
        </p>
        <button
          onClick={onBack}
          className="font-mono text-xs"
          style={{ color: 'var(--color-primary)' }}
        >
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
        <div className="flex items-center gap-4 mb-8">
          {song.cover && (
            <img
              src={song.cover}
              alt=""
              className="w-16 h-16 rounded-2xl object-cover shrink-0"
            />
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

        {/* Instrução */}
        <p
          className="font-mono text-xs mb-6 px-4 py-3 rounded-xl"
          style={{
            color: 'var(--color-muted)',
            background: 'var(--color-card)',
            border: '1px solid var(--color-border)',
          }}
        >
          Ouça cada versão e escolha a que combina com o seu estilo. Depois exporte o MIDI para sua DAW.
        </p>

        {/* 4 MiniPlayers */}
        <div className="space-y-4 mb-8">
          {EXT_CONFIGS.map(({ ext, label, tagline, color }) => (
            <MiniPlayer
              key={ext}
              chords={chords}
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
          ↓ Baixar os 4 MIDIs (.zip)
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
