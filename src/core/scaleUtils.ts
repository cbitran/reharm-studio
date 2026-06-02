const KEY_TO_NUM: Record<string, number> = {
  'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
  'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8,
  'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11,
}

const MODE_INTERVALS: Record<string, number[]> = {
  major:      [0, 2, 4, 5, 7, 9, 11],
  minor:      [0, 2, 3, 5, 7, 8, 10],
  dorian:     [0, 2, 3, 5, 7, 9, 10],
  phrygian:   [0, 1, 3, 5, 7, 8, 10],
  lydian:     [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  locrian:    [0, 1, 3, 5, 6, 8, 10],
}

// Constrói o conjunto de 12 pitch-classes da escala (0-11)
export function buildScale(key: string, mode: string): Set<number> {
  const rootName = key.trim().replace(/\s.*/, '')  // "F major" → "F"
  const root = KEY_TO_NUM[rootName] ?? 0
  const intervals = MODE_INTERVALS[mode.toLowerCase()] ?? MODE_INTERVALS.major!
  return new Set(intervals.map(i => (root + i) % 12))
}

// Desloca o MIDI note para o tom mais próximo dentro da escala
export function snapToScale(midiNote: number, scale: Set<number>): number {
  const pc = ((midiNote % 12) + 12) % 12
  if (scale.has(pc)) return midiNote
  for (let d = 1; d <= 6; d++) {
    if (scale.has((pc + d) % 12)) return midiNote + d
    if (scale.has((pc - d + 12) % 12)) return midiNote - d
  }
  return midiNote
}

// Próxima nota da escala acima (+1) ou abaixo (-1) a partir de um MIDI note
export function nextScaleTone(midiNote: number, scale: Set<number>, dir: 1 | -1): number {
  for (let d = 1; d <= 12; d++) {
    const n = midiNote + dir * d
    if (scale.has(((n % 12) + 12) % 12)) return n
  }
  return midiNote
}
