// Vercel Serverless Function — Edge Runtime
// POST /api/analyze-song
// Body: { artist, title, targetStyle?, targetBpm? }

export const config = { runtime: 'edge' }

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

async function getSpotifyToken(clientId: string, clientSecret: string): Promise<string> {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
    },
    body: 'grant_type=client_credentials',
  })
  const data = await res.json() as { access_token: string }
  return data.access_token
}

async function getSpotifyData(token: string, artist: string, title: string) {
  const q = encodeURIComponent(`track:${title} artist:${artist}`)
  const search = await fetch(`https://api.spotify.com/v1/search?q=${q}&type=track&limit=1`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const sData = await search.json() as { tracks: { items: { id: string }[] } }
  const track = sData.tracks?.items?.[0]
  if (!track) return null

  const featRes = await fetch(`https://api.spotify.com/v1/audio-features/${track.id}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!featRes.ok) return null
  const feat = await featRes.json() as { key: number; mode: number; tempo: number; energy: number; danceability: number }
  return {
    key: NOTE_NAMES[feat.key] ?? 'C',
    mode: feat.mode === 1 ? 'maior' : 'menor',
    bpm: Math.round(feat.tempo),
    energy: feat.energy,
    danceability: feat.danceability,
  }
}

async function analyzeWithGemini(apiKey: string, artist: string, title: string, spotify: { key: string; mode: string; bpm: number } | null, targetStyle: string, targetBpm: number) {
  const spotifyCtx = spotify ? `Dados confirmados pelo Spotify: tonalidade ${spotify.key} ${spotify.mode}, BPM ${spotify.bpm}.` : ''

  const prompt = `Você é especialista em teoria musical e produção de dance music.

Analise a música "${title}" de ${artist}. ${spotifyCtx}

Responda SOMENTE com JSON válido, sem markdown, sem texto extra:
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

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3 },
      }),
    },
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini error: ${res.status} — ${err}`)
  }

  const data = await res.json() as { candidates: { content: { parts: { text: string }[] } }[] }
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
  // Remove possível markdown wrapper
  const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(clean)
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
    const body = await req.json() as { artist?: string; title?: string; targetStyle?: string; targetBpm?: number }
    const { artist, title, targetStyle = 'House', targetBpm = 124 } = body

    if (!artist || !title) {
      return new Response(JSON.stringify({ error: 'artist e title são obrigatórios' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    const geminiKey = process.env.GEMINI_API_KEY
    const spotifyId = process.env.SPOTIFY_CLIENT_ID
    const spotifySecret = process.env.SPOTIFY_CLIENT_SECRET

    if (!geminiKey) throw new Error('GEMINI_API_KEY não configurada')

    // Spotify (opcional)
    let spotifyData = null
    if (spotifyId && spotifySecret) {
      try {
        const token = await getSpotifyToken(spotifyId, spotifySecret)
        spotifyData = await getSpotifyData(token, artist, title)
      } catch { /* continua sem Spotify */ }
    }

    const analysis = await analyzeWithGemini(geminiKey, artist, title, spotifyData, targetStyle, targetBpm)

    return new Response(
      JSON.stringify({ ...analysis, spotify: spotifyData }),
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
