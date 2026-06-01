import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LANGUAGES } from '../i18n'

export function Footer() {
  const { t, i18n } = useTranslation()

  return (
    <footer
      className="border-t mt-auto"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-sidebar)' }}
    >
      <div className="max-w-[1440px] mx-auto px-8 py-6 flex flex-wrap items-center justify-between gap-4">

        {/* Tagline */}
        <p className="font-mono text-xs" style={{ color: 'var(--color-muted)' }}>
          {t('footer.tagline')}
        </p>

        {/* Links legais + seletor de idioma */}
        <div className="flex items-center gap-4 flex-wrap">
          <Link
            to="/privacidade"
            className="font-mono text-xs transition-colors"
            style={{ color: 'var(--color-muted)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-muted)')}
          >
            {t('footer.privacy')}
          </Link>
          <Link
            to="/termos"
            className="font-mono text-xs transition-colors"
            style={{ color: 'var(--color-muted)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-muted)')}
          >
            {t('footer.terms')}
          </Link>
          <Link
            to="/reembolso"
            className="font-mono text-xs transition-colors"
            style={{ color: 'var(--color-muted)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-muted)')}
          >
            {t('footer.refund')}
          </Link>

          {/* Seletor de idioma */}
          <div className="flex items-center gap-1">
            {LANGUAGES.map(lang => (
              <button
                key={lang.code}
                onClick={() => i18n.changeLanguage(lang.code)}
                className="font-mono text-[11px] px-2 py-1 rounded-lg transition-all"
                style={{
                  color: i18n.language === lang.code ? 'var(--color-primary)' : 'var(--color-muted)',
                  background: i18n.language === lang.code ? 'var(--color-card)' : 'transparent',
                  boxShadow: i18n.language === lang.code ? 'var(--shadow-btn)' : 'none',
                }}
              >
                {lang.flag} {lang.code === 'pt-BR' ? 'PT' : lang.code.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
