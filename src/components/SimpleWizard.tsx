import { useState, useCallback } from 'react'
import { SongSearch, type SongAnalysis } from './SongSearch'
import { GENRES, GENRE_NAMES } from '../genres'

export interface SimpleWizardSong {
  title: string
  artist: string
  cover: string | null
}

export interface SimpleWizardResult {
  analysis: SongAnalysis
  song: SimpleWizardSong
  genreName: string
  bpm: number
}

interface Props {
  onComplete: (result: SimpleWizardResult) => void
  onAdvanced: () => void
}

const BPM_CHIPS = ['Auto', '80', '90', '100', '110', '120', '124', '128', '130']

export function SimpleWizard({ onComplete, onAdvanced }: Props) {
  const [analysis, setAnalysis] = useState<SongAnalysis | null>(null)
  const [song, setSong] = useState<SimpleWizardSong | null>(null)
  const [genreName, setGenreName] = useState('House')
  const [bpmOpt, setBpmOpt] = useState('Auto')

  const handleAnalysis = useCallback((a: SongAnalysis) => {
    setAnalysis(a)
    if (a.remix_guide?.style && GENRES[a.remix_guide.style]) {
      setGenreName(a.remix_guide.style)
    }
  }, [])

  const handleGenerate = () => {
    if (!analysis || !song) return
    const genre = GENRES[genreName]!
    const bpm =
      bpmOpt === 'Auto'
        ? (analysis.remix_guide?.bpm ?? genre.bpm)
        : parseInt(bpmOpt, 10)
    onComplete({ analysis, song, genreName, bpm })
  }

  const autoBpm = analysis?.remix_guide?.bpm ?? GENRES[genreName]?.bpm ?? 120

  return (
    <div style={{ background: 'var(--color-bg)', minHeight: '100vh' }}>
      <div className="max-w-[860px] mx-auto px-6 py-10">
        {/* Logo */}
        <div className="mb-10">
          <h1 className="font-sans text-4xl font-bold" style={{ color: 'var(--color-ink)' }}>
            ChordFlip
          </h1>
          <p className="font-mono text-xs mt-1" style={{ color: 'var(--color-muted)' }}>
            Transforme qualquer música em acordes ricos para remix
          </p>
        </div>

        {/* Song Search */}
        <SongSearch
          onAnalysis={handleAnalysis}
          onSelect={(title, artist, cover) => setSong({ title, artist, cover })}
          targetStyle={genreName}
          targetBpm={GENRES[genreName]?.bpm ?? 120}
        />

        {/* Config após análise */}
        {analysis && (
          <div className="mt-8 space-y-6">
            {/* Estilo */}
            <div>
              <p
                className="font-mono text-[10px] uppercase tracking-widest mb-3"
                style={{ color: 'var(--color-muted)' }}
              >
                Estilo do remix
              </p>
              <div className="flex flex-wrap gap-2">
                {GENRE_NAMES.map(g => (
                  <button
                    key={g}
                    onClick={() => setGenreName(g)}
                    className="px-4 py-2 text-sm rounded-xl font-medium transition-all"
                    style={{
                      color: genreName === g ? 'var(--color-bg)' : 'var(--color-ink)',
                      background:
                        genreName === g ? 'var(--color-primary)' : 'var(--color-card)',
                      border: '1px solid',
                      borderColor:
                        genreName === g ? 'var(--color-primary)' : 'var(--color-border)',
                    }}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* BPM */}
            <div>
              <p
                className="font-mono text-[10px] uppercase tracking-widest mb-3"
                style={{ color: 'var(--color-muted)' }}
              >
                BPM
              </p>
              <div className="flex flex-wrap gap-2">
                {BPM_CHIPS.map(b => (
                  <button
                    key={b}
                    onClick={() => setBpmOpt(b)}
                    className="px-4 py-2 text-sm rounded-xl font-mono transition-all"
                    style={{
                      color: bpmOpt === b ? 'var(--color-bg)' : 'var(--color-ink)',
                      background:
                        bpmOpt === b ? 'var(--color-primary)' : 'var(--color-card)',
                      border: '1px solid',
                      borderColor:
                        bpmOpt === b ? 'var(--color-primary)' : 'var(--color-border)',
                    }}
                  >
                    {b === 'Auto' ? `Auto (${autoBpm})` : b}
                  </button>
                ))}
              </div>
            </div>

            {/* Gerar */}
            <button
              onClick={handleGenerate}
              disabled={!song}
              className="btn-primary w-full py-4 text-base font-semibold rounded-2xl disabled:opacity-40"
            >
              Gerar remix →
            </button>
          </div>
        )}

        {/* Link modo avançado */}
        <div className="mt-10 text-center">
          <button
            onClick={onAdvanced}
            className="font-mono text-xs hover:opacity-100 opacity-60 transition-opacity"
            style={{ color: 'var(--color-muted)' }}
          >
            → Modo avançado
          </button>
        </div>
      </div>
    </div>
  )
}
