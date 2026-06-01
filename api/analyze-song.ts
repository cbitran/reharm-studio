// Vercel Serverless Function — Edge Runtime
// POST /api/analyze-song
// Body: { artist, title, targetStyle?, targetBpm? }

export const config = { runtime: 'edge' }


const LANG_INSTRUCTION: Record<string, string> = {
  en: 'Respond entirely in English.',
  es: 'Responde completamente en español.',
  'pt-BR': 'Responda completamente em português do Brasil.',
}

async function analyzeWithGroq(apiKey: string, artist: string, title: string, targetStyle: string, targetBpm: number, lang: string) {
  const langKey = LANG_INSTRUCTION[lang] ?? LANG_INSTRUCTION[lang.split('-')[0]] ?? LANG_INSTRUCTION['pt-BR']

  const prompt = `You are a music theory and dance music production expert. ${langKey}

Analyze the song "${title}" by ${artist}.

Respond ONLY with valid JSON, no markdown, no extra text:
{
  "key": "F",
  "mode": "maior",
  "bpm_original": 69,
  "progression": "Fmaj7 – Am7 – Bbmaj7 – C7",
  "progression_degrees": "I – iii – IV – V",
  "character": "Soul, R&B anos 80, emocional, quente",
  "borrowed_chords": ["Eb (bVII)", "Fm (i menor)"],
  "remix_guide": {
    "style": "${targetStyle}",
    "bpm": ${targetBpm},
    "structure": [
      { "time": "0:00", "section": "Intro", "description": "Piano sutil + sub bass, sem kick" },
      { "time": "0:32", "section": "Build Up", "description": "Hi-hat cresce, filtro abrindo" },
      { "time": "1:20", "section": "Drop 1", "description": "Kick full, piano stab nos contratempos" },
      { "time": "2:30", "section": "Break", "description": "Remove tudo, só pad atmosférico" },
      { "time": "3:00", "section": "Drop 2", "description": "Adiciona lead, mais denso" },
      { "time": "4:30", "section": "Outro", "description": "Dissolve gradual" }
    ],
    "instruments": [
      { "role": "Piano", "suggestion": "Rhodes com sidechain no kick — stab curto nos offbeats" },
      { "role": "Bass", "suggestion": "Operator sine, sub 60Hz — groove nos contratempos" },
      { "role": "Pad", "suggestion": "Wavetable — longo, aparece no break" },
      { "role": "Lead", "suggestion": "Pluck/stab — entra no drop 2" }
    ],
    "tips": [
      "Dica específica para esse remix",
      "Segunda dica de produção"
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
