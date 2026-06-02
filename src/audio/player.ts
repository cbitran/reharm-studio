import * as Tone from 'tone'
import type { MidiEvent, Timbre, TrackId } from '../types'
import { createTimbreSynth } from './timbres'

let synth: Tone.PolySynth | null = null
let bass: Tone.MonoSynth | null = null
let reverbNode: Tone.Reverb | null = null
let onEndTimeoutId: ReturnType<typeof setTimeout> | null = null

// Mini arrangement synths (isolated from playEvents and playUnified)
let miniKick: Tone.MembraneSynth | null = null
let miniClap: Tone.NoiseSynth | null = null
let miniHihat: Tone.NoiseSynth | null = null
let miniBass2: Tone.MonoSynth | null = null
let miniPiano: Tone.PolySynth | null = null
let miniArpeggio: Tone.Synth | null = null
let miniPad: Tone.PolySynth | null = null
let miniLead: Tone.MonoSynth | null = null
let miniPianoReverb: Tone.Reverb | null = null
let miniPadReverb: Tone.Reverb | null = null
let miniEndTimeout: ReturnType<typeof setTimeout> | null = null

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

  if (onEndTimeoutId) clearTimeout(onEndTimeoutId)
  onEndTimeoutId = setTimeout(() => {
    onEndTimeoutId = null
    onEnd()
  }, totalMs + 300)
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
  if (onEndTimeoutId) { clearTimeout(onEndTimeoutId); onEndTimeoutId = null }
  // dispose destrói os nós do Web Audio API e cancela todos os eventos agendados
  // volume=-Infinity era insuficiente: playEvents restaurava o volume trazendo eventos zumbi de volta
  if (synth) { synth.dispose(); synth = null }
  if (bass) { bass.dispose(); bass = null }
  if (reverbNode) { reverbNode.dispose(); reverbNode = null }
  Tone.Transport.cancel()
}

export interface MiniArrangementOptions {
  kickEvents: MidiEvent[]
  clapEvents: MidiEvent[]
  hihatEvents: MidiEvent[]
  pianoEvents: MidiEvent[]
  bassEvents: MidiEvent[]
  arpeggioEvents: MidiEvent[]
  padEvents: MidiEvent[]
  leadEvents: MidiEvent[]
  bpm: number
  tpq: number
  onEnd: () => void
}

export function stopMiniArrangement(): void {
  if (miniEndTimeout) { clearTimeout(miniEndTimeout); miniEndTimeout = null }
  if (miniKick) { miniKick.dispose(); miniKick = null }
  if (miniClap) { miniClap.dispose(); miniClap = null }
  if (miniHihat) { miniHihat.dispose(); miniHihat = null }
  if (miniBass2) { miniBass2.dispose(); miniBass2 = null }
  if (miniPiano) { miniPiano.dispose(); miniPiano = null }
  if (miniArpeggio) { miniArpeggio.dispose(); miniArpeggio = null }
  if (miniPad) { miniPad.dispose(); miniPad = null }
  if (miniLead) { miniLead.dispose(); miniLead = null }
  if (miniPianoReverb) { miniPianoReverb.dispose(); miniPianoReverb = null }
  if (miniPadReverb) { miniPadReverb.dispose(); miniPadReverb = null }
}

