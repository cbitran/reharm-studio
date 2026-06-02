# MiniPlayer — Full Arrangement (6 Instruments + Section Density)

**Date:** 2026-06-02  
**Status:** Approved

## Goal

Replace the current 2-track (piano + bass) MiniPlayer preview with a 6-track arrangement that sounds like a finished production. Instruments enter and exit based on section type (intro, buildup, drop, break, outro) and genre. No manual controls — patterns are deterministic. Users who want customization export the MIDI and edit in their DAW.

---

## 1. Data Model — `src/core/density.ts` (new file)

### SectionType
```ts
type SectionType = 'intro' | 'buildup' | 'drop' | 'break' | 'outro' | 'default'
```

### TrackMask
```ts
type TrackMask = {
  kick: boolean
  bass: boolean
  piano: boolean
  arpeggio: boolean
  pad: boolean
  lead: boolean
}
```

### detectSectionType(name: string): SectionType
Case-insensitive partial match against known keywords:
- intro → `intro`
- build / pré / pre → `buildup`
- drop / chorus / refrão → `drop`
- break / breakdown / transição → `break`
- outro / final / saída → `outro`
- anything else → `default`

### GENRE_DENSITY
Per-genre density table. Each genre maps `SectionType → TrackMask`.

**House / Deep House / Gospel House:**
```
intro:   kick✗ bass✓ piano✓ arpeggio✗ pad✓  lead✗
buildup: kick✓ bass✓ piano✓ arpeggio✓ pad✓  lead✗
drop:    kick✓ bass✓ piano✓ arpeggio✓ pad✓  lead✓
break:   kick✗ bass✗ piano✓ arpeggio✗ pad✓  lead✗
outro:   kick✓ bass✓ piano✓ arpeggio✗ pad✗  lead✗
default: kick✓ bass✓ piano✓ arpeggio✓ pad✓  lead✓
```

**Afro House:**
```
intro:   kick✗ bass✓ piano✓ arpeggio✗ pad✓  lead✗
buildup: kick✓ bass✓ piano✓ arpeggio✓ pad✓  lead✗
drop:    kick✓ bass✓ piano✓ arpeggio✓ pad✓  lead✓
break:   kick✗ bass✗ piano✓ arpeggio✗ pad✓  lead✗
outro:   kick✓ bass✓ piano✓ arpeggio✗ pad✗  lead✗
default: kick✓ bass✓ piano✓ arpeggio✓ pad✓  lead✓
```

**Techno:**
```
intro:   kick✓ bass✓ piano✓ arpeggio✗ pad✓  lead✗
buildup: kick✓ bass✓ piano✓ arpeggio✓ pad✓  lead✗
drop:    kick✓ bass✓ piano✓ arpeggio✓ pad✗  lead✓
break:   kick✗ bass✗ piano✗ arpeggio✗ pad✓  lead✗
outro:   kick✓ bass✓ piano✓ arpeggio✗ pad✗  lead✗
default: kick✓ bass✓ piano✓ arpeggio✓ pad✗  lead✓
```

**Lo-fi:**
```
intro:   kick✗ bass✓ piano✓ arpeggio✗ pad✓  lead✗
buildup: kick✗ bass✓ piano✓ arpeggio✓ pad✓  lead✗
drop:    kick✗ bass✓ piano✓ arpeggio✓ pad✓  lead✓
break:   kick✗ bass✗ piano✓ arpeggio✗ pad✓  lead✗
outro:   kick✗ bass✓ piano✓ arpeggio✗ pad✓  lead✗
default: kick✗ bass✓ piano✓ arpeggio✓ pad✓  lead✓
```

