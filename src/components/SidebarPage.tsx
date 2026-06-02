import { useState, useMemo, useCallback, useEffect } from 'react'
import { zipSync } from 'fflate'
import { SongSearch, type SongAnalysis } from './SongSearch'
import { MiniPlayer } from './MiniPlayer'
import { GENRES, GENRE_NAMES } from '../genres'
import { parseProg } from '../core/parser'
import { genEvents } from '../core/groove'
import { genArpeggioEvents, genPadEvents, genLeadEvents } from '../core/arranger'
import { trackBytes, midiFile } from '../core/midi-writer'
import { buildScale } from '../core/scaleUtils'
import { warmupAudio, initAudio } from '../audio/player'
import type { Extension, ParsedChord } from '../types'
import type { SimpleWizardSong, SimpleWizardResult } from './SimpleWizard'
import type { SectionMarker } from './ResultsPage'

interface Props {
  onAdvanced: (result?: SimpleWizardResult) => void
}

const FEELING_CHIPS = ['Groovy', 'Soulful', 'Dark', 'Tribal', 'Jazzy', 'Uplifting', 'Suspended']

const EXT_CONFIGS: { ext: Extension; label: string; tagline: string; color: string }[] = [
  { ext: 'tri', label: '3 notas', tagline: 'Clean',    color: '#7ad1a8' },
  { ext: '7',   label: '4 notas', tagline: 'Quente',   color: '#8ab4f0' },
  { ext: '9',   label: '5 notas', tagline: 'Rico',     color: '#c084fc' },
  { ext: '11',  label: '6 notas', tagline: 'Completo', color: '#f0a84a' },
]

const SECTION_PALETTE = [
  '#8ab4f0', '#7ad1a8', '#c084fc', '#f0a84a',
  '#e88a8a', '#7ec8d4', '#f0c84a', '#a88af0',
]

const MAX_BARS = 96

const SECTION_COLORS: Record<string, string> = {
  'Intro': '#8ab4f0', 'Build Up': '#c084fc', 'Drop 1': '#7ad1a8',
  'Drop 2': '#7ad1a8', 'Break': '#e8c87a', 'Outro': '#7e7c78',
}

