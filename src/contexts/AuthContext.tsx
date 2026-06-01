import { createContext, useContext, useState, useEffect } from 'react'

export interface User {
  id: string
  name: string
  email: string
  plan: 'free' | 'pro'
  createdAt: string
}

interface AuthContextValue {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  isLoading: false,
})

const STORAGE_KEY = 'reharm-user'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setUser(JSON.parse(stored) as User)
    } catch {}
    setIsLoading(false)
  }, [])

  const login = async (email: string, _password: string) => {
    // MVP: auth simulada — em produção integrar Supabase/Firebase
    await new Promise(r => setTimeout(r, 600))
    const stored = localStorage.getItem(`reharm-account-${email}`)
    if (!stored) throw new Error('Conta não encontrada')
    const account = JSON.parse(stored) as User
    setUser(account)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(account))
  }

  const register = async (name: string, email: string, _password: string) => {
    await new Promise(r => setTimeout(r, 600))
    const existing = localStorage.getItem(`reharm-account-${email}`)
    if (existing) throw new Error('E-mail já cadastrado')
    const newUser: User = {
      id: crypto.randomUUID(),
      name,
      email,
      plan: 'free',
      createdAt: new Date().toISOString(),
    }
    localStorage.setItem(`reharm-account-${email}`, JSON.stringify(newUser))
    setUser(newUser)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser))
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem(STORAGE_KEY)
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