export async function playMiniArrangement({
  kickEvents, clapEvents, hihatEvents,
  pianoEvents, bassEvents, arpeggioEvents, padEvents, leadEvents,
  bpm, tpq, onEnd,
}: MiniArrangementOptions): Promise<void> {
  stopMiniArrangement()
  await Tone.start()

  const secsPerTick = 60 / bpm / tpq
  const now = Tone.now() + 0.05

  miniKick = new Tone.MembraneSynth({
    pitchDecay: 0.05, octaves: 8,
    envelope: { attack: 0.001, decay: 0.3, sustain: 0.01, release: 0.1 },
  }).toDestination()
  miniKick.volume.value = -4

  // Clap — noise burst curto
  miniClap = new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: { attack: 0.005, decay: 0.08, sustain: 0, release: 0.05 },
  }).toDestination()
  miniClap.volume.value = -14

  // Hi-hat — noise mais curto e seco
  miniHihat = new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: { attack: 0.001, decay: 0.025, sustain: 0, release: 0.01 },
  }).toDestination()
  miniHihat.volume.value = -22

  // Reese bass — dois saws detonados com filtro lowpass
  miniBass2 = new Tone.MonoSynth({
    oscillator: { type: 'fatsawtooth', spread: 20, count: 2 } as Tone.OmniOscillatorOptions,
    filter: { type: 'lowpass', frequency: 350, Q: 3 },
    filterEnvelope: { attack: 0.05, decay: 0.4, sustain: 0.3, baseFrequency: 80, octaves: 2 },
    envelope: { attack: 0.02, decay: 0.2, sustain: 0.5, release: 0.8 },
  }).toDestination()
  miniBass2.volume.value = -8

  miniPianoReverb = new Tone.Reverb({ decay: 1.5, wet: 0.12 }).toDestination()
  miniPiano = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'triangle' } as Tone.OmniOscillatorOptions,
    envelope: { attack: 0.01, decay: 0.18, sustain: 0.25, release: 0.5 },
  }).connect(miniPianoReverb)
  miniPiano.volume.value = -13

  miniArpeggio = new Tone.Synth({
    oscillator: { type: 'triangle' } as Tone.OmniOscillatorOptions,
    envelope: { attack: 0.005, decay: 0.15, sustain: 0.1, release: 0.3 },
  }).toDestination()
  miniArpeggio.volume.value = -16

  miniPadReverb = new Tone.Reverb({ decay: 2.0, wet: 0.3 }).toDestination()
  miniPad = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'sine' } as Tone.OmniOscillatorOptions,
    envelope: { attack: 0.3, decay: 0.2, sustain: 0.6, release: 1.0 },
  }).connect(miniPadReverb)
  miniPad.volume.value = -18

  miniLead = new Tone.MonoSynth({
    oscillator: { type: 'sawtooth' },
    filter: { frequency: 1200, Q: 4 },
    envelope: { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.4 },
  }).toDestination()
  miniLead.volume.value = -14

  kickEvents.forEach(({ tick, duration }) => {
    miniKick!.triggerAttackRelease('C1', Math.max(duration * secsPerTick, 0.05), now + tick * secsPerTick, 0.9)
  })
  clapEvents.forEach(({ tick, duration, velocity }) => {
    miniClap!.triggerAttackRelease(Math.max(duration * secsPerTick, 0.05), now + tick * secsPerTick, velocity / 127)
  })
  hihatEvents.forEach(({ tick, duration, velocity }) => {
    miniHihat!.triggerAttackRelease(Math.max(duration * secsPerTick, 0.02), now + tick * secsPerTick, velocity / 127)
  })
  pianoEvents.forEach(({ tick, duration, note, velocity }) => {
    miniPiano!.triggerAttackRelease(midiToNote(note), Math.max(duration * secsPerTick, 0.05), now + tick * secsPerTick, velocity / 127)
  })
  bassEvents.forEach(({ tick, duration, note, velocity }) => {
    miniBass2!.triggerAttackRelease(midiToNote(note), Math.max(duration * secsPerTick, 0.05), now + tick * secsPerTick, velocity / 127)
  })
  arpeggioEvents.forEach(({ tick, duration, note, velocity }) => {
    miniArpeggio!.triggerAttackRelease(midiToNote(note), Math.max(duration * secsPerTick, 0.05), now + tick * secsPerTick, velocity / 127)
  })
  padEvents.forEach(({ tick, duration, note, velocity }) => {
    miniPad!.triggerAttackRelease(midiToNote(note), Math.max(duration * secsPerTick, 0.05), now + tick * secsPerTick, velocity / 127)
  })
  leadEvents.forEach(({ tick, duration, note, velocity }) => {
    miniLead!.triggerAttackRelease(midiToNote(note), Math.max(duration * secsPerTick, 0.05), now + tick * secsPerTick, velocity / 127)
  })

  const allEvents = [
    ...kickEvents, ...clapEvents, ...hihatEvents,
    ...pianoEvents, ...bassEvents, ...arpeggioEvents, ...padEvents, ...leadEvents,
  ]
  const lastTick = allEvents.reduce((max, e) => Math.max(max, e.tick + e.duration), 0)
  const totalMs = lastTick * secsPerTick * 1000

  miniEndTimeout = setTimeout(() => {
    miniEndTimeout = null
    onEnd()
  }, totalMs + 300)
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