**Pop:**
```
intro:   kick✗ bass✓ piano✓ arpeggio✗ pad✓  lead✗
buildup: kick✓ bass✓ piano✓ arpeggio✓ pad✓  lead✗
drop:    kick✓ bass✓ piano✓ arpeggio✓ pad✓  lead✓
break:   kick✗ bass✗ piano✓ arpeggio✗ pad✓  lead✗
outro:   kick✓ bass✓ piano✓ arpeggio✗ pad✗  lead✗
default: kick✓ bass✓ piano✓ arpeggio✓ pad✓  lead✓
```

**Jazz:**
```
intro:   kick✗ bass✓ piano✓ arpeggio✗ pad✗  lead✗
buildup: kick✗ bass✓ piano✓ arpeggio✓ pad✗  lead✗
drop:    kick✗ bass✓ piano✓ arpeggio✓ pad✗  lead✓
break:   kick✗ bass✗ piano✓ arpeggio✗ pad✗  lead✗
outro:   kick✗ bass✓ piano✓ arpeggio✗ pad✗  lead✗
default: kick✗ bass✓ piano✓ arpeggio✓ pad✗  lead✓
```

### Helper functions (also exported)

**`buildSectionRanges(markers, totalTicks)`** — converts fraction-based markers to tick-based ranges:
```ts
Array<{ name: string; startTick: number; endTick: number }>
```

**`buildTrackActiveRanges(markers, totalTicks, genreName, track)`** — returns tick ranges where a given track is active, based on GENRE_DENSITY:
```ts
Array<{ startTick: number; endTick: number; active: boolean }>
```

**`filterBySection(events, activeRanges)`**
```ts
function filterBySection(
  events: MidiEvent[],
  activeRanges: Array<{ startTick: number; endTick: number; active: boolean }>,
): MidiEvent[]
```
Retains only events whose `tick` falls within a range where `active === true`. If a section type maps the track to `false`, all events in that tick range are dropped. Used once per track in `MiniPlayer.tsx`.

---

## 2. Event Generation — New Instruments

### GenreDefinition (extend)
Add `kickSteps: number[]` to the existing type and each genre entry:

```
House / Deep House / Gospel House / Pop: [0, 4, 8, 12]  (four-on-the-floor)
Afro House:  [0, 3, 6, 10]  (syncopated groove)
Techno:      [0, 2, 4, 6, 8, 10, 12, 14]  (every 8th note)
Lo-fi:       []  (no kick)
Jazz:        []  (no kick)
```

### genKickEvents (groove.ts)
```ts
function genKickEvents(chords: ParsedChord[], genre: GenreDefinition): MidiEvent[]
```
Iterates over all bars (one per chord) and emits a kick event at each step in `genre.kickSteps`. Fixed note C1 (MIDI 36), velocity 110, duration `S16 / 2`.

### Arpeggio, Pad, Lead
Already implemented in `arranger.ts`. No changes needed — just used in audio playback (currently only used for MIDI export).

---

## 3. Player — `playMiniArrangement` + 6 Synths

### New function: `playMiniArrangement(options)`
Replaces `playEvents` for MiniPlayer. Uses `Tone.Transport` for atomic multi-track scheduling.

```ts
interface MiniArrangementOptions {
  kickEvents: MidiEvent[]
  pianoEvents: MidiEvent[]
  bassEvents: MidiEvent[]
  arpeggioEvents: MidiEvent[]
  padEvents: MidiEvent[]
  leadEvents: MidiEvent[]
  bpm: number
  tpq: number
  onEnd: () => void
}
```

**Synth specs:**

| Track | Synth | Settings |
|-------|-------|----------|
| Kick | `MembraneSynth` | pitchDecay 0.05, octaves 8, decay 0.3 |
| Bass | `MonoSynth` | sawtooth osc, existing settings |
| Piano | `PolySynth(Synth)` | triangle osc, existing settings |
| Arpeggio | `Synth` | triangle osc, attack 0.005, decay 0.15, sustain 0.1, release 0.3 |
| Pad | `PolySynth(Synth)` | sine osc, attack 0.3, decay 0.2, sustain 0.6, release 1.0 |
| Lead | `MonoSynth` | sawtooth osc, filter cutoff 1200Hz, resonance 4, attack 0.01, decay 0.2 |

