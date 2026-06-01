import { NOTE_NAMES } from '../core/parser'
import { reVoice, nameChord } from '../core/reharmonizer'
import type { Extension } from '../types'

export type ChordCategory = 'diatonic' | 'borrowed' | 'sus' | 'secondary'

export interface HarmonicChord {
  id: string
  root: number
  rootName: string
  name: string
  intervals: number[]
  category: ChordCategory
  roman: string
  label: string       // nome curto para o chip
  feeling: string     // linguagem de produtor
  ext: Extension
}

export interface MoodTag {
  id: string
  label: string
  emoji: string
  styles: string[]    // gêneros compatíveis
}

const QUALITY_INTERVALS: Record<string, number[]> = {
  maj:   [0, 4, 7],
  m:     [0, 3, 7],
  dim:   [0, 3, 6],
  sus2:  [0, 2, 7],
  sus4:  [0, 5, 7],
  dom7:  [0, 4, 7, 10],
}

export const MOODS: MoodTag[] = [
  { id: 'groovy',      label: 'Groovy',      emoji: '🎵', styles: ['House', 'Deep House', 'Afro House'] },
  { id: 'soulful',     label: 'Soulful',     emoji: '✨', styles: ['Gospel House', 'House'] },
  { id: 'dark',        label: 'Dark',        emoji: '🌑', styles: ['Techno', 'Deep House'] },
  { id: 'tribal',      label: 'Tribal',      emoji: '🥁', styles: ['Afro House'] },
  { id: 'jazzy',       label: 'Jazzy',       emoji: '🎷', styles: ['Deep House', 'Jazz'] },
  { id: 'suspended',   label: 'Suspenso',    emoji: '🌊', styles: ['Deep House', 'Lo-fi'] },
  { id: 'uplifting',   label: 'Uplifting',   emoji: '☀️', styles: ['House', 'Gospel House'] },
]

export const EXTENSION_PRESETS: { id: Extension; label: string; description: string }[] = [
  { id: 'tri',  label: 'Tríade',        description: 'Base — limpo e direto' },
  { id: '7',    label: '7ª',            description: 'Soulful — cor básica do House' },
  { id: '9',    label: '9ª',            description: 'Deep — a extensão do Deep House' },
  { id: '11',   label: '11ª',           description: 'Jazzy — aberto e sofisticado' },
]

