import { useState, useRef } from 'react'

interface Props {
  content: string
  children: React.ReactNode
  position?: 'top' | 'bottom' | 'right'
}

export function Tooltip({ content, children, position = 'top' }: Props) {
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const positionClass = {
    top:    'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    right:  'left-full top-1/2 -translate-y-1/2 ml-2',
  }[position]

  return (
    <div
      ref={ref}
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div
          className={`absolute z-50 w-52 px-3 py-2 rounded-xl text-xs leading-relaxed pointer-events-none ${positionClass}`}
          style={{
            background: 'var(--color-ink)',
            color: 'var(--color-bg)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          }}
        >
          {content}
        </div>
      )}
    </div>
  )
}

// Ícone de ajuda padrão
export function HelpIcon({ tip, position }: { tip: string; position?: 'top' | 'bottom' | 'right' }) {
  return (
    <Tooltip content={tip} position={position}>
      <span
        className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold cursor-help ml-1 shrink-0"
        style={{
          background: 'var(--color-bg)',
          color: 'var(--color-muted)',
          boxShadow: 'var(--shadow-btn)',
          lineHeight: 1,
        }}
      >
        ?
      </span>
    </Tooltip>
  )
}
