import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { loadProjects, deleteProject, formatDate } from '../lib/projects'
import { useState, useEffect } from 'react'
import type { SavedProject } from '../lib/projects'

export function AccountPage() {
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [projects, setProjects] = useState<SavedProject[]>([])
  const [tab, setTab] = useState<'profile' | 'projects' | 'plan'>('profile')

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    setProjects(loadProjects())
  }, [user, navigate])

  if (!user) return null

  const handleDelete = (id: string) => {
    deleteProject(id)
    setProjects(loadProjects())
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">

      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold"
          style={{ background: 'var(--color-primary)', color: 'var(--color-bg)', boxShadow: 'var(--shadow-card)' }}
        >
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="font-sans text-xl font-bold" style={{ color: 'var(--color-ink)' }}>{user.name}</h1>
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>{user.email}</p>
        </div>
        <span
          className="ml-auto font-mono text-xs px-3 py-1 rounded-full font-semibold"
          style={{ background: 'var(--color-primary)', color: 'var(--color-bg)' }}
        >
          {user.plan === 'pro' ? t('account.proPlan') : t('account.freePlan')}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(['profile', 'projects', 'plan'] as const).map(tb => (
          <button
            key={tb}
            onClick={() => setTab(tb)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === tb ? 'btn-primary' : 'btn-neumorphic'}`}
            style={tab !== tb ? { color: 'var(--color-ink)' } : {}}
          >
            {{ profile: t('account.profile'), projects: t('account.myProjects'), plan: t('account.subscription') }[tb]}
          </button>
        ))}
      </div>

      {/* Perfil */}
      {tab === 'profile' && (
        <div className="card p-6 space-y-4">
          {[
            { label: t('auth.name'), value: user.name },
            { label: t('auth.email'), value: user.email },
          ].map(field => (
            <div key={field.label}>
              <label className="font-mono text-[11px] uppercase tracking-widest block mb-1" style={{ color: 'var(--color-muted)' }}>
                {field.label}
              </label>
              <div className="input-neumorphic px-4 py-3 text-sm" style={{ color: 'var(--color-ink)' }}>
                {field.value}
              </div>
            </div>
          ))}
          <div className="pt-4 border-t flex justify-between items-center" style={{ borderColor: 'var(--color-border)' }}>
            <button
              onClick={() => { logout(); navigate('/') }}
              className="btn-neumorphic px-4 py-2 text-sm rounded-xl"
              style={{ color: 'var(--color-muted)' }}
            >
              {t('nav.logout')}
            </button>
            <button className="text-xs" style={{ color: '#e88a8a' }}>
              {t('account.deleteAccount')}
            </button>
          </div>
        </div>
      )}

      {/* Projetos */}
      {tab === 'projects' && (
        <div className="space-y-2">
          {projects.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>{t('account.noProjects')}</p>
            </div>
          ) : (
            projects.map(p => (
              <div key={p.id} className="card p-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate" style={{ color: 'var(--color-ink)' }}>{p.name}</p>
                  <p className="font-mono text-[10px] mt-0.5" style={{ color: 'var(--color-muted)' }}>
                    {p.genreName} · {p.bpmOverride ?? '—'} BPM · {t('account.savedOn')} {formatDate(p.savedAt)}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="text-xs shrink-0 px-3 py-1.5 rounded-lg btn-neumorphic"
                  style={{ color: 'var(--color-muted)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#e88a8a')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-muted)')}
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Plano */}
      {tab === 'plan' && (
        <div className="card p-6 text-center space-y-4">
          <div className="text-4xl">🎵</div>
          <h2 className="font-sans text-xl font-bold" style={{ color: 'var(--color-ink)' }}>
            {user.plan === 'free' ? 'Plano Gratuito' : 'Plano Pro'}
          </h2>
          <p className="text-sm max-w-sm mx-auto leading-relaxed" style={{ color: 'var(--color-muted)' }}>
            {user.plan === 'free'
              ? 'Acesse todos os recursos básicos sem custo. Faça upgrade para Pro e desbloqueie exports ilimitados, projetos na nuvem e suporte prioritário.'
              : 'Você tem acesso completo ao Reharm Studio Pro.'}
          </p>
          {user.plan === 'free' && (
            <button className="btn-primary px-8 py-3 text-sm font-semibold rounded-xl mx-auto block">
              {t('account.upgradeBtn')} ✨
            </button>
          )}
        </div>
      )}
    </div>
  )
}
