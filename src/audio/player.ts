import * as Tone from 'tone'
import type { MidiEvent, Timbre, TrackId } from '../types'
import { createTimbreSynth } from './timbres'

let synth: Tone.PolySynth | null = null
let bass: Tone.MonoSynth | null = null
let reverbNode: Tone.Reverb | null = null

const SYNTH_DB = -13
const BASS_DB = -10

async function ensureSynths(): Promise<void> {
  await Tone.start()
  if (synth) return

  reverbNode = new Tone.Reverb({ decay: 1.5, wet: 0.12 }).toDestination()
  // triangle: limpo o suficiente para 4-6 notas simultâneas sem embaralhar
  synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'triangle' } as Tone.OmniOscillatorOptions,
    envelope: { attack: 0.01, decay: 0.18, sustain: 0.25, release: 0.5 },
  }).connect(reverbNode)
  synth.volume.value = SYNTH_DB

  bass = new Tone.MonoSynth({
    oscillator: { type: 'sawtooth' },
    filterEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.3, baseFrequency: 120, octaves: 2.5 },
    envelope: { attack: 0.01, decay: 0.2, sustain: 0.4, release: 0.4 },
  }).toDestination()
  bass.volume.value = BASS_DB
}

// Pré-aquece o contexto de áudio após gesto do usuário — elimina delay no primeiro play
export async function warmupAudio(): Promise<void> {
  await ensureSynths()
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

  // Restaura volumes caso stopAll() tenha silenciado
  synth.volume.value = SYNTH_DB
  bass.volume.value = BASS_DB

  const secsPerTick = 60 / bpm / tpq
  const now = Tone.now() + 0.05

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
  // Silencia imediatamente — cancela notas agendadas mesmo com timestamp futuro
  if (synth) { synth.volume.value = -Infinity; synth.releaseAll() }
  if (bass) bass.volume.value = -Infinity
  Tone.Transport.cancel()
}

export interface UnifiedPlayOptions {
  kickEvents: MidiEvent[]
  pianoEvents: MidiEvent[]
  bassEvents: MidiEvent[]
  bpm: number
  tpq: number
  numBars: number
  muted: Set<TrackId>
  solo: TrackId | null
  timbre: Timbre
  loop?: boolean
  onEnd: () => void
}

// Inicializa o AudioContext (deve ser chamado no handler de clique do usuário)
export async function initAudio(): Promise<void> {
  await Tone.start()
}

// Referências dos synths ativos para controle de volume em tempo real
type SynthRef = {
  track: TrackId
  node: { volume: Tone.Param<'decibels'> }
  nominalDb: number
  dispose: () => void
}
const synthRefs: SynthRef[] = []

function trackIsActive(track: TrackId, muted: Set<TrackId>, solo: TrackId | null): boolean {
  return solo ? track === solo : !muted.has(track)
}

export function stopUnified(): void {
  try { Tone.getDestination().mute = true } catch { /* contexto não iniciado */ }
  Tone.Transport.loop = false
  Tone.Transport.stop()
  Tone.Transport.cancel()
  synthRefs.forEach(r => r.dispose())
  synthRefs.length = 0
}

// Atualiza volume de cada trilha sem reiniciar o playback
export function setUnifiedMix(muted: Set<TrackId>, solo: TrackId | null): void {
  synthRefs.forEach(r => {
    r.node.volume.value = trackIsActive(r.track, muted, solo) ? r.nominalDb : -Infinity
  })
}

// Síncrono após initAudio() — usa Tone.Transport para scheduling atômico
export function playUnified({
  kickEvents, pianoEvents, bassEvents,
  bpm, tpq, numBars, muted, solo, timbre, loop = false, onEnd,
}: UnifiedPlayOptions): void {
  stopUnified()
  Tone.getDestination().mute = false

  Tone.Transport.bpm.value = bpm
  const secsPerTick = 60 / bpm / tpq
  // loopEnd exato em compassos — evita drift de timing
  const loopEndSecs = numBars * 4 * tpq * secsPerTick  // = numBars * 4 * 60/bpm

  // Kick — sempre cria synth; volume controla mute
  if (kickEvents.length > 0) {
    const kickSynth = new Tone.MembraneSynth({
      pitchDecay: 0.05, octaves: 8,
      envelope: { attack: 0.001, decay: 0.3, sustain: 0.01, release: 0.1 },
    }).toDestination()
    kickSynth.volume.value = trackIsActive('kick', muted, solo) ? -4 : -Infinity
    synthRefs.push({ track: 'kick', node: kickSynth, nominalDb: -4, dispose: () => kickSynth.dispose() })
    kickEvents.forEach(({ tick, duration }) => {
      Tone.Transport.schedule((time) => {
        kickSynth.triggerAttackRelease('C1', Math.max(duration * secsPerTick, 0.05), time, 0.9)
      }, tick * secsPerTick)
    })
  }

  // Chords — sempre cria synth
  if (pianoEvents.length > 0) {
    const { synth: chordSynth, cleanup } = createTimbreSynth(timbre)
    const nominalDb = chordSynth.volume.value
    if (!trackIsActive('chords', muted, solo)) chordSynth.volume.value = -Infinity
    synthRefs.push({ track: 'chords', node: chordSynth, nominalDb, dispose: cleanup })
    pianoEvents.forEach(({ tick, duration, note, velocity }) => {
      Tone.Transport.schedule((time) => {
        chordSynth.triggerAttackRelease(
          midiToNote(note), Math.max(duration * secsPerTick, 0.05), time, velocity / 127,
        )
      }, tick * secsPerTick)
    })
  }

  // Bass — sempre cria synth
  if (bassEvents.length > 0) {
    const bassSynth = new Tone.MonoSynth({
      oscillator: { type: 'sawtooth' },
      filterEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.3, baseFrequency: 120, octaves: 2.5 },
      envelope: { attack: 0.01, decay: 0.2, sustain: 0.4, release: 0.4 },
    }).toDestination()
    bassSynth.volume.value = trackIsActive('bass', muted, solo) ? -10 : -Infinity
    synthRefs.push({ track: 'bass', node: bassSynth, nominalDb: -10, dispose: () => bassSynth.dispose() })
    bassEvents.forEach(({ tick, duration, note, velocity }) => {
      Tone.Transport.schedule((time) => {
        bassSynth.triggerAttackRelease(
          midiToNote(note), Math.max(duration * secsPerTick, 0.05), time, velocity / 127,
        )
      }, tick * secsPerTick)
    })
  }

  if (loop) {
    Tone.Transport.loop = true
    Tone.Transport.loopStart = 0
    Tone.Transport.loopEnd = loopEndSecs
  } else {
    Tone.Transport.loop = false
    Tone.Transport.schedule(() => onEnd(), loopEndSecs)
  }

  Tone.Transport.start()
}

export function getLoopDuration(): number | null {
  return Tone.Transport.loop ? (Tone.Transport.loopEnd as number) : null
}

export function getTransportSeconds(): number {
  return Tone.Transport.seconds
}
