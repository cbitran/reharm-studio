import { useState, useMemo, useEffect } from 'react'
import { NOTE_NAMES } from '../core/parser'
import { buildHarmonicField, CATEGORY_META, MOODS, EXTENSION_PRESETS, type HarmonicChord, type ChordCategory } from '../lib/harmonic-field'
import { VoicingKeyboard } from './VoicingKeyboard'
import { previewChord } from '../audio/player'
import { ChordBadge } from './ChordBadge'
import type { Extension, ParsedChord, ChordBadgeData } from '../types'

interface Props {
  ext: Extension
  onExtChange: (e: Extension) => void
  onChordClick: (chord: ParsedChord & { name: string; reharmonizedIntervals: number[] }) => void
  tonicOverride?: number | null
  moodOverride?: string[]
  badges?: Record<string, ChordBadgeData>
}

const TONIC_NOTES = NOTE_NAMES

export function HarmonicField({ ext, onExtChange, onChordClick, tonicOverride, moodOverride, badges = {} }: Props) {
  const [tonic, setTonic] = useState(tonicOverride ?? 5)
  const [activeMoods, setActiveMoods] = useState<string[]>(moodOverride ?? [])

  useEffect(() => { if (tonicOverride != null) setTonic(tonicOverride) }, [tonicOverride])
  useEffect(() => { if (moodOverride?.length) setActiveMoods(moodOverride) }, [moodOverride?.join(',')])
  const [hoveredChord, setHoveredChord] = useState<HarmonicChord | null>(null)
  const [activeCategories, setActiveCategories] = useState<ChordCategory[]>(['diatonic', 'borrowed', 'sus', 'secondary'])

  const allChords = useMemo(() => buildHarmonicField(tonic, ext), [tonic, ext])

  const visibleChords = allChords.filter(c => activeCategories.includes(c.category))

  const grouped = (['diatonic', 'borrowed', 'sus', 'secondary'] as ChordCategory[])
    .filter(cat => activeCategories.includes(cat))
    .map(cat => ({
      cat,
      meta: CATEGORY_META[cat],
      chords: visibleChords.filter(c => c.category === cat),
    }))
    .filter(g => g.chords.length > 0)

  const toggleMood = (id: string) =>
    setActiveMoods(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id])

  const toggleCategory = (cat: ChordCategory) =>
    setActiveCategories(prev =>
      prev.includes(cat)
        ? prev.length > 1 ? prev.filter(c => c !== cat) : prev
        : [...prev, cat]
    )

  const handleChordClick = (chord: HarmonicChord) => {
    onChordClick({
      root: chord.root,
      intervals: chord.intervals,
      reharmonizedIntervals: chord.intervals,
      tok: chord.label,
      ok: true,
      name: chord.name,
    })
  }

  return (
    <div className="space-y-5">

      {/* Controles: tônica + extensão + mood */}
      <div className="card p-5 space-y-4">

        {/* Tônica */}
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest mb-3" style={{ color: 'var(--color-muted)' }}>
            Tonalidade
          </p>
          <div className="flex flex-wrap gap-1.5">
            {TONIC_NOTES.map((note, i) => (
              <button
                key={i}
                onClick={() => setTonic(i)}
                className={`font-mono text-xs px-3 py-2 rounded-xl transition-all ${tonic === i ? 'btn-primary' : 'btn-neumorphic'}`}
                style={tonic !== i ? { color: 'var(--color-ink)' } : {}}
              >
                {note}
              </button>
            ))}
          </div>
        </div>

        {/* Extensão */}
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest mb-3" style={{ color: 'var(--color-muted)' }}>
            Extensão dos acordes
          </p>
          <div className="flex flex-wrap gap-2">
            {EXTENSION_PRESETS.map(ep => (
              <button
                key={ep.id}
                onClick={() => onExtChange(ep.id)}
                className={`flex flex-col gap-0.5 px-4 py-2.5 rounded-xl transition-all text-left ${ext === ep.id ? 'btn-primary' : 'btn-neumorphic'}`}
                style={ext !== ep.id ? { color: 'var(--color-ink)' } : {}}
              >
                <span className="text-xs font-semibold">{ep.label}</span>
                <span className={`font-mono text-[10px] ${ext === ep.id ? 'opacity-70' : ''}`}
                  style={ext !== ep.id ? { color: 'var(--color-muted)' } : {}}>
                  {ep.description}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Mood tags */}
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest mb-3" style={{ color: 'var(--color-muted)' }}>
            Feeling
          </p>
          <div className="flex flex-wrap gap-2">
            {MOODS.map(mood => {
              const active = activeMoods.includes(mood.id)
              return (
                <button
                  key={mood.id}
                  onClick={() => toggleMood(mood.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                    active ? 'btn-primary' : 'btn-neumorphic'
                  }`}
                  style={!active ? { color: 'var(--color-muted)' } : {}}
                >
                  <span>{mood.emoji}</span>
                  {mood.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Filtro de categorias */}
      <div className="flex flex-wrap gap-2">
        {(['diatonic', 'borrowed', 'sus', 'secondary'] as ChordCategory[]).map(cat => {
          const meta = CATEGORY_META[cat]
          const active = activeCategories.includes(cat)
          return (
            <button
              key={cat}
              onClick={() => toggleCategory(cat)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                active ? 'btn-neumorphic' : 'btn-neumorphic opacity-40'
              }`}
              style={{ color: active ? meta.color : 'var(--color-muted)' }}
            >
              <div className="w-2 h-2 rounded-full" style={{ background: meta.color }} />
              {meta.label}
            </button>
          )
        })}
      </div>

      {/* Grupos de acordes */}
      <div className="space-y-4">
        {grouped.map(({ cat, meta, chords }) => (
          <div key={cat}>
            <div className="flex items-baseline gap-2 mb-2">
              <div className="w-2 h-2 rounded-full shrink-0 mt-0.5" style={{ background: meta.color }} />
              <span className="font-mono text-[11px] font-semibold uppercase tracking-widest"
                style={{ color: meta.color }}>
                {meta.label}
              </span>
              <span className="text-xs" style={{ color: 'var(--color-muted)' }}>
                — {meta.description}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {chords.map(chord => (
                <button
                  key={chord.id}
                  onClick={() => handleChordClick(chord)}
                  onMouseEnter={e => { setHoveredChord(chord); (e.currentTarget as HTMLButtonElement).style.borderColor = meta.color; previewChord(chord.root, chord.intervals) }}
                  onMouseLeave={e => { setHoveredChord(null); (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-border)' }}
                  className="btn-neumorphic flex flex-col items-center px-4 py-3 rounded-xl min-w-[72px] transition-all relative"
                  style={{ color: 'var(--color-ink)' }}
                >
                  {badges[chord.name] && (
                    <span className="absolute top-1 right-1" onClick={e => e.stopPropagation()}>
                      <ChordBadge badge={badges[chord.name]} />
                    </span>
                  )}
                  <span className="font-semibold text-sm">{chord.name}</span>
                  <span className="font-mono text-[10px] mt-0.5" style={{ color: meta.color }}>
                    {chord.roman}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Preview do acorde hovereado */}
      {hoveredChord && (
        <div className="card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-semibold text-lg" style={{ color: 'var(--color-ink)' }}>
                {hoveredChord.name}
              </span>
              <span className="font-mono text-xs ml-3" style={{ color: CATEGORY_META[hoveredChord.category].color }}>
                {hoveredChord.roman}
              </span>
            </div>
            <span className="text-sm px-3 py-1 rounded-full"
              style={{
                background: 'var(--color-bg)',
                color: 'var(--color-muted)',
                boxShadow: 'var(--shadow-btn)',
              }}>
              {hoveredChord.feeling}
            </span>
          </div>
          <VoicingKeyboard
            root={hoveredChord.root}
            intervals={hoveredChord.intervals}
            ext={hoveredChord.ext}
          />
          <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
            Clique para adicionar à progressão
          </p>
        </div>
      )}
    </div>
  )
}
