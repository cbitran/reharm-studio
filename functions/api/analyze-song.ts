// Cloudflare Pages Function — /api/analyze-song
// Recebe: { artist, title, targetStyle, targetBpm }
// Retorna: { key, mode, bpm, progression, character, remixGuide }

interface Env {
  GEMINI_API_KEY: string
  SPOTIFY_CLIENT_ID: string
  SPOTIFY_CLIENT_SECRET: string
}

interface SpotifyToken { access_token: string }
interface SpotifyTrack { id: string; name: string; artists: { name: string }[] }
interface SpotifyFeatures { key: number; mode: number; tempo: number; energy: number; danceability: number; valence: number }

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const MODES = ['menor', 'maior']

async function getSpotifyToken(clientId: string, clientSecret: string): Promise<string> {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
    },
    body: 'grant_type=client_credentials',
  })
  const data = await res.json() as SpotifyToken
  return data.access_token
}

async function searchSpotify(token: string, artist: string, title: string) {
  const q = encodeURIComponent(`track:${title} artist:${artist}`)
  const res = await fetch(`https://api.spotify.com/v1/search?q=${q}&type=track&limit=1`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json() as { tracks: { items: SpotifyTrack[] } }
  return data.tracks?.items?.[0] ?? null
}

async function getAudioFeatures(token: string, trackId: string): Promise<SpotifyFeatures | null> {
  const res = await fetch(`https://api.spotify.com/v1/audio-features/${trackId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return null
  return await res.json() as SpotifyFeatures
}

async function analyzeWithGemini(
  apiKey: string,
  artist: string,
  title: string,
  spotifyData: { key: string; mode: string; bpm: number } | null,
  targetStyle: string,
  targetBpm: number,
) {
  const spotifyContext = spotifyData
    ? `Dados do Spotify: tonalidade ${spotifyData.key} ${spotifyData.mode}, BPM ${spotifyData.bpm}.`
    : ''

  const prompt = `Você é um especialista em teoria musical e produção de dance music.

Analise a música "${title}" de ${artist}. ${spotifyContext}

Responda APENAS com um JSON válido neste formato exato:
{
  "key": "F",
  "mode": "maior",
  "bpm_original": 69,
  "progression": "Fmaj7 – Am7 – Bbmaj7 – C7",
  "progression_degrees": "I – iii – IV – V",
  "character": "Soul, R&B anos 80, emocional, quente",
  "borrowed_chords": ["Eb (bVII)", "Dm (vi)"],
  "remix_guide": {
    "style": "${targetStyle}",
    "bpm": ${targetBpm},
    "structure": [
      { "time": "0:00", "section": "Intro", "description": "Piano sutil + sub bass, sem kick" },
      { "time": "0:32", "section": "Build Up", "description": "Hi-hat cresce, filtro abrindo" },
      { "time": "1:20", "section": "Drop 1", "description": "Kick full, piano em stab nos contratempos" },
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
      "A progressão I–iii–IV–V é perfeita para Deep House gospel",
      "Use o bVII (Eb) como virada antes de voltar para o I"
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
        generationConfig: { responseMimeType: 'application/json', temperature: 0.3 },
      }),
    },
  )

  const data = await res.json() as { candidates: { content: { parts: { text: string }[] } }[] }
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
  return JSON.parse(text)
}

export async function onRequestPost(context: { request: Request; env: Env }) {
  const { request, env } = context

  try {
    const body = await request.json() as { artist: string; title: string; targetStyle?: string; targetBpm?: number }
    const { artist, title, targetStyle = 'House', targetBpm = 124 } = body

    if (!artist || !title) {
      return new Response(JSON.stringify({ error: 'artist e title são obrigatórios' }), { status: 400 })
    }

    // Tenta buscar dados do Spotify
    let spotifyData = null
    try {
      const token = await getSpotifyToken(env.SPOTIFY_CLIENT_ID, env.SPOTIFY_CLIENT_SECRET)
      const track = await searchSpotify(token, artist, title)
      if (track) {
        const features = await getAudioFeatures(token, track.id)
        if (features) {
          spotifyData = {
            key: NOTE_NAMES[features.key] ?? 'C',
            mode: MODES[features.mode] ?? 'maior',
            bpm: Math.round(features.tempo),
            energy: features.energy,
            danceability: features.danceability,
          }
        }
      }
    } catch { /* Spotify falhou, continua só com Gemini */ }

    // Análise com Gemini
    const analysis = await analyzeWithGemini(
      env.GEMINI_API_KEY,
      artist,
      title,
      spotifyData,
      targetStyle,
      targetBpm,
    )

    return new Response(
      JSON.stringify({ ...analysis, spotify: spotifyData }),
      { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } },
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Erro ao analisar música', detail: String(err) }),
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } },
    )
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
