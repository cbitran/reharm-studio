import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}

export function LoginPage() {
  const { t } = useTranslation()
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/conta')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--color-outer-bg)' }}>
      <div className="w-full max-w-md">
        <div className="card p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="font-mono text-[10px] uppercase tracking-[3px] mb-2" style={{ color: 'var(--color-muted)' }}>
              Reharm Studio
            </div>
            <h1 className="font-sans text-2xl font-bold" style={{ color: 'var(--color-ink)' }}>
              {t('auth.loginTitle')}
            </h1>
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
            <div>
              <label className="font-mono text-[11px] uppercase tracking-widest block mb-2" style={{ color: 'var(--color-muted)' }}>
                {t('auth.password')}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="input-neumorphic w-full pl-4 pr-11 py-3 text-sm"
                  style={{ color: 'var(--color-ink)', fontFamily: 'inherit' }}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                  style={{ color: 'var(--color-muted)' }}
                  tabIndex={-1}
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>
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
              {loading ? '...' : t('auth.loginBtn')}
            </button>
          </form>

          <div className="mt-6 space-y-3 text-center">
            <button className="text-xs" style={{ color: 'var(--color-muted)' }}>
              {t('auth.forgotPassword')}
            </button>
            <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
              {t('auth.noAccount')}{' '}
              <Link to="/cadastro" style={{ color: 'var(--color-primary)' }} className="font-semibold">
                {t('auth.registerLink')}
              </Link>
            </p>
            <div className="flex items-center gap-3 my-2">
              <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
              <span className="font-mono text-[10px]" style={{ color: 'var(--color-muted)' }}>ou</span>
              <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
            </div>
            <Link
              to="/"
              className="block text-xs"
              style={{ color: 'var(--color-muted)' }}
            >
              {t('auth.orContinue')} →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
