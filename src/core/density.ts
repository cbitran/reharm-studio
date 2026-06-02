import type { MidiEvent } from '../types'

export type SectionType = 'intro' | 'buildup' | 'drop' | 'break' | 'outro' | 'default'
export type TrackName = 'kick' | 'clap' | 'hihat' | 'bass' | 'piano' | 'arpeggio' | 'pad' | 'lead'

type TrackMask = Record<TrackName, boolean>
type DensityTable = Record<SectionType, TrackMask>

const HOUSE: DensityTable = {
  intro:   { kick: false, clap: false, hihat: true,  bass: true,  piano: true,  arpeggio: false, pad: true,  lead: false },
  buildup: { kick: true,  clap: true,  hihat: true,  bass: true,  piano: true,  arpeggio: true,  pad: true,  lead: false },
  drop:    { kick: true,  clap: true,  hihat: true,  bass: true,  piano: true,  arpeggio: true,  pad: true,  lead: true  },
  break:   { kick: false, clap: false, hihat: false, bass: false, piano: true,  arpeggio: false, pad: true,  lead: false },
  outro:   { kick: true,  clap: true,  hihat: true,  bass: true,  piano: true,  arpeggio: false, pad: false, lead: false },
  default: { kick: true,  clap: true,  hihat: true,  bass: true,  piano: true,  arpeggio: true,  pad: true,  lead: true  },
}

const AFRO: DensityTable = {
  intro:   { kick: false, clap: false, hihat: true,  bass: true,  piano: true,  arpeggio: false, pad: true,  lead: false },
  buildup: { kick: true,  clap: true,  hihat: true,  bass: true,  piano: true,  arpeggio: true,  pad: true,  lead: false },
  drop:    { kick: true,  clap: true,  hihat: true,  bass: true,  piano: true,  arpeggio: true,  pad: true,  lead: true  },
  break:   { kick: false, clap: false, hihat: false, bass: false, piano: true,  arpeggio: false, pad: true,  lead: false },
  outro:   { kick: true,  clap: true,  hihat: true,  bass: true,  piano: true,  arpeggio: false, pad: false, lead: false },
  default: { kick: true,  clap: true,  hihat: true,  bass: true,  piano: true,  arpeggio: true,  pad: true,  lead: true  },
}

const TECHNO: DensityTable = {
  intro:   { kick: true,  clap: false, hihat: true,  bass: true,  piano: true,  arpeggio: false, pad: true,  lead: false },
  buildup: { kick: true,  clap: true,  hihat: true,  bass: true,  piano: true,  arpeggio: true,  pad: true,  lead: false },
  drop:    { kick: true,  clap: true,  hihat: true,  bass: true,  piano: true,  arpeggio: true,  pad: false, lead: true  },
  break:   { kick: false, clap: false, hihat: false, bass: false, piano: false, arpeggio: false, pad: true,  lead: false },
  outro:   { kick: true,  clap: false, hihat: true,  bass: true,  piano: true,  arpeggio: false, pad: false, lead: false },
  default: { kick: true,  clap: true,  hihat: true,  bass: true,  piano: true,  arpeggio: true,  pad: false, lead: true  },
}

const LOFI: DensityTable = {
  intro:   { kick: false, clap: false, hihat: true,  bass: true,  piano: true,  arpeggio: false, pad: true,  lead: false },
  buildup: { kick: false, clap: false, hihat: true,  bass: true,  piano: true,  arpeggio: true,  pad: true,  lead: false },
  drop:    { kick: false, clap: true,  hihat: true,  bass: true,  piano: true,  arpeggio: true,  pad: true,  lead: true  },
  break:   { kick: false, clap: false, hihat: false, bass: false, piano: true,  arpeggio: false, pad: true,  lead: false },
  outro:   { kick: false, clap: false, hihat: true,  bass: true,  piano: true,  arpeggio: false, pad: true,  lead: false },
  default: { kick: false, clap: true,  hihat: true,  bass: true,  piano: true,  arpeggio: true,  pad: true,  lead: true  },
}

