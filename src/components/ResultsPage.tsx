import { useState, useMemo, useCallback, useEffect } from 'react'
import { zipSync } from 'fflate'
import { parseProg } from '../core/parser'
import { genEvents } from '../core/groove'
import { genArpeggioEvents, genPadEvents, genLeadEvents } from '../core/arranger'
import { trackBytes, midiFile } from '../core/midi-writer'
import { warmupAudio } from '../audio/player'
import { buildScale } from '../core/scaleUtils'
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
  fraction: number
}

const EXT_CONFIGS: { ext: Extension; label: string; tagline: string; color: string }[] = [
  { ext: 'tri', label: '3 notas', tagline: 'Clean',    color: '#7ad1a8' },
  { ext: '7',   label: '4 notas', tagline: 'Quente',   color: '#8ab4f0' },
  { ext: '9',   label: '5 notas', tagline: 'Rico',     color: '#c084fc' },
  { ext: '11',  label: '6 notas', tagline: 'Completo', color: '#f0a84a' },
]

// Paleta de cores por nome de seção
const SECTION_PALETTE = [
  '#8ab4f0', '#7ad1a8', '#c084fc', '#f0a84a',
  '#e88a8a', '#7ec8d4', '#f0c84a', '#a88af0',
]

const MAX_BARS = 96

