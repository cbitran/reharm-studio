import { useTranslation } from 'react-i18next'
import type { TrackId, Timbre, MidiEvent } from '../types'
import { trackBytes, midiFile, downloadMidi } from '../core/midi-writer'

const STEPS = 16

interface TrackRowProps {
  id: TrackId
  label: string
  color: string
  muted: boolean
  solo: boolean
  onMute: () => void
  onSolo: () => void
  activeSteps: number[]
  timbre?: Timbre
  onTimbreChange?: (t: Timbre) => void
  events?: MidiEvent[]
  bpm?: number
  exportName?: string
}

const TIMBRES: Timbre[] = ['pad', 'pluck', 'lead', 'piano']

export function TrackRow({
  id, label, color, muted, solo,
  onMute, onSolo, activeSteps,
  timbre, onTimbreChange,
  events, bpm, exportName,
}: TrackRowProps) {
  const { t } = useTranslation()

  const handleExport = () => {
    if (!events || !bpm || !exportName) return
    downloadMidi(
      midiFile([
        trackBytes([], bpm, 'Tempo'),
        trackBytes(events, null, label),
      ]),
      `${exportName}-${id}.mid`,
    )
  }

  const activeSet = new Set(activeSteps)
  const isKick = id === 'kick'
  const effectiveMuted = muted && !solo

  return (
    <div
      className="flex items-center gap-3 py-2"
      style={{ opacity: effectiveMuted ? 0.4 : 1, transition: 'opacity 0.15s' }}
    >
      <span
        className="font-mono text-[11px] uppercase tracking-widest w-14 shrink-0 text-right"
        style={{
          color: solo ? color : 'var(--color-muted)',
          textDecoration: effectiveMuted ? 'line-through' : 'none',
        }}
      >
        {label}
      </span>

      <button
        onClick={onMute}
        className="font-mono text-[10px] w-6 h-6 rounded flex items-center justify-center shrink-0 transition-all"
        style={{
          background: muted ? 'rgba(232,138,138,0.2)' : 'var(--color-border)',
          color: muted ? '#e88a8a' : 'var(--color-muted)',
          border: muted ? '1px solid #e88a8a' : '1px solid transparent',
        }}
        title={t('player.mute')}
      >
        M
      </button>

      <button
        onClick={onSolo}
        className="font-mono text-[10px] w-6 h-6 rounded flex items-center justify-center shrink-0 transition-all"
        style={{
          background: solo ? `${color}33` : 'var(--color-border)',
          color: solo ? color : 'var(--color-muted)',
          border: solo ? `1px solid ${color}` : '1px solid transparent',
        }}
        title={t('player.solo')}
      >
        S
      </button>

      {timbre && onTimbreChange ? (
        <select
          value={timbre}
          onChange={e => onTimbreChange(e.target.value as Timbre)}
          className="font-mono text-[10px] px-2 py-1 rounded-lg shrink-0"
          style={{
            background: 'var(--color-card)',
            color: 'var(--color-ink)',
            border: '1px solid var(--color-border)',
          }}
        >
          {TIMBRES.map(tb => (
            <option key={tb} value={tb}>
              {t(`player.timbre${tb.charAt(0).toUpperCase() + tb.slice(1)}`)}
            </option>
          ))}
        </select>
      ) : (
        !isKick && <div className="w-16 shrink-0" />
      )}

      <div className="flex-1 flex gap-px">
        {Array.from({ length: STEPS }, (_, i) => {
          const active = activeSet.has(i)
          if (isKick) {
            return (
              <div
                key={i}
                className="flex-1 flex items-center justify-center"
                style={{ height: 16, borderLeft: i % 4 === 0 ? '1px solid rgba(128,128,128,0.15)' : undefined }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: active ? color : 'var(--color-border)',
                    opacity: active ? 1 : 0.35,
                    transition: 'opacity 0.15s',
                  }}
                />
              </div>
            )
          }
          return (
            <div
              key={i}
              className="flex-1 rounded-sm transition-all"
              style={{
                height: 16,
                background: active ? color : 'var(--color-border)',
                opacity: active ? 0.8 : 0.35,
                borderLeft: i % 4 === 0 ? '1px solid rgba(128,128,128,0.15)' : undefined,
              }}
            />
          )
        })}
      </div>

      {!isKick && events ? (
        <button
          onClick={handleExport}
          className="font-mono text-[10px] px-2 py-1 rounded-lg shrink-0 transition-colors"
          style={{
            background: 'var(--color-card)',
            color: 'var(--color-primary)',
            border: '1px solid var(--color-border)',
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = color)}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
        >
          {t('player.exportMidi')}
        </button>
      ) : (
        <div className="w-14 shrink-0" />
      )}
    </div>
  )
}
