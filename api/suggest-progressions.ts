// POST /api/suggest-progressions
// Body: { artist, title, style, bpm, feeling, mainChords? }
// Returns: { progressions: SuggestedProgression[] }

export const config = { runtime: 'edge' }

function validateGroove(raw: unknown) {
  if (!raw || typeof raw !== 'object') return undefined
  const g = raw as Record<string, unknown>

  const pianoSteps = Array.isArray(g.pianoSteps)
    ? (g.pianoSteps as number[]).filter(s => Number.isInteger(s) && s >= 0 && s <= 15)
    : null
  const bassSteps = Array.isArray(g.bassSteps)
    ? (g.bassSteps as number[]).filter(s => Number.isInteger(s) && s >= 0 && s <= 15)
    : null

  if (!pianoSteps?.length || !bassSteps?.length) return undefined

  const validViradas = ['off', 'antecip', 'full']

  return {
    pianoSteps,
    pianoDur: typeof g.pianoDur === 'number' ? Math.max(50, Math.min(1000, g.pianoDur)) : 150,
    bassSteps,
    bassDur: typeof g.bassDur === 'number' ? Math.max(50, Math.min(1000, g.bassDur)) : 200,
    swing: typeof g.swing === 'number' ? Math.max(50, Math.min(75, g.swing)) : 56,
    viradas: validViradas.includes(g.viradas as string) ? g.viradas : 'antecip',
  }
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const { artist, title, style, bpm, ext, feeling, mainChords } = await req.json() as {
    artist: string
    title: string
    style: string
    bpm: number
    ext?: string
    feeling: string
    mainChords?: string
  }

  const extInstructions: Record<string, string> = {
    tri:  'Use only triads — no extensions, no 7ths. Simple and clean.',
    '7':  'Use 7th chords (maj7, m7, dom7). Avoid 9ths and higher.',
    '9':  'Use 9th chords (maj9, m9, 9, dom9). This is the default for rich house/soul sound.',
    '11': 'Use 11th and higher extensions (maj9#11, m11, 13, sus4/9 etc.). Maximum richness.',
  }
  const extCtx = ext && extInstructions[ext]
    ? `CHORD EXTENSION: ${extInstructions[ext]}`
    : 'CHORD EXTENSION: Use rich 7th/9th voicings appropriate for the style.'

  const mainChordsCtx = mainChords
    ? `The main progression already in use is: ${mainChords}. Your suggestions MUST be harmonically different — different chords, different emotional direction.`
    : ''

  const prompt = `You are a music producer and harmony expert specializing in remixes and dance music.

THE ORIGINAL SONG: "${title}" by ${artist}
REMIX STYLE: ${style}
TARGET BPM: ${bpm} BPM
FEELING: ${feeling}
${extCtx}
${mainChordsCtx}

STEP 1 — Identify the harmonic DNA of "${title}" by ${artist}:
- What key and mode (major/minor/modal) is this song in?
- What are its characteristic chord colors and emotional fingerprint?
- What makes this song harmonically distinct?

STEP 2 — Generate 5 remix progressions that:
- Are ROOTED IN THE SAME KEY as the original song (or its parallel/relative key if the feeling demands)
- Sound like authentic remixes of THIS specific song — not generic ${style} music
- Each progression has 4 chords using the EXACT extension level specified above
- Have MUSICAL VARIETY across the 5 suggestions: explore darker, brighter, more tense, more open directions
- Feel authentically connected to the mood of "${title}" while transformed into ${style} at ${bpm} BPM with feeling: ${feeling}

STEP 3 — For each progression, suggest the groove that fits its specific mood and style:
- "pianoSteps": 3-6 rhythmic positions (integers 0-15, where 0=beat1, 4=beat2, 8=beat3, 12=beat4, 2=and-of-1, 6=and-of-2...)
- "pianoDur": note duration in ticks (100=staccato, 300=medium, 700=legato) at 480 ticks per beat
- "bassSteps": bass positions (sparser than piano)
- "bassDur": bass note duration in ticks
- "swing": 50 (straight) to 72 (heavy swing)
- "viradas": "off" (straight), "antecip" (anticipations), or "full" (full fills)

Groove references by style:
- House: pianoSteps:[2,6,10,14] pianoDur:150 bassSteps:[0,8] bassDur:200 swing:56 viradas:"antecip"
- Deep House: pianoSteps:[2,6,10,14] pianoDur:140 bassSteps:[0,8,14] bassDur:180 swing:55 viradas:"antecip"
- Jazz: pianoSteps:[0,3,6,9,12] pianoDur:220 bassSteps:[0,2,4,6,8,10,12,14] bassDur:180 swing:66 viradas:"full"
- Lo-fi: pianoSteps:[0,8] pianoDur:700 bassSteps:[0,8] bassDur:600 swing:62 viradas:"off"
- Gospel House: pianoSteps:[0,2,6,8,10,14] pianoDur:130 bassSteps:[0,4,8,12,14] bassDur:140 swing:54 viradas:"full"

Respond ONLY with valid JSON array, no markdown, no explanation:
[
  {
    "name": "creative name in Portuguese",
    "mood": "adjective · adjective",
    "chords": ["Xm9", "Ymaj7", "Zsus4", "Wm7"],
    "groove": {
      "pianoSteps": [2,6,10,14],
      "pianoDur": 150,
      "bassSteps": [0,8],
      "bassDur": 200,
      "swing": 56,
      "viradas": "antecip"
    }
  },
  ...5 items total
]`

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.75,
        max_tokens: 1000,
      }),
    })

    const data = await groqRes.json() as { choices: { message: { content: string } }[] }
    const raw = data.choices[0]?.message?.content ?? '[]'
    const match = raw.match(/\[[\s\S]*\]/)
    const items: unknown[] = match ? JSON.parse(match[0]) : []

    const progressions = items.map((item) => {
      const p = item as Record<string, unknown>
      return {
        name: String(p.name ?? ''),
        mood: String(p.mood ?? ''),
        chords: Array.isArray(p.chords) ? (p.chords as string[]) : [],
        groove: validateGroove(p.groove),
      }
    }).filter(p => p.chords.length > 0)

    return new Response(JSON.stringify({ progressions }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('suggest-progressions error:', err)
    return new Response(JSON.stringify({ progressions: [] }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
