import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { HelpIcon } from './ui/Tooltip'

interface SpotifySuggestion {
  id: string
  title: string
  artist: string
  album: string
  cover: string | null
  duration: number
}

export interface SongAnalysis {
  key: string
  mode: string
  bpm_original: number
  progression: string
  progression_degrees: string
  character: string
  borrowed_chords: string[]
  spotify?: { energy: number; danceability: number } | null
  remix_guide: {
    style: string
    bpm: number
    structure: { time: string; section: string; description: string }[]
    instruments: { role: string; suggestion: string }[]
    tips: string[]
  }
}

interface Props {
  onAnalysis: (analysis: SongAnalysis, chords: string) => void
  targetStyle: string
  targetBpm: number
}

function formatDuration(secs: number): string {
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`
}

const SECTION_COLORS: Record<string, string> = {
  'Intro': '#8ab4f0', 'Build Up': '#c084fc', 'Drop 1': '#7ad1a8',
  'Drop 2': '#7ad1a8', 'Break': '#e8c87a', 'Outro': '#7e7c78',
}

export function SongSearch({ onAnalysis, targetStyle, targetBpm }: Props) {
  const { t, i18n } = useTranslation()
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<SpotifySuggestion[]>([])
  const [selected, setSelected] = useState<SpotifySuggestion | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<SongAnalysis | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Debounce da busca
  useEffect(() => {
    if (selected) return
    if (query.length < 2) { setSuggestions([]); setShowDropdown(false); return }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/search-songs?q=${encodeURIComponent(query)}`)
        const data = await res.json() as SpotifySuggestion[]
        setSuggestions(Array.isArray(data) ? data : [])
        setShowDropdown(true)
      } catch { setSuggestions([]) }
      finally { setLoading(false) }
    }, 350)
  }, [query, selected])

  const handleSelect = (s: SpotifySuggestion) => {
    setSelected(s)
    setQuery(`${s.artist} — ${s.title}`)
    setShowDropdown(false)
    setSuggestions([])
  }

  const handleClear = () => {
    setSelected(null)
    setQuery('')
    setResult(null)
    setError('')
    setSuggestions([])
  }

  const handleAnalyze = async () => {
    if (!selected) return
    setAnalyzing(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch('/api/analyze-song', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artist: selected.artist,
          title: selected.title,
          targetStyle,
          targetBpm,
          lang: i18n.language,
        }),
      })
      if (!res.ok) throw new Error(t('analysis.error'))
      const data = await res.json() as SongAnalysis
      setResult(data)
      onAnalysis(data, data.progression)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('analysis.unknownError'))
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-muted)' }}>
            {t('sections.search')}
          </p>
          <HelpIcon tip="Digite o nome da música ou artista. Selecione nas sugestões e clique em Analisar para gerar o guia do remix." />
        </div>

        {/* Campo de busca com autocomplete */}
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[260px] relative" ref={wrapperRef}>
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={e => { setQuery(e.target.value); setSelected(null) }}
                onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
                placeholder="Ex: Lionel Richie — Stuck on You"
                className="input-neumorphic w-full pl-4 pr-10 py-2.5 text-sm"
                style={{ color: 'var(--color-ink)', fontFamily: 'inherit' }}
              />
              {/* Indicadores */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {loading && (
                  <span className="font-mono text-xs animate-spin" style={{ color: 'var(--color-muted)' }}>◌</span>
                )}
                {selected && (
                  <button onClick={handleClear} className="text-xs" style={{ color: 'var(--color-muted)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#e88a8a')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-muted)')}>
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Dropdown de sugestões */}
            {showDropdown && suggestions.length > 0 && (
              <div
                className="absolute top-full left-0 right-0 mt-1 z-50 rounded-2xl overflow-hidden"
                style={{
                  background: 'var(--color-card)',
                  boxShadow: 'var(--shadow-card)',
                  border: '1px solid var(--color-border)',
                }}
              >
                {suggestions.map(s => (
                  <button
                    key={s.id}
                    onClick={() => handleSelect(s)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left border-b last:border-0 transition-colors"
                    style={{ borderColor: 'var(--color-border)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-card-hi)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* Capa */}
                    {s.cover ? (
                      <img src={s.cover} alt={s.album} className="w-9 h-9 rounded-lg shrink-0 object-cover" />
                    ) : (
                      <div className="w-9 h-9 rounded-lg shrink-0 flex items-center justify-center text-lg"
                        style={{ background: 'var(--color-bg)' }}>🎵</div>
                    )}
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-ink)' }}>
                        {s.title}
                      </p>
                      <p className="font-mono text-[11px] truncate" style={{ color: 'var(--color-muted)' }}>
                        {s.artist} · {s.album}
                      </p>
                    </div>
                    {/* Duração */}
                    <span className="font-mono text-[11px] shrink-0" style={{ color: 'var(--color-muted)' }}>
                      {formatDuration(s.duration)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleAnalyze}
            disabled={analyzing || !selected}
            className="btn-primary px-5 py-2.5 text-sm font-semibold rounded-xl disabled:opacity-40 whitespace-nowrap"
          >
            {analyzing ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin inline-block">◌</span> {t('analysis.analyzing')}
              </span>
            ) : t('analysis.analyzeBtn')}
          </button>
        </div>

        {/* Música selecionada */}
        {selected && !result && !analyzing && (
          <div className="flex items-center gap-3 mt-3 px-3 py-2 rounded-xl"
            style={{ background: 'var(--color-bg)', boxShadow: 'var(--shadow-input)' }}>
            {selected.cover && (
              <img src={selected.cover} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
            )}
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>{selected.title}</p>
              <p className="font-mono text-[11px]" style={{ color: 'var(--color-muted)' }}>{selected.artist}</p>
            </div>
            <span className="ml-auto font-mono text-[10px] px-2 py-1 rounded-full"
              style={{ background: 'var(--color-primary)', color: 'var(--color-bg)' }}>
              {t('analysis.selected')}
            </span>
          </div>
        )}

        {error && (
          <p className="text-xs mt-3 px-3 py-2 rounded-xl"
            style={{ background: 'rgba(232,138,138,0.1)', color: '#e88a8a' }}>
            {error}
          </p>
        )}
      </div>

      {/* Resultado */}
      {result && (
        <div className="space-y-3">
          {/* Análise harmônica */}
          <div className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                {selected?.cover && (
                  <img src={selected.cover} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" />
                )}
                <div>
                  <h3 className="font-sans font-bold text-base" style={{ color: 'var(--color-ink)' }}>
                    {selected?.title} — {selected?.artist}
                  </h3>
                  <p className="text-sm mt-0.5" style={{ color: 'var(--color-muted)' }}>{result.character}</p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <span className="chip font-mono text-xs px-3 py-1.5" style={{ color: 'var(--color-primary)' }}>
                  {result.key} {result.mode}
                </span>
                <span className="chip font-mono text-xs px-3 py-1.5" style={{ color: 'var(--color-muted)' }}>
                  {result.bpm_original} BPM orig.
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--color-muted)' }}>
                  {t('analysis.mainProgression')}
                </p>
                <p className="font-sans font-semibold text-base" style={{ color: 'var(--color-ink)' }}>
                  {result.progression}
                </p>
                <p className="font-mono text-xs mt-0.5" style={{ color: 'var(--color-primary)' }}>
                  {result.progression_degrees}
                </p>
              </div>

              {result.borrowed_chords?.length > 0 && (
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--color-muted)' }}>
                    {t('analysis.availableChords')}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {result.borrowed_chords.map((c, i) => (
                      <span key={i} className="chip font-mono text-xs px-2.5 py-1" style={{ color: '#8ab4f0' }}>
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Guia do remix */}
          <div className="card p-5">
            <p className="font-mono text-[10px] uppercase tracking-widest mb-4" style={{ color: 'var(--color-muted)' }}>
              {t('analysis.remixGuide', { style: result.remix_guide.style, bpm: result.remix_guide.bpm })}
            </p>

            <div className="space-y-0 mb-5">
              {result.remix_guide.structure.map((s, i) => (
                <div key={i} className="flex items-start gap-3 py-2.5 border-b last:border-0"
                  style={{ borderColor: 'var(--color-border)' }}>
                  <span className="font-mono text-xs w-10 shrink-0 pt-0.5" style={{ color: 'var(--color-muted)' }}>
                    {s.time}
                  </span>
                  <span className="font-mono text-xs font-semibold w-20 shrink-0 pt-0.5"
                    style={{ color: SECTION_COLORS[s.section] ?? 'var(--color-primary)' }}>
                    {s.section}
                  </span>
                  <span className="text-sm" style={{ color: 'var(--color-ink)' }}>{s.description}</span>
                </div>
              ))}
            </div>

            <div className="mb-4">
              <p className="font-mono text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--color-muted)' }}>
                {t('analysis.instruments')}
              </p>
              {result.remix_guide.instruments.map((inst, i) => (
                <div key={i} className="flex gap-3 py-1.5">
                  <span className="font-mono text-xs font-semibold w-16 shrink-0" style={{ color: 'var(--color-primary)' }}>
                    {inst.role}
                  </span>
                  <span className="text-sm" style={{ color: 'var(--color-muted)' }}>{inst.suggestion}</span>
                </div>
              ))}
            </div>

            {result.remix_guide.tips?.length > 0 && (
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--color-muted)' }}>
                  {t('analysis.tips')}
                </p>
                {result.remix_guide.tips.map((tip, i) => (
                  <p key={i} className="text-sm flex gap-2 mb-1.5" style={{ color: 'var(--color-muted)' }}>
                    <span style={{ color: 'var(--color-primary)' }}>→</span> {tip}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
