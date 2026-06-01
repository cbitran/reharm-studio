// Vercel Edge Function — GET /api/search-songs?q=lionel+richie
export const config = { runtime: 'edge' }

interface SpotifyToken { access_token: string }
interface SpotifyTrack {
  id: string
  name: string
  artists: { name: string }[]
  album: { name: string; images: { url: string }[] }
  duration_ms: number
}

async function getSpotifyToken(clientId: string, clientSecret: string): Promise<string> {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
    },
    body: 'grant_type=client_credentials',
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Spotify token error ${res.status}: ${text}`)
  }
  const data = await res.json() as SpotifyToken
  if (!data.access_token) throw new Error('Spotify: token vazio')
  return data.access_token
}

export default async function handler(req: Request) {
  const cors = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }

  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })

  const url = new URL(req.url)
  const q = url.searchParams.get('q')?.trim()

  if (!q || q.length < 2) {
    return new Response(JSON.stringify([]), { headers: cors })
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return new Response(JSON.stringify({ error: 'Spotify não configurado' }), { status: 500, headers: cors })
  }

  try {
    const token = await getSpotifyToken(clientId, clientSecret)

    const res = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=6&market=BR`,
      { headers: { Authorization: `Bearer ${token}` } },
    )

    const data = await res.json() as { tracks: { items: SpotifyTrack[] } }
    const tracks = data.tracks?.items ?? []

    const results = tracks.map(t => ({
      id: t.id,
      title: t.name,
      artist: t.artists.map(a => a.name).join(', '),
      album: t.album.name,
      cover: t.album.images[2]?.url ?? t.album.images[0]?.url ?? null,
      duration: Math.round(t.duration_ms / 1000),
    }))

    return new Response(JSON.stringify(results), { headers: cors })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: cors })
  }
}
