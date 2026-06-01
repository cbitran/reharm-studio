import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'

export function ForgotPasswordPage() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/nova-senha`,
      })
      if (error) throw error
      setSent(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('auth.errForgot'))
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--color-outer-bg)' }}>
        <div className="w-full max-w-md">
          <div className="card p-8 text-center">
            <div className="text-4xl mb-4">✉️</div>
            <div className="font-mono text-[10px] uppercase tracking-[3px] mb-2" style={{ color: 'var(--color-muted)' }}>
              Reharm Studio
            </div>
            <h1 className="font-sans text-2xl font-bold mb-3" style={{ color: 'var(--color-ink)' }}>
              {t('auth.forgotSentTitle')}
            </h1>
            <p className="text-sm mb-6" style={{ color: 'var(--color-muted)' }}>
              {t('auth.forgotSentMsg', { email })}
            </p>
            <Link to="/login" className="btn-primary block w-full py-3 text-sm font-semibold rounded-xl text-center">
              {t('auth.backToLogin').replace('← ', '')}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--color-outer-bg)' }}>
      <div className="w-full max-w-md">
        <div className="card p-8">
          <div className="text-center mb-8">
            <div className="font-mono text-[10px] uppercase tracking-[3px] mb-2" style={{ color: 'var(--color-muted)' }}>
              Reharm Studio
            </div>
            <h1 className="font-sans text-2xl font-bold" style={{ color: 'var(--color-ink)' }}>
              {t('auth.forgotTitle')}
            </h1>
            <p className="text-sm mt-2" style={{ color: 'var(--color-muted)' }}>
              {t('auth.forgotSubtitle')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="font-mono text-[11px] uppercase tracking-widest block mb-2" style={{ color: 'var(--color-muted)' }}>
                {t('auth.email')}
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="input-neumorphic w-full px-4 py-3 text-sm"
                style={{ color: 'var(--color-ink)', fontFamily: 'inherit' }}
                placeholder="seu@email.com"
              />
            </div>

            {error && (
              <p className="text-sm px-3 py-2 rounded-xl" style={{ background: 'rgba(232,138,138,0.1)', color: '#e88a8a' }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-sm font-semibold rounded-xl mt-2 disabled:opacity-60"
            >
              {loading ? '...' : t('auth.forgotBtn')}
            </button>
          </form>

          <div className="mt-4 text-center">
            <Link to="/login" className="text-sm" style={{ color: 'var(--color-muted)' }}>
              {t('auth.backToLogin')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
