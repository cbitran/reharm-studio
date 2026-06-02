// src/components/PianoRollMini.tsx
import type { MidiEvent } from '../types'

const ROLL_H = 96       // altura total em px
const LABEL_W = 28      // largura da coluna de labels
const BLACK_KEYS = new Set([1, 3, 6, 8, 10])  // semitones que são teclas pretas
const CHROMATIC = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']

function midiToName(n: number): string {
  return CHROMATIC[n % 12]! + (Math.floor(n / 12) - 1)
}

interface Props {
  events: MidiEvent[]
  totalTicks: number
  progress: number   // 0-1
  color: string
}

export function PianoRollMini({ events, totalTicks, progress, color }: Props) {
  if (!events.length) return null

  const notes = events.map(e => e.note)
  const pitchMin = Math.min(...notes) - 1
  const pitchMax = Math.max(...notes) + 1
  const pitchRange = pitchMax - pitchMin + 1
  const rowH = ROLL_H / pitchRange

  const noteY = (note: number) => ((pitchMax - note) / pitchRange) * ROLL_H

  // notas únicas com evento — para mostrar label
  const notesWithEvents = new Set(notes)

  return (
    <div
      style={{
        position: 'relative',
        height: ROLL_H,
        background: 'var(--color-bg)',
        borderRadius: 6,
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {/* Coluna de labels de pitch */}
      <div
        style={{
          position: 'absolute',
          left: 0, top: 0, bottom: 0,
          width: LABEL_W,
          zIndex: 2,
          borderRight: '1px solid var(--color-border)',
        }}
      >
        {Array.from({ length: pitchRange }, (_, i) => {
          const note = pitchMax - i
          const y = noteY(note)
          const isC = note % 12 === 0
          const hasEvent = notesWithEvents.has(note)
          if (!isC && !hasEvent) return null
          return (
            <span
              key={note}
              style={{
                position: 'absolute',
                top: y + 1,
                left: 3,
                fontSize: 7,
                fontFamily: 'monospace',
                lineHeight: '1',
                color: isC ? 'var(--color-muted)' : color,
                opacity: isC ? 0.5 : 0.9,
              }}
            >
              {midiToName(note)}
            </span>
          )
        })}
      </div>

      {/* Área do roll */}
      <div
        style={{
          position: 'absolute',
          left: LABEL_W, right: 0, top: 0, bottom: 0,
        }}
      >
        {/* Rows de background (teclas pretas escurecem) */}
        {Array.from({ length: pitchRange }, (_, i) => {
          const note = pitchMax - i
          const isBlack = BLACK_KEYS.has(note % 12)
          if (!isBlack) return null
          return (
            <div
              key={note}
              style={{
                position: 'absolute',
                top: noteY(note),
                left: 0, right: 0,
                height: rowH,
                background: 'rgba(0,0,0,0.25)',
              }}
            />
          )
        })}

        {/* Grid lines horizontais (separação de oitava) */}
        {Array.from({ length: pitchRange }, (_, i) => {
          const note = pitchMax - i
          if (note % 12 !== 0) return null
          return (
            <div
              key={note}
              style={{
                position: 'absolute',
                top: noteY(note),
                left: 0, right: 0,
                height: 1,
                background: 'var(--color-border)',
                opacity: 0.5,
              }}
            />
          )
        })}

        {/* Blocos de nota */}
        {events.map((e, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${(e.tick / totalTicks) * 100}%`,
              width: `max(${(e.duration / totalTicks) * 100}%, 3px)`,
              top: noteY(e.note) + 1,
              height: Math.max(rowH - 2, 2),
              background: color,
              borderRadius: 2,
              opacity: 0.85,
            }}
          />
        ))}

        {/* Playhead */}
        {progress > 0 && (
          <div
            style={{
              position: 'absolute',
              top: 0, bottom: 0,
              width: 1,
              background: '#fff',
              opacity: 0.7,
              left: `${progress * 100}%`,
              pointerEvents: 'none',
            }}
          />
        )}
      </div>
    </div>
  )
}
