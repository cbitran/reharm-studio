import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useState, useRef, useEffect } from 'react'

const LANGS = [
  { code: 'pt-BR', label: 'PT', flag: '🇧🇷' },
  { code: 'en',    label: 'EN', flag: '🇺🇸' },
  { code: 'es',    label: 'ES', flag: '🇪🇸' },
]

function LangDropdown() {
  const { i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = LANGS.find(l => i18n.language.startsWith(l.code.split('-')[0])) ?? LANGS[0]

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="btn-neumorphic px-3 py-1.5 text-xs font-mono rounded-xl flex items-center gap-1.5"
        style={{ color: 'var(--color-ink)' }}
      >
        <span>{current.flag}</span>
        <span>{current.label}</span>
        <span style={{ color: 'var(--color-muted)', fontSize: '9px' }}>▼</span>
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-1 rounded-xl overflow-hidden z-50 min-w-[90px]"
          style={{ background: 'var(--color-card)', boxShadow: 'var(--shadow-card)', border: '1px solid var(--color-border)' }}
        >
          {LANGS.map(l => (
            <button
              key={l.code}
              onClick={() => { i18n.changeLanguage(l.code); setOpen(false) }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-mono text-left transition-colors"
              style={{
                color: i18n.language.startsWith(l.code.split('-')[0]) ? 'var(--color-primary)' : 'var(--color-ink)',
                background: 'transparent',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-card-hi)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <span>{l.flag}</span>
              <span>{l.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function Navbar() {
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()

  return (
    <nav
      className="border-b px-6 py-3 flex items-center justify-between"
      style={{
        borderColor: 'var(--color-border)',
        background: 'var(--color-sidebar)',
      }}
    >
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[3px]" style={{ color: 'var(--color-muted)' }}>
          Studio
        </span>
        <span className="font-sans text-lg font-bold" style={{ color: 'var(--color-ink)' }}>
          Reharm
        </span>
      </Link>

      {/* Ações */}
      <div className="flex items-center gap-2">
        <LangDropdown />

        {/* Toggle tema */}
        <button
          onClick={toggle}
          className="btn-neumorphic px-3 py-1.5 text-xs font-mono rounded-xl"
          style={{ color: 'var(--color-muted)' }}
        >
          {theme === 'dark' ? '☀' : '◑'}
        </button>

        {user ? (
          <>
            <Link
              to="/conta"
              className="btn-neumorphic px-4 py-1.5 text-sm font-medium rounded-xl flex items-center gap-2"
              style={{ color: 'var(--color-ink)' }}
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: 'var(--color-primary)', color: 'var(--color-bg)' }}
              >
                {user.name.charAt(0).toUpperCase()}
              </div>
              {user.name.split(' ')[0]}
            </Link>
            <button
              onClick={() => { logout(); navigate('/') }}
              className="btn-neumorphic px-3 py-1.5 text-xs rounded-xl"
              style={{ color: 'var(--color-muted)' }}
            >
              {t('nav.logout')}
            </button>
          </>
        ) : (
          <>
            <Link
              to="/login"
              className="btn-neumorphic px-4 py-1.5 text-sm font-medium rounded-xl"
              style={{ color: 'var(--color-ink)' }}
            >
              {t('nav.login')}
            </Link>
            <Link
              to="/cadastro"
              className="btn-primary px-4 py-1.5 text-sm rounded-xl"
            >
              {t('nav.register')}
            </Link>
          </>
        )}
      </div>
    </nav>
  )
}