export function ResultsPage({ analysis, song, genreName, bpm, onAdvanced, onBack }: Props) {
  const [activeExt, setActiveExt] = useState<Extension | null>(null)
  const [activeProgress, setActiveProgress] = useState(0)
  const [showTimeline, setShowTimeline] = useState(false)

  useEffect(() => { warmupAudio().catch(() => {}) }, [])

  const genre = GENRES[genreName] ?? GENRES['House']!

  // Escala da música detectada pela IA (key + mode → notas diatônicas)
  const scale = useMemo(
    () => buildScale(analysis.key, analysis.mode),
    [analysis.key, analysis.mode],
  )

  const songSlug = useMemo(
    () =>
      `${song.title} ${song.artist}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, ''),
    [song],
  )

  // Monta a música completa a partir das seções
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

    return { chords: allChords, markers, totalBars: total }
  }, [analysis])

  // Cor por nome de seção (mesma seção = mesma cor)
  const sectionColorMap = useMemo(() => {
    const map: Record<string, string> = {}
    const seen: string[] = []
    fullSong.markers.forEach(m => {
      if (!map[m.name]) {
        map[m.name] = SECTION_PALETTE[seen.length % SECTION_PALETTE.length]!
        seen.push(m.name)
      }
    })
    return map
  }, [fullSong.markers])

  // Índice do marcador ativo com base no progresso
  const currentMarkerIdx = useMemo(() => {
    if (activeProgress <= 0 || activeExt === null) return -1
    let idx = 0
    for (let i = 0; i < fullSong.markers.length; i++) {
      if (fullSong.markers[i]!.fraction <= activeProgress) idx = i
      else break
    }
    return idx
  }, [activeProgress, activeExt, fullSong.markers])

  const handlePlay = useCallback((ext: Extension) => {
    setActiveProgress(0)
    setActiveExt(ext)
  }, [])

  const handleStop = useCallback(() => {
    setActiveExt(null)
    setActiveProgress(0)
  }, [])

  const handleProgress = useCallback((p: number) => setActiveProgress(p), [])

  const durationLabel = useMemo(() => {
    const s = Math.round(fullSong.totalBars * 4 * (60 / bpm))
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  }, [fullSong.totalBars, bpm])

  const handleDownloadAll = () => {
    const files: Record<string, Uint8Array> = {}
    for (const { ext, label } of EXT_CONFIGS) {
      const { pe, be } = genEvents(fullSong.chords, ext, genre, 0.58, 'off')
      const ae = genArpeggioEvents(fullSong.chords, ext, scale)
      const pde = genPadEvents(fullSong.chords, ext, scale)
      const le = genLeadEvents(fullSong.chords, ext, scale)
      const midi = midiFile([
        trackBytes([], bpm, 'Tempo'),
        trackBytes(pe, null, 'Piano'),
        trackBytes(be, null, 'Bass'),
        trackBytes(ae, null, 'Arpejo'),
        trackBytes(pde, null, 'Pad'),
        trackBytes(le, null, 'Lead'),
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

  if (!fullSong.chords.length) {
    return (
      <div className="max-w-[860px] mx-auto px-6 py-10"
        style={{ background: 'var(--color-bg)', minHeight: '100vh' }}>
        <p className="text-sm mb-4" style={{ color: 'var(--color-muted)' }}>
          Não foi possível analisar a progressão.
        </p>
        <button onClick={onBack} className="font-mono text-xs" style={{ color: 'var(--color-primary)' }}>
          ← Voltar
        </button>
      </div>
    )
  }

  // Blocos da timeline com largura proporcional
  const timelineBlocks = fullSong.markers.map((m, i) => ({
    ...m,
    color: sectionColorMap[m.name] ?? '#aaa',
    widthPct: ((fullSong.markers[i + 1]?.fraction ?? 1) - m.fraction) * 100,
  }))

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

        {/* Pills de seção com destaque ativo */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {fullSong.markers.map((m, i) => {
            const isActive = currentMarkerIdx === i
            const sColor = sectionColorMap[m.name] ?? 'var(--color-muted)'
            return (
              <span
                key={i}
                className="font-mono text-[11px] px-2.5 py-1 rounded-full transition-all"
                style={{
                  background: isActive ? `${sColor}33` : 'var(--color-card)',
                  color: isActive ? sColor : 'var(--color-muted)',
                  border: `1px solid ${isActive ? sColor : 'var(--color-border)'}`,
                  fontWeight: isActive ? 700 : 400,
                  transform: isActive ? 'scale(1.05)' : 'scale(1)',
                }}
              >
                {m.name}
              </span>
            )
          })}
          <span className="font-mono text-[11px] ml-auto" style={{ color: 'var(--color-muted)' }}>
            {durationLabel}
          </span>
        </div>

        {/* Botão toggle timeline */}
        {fullSong.markers.length > 1 && (
          <button
            onClick={() => setShowTimeline(v => !v)}
            className="font-mono text-[10px] mb-4 flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity"
            style={{ color: 'var(--color-muted)' }}
          >
            {showTimeline ? '▾' : '▸'} {showTimeline ? 'Fechar timeline' : 'Ver timeline'}
          </button>
        )}

        {/* Timeline expansível */}
        {showTimeline && (
          <div className="mb-6 card p-4">
            <div className="relative">
              {/* Barra de seções */}
              <div className="flex h-8 rounded-lg overflow-hidden mb-1">
                {timelineBlocks.map((b, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-center overflow-hidden font-mono text-[9px] font-semibold"
                    style={{
                      width: `${b.widthPct}%`,
                      background: b.color,
                      opacity: currentMarkerIdx === i ? 1 : 0.35,
                      color: '#111',
                      transition: 'opacity 0.2s',
                      whiteSpace: 'nowrap',
                      padding: '0 4px',
                    }}
                    title={b.name}
                  >
                    {b.widthPct > 6 ? b.name : ''}
                  </div>
                ))}
              </div>

              {/* Playhead */}
              {activeExt !== null && (
                <div
                  className="absolute top-0 bottom-1 w-0.5 rounded-full pointer-events-none"
                  style={{
                    left: `${activeProgress * 100}%`,
                    background: 'white',
                    boxShadow: '0 0 4px rgba(0,0,0,0.4)',
                    transition: 'left 80ms linear',
                  }}
                />
              )}

              {/* Rótulos abaixo */}
              <div className="relative h-4">
                {timelineBlocks.map((b, i) => (
                  <span
                    key={i}
                    className="absolute font-mono text-[9px] truncate"
                    style={{
                      left: `${b.fraction * 100}%`,
                      transform: i === 0 ? 'none' : 'translateX(-50%)',
                      color: currentMarkerIdx === i ? b.color : 'var(--color-muted)',
                      opacity: currentMarkerIdx === i ? 1 : 0.5,
                    }}
                  >
                    {b.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 4 MiniPlayers */}
        <div className="space-y-4 mb-8">
          {EXT_CONFIGS.map(({ ext, label, tagline, color }) => (
            <MiniPlayer
              key={ext}
              chords={fullSong.chords}
              markers={fullSong.markers}
              scale={scale}
              ext={ext}
              label={label}
              tagline={tagline}
              color={color}
              genre={genre}
              genreName={genreName}
              bpm={bpm}
              isActive={activeExt === ext}
              onPlay={() => handlePlay(ext)}
              onStop={handleStop}
              onProgress={handleProgress}
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
          ↓ Baixar os 4 MIDIs — 5 trilhas cada (.zip)
        </button>

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
