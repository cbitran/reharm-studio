import { getSkeletonsForGenre, type ProgressionSkeleton } from '../lib/progressions'
import { nameChord, reVoice } from '../core/reharmonizer'
import type { Extension, ParsedChord } from '../types'

interface Props {
  tonic: number | null
  genreName: string
  ext: Extension
  onSelect: (chords: ParsedChord[], skeleton: ProgressionSkeleton) => void
  selectedId: string | null
}

const QUALITY_MAP: Record<string, number[]> = {
  maj: [0, 4, 7], m: [0, 3, 7], dim: [0, 3, 6],
  maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10],
  '7': [0, 4, 7, 10], 'm7b5': [0, 3, 6, 10],
}

function transposeToKey(
  skeleton: ProgressionSkeleton,
  tonic: number,
  ext: Extension,
): (ParsedChord & { name: string; reharmonizedIntervals: number[] })[] {
  return skeleton.degrees.map((deg, i) => {
    const root = (tonic + deg) % 12
    const baseIntervals = QUALITY_MAP[skeleton.qualities[i] ?? 'maj'] ?? [0, 4, 7]
    const reharmonized = reVoice(baseIntervals, ext)
    const name = nameChord(root, reharmonized)
    return { root, intervals: baseIntervals, reharmonizedIntervals: reharmonized, tok: name, ok: true, name }
  })
}

export function ProgressionGallery({ tonic, genreName, ext, onSelect, selectedId }: Props) {
  const skeletons = getSkeletonsForGenre(genreName)

  if (tonic === null) {
    return (
      <div className="card p-8 text-center">
        <p className="font-mono text-sm" style={{ color: 'var(--color-muted)' }}>
          Digite acordes na seção 01 para ver progressões sugeridas
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {skeletons.map(sk => {
        const chords = transposeToKey(sk, tonic, ext)
        const isSelected = selectedId === sk.id

        return (
          <button
            key={sk.id}
            onClick={() => onSelect(chords, sk)}
            className={`text-left p-5 rounded-2xl border transition-all ${
              isSelected ? 'ring-2' : 'card hover:scale-[1.01]'
            }`}
            style={
              isSelected
                ? {
                    background: 'var(--color-card)',
                    borderColor: 'var(--color-primary)',
                    boxShadow: 'var(--shadow-card)',
                    outline: `2px solid var(--color-primary)`,
                  }
                : {}
            }
          >
            {/* Cabeçalho */}
            <div className="flex items-center justify-between mb-3">
              <span
                className="font-mono text-xs font-semibold"
                style={{ color: 'var(--color-primary)' }}
              >
                {sk.name}
              </span>
              {isSelected && (
                <span
                  className="font-mono text-[10px] px-2 py-0.5 rounded-full"
                  style={{
                    background: 'var(--color-primary)',
                    color: 'var(--color-bg)',
                  }}
                >
                  ativo
                </span>
              )}
            </div>

            {/* Acordes */}
            <div className="flex flex-wrap items-center gap-1 mb-3">
              {chords.map((c, i) => (
                <span key={i} className="flex items-center gap-1">
                  <span
                    className="font-sans text-base font-semibold"
                    style={{ color: 'var(--color-ink)' }}
                  >
                    {c.name}
                  </span>
                  {i < chords.length - 1 && (
                    <span className="font-mono text-xs" style={{ color: 'var(--color-muted)' }}>
                      –
                    </span>
                  )}
                </span>
              ))}
            </div>

            {/* Descrição */}
            <p className="text-xs leading-relaxed mb-3" style={{ color: 'var(--color-muted)' }}>
              {sk.description}
            </p>

            {/* Tags */}
            <div className="flex flex-wrap gap-1">
              {sk.tags.map(tag => (
                <span
                  key={tag}
                  className="font-mono text-[10px] px-2 py-0.5 rounded-full"
                  style={{
                    background: 'var(--color-bg)',
                    color: 'var(--color-muted)',
                    boxShadow: 'var(--shadow-btn)',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </button>
        )
      })}
    </div>
  )
}

export { transposeToKey }
export type { ProgressionSkeleton }
