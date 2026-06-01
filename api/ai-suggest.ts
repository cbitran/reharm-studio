// POST /api/ai-suggest
// Body: { session: AISession, intention?: string, lang?: string }
// Returns: { chords: string[], explanation: string }

export const config = { runtime: 'edge' }

const LANG_INSTRUCTION: Record<string, string> = {
  en: 'All text values must be in English.',
  es: 'Todos los valores de texto deben estar en español.',
  'pt-BR': 'Todos os valores de texto devem estar em português do Brasil.',
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
    const body = await req.json() as {
      session: {
        song: { artist: string; title: string } | null
        style: string
        bpm: number
        feeling: string[]
        chords: string[]
        tonicNum: number | null
      }
      intention?: string
      lang?: string
    }

    const { session, intention, lang = 'pt-BR' } = body
    const langInstruction = LANG_INSTRUCTION[lang] ?? LANG_INSTRUCTION['pt-BR']
    const groqKey = process.env.GROQ_API_KEY
    if (!groqKey) throw new Error('GROQ_API_KEY não configurada')

    const songContext = session.song
      ? `The reference song is "${session.song.title}" by ${session.song.artist}.`
      : 'No reference song provided.'

    const chordsContext = session.chords.length > 0
      ? `The user already has these chords: ${session.chords.join(' – ')}.`
      : 'The user has no chords yet.'

    const intentionContext = intention
      ? `The user's intention: "${intention}".`
      : ''

    const prompt = `You are an expert music producer and harmony coach specializing in electronic dance music.

${songContext}
Target style: ${session.style}
Target BPM: ${session.bpm}
Desired feeling: ${session.feeling.join(', ') || 'not specified'}
${chordsContext}
${intentionContext}

Task: suggest exactly 4 chord names that form a progression fitting the context above.

Rules:
- Each chord must be a valid chord symbol (e.g. Fmaj9, Am11, Bbmaj9, C9sus4, Dm7, G13)
- Use rich voicings with extensions (7th, 9th, 11th, 13th) appropriate for the style
- The "chords" field MUST be a JSON array of exactly 4 strings
- The "explanation" field must be 1-2 sentences in the target language

${langInstruction}

You MUST respond with ONLY this exact JSON structure — no markdown, no extra keys, no wrapping:
{"chords":["chord1","chord2","chord3","chord4"],"explanation":"your explanation here"}`

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
        response_format: { type: 'json_object' },
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Groq error: ${res.status} — ${err}`)
    }

    const data = await res.json() as { choices: { message: { content: string } }[] }
    const content = data.choices?.[0]?.message?.content ?? '{}'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsed = JSON.parse(content) as Record<string, any>

    // Parsing robusto: aceita variações de chave que o modelo às vezes retorna
    const rawChords =
      parsed.chords ??
      parsed.chord_progression ??
      parsed.progression?.chords ??
      parsed.progression ??
      []

    // Normaliza: se vier string separada por espaço/traço, divide em array
    let chords: string[]
    if (Array.isArray(rawChords)) {
      chords = rawChords.map(String).filter(Boolean)
    } else if (typeof rawChords === 'string') {
      chords = rawChords.split(/[\s–—-]+/).map(s => s.trim()).filter(Boolean)
    } else {
      chords = []
    }

    const explanation: string =
      parsed.explanation ??
      parsed.description ??
      parsed.reasoning ??
      ''

    return new Response(
      JSON.stringify({ chords, explanation }),
      { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } },
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Erro ao gerar sugestão', detail: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } },
    )
  }
}
