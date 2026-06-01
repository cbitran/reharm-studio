export interface ParsedChord {
  root: number
  intervals: number[]
  tok: string
  ok: boolean
}

export interface ReharmChord extends ParsedChord {
  name: string
  reharmonizedIntervals: number[]
}

export type Extension = 'tri' | '7' | '9' | '11'

export type ViradasMode = 'off' | 'antecip' | 'full'

export interface MidiEvent {
  tick: number
  duration: number
  note: number
  velocity: number
}

export interface InstrumentPreset {
  label: string
  role: 'harmony' | 'bass' | 'pad'
  pianoBase?: number
  bassBase?: number
  steps: number[]
  duration: number
  sub?: boolean
  tip: string
}

export interface GenreDefinition {
  bpm: number
  ext: Extension
  pianoBase: number
  bassBase: number
  pianoSteps: number[]
  pianoDur: number
  bassSteps: number[]
  bassDur: number
  sub: boolean
  inst: Record<string, string>
}

export interface Section {
  id: string
  name: string
  text: string
  genreName: string
  extOverride: Extension | null
  bpmOverride: number | null
  swing: number
  viradas: ViradasMode
}

export interface ProgressionVariant {
  id: string
  name: string
  description: string
  chords: ReharmChord[]
  character: string
}

export type Timbre = 'pad' | 'pluck' | 'lead' | 'piano'
export type TrackId = 'kick' | 'chords' | 'bass'