export function SidebarPage({ onAdvanced }: Props) {
  const [analysis, setAnalysis] = useState<SongAnalysis | null>(null)
  const [song, setSong] = useState<SimpleWizardSong | null>(null)
  const [genreName, setGenreName] = useState('House')
  const [feeling, setFeeling] = useState<string[]>([])
  const [bpmValue, setBpmValue] = useState(120)
  const [result, setResult] = useState<SimpleWizardResult | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [activeExt, setActiveExt] = useState<Extension | null>(null)
  const [activeProgress, setActiveProgress] = useState(0)
  const [showTimeline, setShowTimeline] = useState(false)

  useEffect(() => {
    if (result) warmupAudio().catch(() => {})
  }, [result])

  const handleAnalysis = useCallback((a: SongAnalysis) => {
    setAnalysis(a)
    if (a.remix_guide?.style && GENRES[a.remix_guide.style]) setGenreName(a.remix_guide.style)
    if (a.remix_guide?.bpm) setBpmValue(a.remix_guide.bpm)
  }, [])

  const handleGenerate = () => {
    initAudio().catch(() => {})
    if (!analysis || !song) return
    setResult({ analysis, song, genreName, bpm: bpmValue })
    setActiveExt(null)
    setActiveProgress(0)
    setShowTimeline(false)
  }

  const handleAdvanced = () => {
    if (result) onAdvanced(result)
    else if (analysis && song) onAdvanced({ analysis, song, genreName, bpm: bpmValue })
    else onAdvanced()
  }

  const genre = result ? (GENRES[result.genreName] ?? GENRES['House']!) : null

  const scale = useMemo(
    () => result ? buildScale(result.analysis.key, result.analysis.mode) : new Set<number>(),
    [result],
  )

  const songSlug = useMemo(
    () => result
      ? `${result.song.title} ${result.song.artist}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      : '',
    [result],
  )

  const fullSong = useMemo(() => {
    if (!result) return { chords: [] as ParsedChord[], markers: [] as SectionMarker[], totalBars: 0 }
    const rawSections = result.analysis.sections?.length
      ? result.analysis.sections
      : [{ name: 'Main', progression: result.analysis.progression, repeats: 2 }]
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
  }, [result])

  const sectionColorMap = useMemo(() => {
    const map: Record<string, string> = {}
    const seen: string[] = []
    fullSong.markers.forEach(m => {
      if (!map[m.name]) { map[m.name] = SECTION_PALETTE[seen.length % SECTION_PALETTE.length]!; seen.push(m.name) }
    })
    return map
  }, [fullSong.markers])

  const currentMarkerIdx = useMemo(() => {
    if (activeProgress <= 0 || activeExt === null) return -1
    let idx = 0
    for (let i = 0; i < fullSong.markers.length; i++) {
      if (fullSong.markers[i]!.fraction <= activeProgress) idx = i
      else break
    }
    return idx
  }, [activeProgress, activeExt, fullSong.markers])

  const handlePlay = useCallback((ext: Extension) => { initAudio().catch(() => {}); setActiveProgress(0); setActiveExt(ext) }, [])
  const handleStop = useCallback(() => { setActiveExt(null); setActiveProgress(0) }, [])

  const durationLabel = useMemo(() => {
    if (!result) return ''
    const s = Math.round(fullSong.totalBars * 4 * (60 / result.bpm))
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  }, [fullSong.totalBars, result])

  const handleDownloadAll = () => {
    if (!result || !genre) return
    const files: Record<string, Uint8Array> = {}
    for (const { ext, label } of EXT_CONFIGS) {
      const { pe, be } = genEvents(fullSong.chords, ext, genre, 0.58, 'off')
      const ae = genArpeggioEvents(fullSong.chords, ext, scale)
      const pde = genPadEvents(fullSong.chords, ext, scale)
      const le = genLeadEvents(fullSong.chords, ext, scale)
      const midi = midiFile([
        trackBytes([], result.bpm, 'Tempo'),
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
    const a = document.createElement('a'); a.href = url
    a.download = `${songSlug}-chordflip.zip`; a.click()
    URL.revokeObjectURL(url)
  }

  const timelineBlocks = fullSong.markers.map((m, i) => ({
    ...m,
    color: sectionColorMap[m.name] ?? '#aaa',
    widthPct: ((fullSong.markers[i + 1]?.fraction ?? 1) - m.fraction) * 100,
  }))

  const toggleFeeling = (f: string) =>
    setFeeling(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f])

  const chip = (active: boolean) => ({
    color: active ? 'var(--color-bg)' : 'var(--color-ink)',
    background: active ? 'var(--color-primary)' : 'var(--color-card-hi)',
    border: '1px solid',
    borderColor: active ? 'var(--color-primary)' : 'var(--color-border)',
  })

  return (
    <div className="flex" style={{ background: 'var(--color-bg)', minHeight: '100vh' }}>

      {/* ── SIDEBAR ── */}
      <aside
        className="shrink-0 flex flex-col relative"
        style={{
          width: collapsed ? '40px' : (result ? '288px' : '480px'),
          transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          borderRight: '1px solid var(--color-border)',
          background: 'var(--color-card)',
          overflow: 'hidden',
        }}
      >
        {/* ── Mini strip — visível quando recolhido ── */}
        {collapsed && (
          <div className="flex flex-col items-center gap-3 py-4 flex-1">
            {/* Toggle expandir — centralizado */}
            <button
              onClick={() => setCollapsed(false)}
              title="Expandir sidebar"
              className="w-6 h-6 flex items-center justify-center rounded-full hover:opacity-80 transition-opacity"
              style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-muted)', fontSize: '10px' }}
            >›</button>

            {/* Ícone de busca */}
            <button
              onClick={() => setCollapsed(false)}
              title="Nova busca"
              className="w-7 h-7 flex items-center justify-center rounded-full hover:opacity-80 transition-opacity"
              style={{ color: 'var(--color-muted)', fontSize: '13px' }}
            >🔍</button>

            {/* Capa do disco */}
            {song?.cover && (
              <img src={song.cover} alt="" className="w-7 h-7 rounded-md object-cover" title={song.title} />
            )}

            {/* Nota principal */}
            {analysis && (
              <span className="font-mono text-[10px] font-bold" style={{ color: 'var(--color-primary)' }}
                title={`${analysis.key} ${analysis.mode}`}>
                {analysis.key}
              </span>
            )}

            {/* Feeling abreviado — primeira letra de cada chip */}
            {feeling.length > 0 && (
              <div className="flex flex-col items-center gap-0.5">
                {feeling.map(f => (
                  <span key={f} className="font-mono text-[9px] font-semibold"
                    style={{ color: 'var(--color-primary)', opacity: 0.7 }} title={f}>
                    {f[0]}
                  </span>
                ))}
              </div>
            )}

            {/* BPM abreviado */}
            {analysis && (
              <span className="font-mono text-[9px]" style={{ color: 'var(--color-muted)' }}
                title={`${bpmValue} BPM`}>
                {bpmValue}
              </span>
            )}
          </div>
        )}

        {/* Toggle recolher — visível apenas quando expandido */}
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            title="Recolher sidebar"
            className="absolute top-4 right-3 z-10 w-6 h-6 flex items-center justify-center rounded-full transition-opacity hover:opacity-80"
            style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-muted)', fontSize: '10px' }}
          >‹</button>
        )}

        {/* Conteúdo da sidebar — oculto quando recolhido */}
        <div
          className="flex flex-col flex-1 overflow-y-auto px-5 py-7"
          style={{ display: collapsed ? 'none' : 'flex', minWidth: '280px' }}
        >
          {/* Tagline */}
          <p className="font-mono text-xs mb-5 leading-relaxed" style={{ color: 'var(--color-muted)' }}>
            Busque uma música, escolha o estilo e gere acordes ricos para o seu remix.
          </p>

          {/* Busca */}
          <SongSearch
            onAnalysis={handleAnalysis}
            onSelect={(title, artist, cover) => setSong({ title, artist, cover })}
            targetStyle={genreName}
            targetBpm={GENRES[genreName]?.bpm ?? 120}
            hideHeader
            stackLayout
          />

          {/* Configurações — após análise */}
          {analysis && (
            <div className="mt-6 flex flex-col gap-5">
              {/* Song info */}
              {song && (
                <div className="flex items-center gap-2.5">
                  {song.cover && <img src={song.cover} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" />}
                  <div className="min-w-0">
                    <p className="font-sans text-xs font-semibold truncate" style={{ color: 'var(--color-ink)' }}>{song.title}</p>
                    <p className="font-mono text-[10px] truncate" style={{ color: 'var(--color-muted)' }}>{song.artist}</p>
                  </div>
                </div>
              )}

              {/* Escala detectada */}
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest mb-1.5" style={{ color: 'var(--color-muted)' }}>Escala detectada</p>
                <span className="inline-block font-mono text-xs px-2.5 py-1 rounded-full"
                  style={{ background: 'var(--color-bg)', color: 'var(--color-primary)', border: '1px solid var(--color-border)' }}>
                  {analysis.key} {analysis.mode}
                </span>
              </div>

              {/* Estilo */}
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest mb-1.5" style={{ color: 'var(--color-muted)' }}>Estilo do remix</p>
                <div className="flex flex-wrap gap-1.5">
                  {GENRE_NAMES.map(g => (
                    <button key={g} onClick={() => setGenreName(g)}
                      className="px-3 py-1.5 text-xs rounded-xl font-medium transition-all"
                      style={chip(genreName === g)}>{g}</button>
                  ))}
                </div>
              </div>

              {/* Feeling */}
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest mb-1.5" style={{ color: 'var(--color-muted)' }}>Feeling</p>
                <div className="flex flex-wrap gap-1.5">
                  {FEELING_CHIPS.map(f => (
                    <button key={f} onClick={() => toggleFeeling(f)}
                      className="px-3 py-1.5 text-xs rounded-xl font-medium transition-all"
                      style={chip(feeling.includes(f))}>{f}</button>
                  ))}
                </div>
              </div>

              {/* BPM */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-muted)' }}>BPM</p>
                  <div className="flex items-center rounded-xl overflow-hidden"
                    style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                    <button
                      onClick={() => setBpmValue(v => Math.max(50, v - 1))}
                      onMouseDown={e => {
                        const id = setInterval(() => setBpmValue(v => Math.max(50, v - 1)), 120)
                        const stop = () => clearInterval(id)
                        e.currentTarget.addEventListener('mouseup', stop, { once: true })
                        window.addEventListener('mouseup', stop, { once: true })
                      }}
                      className="px-2.5 py-1.5 font-light select-none" style={{ color: 'var(--color-muted)' }}>−</button>
                    <input type="number" value={bpmValue} min={50} max={220}
                      onChange={e => setBpmValue(Math.max(50, Math.min(220, Number(e.target.value) || 120)))}
                      className="w-11 py-1.5 font-mono text-xs text-center bg-transparent focus:outline-none"
                      style={{ color: 'var(--color-ink)' }} />
                    <button
                      onClick={() => setBpmValue(v => Math.min(220, v + 1))}
                      onMouseDown={e => {
                        const id = setInterval(() => setBpmValue(v => Math.min(220, v + 1)), 120)
                        const stop = () => clearInterval(id)
                        e.currentTarget.addEventListener('mouseup', stop, { once: true })
                        window.addEventListener('mouseup', stop, { once: true })
                      }}
                      className="px-2.5 py-1.5 font-light select-none" style={{ color: 'var(--color-muted)' }}>+</button>
                  </div>
                </div>
                <input type="range" min={50} max={220} step={1} value={bpmValue}
                  onChange={e => setBpmValue(Number(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{ accentColor: 'var(--color-primary)' }} />
                <div className="flex justify-between mt-1">
                  <span className="font-mono text-[9px]" style={{ color: 'var(--color-muted)' }}>50</span>
                  <span className="font-mono text-[9px]" style={{ color: 'var(--color-muted)' }}>220</span>
                </div>
              </div>

              {/* Gerar remix */}
              <button onClick={handleGenerate} disabled={!song}
                className="btn-primary w-full py-3 text-sm font-semibold rounded-2xl disabled:opacity-40">
                Gerar remix →
              </button>
            </div>
          )}

          {/* Rodapé */}
          <div className="mt-auto pt-8">
            <button onClick={handleAdvanced}
              className="font-mono text-[11px] opacity-50 hover:opacity-100 transition-opacity"
              style={{ color: 'var(--color-muted)' }}>
              → Modo avançado
            </button>
          </div>
        </div>
      </aside>

      {/* ── CONTEÚDO ── */}
      <main className="flex-1 flex overflow-hidden">

        {/* Zero state */}
        {!analysis && (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
            <p className="font-sans text-2xl font-bold mb-3" style={{ color: 'var(--color-ink)' }}>
              Seus acordes vão aparecer aqui
            </p>
            <p className="font-mono text-sm leading-relaxed max-w-sm" style={{ color: 'var(--color-muted)' }}>
              Preencha as informações ao lado e clique em{' '}
              <span style={{ color: 'var(--color-primary)' }}>Gerar remix</span>{' '}
              para ver 4 variações harmônicas da sua música.
            </p>
          </div>
        )}

        {/* Coluna do meio: guia de análise — persiste após "Gerar remix" */}
        {analysis && (
          <div
            className="overflow-y-auto px-8 py-8 shrink-0"
            style={{
              flex: result ? '0 0 400px' : '1',
              borderRight: result ? '1px solid var(--color-border)' : 'none',
            }}
          >
            <div className="max-w-xl space-y-4" style={{ animation: 'fadeInUp 0.35s ease' }}>
              {/* Cabeçalho */}
              <div className="flex items-center gap-4 mb-2">
                {song?.cover && <img src={song.cover} alt="" className="w-14 h-14 rounded-2xl object-cover shrink-0" />}
                <div>
                  <h2 className="font-sans text-xl font-bold" style={{ color: 'var(--color-ink)' }}>
                    {song?.title} — {song?.artist}
                  </h2>
                  <p className="text-sm mt-0.5" style={{ color: 'var(--color-muted)' }}>{analysis.character}</p>
                </div>
              </div>

              {/* Análise harmônica */}
              <div className="card p-5">
                <div className="flex gap-2 flex-wrap mb-4">
                  <span className="chip font-mono text-xs px-3 py-1.5" style={{ color: 'var(--color-primary)' }}>
                    {analysis.key} {analysis.mode}
                  </span>
                  <span className="chip font-mono text-xs px-3 py-1.5" style={{ color: 'var(--color-muted)' }}>
                    {analysis.bpm_original} BPM orig.
                  </span>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--color-muted)' }}>Progressão principal</p>
                    <p className="font-sans font-semibold text-base" style={{ color: 'var(--color-ink)' }}>{analysis.progression}</p>
                    <p className="font-mono text-xs mt-0.5" style={{ color: 'var(--color-primary)' }}>{analysis.progression_degrees}</p>
                  </div>
                  {analysis.borrowed_chords?.length > 0 && (
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--color-muted)' }}>Acordes disponíveis para remix</p>
                      <div className="flex flex-wrap gap-1.5">
                        {analysis.borrowed_chords.map((c, i) => (
                          <span key={i} className="chip font-mono text-xs px-2.5 py-1" style={{ color: '#8ab4f0' }}>{c}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Guia do remix */}
              <div className="card p-5">
                <p className="font-mono text-[10px] uppercase tracking-widest mb-4" style={{ color: 'var(--color-muted)' }}>
                  Guia do remix — {analysis.remix_guide.style} · {analysis.remix_guide.bpm} BPM
                </p>
                <div className="space-y-0 mb-5">
                  {analysis.remix_guide.structure.map((s, i) => (
                    <div key={i} className="flex items-start gap-3 py-2.5 border-b last:border-0"
                      style={{ borderColor: 'var(--color-border)' }}>
                      <span className="font-mono text-xs w-10 shrink-0 pt-0.5" style={{ color: 'var(--color-muted)' }}>{s.time}</span>
                      <span className="font-mono text-xs font-semibold w-20 shrink-0 pt-0.5"
                        style={{ color: SECTION_COLORS[s.section] ?? 'var(--color-primary)' }}>{s.section}</span>
                      <span className="text-sm" style={{ color: 'var(--color-ink)' }}>{s.description}</span>
                    </div>
                  ))}
                </div>
                {analysis.remix_guide.instruments?.length > 0 && (
                  <div className="mb-4">
                    <p className="font-mono text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--color-muted)' }}>Instrumentos</p>
                    {analysis.remix_guide.instruments.map((inst, i) => (
                      <div key={i} className="flex gap-3 py-1.5">
                        <span className="font-mono text-xs font-semibold w-16 shrink-0" style={{ color: 'var(--color-primary)' }}>{inst.role}</span>
                        <span className="text-sm" style={{ color: 'var(--color-muted)' }}>{inst.suggestion}</span>
                      </div>
                    ))}
                  </div>
                )}
                {analysis.remix_guide.tips?.length > 0 && (
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--color-muted)' }}>Dicas</p>
                    {analysis.remix_guide.tips.map((tip, i) => (
                      <p key={i} className="text-sm flex gap-2 mb-1.5" style={{ color: 'var(--color-muted)' }}>
                        <span style={{ color: 'var(--color-primary)' }}>→</span> {tip}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 3ª coluna: MiniPlayers — aparece após "Gerar remix" */}
        {result && (
          <div className="flex-1 overflow-y-auto px-8 py-8" style={{ animation: 'fadeInUp 0.4s ease' }}>
            {/* Song header */}
            <div className="flex items-center gap-4 mb-6">
              {result.song.cover && <img src={result.song.cover} alt="" className="w-14 h-14 rounded-2xl object-cover shrink-0" />}
              <div>
                <h2 className="font-sans text-2xl font-bold" style={{ color: 'var(--color-ink)' }}>{result.song.title}</h2>
                <p className="font-mono text-xs mt-1" style={{ color: 'var(--color-muted)' }}>
                  {result.song.artist} · {result.genreName} · {result.bpm} BPM
                </p>
              </div>
            </div>

            {/* Pills de seção */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {fullSong.markers.map((m, i) => {
                const isActive = currentMarkerIdx === i
                const sColor = sectionColorMap[m.name] ?? 'var(--color-muted)'
                return (
                  <span key={i} className="font-mono text-[11px] px-2.5 py-1 rounded-full transition-all"
                    style={{
                      background: isActive ? `${sColor}33` : 'var(--color-card)',
                      color: isActive ? sColor : 'var(--color-muted)',
                      border: `1px solid ${isActive ? sColor : 'var(--color-border)'}`,
                      fontWeight: isActive ? 700 : 400,
                      transform: isActive ? 'scale(1.05)' : 'scale(1)',
                    }}>{m.name}</span>
                )
              })}
              <span className="font-mono text-[11px] ml-auto" style={{ color: 'var(--color-muted)' }}>{durationLabel}</span>
            </div>

            {/* Toggle timeline */}
            {fullSong.markers.length > 1 && (
              <button onClick={() => setShowTimeline(v => !v)}
                className="font-mono text-[10px] mb-4 flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity"
                style={{ color: 'var(--color-muted)' }}>
                {showTimeline ? '▾' : '▸'} {showTimeline ? 'Fechar timeline' : 'Ver timeline'}
              </button>
            )}

            {/* Timeline */}
            {showTimeline && (
              <div className="mb-6 card p-4">
                <div className="relative">
                  <div className="flex h-8 rounded-lg overflow-hidden mb-1">
                    {timelineBlocks.map((b, i) => (
                      <div key={i}
                        className="flex items-center justify-center overflow-hidden font-mono text-[9px] font-semibold"
                        style={{ width: `${b.widthPct}%`, background: b.color, opacity: currentMarkerIdx === i ? 1 : 0.35,
                          color: '#111', transition: 'opacity 0.2s', whiteSpace: 'nowrap', padding: '0 4px' }}
                        title={b.name}>
                        {b.widthPct > 6 ? b.name : ''}
                      </div>
                    ))}
                  </div>
                  {activeExt !== null && (
                    <div className="absolute top-0 bottom-1 w-0.5 rounded-full pointer-events-none"
                      style={{ left: `${activeProgress * 100}%`, background: 'white', boxShadow: '0 0 4px rgba(0,0,0,0.4)', transition: 'left 80ms linear' }} />
                  )}
                  <div className="relative h-4">
                    {timelineBlocks.map((b, i) => (
                      <span key={i} className="absolute font-mono text-[9px] truncate"
                        style={{ left: `${b.fraction * 100}%`, transform: i === 0 ? 'none' : 'translateX(-50%)',
                          color: currentMarkerIdx === i ? b.color : 'var(--color-muted)', opacity: currentMarkerIdx === i ? 1 : 0.5 }}>
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
                <MiniPlayer key={ext} chords={fullSong.chords} markers={fullSong.markers} scale={scale}
                  ext={ext} label={label} tagline={tagline} color={color} genre={genre!} bpm={result.bpm}
                  isActive={activeExt === ext} onPlay={() => handlePlay(ext)} onStop={handleStop}
                  onProgress={p => setActiveProgress(p)} songSlug={songSlug} />
              ))}
            </div>

            {/* Download all */}
            <button onClick={handleDownloadAll}
              className="w-full py-4 rounded-2xl font-semibold text-sm transition-opacity hover:opacity-80"
              style={{ background: 'var(--color-card)', color: 'var(--color-primary)', border: '1px solid var(--color-border)' }}>
              ↓ Baixar os 4 MIDIs — 5 trilhas cada (.zip)
            </button>
          </div>
        )}

      </main>
    </div>
  )
}
