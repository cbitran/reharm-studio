import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useAI, useAIInternal } from '../contexts/AIContext'

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
  album: string
  cover: string | null
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
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setSelected(null) }}
          placeholder="Ex: Lionel Richie — Stuck on You"
          className="input-neumorphic w-full pl-4 pr-8 py-2.5 text-sm"
          style={{ color: 'var(--color-ink)', fontFamily: 'inherit' }}
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs animate-spin" style={{ color: 'var(--color-muted)' }}>◌</span>
        )}
        {selected && (
          <button
            onClick={() => { setSelected(null); setQuery('') }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs"
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
                <img src={s.cover} alt="" className="w-8 h-8 rounded-lg shrink-0 object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-base" style={{ background: 'var(--color-bg)' }}>🎵</div>
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

export function AIWizard() {
  const { t, i18n } = useTranslation()
  const { wizardOpen, session, updateSession } = useAI()
  const { setWizardOpen, setSuggestionFromGroq, setStatus, setPanelOpen } = useAIInternal()

  const [step, setStep] = useState(0)
  const [localStyle, setLocalStyle] = useState(session.style)
  const [localBpm, setLocalBpm] = useState(session.bpm)
  const [localFeeling, setLocalFeeling] = useState<string[]>([])
  const [generating, setGenerating] = useState(false)

  // Reset ao abrir
  useEffect(() => {
    if (wizardOpen) {
      setStep(0)
      setLocalStyle(session.style)
      setLocalBpm(session.bpm)
      setLocalFeeling([])
      setGenerating(false)
    }
  }, [wizardOpen])

  if (!wizardOpen) return null

  const toggleFeeling = (id: string) =>
    setLocalFeeling(prev =>
      prev.includes(id)
        ? prev.filter(f => f !== id)
        : prev.length < 2 ? [...prev, id] : prev
    )

  const handleSongSelect = (song: { artist: string; title: string }) => {
    updateSession({ song })
    setStep(1)
  }

  const handleGenerate = async () => {
    setGenerating(true)
    setStatus('loading')

    const snap = {
      song: session.song,
      style: localStyle,
      bpm: localBpm,
      feeling: localFeeling,
      chords: session.chords,
      tonicNum: session.tonicNum,
    }
    updateSession({ style: localStyle, bpm: localBpm, feeling: localFeeling })

    try {
      const res = await fetch('/api/ai-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session: snap, lang: i18n.language }),
      })
      const data = await res.json() as { chords?: string[]; explanation?: string }
      setSuggestionFromGroq({ chords: data.chords ?? [], explanation: data.explanation ?? '' })
      setWizardOpen(false)
      setPanelOpen(true)
    } catch {
      setStatus('idle')
    } finally {
      setGenerating(false)
    }
  }

  const dots = [0, 1, 2, 3]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={() => setWizardOpen(false)}
    >
      <div
        className="relative rounded-2xl p-8 w-full max-w-[540px] mx-4"
        style={{ background: 'var(--color-card)', boxShadow: 'var(--shadow-card)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <span className="font-semibold text-base" style={{ color: 'var(--color-ink)' }}>
            ✦ {t('ai.wizardTitle')}
          </span>
          <button onClick={() => setWizardOpen(false)} style={{ color: 'var(--color-muted)' }}>✕</button>
        </div>

        {/* Dots de progresso */}
        <div className="flex gap-2 mb-8">
          {dots.map(i => (
            <div
              key={i}
              className="w-2 h-2 rounded-full transition-all"
              style={{ background: i === step ? 'var(--color-primary)' : 'var(--color-border)' }}
            />
          ))}
        </div>

        {/* Passo 0: Música */}
        {step === 0 && (
          <div className="space-y-4">
            <p className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>{t('ai.step1')}</p>
            <MiniSearch onSelect={handleSongSelect} />
            <button
              onClick={() => setStep(1)}
              className="text-xs mt-1"
              style={{ color: 'var(--color-muted)' }}
            >
              {t('ai.step1Skip')} →
            </button>
          </div>
        )}

        {/* Passo 1: Estilo */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>{t('ai.step2')}</p>
            <div className="flex flex-wrap gap-2">
              {STYLES.map(s => (
                <button
                  key={s}
                  onClick={() => setLocalStyle(s)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${localStyle === s ? 'btn-primary' : 'btn-neumorphic'}`}
                  style={localStyle !== s ? { color: 'var(--color-ink)' } : {}}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="flex justify-between mt-4">
              <button onClick={() => setStep(0)} className="text-xs" style={{ color: 'var(--color-muted)' }}>{t('ai.back')}</button>
              <button onClick={() => setStep(2)} className="btn-primary px-4 py-2 text-sm rounded-xl">{t('ai.next')}</button>
            </div>
          </div>
        )}

        {/* Passo 2: BPM */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>{t('ai.step3')}</p>
            <div className="space-y-3">
              <input
                type="range"
                min={60}
                max={180}
                value={localBpm}
                onChange={e => setLocalBpm(Number(e.target.value))}
                className="w-full accent-[var(--color-primary)]"
              />
              <div className="flex justify-between text-xs font-mono" style={{ color: 'var(--color-muted)' }}>
                <span>60</span>
                <span className="font-bold text-base" style={{ color: 'var(--color-ink)' }}>{localBpm} BPM</span>
                <span>180</span>
              </div>
            </div>
            <div className="flex justify-between mt-4">
              <button onClick={() => setStep(1)} className="text-xs" style={{ color: 'var(--color-muted)' }}>{t('ai.back')}</button>
              <button onClick={() => setStep(3)} className="btn-primary px-4 py-2 text-sm rounded-xl">{t('ai.next')}</button>
            </div>
          </div>
        )}

        {/* Passo 3: Feeling */}
        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>{t('ai.step4')}</p>
            <div className="flex flex-wrap gap-2">
              {FEELINGS.map(f => (
                <button
                  key={f.id}
                  onClick={() => toggleFeeling(f.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${localFeeling.includes(f.id) ? 'btn-primary' : 'btn-neumorphic'}`}
                  style={!localFeeling.includes(f.id) ? { color: 'var(--color-muted)' } : {}}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="flex justify-between mt-4">
              <button onClick={() => setStep(2)} className="text-xs" style={{ color: 'var(--color-muted)' }}>{t('ai.back')}</button>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="btn-primary px-5 py-2 text-sm rounded-xl flex items-center gap-2"
              >
                {generating ? (
                  <span className="inline-block w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                ) : '✦'}
                {t('ai.generate')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
