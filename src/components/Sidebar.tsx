import { useTheme } from '../contexts/ThemeContext'

interface NavItem {
  id: string
  number: string
  label: string
  icon: string
}

const NAV: NavItem[] = [
  { id: 'acordes',    number: '01', label: 'Acordes',     icon: '♩' },
  { id: 'estilo',     number: '02', label: 'Estilo',      icon: '◈' },
  { id: 'progressoes',number: '03', label: 'Progressões', icon: '⟳' },
  { id: 'groove',     number: '04', label: 'Groove',      icon: '≋' },
  { id: 'grid',       number: '05', label: 'Grid',        icon: '⊞' },
  { id: 'export',     number: '06', label: 'Export',      icon: '⬇' },
  { id: 'instrumentos',number: '07', label: 'Instrumentos', icon: '🎹' },
]

interface Props {
  active: string
  onNav: (id: string) => void
}

export function Sidebar({ active, onNav }: Props) {
  const { theme, toggle } = useTheme()

  return (
    <aside
      className="w-56 shrink-0 flex flex-col h-screen sticky top-0 py-8 px-4"
      style={{ background: 'var(--color-sidebar)' }}
    >
      {/* Logo */}
      <div className="mb-8 px-2">
        <div className="font-mono text-[10px] text-muted uppercase tracking-[3px] mb-1">
          Studio
        </div>
        <h1 className="font-sans text-xl font-bold text-ink leading-tight">
          Reharm
        </h1>
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col gap-1">
        {NAV.map(item => {
          const isActive = active === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNav(item.id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all text-sm ${
                isActive
                  ? 'btn-primary font-semibold'
                  : 'btn-neumorphic text-muted hover:text-ink'
              }`}
            >
              <span className="font-mono text-base w-5 text-center leading-none">
                {item.icon}
              </span>
              <span>{item.label}</span>
              <span
                className={`font-mono text-[10px] ml-auto ${
                  isActive ? 'opacity-70' : 'text-muted/50'
                }`}
              >
                {item.number}
              </span>
            </button>
          )
        })}
      </nav>

      {/* Theme toggle */}
      <div className="mt-6 px-1">
        <button
          onClick={toggle}
          className="btn-neumorphic w-full flex items-center justify-between px-3 py-2.5 text-sm"
        >
          <span className="text-muted text-xs font-mono uppercase tracking-wider">
            {theme === 'dark' ? 'Dark' : 'Light'}
          </span>
          <div
            className={`w-10 h-5 rounded-full relative transition-all ${
              theme === 'dark' ? 'bg-primary/30' : 'bg-primary/20'
            }`}
            style={{ boxShadow: 'var(--shadow-input)' }}
          >
            <div
              className={`absolute top-0.5 w-4 h-4 rounded-full transition-all`}
              style={{
                background: 'var(--color-primary)',
                left: theme === 'dark' ? '22px' : '2px',
                boxShadow: 'var(--shadow-btn)',
              }}
            />
          </div>
        </button>
      </div>
    </aside>
  )
}
