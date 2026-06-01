import { createContext, useContext, useState, useCallback } from 'react'
import type { AIStatus, AISession, AISuggestion, ChordBadgeData, AIContextValue } from '../types'
import { parseGroqBadges } from '../lib/ai-utils'

const defaultSession: AISession = {
  song: null,
  style: 'House',
  bpm: 124,
  feeling: [],
  chords: [],
  tonicNum: null,
}

const AIContext = createContext<AIContextValue>({
  status: 'idle',
  session: defaultSession,
  suggestion: null,
  badges: {},
  wizardOpen: false,
  panelOpen: false,
  updateSession: () => {},
  callAI: () => {},
  acceptSuggestion: () => {},
  dismissAI: () => {},
})

export function useAI() {
  return useContext(AIContext)
}

// Internal context: only AIWizard and AIPanel use these setters
interface AIInternalValue {
  setStatus: (s: AIStatus) => void
  setSuggestionFromGroq: (s: AISuggestion) => void
  fetchBadges: (chords: string[], ctx: Omit<AISession, 'chords'>) => Promise<void>
  setWizardOpen: (v: boolean) => void
  setPanelOpen: (v: boolean) => void
}

const AIInternalContext = createContext<AIInternalValue>({
  setStatus: () => {},
  setSuggestionFromGroq: () => {},
  fetchBadges: async () => {},
  setWizardOpen: () => {},
  setPanelOpen: () => {},
})

export function useAIInternal() {
  return useContext(AIInternalContext)
}

export function AIProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AIStatus>('idle')
  const [session, setSession] = useState<AISession>(defaultSession)
  const [suggestion, setSuggestion] = useState<AISuggestion | null>(null)
  const [badges, setBadges] = useState<Record<string, ChordBadgeData>>({})
  const [wizardOpen, setWizardOpen] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)

  const updateSession = useCallback((patch: Partial<AISession>) => {
    setSession(prev => ({ ...prev, ...patch }))
  }, [])

  const callAI = useCallback(() => {
    const isEmpty = session.song === null && session.chords.length === 0
    if (isEmpty) {
      setWizardOpen(true)
    } else {
      setPanelOpen(true)
    }
  }, [session])

  const acceptSuggestion = useCallback((onApply: (chords: string[]) => void) => {
    if (!suggestion) return
    onApply(suggestion.chords)
    setSuggestion(null)
    setPanelOpen(false)
    setWizardOpen(false)
    setStatus('active')
  }, [suggestion])

  const dismissAI = useCallback(() => {
    setSuggestion(null)
    setBadges({})
    setStatus('dismissed')
    setWizardOpen(false)
    setPanelOpen(false)
  }, [])

  const setSuggestionFromGroq = useCallback((raw: AISuggestion) => {
    setSuggestion(raw)
    setStatus('active')
  }, [])

  const fetchBadges = useCallback(async (chords: string[], ctx: Omit<AISession, 'chords'>) => {
    try {
      const res = await fetch('/api/ai-badges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chords,
          style: ctx.style,
          bpm: ctx.bpm,
          feeling: ctx.feeling,
          tonicNum: ctx.tonicNum,
        }),
      })
      const data = await res.json() as { badges: ChordBadgeData[] }
      setBadges(parseGroqBadges(data.badges ?? []))
    } catch {
      // badges são não-críticos, falha silenciosa
    }
  }, [])

  return (
    <AIContext.Provider value={{
      status,
      session,
      suggestion,
      badges,
      wizardOpen,
      panelOpen,
      updateSession,
      callAI,
      acceptSuggestion,
      dismissAI,
    }}>
      <AIInternalContext.Provider value={{ setStatus, setSuggestionFromGroq, fetchBadges, setWizardOpen, setPanelOpen }}>
        {children}
      </AIInternalContext.Provider>
    </AIContext.Provider>
  )
}
