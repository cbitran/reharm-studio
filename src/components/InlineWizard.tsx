import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

const STYLES = ['House', 'Deep House', 'Gospel House', 'Afro House', 'Tech House', 'Jazz', 'Lo-fi', 'Techno']

const FEELINGS = [
  { id: 'groovy', label: 'Groovy' },
  { id: 'soulful', label: 'Soulful' },
  { id: 'dark', label: 'Dark' },
  { id: 'tribal', label: 'Tribal' },
  { id: 'jazzy', label: 'Jazzy' },
  { id: 'uplifting', label: 'Uplifting' },
  { id: 'melancólico', label: 'Melancólico' },
  { id: 'energético', label: 'Energético' },
]

interface SongOption {
  id: string
  title: string
  artist: string
  cover: string | null
}

export interface InlineWizardResult {
  chords: string[]
  explanation: string
  style: string
  bpm: number
  feeling: string[]
  song: { artist: string; title: string } | null
}

interface Props {
  onComplete: (result: InlineWizardResult) => void
  onSkip: () => void
}

function MiniSearch({ onSelect }: { onSelect: (song: SongOption) => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SongOption[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<SongOption | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (selected) return
    if (query.length < 2) { setResults([]); setOpen(false); return }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/search-songs?q=${encodeURIComponent(query)}`)
        const data = await res.json() as SongOption[]
        setResults(Array.isArray(data) ? data : [])
        setOpen(true)
      } catch { setResults([]) }
      finally { setLoading(false) }
    }, 350)
  }, [query, selected])

  const handlePick = (s: SongOption) => {
    setSelected(s)
    setQuery(`${s.artist} — ${s.title}`)
    setOpen(false)
    onSelect(s)
  }

  return (
    <div ref={wrapperRef} className="relative w-full max-w-lg">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setSelected(null) }}
          placeholder="Ex: Lionel Richie — Stuck on You"
          autoFocus
          className="input-neumorphic w-full pl-5 pr-10 py-3.5 text-base"
          style={{ color: 'var(--color-ink)', fontFamily: 'inherit' }}
        />
        {loading && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm animate-spin" style={{ color: 'var(--color-muted)' }}>◌</span>
        )}
        {selected && (
          <button
            onClick={() => { setSelected(null); setQuery('') }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-sm"
            style={{ color: 'var(--color-muted)' }}
          >✕</button>
        )}
      </div>
      {open && results.length > 0 && (
        <div
          className="absolute top-full left-0 right-0 mt-1 z-50 rounded-2xl overflow-hidden"
          style={{ background: 'var(--color-card)', boxShadow: 'var(--shadow-card)', border: '1px solid var(--color-border)' }}
        >
          {results.slice(0, 5).map(s => (
            <button
              key={s.id}
              onClick={() => handlePick(s)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left border-b last:border-0 transition-colors"
              style={{ borderColor: 'var(--color-border)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-card-hi)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {s.cover ? (
                <img src={s.cover} alt="" className="w-9 h-9 rounded-lg shrink-0 object-cover" />
              ) : (
                <div className="w-9 h-9 rounded-lg shrink-0 flex items-center justify-center text-lg" style={{ background: 'var(--color-bg)' }}>🎵</div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-ink)' }}>{s.title}</p>
                <p className="font-mono text-[11px] truncate" style={{ color: 'var(--color-muted)' }}>{s.artist}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function InlineWizard({ onComplete, onSkip }: Props) {
  const { i18n } = useTranslation()
  const [step, setStep] = useState(0)
  const [song, setSong] = useState<{ artist: string; title: string } | null>(null)
  const [style, setStyle] = useState('Deep House')
  const [bpm, setBpm] = useState(124)
  const [feeling, setFeeling] = useState<string[]>([])
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  const toggleFeeling = (id: string) =>
    setFeeling(prev =>
      prev.includes(id)
        ? prev.filter(f => f !== id)
        : prev.length < 2 ? [...prev, id] : prev
    )

  const handleGenerate = async () => {
    setGenerating(true)
    setError('')
    const session = { song, style, bpm, feeling, chords: [], tonicNum: null }
    try {
      const res = await fetch('/api/ai-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session, lang: i18n.language }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(err.error ?? `Erro ${res.status}`)
      }
      const data = await res.json() as { chords?: string[]; explanation?: string }
      if (!data.chords?.length) throw new Error('Nenhum acorde retornado. Tente novamente.')
      onComplete({ chords: data.chords, explanation: data.explanation ?? '', style, bpm, feeling, song })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar sugestão')
      setGenerating(false)
    }
  }

  const dots = [0, 1, 2, 3]

  return (
    <div
      className="flex flex-col items-center justify-center min-h-[70vh] py-16 px-4"
      style={{ background: 'var(--color-bg)' }}
    >
      {/* Título */}
      <div className="mb-10 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <span className="text-2xl" style={{ color: 'var(--color-primary)' }}>✦</span>
          <span className="font-mono text-[11px] uppercase tracking-[3px]" style={{ color: 'var(--color-muted)' }}>
            AI Coach
          </span>
        </div>
        <h2 className="font-sans text-3xl font-bold" style={{ color: 'var(--color-ink)' }}>
          Vamos criar juntos
        </h2>
      </div>

      {/* Progress dots */}
      <div className="flex gap-2 mb-10">
        {dots.map(i => (
          <div
            key={i}
            className="rounded-full transition-all duration-300"
            style={{
              width: i === step ? 24 : 8,
              height: 8,
              background: i === step ? 'var(--color-primary)' : 'var(--color-border)',
            }}
          />
        ))}
      </div>

      {/* Conteúdo do passo */}
      <div className="w-full max-w-xl space-y-6">

        {/* Passo 0: Música */}
        {step === 0 && (
          <div className="space-y-5 text-center">
            <p className="text-xl font-semibold" style={{ color: 'var(--color-ink)' }}>
              Qual música você quer remixar?
            </p>
            <div className="flex flex-col items-center gap-3">
              <MiniSearch onSelect={s => { setSong(s); setStep(1) }} />
              <button
                onClick={() => setStep(1)}
                className="text-sm"
                style={{ color: 'var(--color-muted)' }}
              >
                Pular →
              </button>
            </div>
          </div>
        )}

        {/* Passo 1: Estilo */}
        {step === 1 && (
          <div className="space-y-5 text-center">
            <p className="text-xl font-semibold" style={{ color: 'var(--color-ink)' }}>
              Que estilo você está fazendo?
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {STYLES.map(s => (
                <button
                  key={s}
                  onClick={() => setStyle(s)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${style === s ? 'btn-primary' : 'btn-neumorphic'}`}
                  style={style !== s ? { color: 'var(--color-ink)' } : {}}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="flex justify-center gap-6 pt-2">
              <button onClick={() => setStep(0)} className="text-sm" style={{ color: 'var(--color-muted)' }}>← Voltar</button>
              <button onClick={() => setStep(2)} className="btn-primary px-6 py-2 text-sm rounded-xl">Próximo →</button>
            </div>
          </div>
        )}

        {/* Passo 2: BPM */}
        {step === 2 && (
          <div className="space-y-5 text-center">
            <p className="text-xl font-semibold" style={{ color: 'var(--color-ink)' }}>
              Que BPM você está buscando?
            </p>
            <div className="space-y-4 max-w-sm mx-auto">
              <input
                type="range"
                min={60}
                max={180}
                value={bpm}
                onChange={e => setBpm(Number(e.target.value))}
                className="w-full accent-[var(--color-primary)]"
              />
              <div className="flex justify-between text-xs font-mono" style={{ color: 'var(--color-muted)' }}>
                <span>60</span>
                <span className="text-2xl font-bold" style={{ color: 'var(--color-ink)' }}>{bpm}</span>
                <span>180</span>
              </div>
            </div>
            <div className="flex justify-center gap-6 pt-2">
              <button onClick={() => setStep(1)} className="text-sm" style={{ color: 'var(--color-muted)' }}>← Voltar</button>
              <button onClick={() => setStep(3)} className="btn-primary px-6 py-2 text-sm rounded-xl">Próximo →</button>
            </div>
          </div>
        )}

        {/* Passo 3: Feeling + Gerar */}
        {step === 3 && (
          <div className="space-y-5 text-center">
            <p className="text-xl font-semibold" style={{ color: 'var(--color-ink)' }}>
              Qual o feeling que você quer?
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {FEELINGS.map(f => (
                <button
                  key={f.id}
                  onClick={() => toggleFeeling(f.id)}
                  className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all border ${feeling.includes(f.id) ? 'btn-primary' : 'btn-neumorphic'}`}
                  style={!feeling.includes(f.id) ? { color: 'var(--color-muted)' } : {}}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {error && (
              <p className="text-sm px-4 py-2 rounded-xl mx-auto max-w-sm" style={{ background: 'rgba(232,138,138,0.1)', color: '#e88a8a' }}>
                {error}
              </p>
            )}

            {generating ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <span
                  className="inline-block w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
                  style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }}
                />
                <p className="text-sm" style={{ color: 'var(--color-muted)' }}>Gerando sua progressão...</p>
              </div>
            ) : (
              <div className="flex justify-center gap-6 pt-2">
                <button onClick={() => setStep(2)} className="text-sm" style={{ color: 'var(--color-muted)' }}>← Voltar</button>
                <button
                  onClick={handleGenerate}
                  className="btn-primary px-8 py-3 text-base rounded-xl flex items-center gap-2"
                >
                  ✦ Gerar progressão
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Skip */}
      <button
        onClick={onSkip}
        className="mt-12 text-xs"
        style={{ color: 'var(--color-muted)' }}
      >
        Usar sem IA — ir direto para o studio
      </button>
    </div>
  )
}
