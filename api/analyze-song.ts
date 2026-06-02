// Vercel Serverless Function — Edge Runtime
// POST /api/analyze-song
// Body: { artist, title, targetStyle?, targetBpm? }

export const config = { runtime: 'edge' }


const LANG_INSTRUCTION: Record<string, string> = {
  en: 'All text values must be in English.',
  es: 'Todos los valores de texto deben estar en español.',
  'pt-BR': 'Todos os valores de texto devem estar em português do Brasil.',
}

async function analyzeWithGroq(apiKey: string, artist: string, title: string, targetStyle: string, targetBpm: number, lang: string) {
  const langInstruction = LANG_INSTRUCTION[lang] ?? LANG_INSTRUCTION[lang.split('-')[0]] ?? LANG_INSTRUCTION['pt-BR']

  const prompt = `You are a music theory and dance music production expert.

Analyze the song "${title}" by ${artist}.

IMPORTANT: Keep ALL JSON keys exactly as shown below (in English). Only translate the string values. ${langInstruction}

For the "sections" field:
- List ALL sections of the song in order as they appear (Intro, Verso, Pré-Refrão, Refrão, Ponte, Outro, etc.)
- "progression" = the unique chord sequence for that section (2–8 chords, use the same notation as the main "progression" field)
- "repeats" = how many times that section loops before the next one begins (integer, 1–8)
- If a section uses the same chords as another, still include it with the correct repeats
- If unsure about a section's chords, use the closest approximation or the main progression

Respond ONLY with valid JSON, no markdown, no extra text:
{
  "key": "F",
  "mode": "major",
  "bpm_original": 69,
  "progression": "Fmaj7 Am7 Bbmaj7 C7",
  "progression_degrees": "I – iii – IV – V",
  "character": "Soul, 80s R&B, emotional, warm",
  "borrowed_chords": ["Eb (bVII)", "Fm (i minor)"],
  "sections": [
    { "name": "Intro",      "progression": "Fmaj7 Am7",               "repeats": 2 },
    { "name": "Verso",      "progression": "Fmaj7 Am7 Bbmaj7 C7",     "repeats": 4 },
    { "name": "Pré-Refrão", "progression": "Dm7 G7",                  "repeats": 2 },
    { "name": "Refrão",     "progression": "Bbmaj7 C7 Am7 Fmaj7",     "repeats": 4 },
    { "name": "Verso",      "progression": "Fmaj7 Am7 Bbmaj7 C7",     "repeats": 2 },
    { "name": "Refrão",     "progression": "Bbmaj7 C7 Am7 Fmaj7",     "repeats": 4 },
    { "name": "Outro",      "progression": "Fmaj7 Am7",               "repeats": 4 }
  ],
  "remix_guide": {
    "style": "${targetStyle}",
    "bpm": ${targetBpm},
    "structure": [
      { "time": "0:00", "section": "Intro", "description": "Subtle piano + sub bass, no kick" },
      { "time": "0:32", "section": "Build Up", "description": "Hi-hat grows, filter opening" },
      { "time": "1:20", "section": "Drop 1", "description": "Full kick, piano stab on off-beats" },
      { "time": "2:30", "section": "Break", "description": "Strip everything, only atmospheric pad" },
      { "time": "3:00", "section": "Drop 2", "description": "Add lead, denser" },
      { "time": "4:30", "section": "Outro", "description": "Gradual dissolve" }
    ],
    "instruments": [
      { "role": "Piano", "suggestion": "Rhodes with sidechain on kick — short stab on off-beats" },
      { "role": "Bass", "suggestion": "Sine sub, 60Hz — groove on off-beats" },
      { "role": "Pad", "suggestion": "Long wavetable pad — enters on break" },
      { "role": "Lead", "suggestion": "Pluck/stab — enters on drop 2" }
    ],
    "tips": [
      "Specific tip for this remix",
      "Second production tip"
    ]
  }
}`

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Groq error: ${res.status} — ${err}`)
  }

  const data = await res.json() as { choices: { message: { content: string } }[] }
  const text = data.choices?.[0]?.message?.content ?? '{}'
  return JSON.parse(text)
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
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  try {
    const body = await req.json() as { artist?: string; title?: string; targetStyle?: string; targetBpm?: number; lang?: string }
    const { artist, title, targetStyle = 'House', targetBpm = 124, lang = 'pt-BR' } = body

    if (!artist || !title) {
      return new Response(JSON.stringify({ error: 'artist e title são obrigatórios' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    const groqKey = process.env.GROQ_API_KEY
    if (!groqKey) throw new Error('GROQ_API_KEY não configurada')

    const analysis = await analyzeWithGroq(groqKey, artist, title, targetStyle, targetBpm, lang)

    return new Response(
      JSON.stringify({ ...analysis }),
      { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } },
    )
  } catch (err) {
    console.error('analyze-song error:', err)
    return new Response(
      JSON.stringify({ error: 'Erro ao analisar música', detail: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } },
    )
  }
}
