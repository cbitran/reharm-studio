import type { InlineWizardResult } from './InlineWizard'

interface Props {
  step: number
  result: InlineWizardResult
  onNext: () => void
  onDone: () => void
}

const STEP_LABELS = [
  'Quero explorar mais acordes →',
  'Entrar no studio completo →',
]

export function GuideNarration({ step, result, onNext, onDone }: Props) {
  const isLast = step === 1

  return (
    <div
      className="rounded-2xl p-6 mb-8"
      style={{
        background: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {/* Header IA */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-base" style={{ color: 'var(--color-primary)' }}>✦</span>
        <span className="font-mono text-[10px] uppercase tracking-[3px]" style={{ color: 'var(--color-primary)' }}>
          AI Coach
        </span>
      </div>

      {/* Passo 0 — Entrega: player + acordes + explicação */}
      {step === 0 && (
        <div className="space-y-4">
          <p className="font-semibold text-base" style={{ color: 'var(--color-ink)' }}>
            {result.song
              ? `Pronto. Para o seu remix de "${result.song.title}" em ${result.style}, aqui está o que eu construí:`
              : `Pronto. Aqui está a progressão que eu construí para ${result.style} a ${result.bpm} BPM:`}
          </p>

          {/* Acordes gerados */}
          <div className="flex flex-wrap gap-2">
            {result.chords.map((chord, i) => (
              <span
                key={i}
                className="px-5 py-2.5 rounded-xl text-base font-bold"
                style={{ background: 'var(--color-primary)', color: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
              >
                {chord}
              </span>
            ))}
          </div>

          {/* Explicação em linguagem de produtor */}
          {result.explanation && (
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-muted)' }}>
              {result.explanation}
            </p>
          )}

          {/* Call to action para o player */}
          <p className="text-sm font-medium" style={{ color: 'var(--color-primary)' }}>
            ↓ Dê um play abaixo e ouça como vai soar. Mute ou solo as trilhas para ouvir cada camada separada.
          </p>
        </div>
      )}

      {/* Passo 1 — Campo Harmônico */}
      {step === 1 && (
        <div className="space-y-2">
          <p className="font-semibold text-base" style={{ color: 'var(--color-ink)' }}>
            Quer trocar algum acorde?
          </p>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-muted)' }}>
            Abaixo você vê todos os acordes que combinam com esse contexto. Clique em qualquer um para adicioná-lo
            à sua progressão — e ouça o resultado no player. Os ícones{' '}
            <span>🟢</span><span>🟡</span><span>🔴</span>{' '}
            mostram o quanto cada acorde encaixa no clima do seu remix.
          </p>
        </div>
      )}

      {/* CTA */}
      <div className="flex items-center justify-between mt-5">
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="text-xs"
          style={{ color: 'var(--color-muted)', opacity: 0.6 }}
        >
          ↑ Ver do início
        </button>
        <button
          onClick={isLast ? onDone : onNext}
          className="btn-primary px-6 py-2.5 text-sm rounded-xl"
        >
          {STEP_LABELS[step]}
        </button>
      </div>
    </div>
  )
}
