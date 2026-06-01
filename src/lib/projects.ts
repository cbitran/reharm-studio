import type { Extension, ViradasMode } from '../types'

export interface SavedProject {
  id: string
  name: string
  savedAt: string
  text: string
  genreName: string
  extOverride: Extension | null
  bpmOverride: number | null
  swing: number
  viradas: ViradasMode
  selectedSkeletonId: string | null
}

const KEY = 'reharm-projects'

export function loadProjects(): SavedProject[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as SavedProject[]
  } catch {
    return []
  }
}

export function saveProject(project: Omit<SavedProject, 'id' | 'savedAt'>): SavedProject {
  const projects = loadProjects()
  const existing = projects.findIndex(p => p.name === project.name)
  const saved: SavedProject = {
    ...project,
    id: existing >= 0 ? projects[existing]!.id : crypto.randomUUID(),
    savedAt: new Date().toISOString(),
  }
  if (existing >= 0) {
    projects[existing] = saved
  } else {
    projects.unshift(saved)
  }
  localStorage.setItem(KEY, JSON.stringify(projects))
  return saved
}

export function deleteProject(id: string): void {
  const projects = loadProjects().filter(p => p.id !== id)
  localStorage.setItem(KEY, JSON.stringify(projects))
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}
