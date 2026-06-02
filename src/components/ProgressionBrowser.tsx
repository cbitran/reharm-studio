import { useState, useCallback, useEffect, useRef } from 'react'
import { ProgressionCard } from './ProgressionCard'
import type { SuggestedProgression } from '../types/progressions'
import type { Extension } from '../types'

interface Props {
  artist: string
  title: string
  mainChords: string
  style: string
  bpm: number
  ext: Extension
  feeling: string
  onLoadTab: (p: SuggestedProgression) => void
  onChordClick: (chord: string) => void
}

const EXT_LABEL: Record<string, string> = {
  tri: 'tríades',
  '7': 'acordes com 7ª',
  '9': 'acordes com 9ª',
  '11': 'acordes com 11ª',
}

export function ProgressionBrowser({
  artist, title, mainChords, style, bpm, ext, feeling,
  onLoadTab, onChordClick,
}: Props) {
  const [progressions, setProgressions] = useState<SuggestedProgression[]>([])
  const [loading, setLoading] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const [stale, setStale] = useState(false)

  // Guarda os parâmetros da última geração para detectar mudanças
  const lastParams = useRef({ style, bpm, ext, feeling, mainChords })

  // Detecta quando os parâmetros mudaram desde a última geração
  useEffect(() => {
    if (!initialized) return
    const p = lastParams.current
    if (p.style !== style || p.bpm !== bpm || p.ext !== ext || p.feeling !== feeling) {
      setStale(true)
    }
  }, [style, bpm, ext, feeling, initialized])

  const fetchFresh = useCallback(async () => {
    setLoading(true)
    setStale(false)
    lastParams.current = { style, bpm, ext, feeling, mainChords }
    try {
      const res = await fetch('/api/suggest-progressions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artist, title, style, bpm, ext, feeling, mainChords }),
      })
      const data = await res.json() as { progressions: Omit<SuggestedProgression, 'id'>[] }
      const newOnes = (data.progressions ?? []).map(p => ({
        ...p,
        id: `${style}-${bpm}-${ext}-${Math.random().toString(36).slice(2)}`,
      }))
      // Substitui resultados anteriores quando parâmetros mudaram, appenda se é "mais do mesmo"
      setProgressions(stale ? newOnes : prev => [...prev, ...newOnes])
      setInitialized(true)
    } catch {
      setInitialized(true)
    } finally {
      setLoading(false)
    }
  }, [artist, title, mainChords, style, bpm, ext, feeling, stale])

  useEffect(() => {
    fetchFresh()
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  if (!initialized && !loading) return null

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-[3px]" style={{ color: 'var(--color-muted)' }}>
            05.6
          </span>
          <span className="font-sans font-bold text-lg ml-2" style={{ color: 'var(--color-ink)' }}>
            Progressões Sugeridas
          </span>
          {initialized && (
            <span className="font-mono text-[10px] ml-3" style={{ color: 'var(--color-muted)' }}>
              {style} · {bpm} BPM · {EXT_LABEL[ext]}
              {feeling ? ` · ${feeling}` : ''}
            </span>
          )}
        </div>

        <button
          onClick={fetchFresh}
          disabled={loading}
          className="font-mono text-xs px-4 py-2 rounded-xl transition-all"
          style={{
            background: stale ? 'var(--color-primary)' : 'var(--color-bg)',
            color: loading ? 'var(--color-muted)' : stale ? 'var(--color-bg)' : 'var(--color-primary)',
            border: `1px solid ${stale ? 'var(--color-primary)' : 'var(--color-border)'}`,
            boxShadow: 'var(--shadow-btn)',
          }}
        >
          {loading ? 'Gerando...' : stale ? '↻ Aplicar mudanças' : '+ Gerar mais'}
        </button>
      </div>

      <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
        Clique num acorde para adicionar à progressão atual · "Carregar →" abre numa aba nova
      </p>

      {stale && !loading && (
        <p className="text-xs px-3 py-2 rounded-xl" style={{ background: 'rgba(122,209,168,0.08)', color: 'var(--color-primary)' }}>
          Você mudou o estilo, BPM, extensão ou feeling. Clique em "Aplicar mudanças" para gerar novas progressões com as configurações atuais.
        </p>
      )}

      {loading && progressions.length === 0 ? (
        <div className="flex items-center py-4">
          <span className="animate-pulse font-mono text-sm" style={{ color: 'var(--color-muted)' }}>
            Analisando "{title}" → gerando remixes {style} {bpm} BPM {EXT_LABEL[ext]}...
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
          {loading && progressions.length > 0 && (
            <div className="shrink-0 flex items-center px-6" style={{ color: 'var(--color-muted)' }}>
              <span className="animate-pulse font-mono text-sm">Gerando...</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
