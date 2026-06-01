import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAI, useAIInternal } from '../contexts/AIContext'

export function AIPanel({ onApply }: { onApply: (chords: string[]) => void }) {
  const { t, i18n } = useTranslation()
  const { panelOpen, session, suggestion } = useAI()
  const { setPanelOpen, setSuggestionFromGroq, setStatus, fetchBadges } = useAIInternal()
  const { acceptSuggestion, dismissAI } = useAI()

  const [loading, setLoading] = useState(false)

  if (!panelOpen) return null

  const handleCallSuggest = async (intention?: string) => {
    setLoading(true)
    setStatus('loading')
    try {
      const res = await fetch('/api/ai-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session, intention, lang: i18n.language }),
      })
      const data = await res.json() as { chords?: string[]; explanation?: string }
      setSuggestionFromGroq({ chords: data.chords ?? [], explanation: data.explanation ?? '' })
    } catch {
      setStatus('idle')
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = () => {
    acceptSuggestion((chords) => {
      onApply(chords)
      fetchBadges(chords, session)
    })
  }

  const handleEdit = () => {
    if (!suggestion) return
    onApply(suggestion.chords)
    setPanelOpen(false)
  }

  const contextParts = [
    session.song ? `${session.song.title} · ${session.song.artist}` : null,
    session.style,
    session.bpm ? `${session.bpm} BPM` : null,
    session.chords.length > 0 ? session.chords.join(' – ') : null,
  ].filter(Boolean)

  const intentions = [
    { key: 'intentionResolve' as const },
    { key: 'intentionIntensify' as const },
    { key: 'intentionSurprise' as const },
  ]

  return (
    <>
      {/* Overlay semi-transparente para fechar */}
      <div
        className="fixed inset-0 z-30"
        onClick={() => setPanelOpen(false)}
      />

      {/* Painel */}
      <div
        className="fixed right-0 top-0 h-full z-40 flex flex-col"
        style={{
          width: '360px',
          background: 'var(--color-card)',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.2)',
          borderLeft: '1px solid var(--color-border)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <span className="flex items-center gap-2 font-semibold text-sm" style={{ color: 'var(--color-primary)' }}>
            <span className="animate-pulse">✦</span>
            {t('ai.active')}
          </span>
          <button onClick={() => setPanelOpen(false)} style={{ color: 'var(--color-muted)' }}>✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Contexto atual */}
          {contextParts.length > 0 && (
            <p
              className="text-xs rounded-xl px-3 py-2 leading-relaxed"
              style={{ background: 'var(--color-bg)', color: 'var(--color-muted)' }}
            >
              {contextParts.join(' · ')}
            </p>
          )}

          {/* Estado: sem sugestão, aguardando intenção */}
          {!suggestion && !loading && (
            <div className="space-y-3">
              <p className="text-sm" style={{ color: 'var(--color-ink)' }}>
                {t('ai.intentionQuestion')}
              </p>
              <div className="space-y-2">
                {intentions.map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => handleCallSuggest(t(`ai.${opt.key}`))}
                    className="w-full text-left px-4 py-3 rounded-xl text-sm btn-neumorphic transition-colors"
                    style={{ color: 'var(--color-ink)' }}
                  >
                    {t(`ai.${opt.key}`)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Estado: carregando */}
          {loading && (
            <div className="flex items-center gap-3 py-4">
              <span
                className="inline-block w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }}
              />
              <span className="text-sm" style={{ color: 'var(--color-muted)' }}>{t('ai.generating')}</span>
            </div>
          )}

          {/* Estado: sugestão disponível */}
          {suggestion && !loading && (
            <div className="space-y-4">
              <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-muted)' }}>
                {t('ai.suggestion')}
              </p>

              {/* Chips de acordes */}
              <div className="flex flex-wrap gap-2">
                {suggestion.chords.map((chord, i) => (
                  <span
                    key={i}
                    className="px-4 py-2 rounded-xl text-sm font-semibold"
                    style={{ background: 'var(--color-primary)', color: 'var(--color-bg)' }}
                  >
                    {chord}
                  </span>
                ))}
              </div>

              {/* Explicação */}
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>
                {suggestion.explanation}
              </p>

              {/* Ações */}
              <div className="flex gap-2 pt-2">
                <button onClick={handleAccept} className="btn-primary flex-1 py-2 text-sm rounded-xl">
                  ✓ {t('ai.accept')}
                </button>
                <button
                  onClick={handleEdit}
                  className="btn-neumorphic px-4 py-2 text-sm rounded-xl"
                  style={{ color: 'var(--color-ink)' }}
                >
                  ✏ {t('ai.edit')}
                </button>
              </div>

              {/* Nova sugestão */}
              <button
                onClick={() => handleCallSuggest()}
                className="text-xs w-full text-center mt-1"
                style={{ color: 'var(--color-muted)' }}
              >
                ↺ Tentar outra sugestão
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <button
            onClick={dismissAI}
            className="text-xs w-full text-center"
            style={{ color: 'var(--color-muted)' }}
          >
            {t('ai.dismiss')}
          </button>
        </div>
      </div>
    </>
  )
}