const POP: DensityTable = {
  intro:   { kick: false, clap: false, hihat: true,  bass: true,  piano: true,  arpeggio: false, pad: true,  lead: false },
  buildup: { kick: true,  clap: true,  hihat: true,  bass: true,  piano: true,  arpeggio: true,  pad: true,  lead: false },
  drop:    { kick: true,  clap: true,  hihat: true,  bass: true,  piano: true,  arpeggio: true,  pad: true,  lead: true  },
  break:   { kick: false, clap: false, hihat: false, bass: false, piano: true,  arpeggio: false, pad: true,  lead: false },
  outro:   { kick: true,  clap: true,  hihat: true,  bass: true,  piano: true,  arpeggio: false, pad: false, lead: false },
  default: { kick: true,  clap: true,  hihat: true,  bass: true,  piano: true,  arpeggio: true,  pad: true,  lead: true  },
}

const JAZZ: DensityTable = {
  intro:   { kick: false, clap: false, hihat: false, bass: true,  piano: true,  arpeggio: false, pad: false, lead: false },
  buildup: { kick: false, clap: false, hihat: false, bass: true,  piano: true,  arpeggio: true,  pad: false, lead: false },
  drop:    { kick: false, clap: false, hihat: false, bass: true,  piano: true,  arpeggio: true,  pad: false, lead: true  },
  break:   { kick: false, clap: false, hihat: false, bass: false, piano: true,  arpeggio: false, pad: false, lead: false },
  outro:   { kick: false, clap: false, hihat: false, bass: true,  piano: true,  arpeggio: false, pad: false, lead: false },
  default: { kick: false, clap: false, hihat: false, bass: true,  piano: true,  arpeggio: true,  pad: false, lead: true  },
}

export const GENRE_DENSITY: Record<string, DensityTable> = {
  'House':        HOUSE,
  'Deep House':   HOUSE,
  'Gospel House': HOUSE,
  'Afro House':   AFRO,
  'Techno':       TECHNO,
  'Lo-fi':        LOFI,
  'Pop':          POP,
  'Jazz':         JAZZ,
}

export function detectSectionType(name: string): SectionType {
  const l = name.toLowerCase()
  if (l.includes('intro')) return 'intro'
  if (l.includes('build') || l.includes('pré') || l.includes('pre')) return 'buildup'
  if (l.includes('drop') || l.includes('chorus') || l.includes('refrão')) return 'drop'
  if (l.includes('break') || l.includes('breakdown') || l.includes('transição')) return 'break'
  if (l.includes('outro') || l.includes('final') || l.includes('saída')) return 'outro'
  return 'default'
}

export function buildSectionRanges(
  markers: Array<{ name: string; fraction: number }>,
  totalTicks: number,
): Array<{ name: string; startTick: number; endTick: number }> {
  return markers.map((m, i) => ({
    name: m.name,
    startTick: Math.round(m.fraction * totalTicks),
    endTick: Math.round((markers[i + 1]?.fraction ?? 1) * totalTicks),
  }))
}

export function buildTrackActiveRanges(
  markers: Array<{ name: string; fraction: number }>,
  totalTicks: number,
  genreName: string,
  track: TrackName,
): Array<{ startTick: number; endTick: number; active: boolean }> {
  const table = GENRE_DENSITY[genreName] ?? GENRE_DENSITY['House']!
  return buildSectionRanges(markers, totalTicks).map(r => ({
    startTick: r.startTick,
    endTick: r.endTick,
    active: table[detectSectionType(r.name)][track],
  }))
}

export function filterBySection(
  events: MidiEvent[],
  activeRanges: Array<{ startTick: number; endTick: number; active: boolean }>,
): MidiEvent[] {
  if (!activeRanges.length) return events
  return events.filter(e =>
    activeRanges.some(r => r.active && e.tick >= r.startTick && e.tick < r.endTick),
  )
}