export function buildHarmonicField(tonic: number, ext: Extension): HarmonicChord[] {
  const chords: HarmonicChord[] = []

  // ── Diatônicos de C maior (transportados) ────────────────────
  const DIATONIC: { deg: number; quality: string; roman: string; feeling: string }[] = [
    { deg: 0,  quality: 'maj', roman: 'I',    feeling: 'casa' },
    { deg: 2,  quality: 'm',   roman: 'ii',   feeling: 'tensão suave' },
    { deg: 4,  quality: 'm',   roman: 'iii',  feeling: 'soul' },
    { deg: 5,  quality: 'maj', roman: 'IV',   feeling: 'movimento' },
    { deg: 7,  quality: 'maj', roman: 'V',    feeling: 'tensão forte' },
    { deg: 9,  quality: 'm',   roman: 'vi',   feeling: 'melancólico' },
    { deg: 11, quality: 'dim', roman: 'vii°', feeling: 'passagem' },
  ]

  DIATONIC.forEach(({ deg, quality, roman, feeling }) => {
    const root = (tonic + deg) % 12
    const base = QUALITY_INTERVALS[quality]!
    const iv = reVoice(base, ext)
    chords.push({
      id: `diatonic-${deg}`,
      root, rootName: NOTE_NAMES[root]!,
      name: nameChord(root, iv),
      intervals: base,
      category: 'diatonic',
      roman, label: NOTE_NAMES[root]!,
      feeling, ext,
    })
  })

  // ── Emprestados — o sabor do House ───────────────────────────
  const BORROWED: { deg: number; quality: string; roman: string; feeling: string }[] = [
    { deg: 10, quality: 'maj', roman: 'bVII', feeling: 'virada clássica' },
    { deg: 3,  quality: 'maj', roman: 'bIII', feeling: 'dark, dramático' },
    { deg: 8,  quality: 'maj', roman: 'bVI',  feeling: 'afro / gospel' },
    { deg: 0,  quality: 'm',   roman: 'i',    feeling: 'minor paralelo' },
    { deg: 5,  quality: 'm',   roman: 'iv',   feeling: 'tensão gospel' },
  ]

  BORROWED.forEach(({ deg, quality, roman, feeling }) => {
    const root = (tonic + deg) % 12
    const base = QUALITY_INTERVALS[quality]!
    const iv = reVoice(base, ext === 'tri' ? 'tri' : '7')
    const existsAlready = chords.find(c => c.root === root && c.category === 'diatonic')
    if (existsAlready) return
    chords.push({
      id: `borrowed-${deg}-${quality}`,
      root, rootName: NOTE_NAMES[root]!,
      name: nameChord(root, iv),
      intervals: base,
      category: 'borrowed',
      roman, label: NOTE_NAMES[root]!,
      feeling, ext: ext === 'tri' ? 'tri' : '7',
    })
  })

  // ── Sus — tensão sem resolução (Deep House) ──────────────────
  const SUS: { deg: number; quality: string; roman: string; feeling: string }[] = [
    { deg: 7,  quality: 'sus4', roman: 'Vsus4', feeling: 'suspenso' },
    { deg: 0,  quality: 'sus2', roman: 'Isus2',  feeling: 'aberto' },
    { deg: 5,  quality: 'sus4', roman: 'IVsus4', feeling: 'flutuante' },
  ]

  SUS.forEach(({ deg, quality, roman, feeling }) => {
    const root = (tonic + deg) % 12
    const base = QUALITY_INTERVALS[quality]!
    chords.push({
      id: `sus-${deg}-${quality}`,
      root, rootName: NOTE_NAMES[root]!,
      name: nameChord(root, base),
      intervals: base,
      category: 'sus',
      roman, label: `${NOTE_NAMES[root]!}sus`,
      feeling, ext: 'tri',
    })
  })

  // ── Dominantes secundários — tensão direcionada ──────────────
  const SEC_DOM: { from: number; to: number; roman: string; feeling: string }[] = [
    { from: 7,  to: 0,  roman: 'V7/I',   feeling: '→ I (House clássico)' },
    { from: 2,  to: 9,  roman: 'V7/vi',  feeling: '→ vi (gospel)' },
    { from: 9,  to: 2,  roman: 'V7/ii',  feeling: '→ ii (jazz-house)' },
  ]

  SEC_DOM.forEach(({ from, roman, feeling }) => {
    const root = (tonic + from + 7) % 12
    const base = QUALITY_INTERVALS['dom7']!
    const name = `${NOTE_NAMES[root]!}7`
    chords.push({
      id: `secondary-${from}`,
      root, rootName: NOTE_NAMES[root]!,
      name,
      intervals: base,
      category: 'secondary',
      roman, label: name,
      feeling, ext: '7',
    })
  })

  return chords
}

export const CATEGORY_META: Record<ChordCategory, { label: string; description: string; color: string }> = {
  diatonic:  { label: 'Diatônicos',           description: 'Sempre seguros — pertencem à escala',     color: '#7ad1a8' },
  borrowed:  { label: 'Emprestados',          description: 'O sabor do House — fora da escala mas funcionam', color: '#8ab4f0' },
  sus:       { label: 'Suspensos',            description: 'Tensão sem resolução — característico do Deep',   color: '#c084fc' },
  secondary: { label: 'Dominantes',           description: 'Tensão direcionada — cria movimento forte',       color: '#e8c87a' },
}
