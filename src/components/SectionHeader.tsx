interface Props {
  number: string
  title: string
  subtitle?: string
}

export function SectionHeader({ number, title, subtitle }: Props) {
  return (
    <div className="mb-6">
      <div className="flex items-baseline gap-3">
        <span
          className="font-mono text-[11px] tracking-[3px] uppercase"
          style={{ color: 'var(--color-primary)' }}
        >
          {number}
        </span>
        <h2 className="font-sans text-2xl font-semibold" style={{ color: 'var(--color-ink)' }}>
          {title}
        </h2>
      </div>
      {subtitle && (
        <p className="text-sm mt-1.5 ml-10" style={{ color: 'var(--color-muted)' }}>
          {subtitle}
        </p>
      )}
    </div>
  )
}
