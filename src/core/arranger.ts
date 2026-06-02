import type { MidiEvent, ParsedChord, Extension } from '../types'
import { reVoice } from './reharmonizer'
import { snapToScale, nextScaleTone } from './scaleUtils'
import { TPQ } from './groove'

const BAR = 4 * TPQ   // 1920 ticks
const S16 = TPQ / 4   // 120 ticks (1 semicolcheia)
const HALF = BAR / 2  // 960 ticks (semínima × 2)

// Arpejo — 8ª notas ascendentes ciclando pelos tons do acorde (C4)
export function genArpeggioEvents(
  chords: ParsedChord[],
  ext: Extension,
  scale: Set<number>,
): MidiEvent[] {
  const events: MidiEvent[] = []
  const base = 60  // C4 — uma oitava acima do piano

  for (let i = 0; i < chords.length; i++) {
    const barStart = i * BAR
    const chord = chords[i]!
    const notes = reVoice(chord.intervals, ext).map(interval =>
      snapToScale(base + chord.root + interval, scale),
    )

    for (let step = 0; step < 8; step++) {
      const note = notes[step % notes.length]!
      const tick = barStart + step * S16 * 2
      const velocity = step % 2 === 0 ? 75 : 68
      events.push({ tick, duration: S16 * 2 - 20, note, velocity })
    }
  }

  return events
}

// Pad — notas sustentadas por todo o compasso (C3, suave)
export function genPadEvents(
  chords: ParsedChord[],
  ext: Extension,
  scale: Set<number>,
): MidiEvent[] {
  const events: MidiEvent[] = []
  const padBase = 48  // C3 — mesmo registro do piano, mas nota longa

  for (let i = 0; i < chords.length; i++) {
    const barStart = i * BAR
    const chord = chords[i]!
    const notes = reVoice(chord.intervals, ext).map(interval =>
      snapToScale(padBase + chord.root + interval, scale),
    )

    notes.forEach(note => {
      events.push({ tick: barStart, duration: BAR - 20, note, velocity: 52 })
    })
  }

  return events
}

// Lead — melodia do topo: nota do acorde + nota de aproximação para o próximo
export function genLeadEvents(
  chords: ParsedChord[],
  ext: Extension,
  scale: Set<number>,
): MidiEvent[] {
  const events: MidiEvent[] = []
  const leadBase = 72  // C5 — duas oitavas acima do piano
  const n = chords.length

  for (let i = 0; i < n; i++) {
    const barStart = i * BAR
    const chord = chords[i]!
    const notes = reVoice(chord.intervals, ext).map(interval =>
      snapToScale(leadBase + chord.root + interval, scale),
    )
    const topNote = Math.max(...notes)

    // Primeira metade do compasso: nota do topo (sustentada)
    events.push({ tick: barStart, duration: HALF - 10, note: topNote, velocity: 82 })

    // Segunda metade: nota de aproximação em direção ao próximo acorde
    const nextChord = chords[(i + 1) % n]!
    const nextNotes = reVoice(nextChord.intervals, ext).map(interval =>
      snapToScale(leadBase + nextChord.root + interval, scale),
    )
    const nextTop = Math.max(...nextNotes)
    const dir: 1 | -1 = nextTop >= topNote ? 1 : -1
    const approach = nextTop !== topNote ? nextScaleTone(topNote, scale, dir) : topNote

    events.push({ tick: barStart + HALF, duration: HALF - 10, note: approach, velocity: 74 })
  }

  return events
}