Piano → Reverb (wet 0.12) → destination  
Pad → Reverb (wet 0.3) → destination  
All others → destination directly

**Volume levels (dB):** kick -4, bass -10, piano -13, arpeggio -16, pad -18, lead -14

**Scheduling:** all events use `Tone.Transport.schedule(time => synth.triggerAttackRelease(...), tick * secsPerTick)`

**onEnd:** `Transport.schedule(() => onEnd(), lastTick * secsPerTick)`

### New function: `stopMiniArrangement()`
Replaces `stopAll()` in MiniPlayer context:
- `Transport.stop()` + `Transport.cancel()`
- `dispose()` on all 6 synths + reverb nodes
- Sets all refs to null

---

## 4. MiniPlayer Integration

### useMemo additions
```ts
const ke = useMemo(() => genKickEvents(chords, genre), [chords, genre])
const ae = useMemo(() => genArpeggioEvents(chords, ext, scale), [chords, ext, scale])
const pde = useMemo(() => genPadEvents(chords, ext, scale), [chords, ext, scale])
const le = useMemo(() => genLeadEvents(chords, ext, scale), [chords, ext, scale])
```

### Section-aware filtering
```ts
const sectionRanges = useMemo(() =>
  buildSectionRanges(markers, totalTicks),
  [markers, totalTicks]
)

// genreName comes from a new prop: genreName: string (passed from SidebarPage via result.genreName)
const filteredKe  = useMemo(() => filterBySection(ke,  buildTrackActiveRanges(markers, totalTicks, genreName, 'kick')),     [ke,  markers, totalTicks, genreName])
const filteredPe  = useMemo(() => filterBySection(pe,  buildTrackActiveRanges(markers, totalTicks, genreName, 'piano')),    [pe,  markers, totalTicks, genreName])
const filteredBe  = useMemo(() => filterBySection(be,  buildTrackActiveRanges(markers, totalTicks, genreName, 'bass')),     [be,  markers, totalTicks, genreName])
const filteredAe  = useMemo(() => filterBySection(ae,  buildTrackActiveRanges(markers, totalTicks, genreName, 'arpeggio')), [ae,  markers, totalTicks, genreName])
const filteredPde = useMemo(() => filterBySection(pde, buildTrackActiveRanges(markers, totalTicks, genreName, 'pad')),      [pde, markers, totalTicks, genreName])
const filteredLe  = useMemo(() => filterBySection(le,  buildTrackActiveRanges(markers, totalTicks, genreName, 'lead')),     [le,  markers, totalTicks, genreName])
```

### useEffect changes
- Replace `stopAll()` with `stopMiniArrangement()`
- Replace `playEvents(pe, be, ...)` with `playMiniArrangement({ kickEvents: filteredKe, pianoEvents: filteredPe, ... })`
- Progress bar and `totalMs` remain unchanged (wall-clock based)

### No UI changes
The MiniPlayer visual (progress bar, play/stop, note chips) does not change.

---

## Files Changed

| File | Change |
|------|--------|
| `src/core/density.ts` | **New** — SectionType, TrackMask, GENRE_DENSITY, detectSectionType, filterBySection |
| `src/types.ts` | Add `kickSteps` to `GenreDefinition` |
| `src/genres/index.ts` | Add `kickSteps` to each genre |
| `src/core/groove.ts` | Add `genKickEvents` |
| `src/audio/player.ts` | Add `playMiniArrangement`, `stopMiniArrangement` |
| `src/components/MiniPlayer.tsx` | Add `genreName` prop, use new events + new player function |

---

## Out of Scope

- Manual instrument mixing UI (user does this in the DAW after MIDI export)
- Per-section variation of tempo or key
- Real drum samples (all synthesis via Tone.js)
- Piano roll visualization (separate feature)
