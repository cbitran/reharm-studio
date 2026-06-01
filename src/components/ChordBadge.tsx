import { useState } from 'react'
import type { ChordBadgeData } from '../types'

const BADGE_EMOJI: Record<string, string> = {
  good: '🟢',
  ok:   '🟡',
  bad:  '🔴',
}

export function ChordBadge({ badge }: { badge: ChordBadgeData }) {
  const [open, setOpen] = useState(false)
  const emoji = BADGE_EMOJI[badge.level] ?? '🟡'

  return (
    <div className="relative inline-flex">
      <button
        onClick={e => { e.stopPropagation(); setOpen(v => !v) }}
        className="text-[11px] leading-none select-none"
        title={badge.explanation}
      >
        {emoji}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 rounded-xl px-3 py-2.5 text-xs w-52 leading-relaxed"
            style={{
              background: 'var(--color-card)',
              boxShadow: 'var(--shadow-card)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-ink)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <span className="font-semibold block mb-1">{badge.chord}</span>
            {badge.explanation}
          </div>
        </>
      )}
    </div>
  )
}
