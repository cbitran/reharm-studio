import { GENRES, GENRE_NAMES, EXT_LABEL } from '../genres'
import type { Extension } from '../types'

interface Props {
  genre: string
  ext: Extension
  bpm: number
  onGenre: (g: string) => void
  onExt: (e: Extension) => void
  onBpm: (b: number | ((prev: number) => number)) => void
}

export function GenreSelector({ genre, ext, bpm, onGenre, onExt, onBpm }: Props) {
  return (
    <div className="card p-6 space-y-5">
      {/* Gêneros */}
      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest mb-3" style={{ color: 'var(--color-muted)' }}>
          Gênero
        </p>
        <div className="flex flex-wrap gap-2">
          {GENRE_NAMES.map(g => {
            const active = genre === g
            return (
              <button
                key={g}
                onClick={() => onGenre(g)}
                className={`flex flex-col gap-1 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                  active ? 'btn-primary' : 'btn-neumorphic'
                }`}
                style={active ? {} : { color: 'var(--color-ink)' }}
              >
                {g}
                <span className="font-mono text-[10px] opacity-60 font-normal">
                  {GENRES[g]?.bpm} BPM
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Extensão + BPM */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-muted)' }}>
            Extensão
          </span>
          {(['tri', '7', '9', '11'] as Extension[]).map(x => (
            <button
              key={x}
              onClick={() => onExt(x)}
              className={`font-mono text-xs rounded-xl px-3 py-2 transition-all ${
                ext === x ? 'btn-primary' : 'btn-neumorphic'
              }`}
              style={ext !== x ? { color: 'var(--color-ink)' } : {}}
            >
              {EXT_LABEL[x]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 ml-2">
          <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-muted)' }}>
            BPM
          </span>
          <div
            className="flex items-center rounded-xl overflow-hidden"
            style={{
              background: 'var(--color-bg)',
              boxShadow: 'var(--shadow-input)',
              border: '1px solid var(--color-border)',
            }}
          >
            <button
              onClick={() => onBpm(Math.max(50, bpm - 1))}
              onMouseDown={e => {
                const id = setInterval(() => onBpm(v => Math.max(50, v - 1)), 120)
                const stop = () => clearInterval(id)
                e.currentTarget.addEventListener('mouseup', stop, { once: true })
                window.addEventListener('mouseup', stop, { once: true })
              }}
              className="px-3 py-2 text-base font-light transition-colors select-none"
              style={{ color: 'var(--color-muted)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-primary)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-muted)')}
            >
              −
            </button>
            <input
              type="number"
              value={bpm}
              min={50}
              max={200}
              onChange={e => onBpm(Math.max(50, Math.min(200, Number(e.target.value) || 120)))}
              className="w-12 py-2 font-mono text-sm text-center bg-transparent focus:outline-none"
              style={{ color: 'var(--color-ink)' }}
            />
            <button
              onClick={() => onBpm(Math.min(200, bpm + 1))}
              onMouseDown={e => {
                const id = setInterval(() => onBpm(v => Math.min(200, v + 1)), 120)
                const stop = () => clearInterval(id)
                e.currentTarget.addEventListener('mouseup', stop, { once: true })
                window.addEventListener('mouseup', stop, { once: true })
              }}
              className="px-3 py-2 text-base font-light transition-colors select-none"
              style={{ color: 'var(--color-muted)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-primary)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-muted)')}
            >
              +
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
