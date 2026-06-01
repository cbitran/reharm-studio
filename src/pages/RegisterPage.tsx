import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'

export function RegisterPage() {
  const { t } = useTranslation()
  const { register } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('As senhas não coincidem'); return }
    if (password.length < 6) { setError('Senha deve ter pelo menos 6 caracteres'); return }
    setLoading(true)
    try {
      await register(name, email, password)
      navigate('/conta')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar conta')
    } finally {
      setLoading(false)
    }
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
              {t('auth.registerTitle')}
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { key: 'name', label: t('auth.name'), value: name, set: setName, type: 'text', placeholder: 'Seu nome' },
              { key: 'email', label: t('auth.email'), value: email, set: setEmail, type: 'email', placeholder: 'seu@email.com' },
              { key: 'password', label: t('auth.password'), value: password, set: setPassword, type: 'password', placeholder: '••••••••' },
              { key: 'confirm', label: t('auth.confirmPassword'), value: confirm, set: setConfirm, type: 'password', placeholder: '••••••••' },
            ].map(field => (
              <div key={field.key}>
                <label className="font-mono text-[11px] uppercase tracking-widest block mb-2" style={{ color: 'var(--color-muted)' }}>
                  {field.label}
                </label>
                <input
                  type={field.type}
                  value={field.value}
                  onChange={e => field.set(e.target.value)}
                  required
                  className="input-neumorphic w-full px-4 py-3 text-sm"
                  style={{ color: 'var(--color-ink)', fontFamily: 'inherit' }}
                  placeholder={field.placeholder}
                />
              </div>
            ))}

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
              {loading ? '...' : t('auth.registerBtn')}
            </button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
              {t('auth.hasAccount')}{' '}
              <Link to="/login" style={{ color: 'var(--color-primary)' }} className="font-semibold">
                {t('auth.loginLink')}
              </Link>
            </p>
            <Link to="/" className="block text-xs" style={{ color: 'var(--color-muted)' }}>
              {t('auth.orContinue')} →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
