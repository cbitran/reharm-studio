import { useState, useCallback, useEffect } from 'react'
import { ProgressionCard } from './ProgressionCard'
import type { SuggestedProgression } from '../types/progressions'

interface Props {
  song: string
  style: string
  bpm: number
  feeling: string
  onLoadTab: (p: SuggestedProgression) => void
  onChordClick: (chord: string) => void
}

export function ProgressionBrowser({ song, style, bpm, feeling, onLoadTab, onChordClick }: Props) {
  const [progressions, setProgressions] = useState<SuggestedProgression[]>([])
  const [loading, setLoading] = useState(false)
  const [initialized, setInitialized] = useState(false)

  const fetchMore = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/suggest-progressions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ song, style, bpm, feeling }),
      })
      const data = await res.json() as { progressions: Omit<SuggestedProgression, 'id'>[] }
      const newOnes = (data.progressions ?? []).map(p => ({
        ...p,
        id: `${style}-${bpm}-${Math.random().toString(36).slice(2)}`,
      }))
      setProgressions(prev => [...prev, ...newOnes])
      setInitialized(true)
    } catch {
      setInitialized(true)
    } finally {
      setLoading(false)
    }
  }, [song, style, bpm, feeling])

  useEffect(() => {
    fetchMore()
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  if (!initialized && !loading) return null

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-[3px]" style={{ color: 'var(--color-muted)' }}>
            05.6
          </span>
          <span className="font-sans font-bold text-lg ml-2" style={{ color: 'var(--color-ink)' }}>
            Progressões Sugeridas
          </span>
        </div>
        <button
          onClick={fetchMore}
          disabled={loading}
          className="font-mono text-xs px-4 py-2 rounded-xl transition-all"
          style={{
            background: 'var(--color-bg)',
            color: loading ? 'var(--color-muted)' : 'var(--color-primary)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-btn)',
          }}
        >
          {loading ? 'Gerando...' : '+ Gerar mais'}
        </button>
      </div>

      <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
        Clique num acorde para adicionar à progressão atual · "Carregar →" abre numa aba nova
      </p>

      {loading && progressions.length === 0 ? (
        <div className="flex items-center py-4">
          <span className="animate-pulse font-mono text-sm" style={{ color: 'var(--color-muted)' }}>
            Gerando progressões para {style} {bpm} BPM...
          </span>
        </div>
      ) : (
        <div
          className="flex gap-3 overflow-x-auto pb-2"
          style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--color-border) transparent' }}
        >
          {progressions.map(p => (
            <ProgressionCard
              key={p.id}
              progression={p}
              onLoadTab={onLoadTab}
              onChordClick={onChordClick}
            />
          ))}
        </div>
      )}
    </div>
  )
}
