import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'

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
