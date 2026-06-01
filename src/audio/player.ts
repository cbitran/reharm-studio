import * as Tone from 'tone'
import type { MidiEvent } from '../types'

let synth: Tone.PolySynth | null = null
let bass: Tone.MonoSynth | null = null

async function ensureSynths(): Promise<void> {
  await Tone.start()
  if (synth) return

  const reverb = new Tone.Reverb({ decay: 2, wet: 0.25 }).toDestination()
  synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'fatsawtooth', count: 3, spread: 24 } as Tone.OmniOscillatorOptions,
    envelope: { attack: 0.03, decay: 0.3, sustain: 0.4, release: 0.8 },
  }).connect(reverb)
  synth.volume.value = -13

  bass = new Tone.MonoSynth({
    oscillator: { type: 'sawtooth' },
    filterEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.3, baseFrequency: 120, octaves: 2.5 },
    envelope: { attack: 0.01, decay: 0.2, sustain: 0.4, release: 0.4 },
  }).toDestination()
  bass.volume.value = -10
}

function midiToNote(midi: number): string {
  return Tone.Frequency(midi, 'midi').toNote()
}

export async function playEvents(
  pianoEvents: MidiEvent[],
  bassEvents: MidiEvent[],
  bpm: number,
  tpq: number,
  onEnd: () => void,
): Promise<void> {
  await ensureSynths()
  if (!synth || !bass) return

  const secsPerTick = 60 / bpm / tpq
  const now = Tone.now() + 0.1

  pianoEvents.forEach(({ tick, duration, note, velocity }) => {
    synth!.triggerAttackRelease(
      midiToNote(note),
      Math.max(duration * secsPerTick, 0.05),
      now + tick * secsPerTick,
      velocity / 127,
    )
  })

  bassEvents.forEach(({ tick, duration, note, velocity }) => {
    bass!.triggerAttackRelease(
      midiToNote(note),
      Math.max(duration * secsPerTick, 0.05),
      now + tick * secsPerTick,
      velocity / 127,
    )
  })

  const allEvents = [...pianoEvents, ...bassEvents]
  const lastTick = allEvents.reduce((max, e) => Math.max(max, e.tick + e.duration), 0)
  const totalMs = lastTick * secsPerTick * 1000

  setTimeout(onEnd, totalMs + 300)
}

export async function previewChord(root: number, intervals: number[]): Promise<void> {
  await ensureSynths()
  if (!synth) return
  const baseOctave = 60 // C4
  const notes = intervals.map(i => midiToNote(baseOctave + root + i))
  const now = Tone.now() + 0.05
  synth.triggerAttackRelease(notes, '2n', now, 0.6)
}

export function stopAll(): void {
  synth?.releaseAll()
  Tone.Transport.cancel()
}
