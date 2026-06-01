import { useState } from 'react'
import { HelpIcon } from './ui/Tooltip'

interface RemixStructure {
  time: string
  section: string
  description: string
}

interface InstrumentSuggestion {
  role: string
  suggestion: string
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
    structure: RemixStructure[]
    instruments: InstrumentSuggestion[]
    tips: string[]
  }
}

interface Props {
  onAnalysis: (analysis: SongAnalysis, chords: string) => void
  targetStyle: string
  targetBpm: number
}

export function SongSearch({ onAnalysis, targetStyle, targetBpm }: Props) {
  const [artist, setArtist] = useState('')
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<SongAnalysis | null>(null)

  const handleSearch = async () => {
    if (!artist.trim() || !title.trim()) return
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const res = await fetch('/api/analyze-song', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artist: artist.trim(), title: title.trim(), targetStyle, targetBpm }),
      })

      if (!res.ok) throw new Error('Erro ao analisar música')
      const data = await res.json() as SongAnalysis
      setResult(data)
      onAnalysis(data, data.progression)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  const SECTION_COLORS: Record<string, string> = {
    'Intro': '#8ab4f0',
    'Build Up': '#c084fc',
    'Drop 1': '#7ad1a8',
    'Drop 2': '#7ad1a8',
    'Break': '#e8c87a',
    'Outro': '#7e7c78',
  }

  return (
    <div className="space-y-4">

      {/* Input */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-muted)' }}>
            Buscar música
          </p>
          <HelpIcon tip="Digite o artista e o nome da música. O sistema identifica automaticamente a tonalidade, progressão e gera um guia completo para o seu remix." />
        </div>

        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            value={artist}
            onChange={e => setArtist(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Artista"
            className="input-neumorphic flex-1 min-w-[140px] px-4 py-2.5 text-sm"
            style={{ color: 'var(--color-ink)', fontFamily: 'inherit' }}
          />
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Nome da música"
            className="input-neumorphic flex-1 min-w-[180px] px-4 py-2.5 text-sm"
            style={{ color: 'var(--color-ink)', fontFamily: 'inherit' }}
          />
          <button
            onClick={handleSearch}
            disabled={loading || !artist.trim() || !title.trim()}
            className="btn-primary px-5 py-2.5 text-sm font-semibold rounded-xl disabled:opacity-50 whitespace-nowrap"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">◌</span> Analisando...
              </span>
            ) : 'Analisar música'}
          </button>
        </div>

        {error && (
          <p className="text-xs mt-3 px-3 py-2 rounded-xl" style={{ background: 'rgba(232,138,138,0.1)', color: '#e88a8a' }}>
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
              <div>
                <h3 className="font-sans font-bold text-base" style={{ color: 'var(--color-ink)' }}>
                  {title} — {artist}
                </h3>
                <p className="text-sm mt-0.5" style={{ color: 'var(--color-muted)' }}>{result.character}</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <span className="chip font-mono text-xs px-3 py-1.5">
                  <span style={{ color: 'var(--color-primary)' }}>{result.key} {result.mode}</span>
                </span>
                <span className="chip font-mono text-xs px-3 py-1.5" style={{ color: 'var(--color-muted)' }}>
                  {result.bpm_original} BPM
                </span>
                {result.spotify && (
                  <span className="chip font-mono text-xs px-3 py-1.5" style={{ color: 'var(--color-muted)' }}>
                    energy {Math.round(result.spotify.energy * 100)}%
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--color-muted)' }}>
                  Progressão principal
                </p>
                <p className="font-sans font-semibold" style={{ color: 'var(--color-ink)' }}>
                  {result.progression}
                </p>
                <p className="font-mono text-xs mt-0.5" style={{ color: 'var(--color-primary)' }}>
                  {result.progression_degrees}
                </p>
              </div>

              {result.borrowed_chords?.length > 0 && (
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--color-muted)' }}>
                    Acordes disponíveis para remix
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
              Guia do Remix — {result.remix_guide.style} · {result.remix_guide.bpm} BPM
            </p>

            {/* Estrutura */}
            <div className="space-y-1 mb-5">
              {result.remix_guide.structure.map((s, i) => (
                <div key={i} className="flex items-start gap-3 py-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
                  <span className="font-mono text-xs w-10 shrink-0 pt-0.5" style={{ color: 'var(--color-muted)' }}>
                    {s.time}
                  </span>
                  <span
                    className="font-mono text-xs font-semibold w-20 shrink-0 pt-0.5"
                    style={{ color: SECTION_COLORS[s.section] ?? 'var(--color-primary)' }}
                  >
                    {s.section}
                  </span>
                  <span className="text-sm" style={{ color: 'var(--color-ink)' }}>
                    {s.description}
                  </span>
                </div>
              ))}
            </div>

            {/* Instrumentos */}
            <div className="mb-5">
              <p className="font-mono text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--color-muted)' }}>
                Instrumentos
              </p>
              <div className="space-y-1">
                {result.remix_guide.instruments.map((inst, i) => (
                  <div key={i} className="flex gap-3 py-1.5">
                    <span className="font-mono text-xs font-semibold w-16 shrink-0" style={{ color: 'var(--color-primary)' }}>
                      {inst.role}
                    </span>
                    <span className="text-sm" style={{ color: 'var(--color-muted)' }}>
                      {inst.suggestion}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Dicas */}
            {result.remix_guide.tips?.length > 0 && (
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--color-muted)' }}>
                  Dicas
                </p>
                {result.remix_guide.tips.map((tip, i) => (
                  <p key={i} className="text-sm flex gap-2 mb-1" style={{ color: 'var(--color-muted)' }}>
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
