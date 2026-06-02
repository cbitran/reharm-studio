// POST /api/suggest-progressions
// Body: { song, style, bpm, feeling }
// Returns: { progressions: SuggestedProgression[] }

export const config = { runtime: 'edge' }

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

  const { song, style, bpm, feeling } = await req.json() as {
    song: string
    style: string
    bpm: number
    feeling: string
  }

  const prompt = `Você é um produtor musical especialista em música eletrônica.
O usuário quer remixar "${song}" no estilo ${style}, ${bpm} BPM, feeling: ${feeling}.

Gere EXATAMENTE 5 progressões de acordes diferentes para este contexto.
Cada progressão deve ter 4 acordes. Use extensões ricas (maj9, m9, 7sus4, m7, maj7, etc).
Pense como um pianista de ${style} — variedade de texturas e emoções.

Responda APENAS com JSON válido, sem markdown, sem explicação:
[
  {"name": "nome criativo em português", "mood": "adjetivo · adjetivo", "chords": ["Xm9", "Ymaj7", "Zsus4", "Wm7"]},
  ...5 itens total
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
        temperature: 0.85,
        max_tokens: 600,
      }),
    })

    const data = await groqRes.json() as { choices: { message: { content: string } }[] }
    const raw = data.choices[0]?.message?.content ?? '[]'
    const match = raw.match(/\[[\s\S]*\]/)
    const progressions = match ? JSON.parse(match[0]) : []

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
