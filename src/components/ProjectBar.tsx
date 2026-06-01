import { useState, useEffect, useRef } from 'react'
import { loadProjects, saveProject, deleteProject, formatDate, type SavedProject } from '../lib/projects'
import type { Extension, ViradasMode } from '../types'

interface ProjectState {
  text: string
  genreName: string
  extOverride: Extension | null
  bpmOverride: number | null
  swing: number
  viradas: ViradasMode
  selectedSkeletonId: string | null
}

interface Props {
  state: ProjectState
  onLoad: (project: SavedProject) => void
}

export function ProjectBar({ state, onLoad }: Props) {
  const [name, setName] = useState('Sem título')
  const [projects, setProjects] = useState<SavedProject[]>([])
  const [open, setOpen] = useState(false)
  const [saved, setSaved] = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setProjects(loadProjects())
  }, [])

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSave = () => {
    if (!name.trim()) return
    saveProject({ name: name.trim(), ...state })
    setProjects(loadProjects())
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleLoad = (project: SavedProject) => {
    setName(project.name)
    onLoad(project)
    setOpen(false)
  }

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    deleteProject(id)
    setProjects(loadProjects())
  }

  return (
    <div className="flex items-center gap-3 mb-8 flex-wrap">
      {/* Input de nome */}
      <input
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleSave()}
        placeholder="Nome do projeto"
        className="input-neumorphic px-4 py-2.5 text-sm font-semibold w-52"
        style={{ color: 'var(--color-ink)' }}
      />

      {/* Salvar */}
      <button
        onClick={handleSave}
        className={`px-4 py-2.5 text-sm font-semibold rounded-xl transition-all ${
          saved ? 'btn-primary' : 'btn-neumorphic'
        }`}
        style={saved ? {} : { color: 'var(--color-primary)' }}
      >
        {saved ? '✓ Salvo' : 'Salvar'}
      </button>

      {/* Projetos salvos */}
      <div className="relative" ref={dropRef}>
        <button
          onClick={() => setOpen(v => !v)}
          className="btn-neumorphic px-4 py-2.5 text-sm flex items-center gap-2"
          style={{ color: 'var(--color-muted)' }}
        >
          Projetos
          {projects.length > 0 && (
            <span
              className="font-mono text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
              style={{ background: 'var(--color-primary)', color: 'var(--color-bg)' }}
            >
              {projects.length}
            </span>
          )}
          <span className="text-xs">{open ? '▲' : '▼'}</span>
        </button>

        {open && (
          <div
            className="absolute top-full left-0 mt-2 w-72 z-50 rounded-2xl overflow-hidden"
            style={{
              background: 'var(--color-card)',
              boxShadow: 'var(--shadow-card)',
              border: '1px solid var(--color-border)',
            }}
          >
            {projects.length === 0 ? (
              <div className="px-4 py-5 text-center">
                <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                  Nenhum projeto salvo ainda.
                </p>
              </div>
            ) : (
              <ul>
                {projects.map(p => (
                  <li
                    key={p.id}
                    onClick={() => handleLoad(p)}
                    className="flex items-center justify-between px-4 py-3 cursor-pointer transition-colors border-b last:border-0"
                    style={{
                      borderColor: 'var(--color-border)',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-card-hi)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-ink)' }}>
                        {p.name}
                      </p>
                      <p className="font-mono text-[10px] mt-0.5" style={{ color: 'var(--color-muted)' }}>
                        {p.genreName} · {p.bpmOverride ?? '—'} BPM · {formatDate(p.savedAt)}
                      </p>
                    </div>
                    <button
                      onClick={e => handleDelete(e, p.id)}
                      className="ml-3 text-xs shrink-0 px-2 py-1 rounded-lg transition-colors"
                      style={{ color: 'var(--color-muted)' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#e88a8a')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-muted)')}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
