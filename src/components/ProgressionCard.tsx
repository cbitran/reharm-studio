import type { SuggestedProgression } from '../types/progressions'

interface Props {
  progression: SuggestedProgression
  onLoadTab: (p: SuggestedProgression) => void
  onChordClick: (chord: string) => void
}

export function ProgressionCard({ progression, onLoadTab, onChordClick }: Props) {
  return (
    <div
      className="rounded-xl p-4 space-y-3 shrink-0"
      style={{
        background: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-card)',
        minWidth: 220,
        maxWidth: 260,
      }}
    >
      <div>
        <p className="font-semibold text-sm leading-tight" style={{ color: 'var(--color-ink)' }}>
          {progression.name}
        </p>
        <p className="font-mono text-[10px] mt-0.5" style={{ color: 'var(--color-muted)' }}>
          {progression.mood}
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {progression.chords.map((chord, i) => (
          <button
            key={i}
            onClick={() => onChordClick(chord)}
            className="font-mono text-xs px-2 py-1 rounded-lg transition-all"
            style={{
              background: 'rgba(122,209,168,0.15)',
              color: '#7ad1a8',
              border: '1px solid rgba(122,209,168,0.35)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(122,209,168,0.3)'
              e.currentTarget.style.borderColor = '#7ad1a8'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(122,209,168,0.15)'
              e.currentTarget.style.borderColor = 'rgba(122,209,168,0.35)'
            }}
            title="Adicionar à progressão atual"
          >
            {chord}
          </button>
        ))}
      </div>

      <button
        onClick={() => onLoadTab(progression)}
        className="w-full font-mono text-xs py-2 rounded-xl transition-all"
        style={{
          background: 'var(--color-bg)',
          color: 'var(--color-primary)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-btn)',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary)' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)' }}
      >
        Carregar →
      </button>
    </div>
  )
}
