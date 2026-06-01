import { reVoice } from '../core/reharmonizer'
import type { Extension } from '../types'

interface Props {
  root: number
  intervals: number[]
  ext: Extension
}

const WHITES = [0, 2, 4, 5, 7, 9, 11]  // C D E F G A B
const BLACKS = [1, 3, 6, 8, 10]         // C# D# F# G# A#

const BLACK_LEFT: Record<number, string> = { 1: '7%', 3: '20%', 6: '46%', 8: '59%', 10: '72%' }

export function VoicingKeyboard({ intervals, ext }: Props) {
  const voicedIntervals = reVoice(intervals, ext)
  return (
    <div className="relative h-14 rounded-xl overflow-hidden select-none" style={{ background: 'var(--color-bg)', boxShadow: 'var(--shadow-input)' }}>
      {/* Teclas brancas */}
      <div className="flex h-full px-2 gap-px">
        {WHITES.map(note => {
          const isRoot = note === 0
          const isActive = voicedIntervals.some(iv => (iv % 12) === note || (iv % 12) === ((note + 12) % 12))
          return (
            <div
              key={note}
              className="flex-1 rounded-b-md flex items-end justify-center pb-1 transition-colors"
              style={{
                background: isActive
                  ? 'var(--color-primary)'
                  : isRoot
                  ? 'rgba(128,128,128,0.15)'
                  : 'var(--color-card-hi)',
                border: '1px solid var(--color-border)',
              }}
            >
              {isActive && (
                <div className="w-2 h-2 rounded-full" style={{ background: 'var(--color-bg)' }} />
              )}
            </div>
          )
        })}
      </div>

      {/* Teclas pretas */}
      <div className="absolute inset-0 pointer-events-none px-2">
        {BLACKS.map(note => {
          const isActive = voicedIntervals.some(iv => (iv % 12) === note)
          return (
            <div
              key={note}
              className="absolute top-0 rounded-b-sm"
              style={{
                left: `calc(${BLACK_LEFT[note]} + 0.5rem)`,
                width: '8%',
                height: '55%',
                background: isActive ? 'var(--color-primary)' : '#1a1a2e',
                border: '1px solid var(--color-border)',
                zIndex: 2,
              }}
            />
          )
        })}
      </div>
    </div>
  )
}
