import { useState, useMemo, useCallback } from 'react'
import { parseProg } from './core/parser'
import { reVoice, nameChord } from './core/reharmonizer'
import { genEvents, TPQ } from './core/groove'
import { playEvents, stopAll } from './audio/player'
import { GENRES } from './genres'
import { SectionHeader } from './components/SectionHeader'
import { ChordInput } from './components/ChordInput'
import { GenreSelector } from './components/GenreSelector'
import { GrooveControls } from './components/GrooveControls'
import { StepGrid } from './components/StepGrid'
import { ExportButtons } from './components/ExportButtons'
import { InstrumentGuide } from './components/InstrumentGuide'
import { HarmonicField } from './components/HarmonicField'
import { ProjectBar } from './components/ProjectBar'
import type { Extension, ViradasMode, ReharmChord } from './types'
import type { SavedProject } from './lib/projects'


export default function App() {
  const [text, setText] = useState('F Am Bb C')
  const [genreName, setGenreName] = useState('House')
  const [extOverride, setExtOverride] = useState<Extension | null>(null)
  const [bpmOverride, setBpmOverride] = useState<number | null>(null)
  const [swing, setSwing] = useState(58)
  const [viradas, setViradas] = useState<ViradasMode>('antecip')
  const [playing, setPlaying] = useState(false)
  const [selectedSkeletonId, setSelectedSkeletonId] = useState<string | null>(null)

  const genre = GENRES[genreName]!
  const ext = extOverride ?? genre.ext
  const bpm = bpmOverride ?? genre.bpm

  const { chords: parsedChords, bad } = useMemo(() => parseProg(text), [text])

  const reharm: ReharmChord[] = useMemo(
    () =>
      parsedChords.map(c => {
        const reharmonizedIntervals = reVoice(c.intervals, ext)
        return { ...c, reharmonizedIntervals, name: nameChord(c.root, reharmonizedIntervals) }
      }),
    [parsedChords, ext],
  )

  const { pe, be } = useMemo(() => {
    if (!parsedChords.length) return { pe: [], be: [] }
    return genEvents(parsedChords, ext, genre, swing / 100, viradas)
  }, [parsedChords, ext, genre, swing, viradas])

  const handlePlay = useCallback(async () => {
    if (!parsedChords.length) return
    if (playing) { stopAll(); setPlaying(false); return }
    setPlaying(true)
    await playEvents(pe, be, bpm, TPQ, () => setPlaying(false))
  }, [parsedChords, playing, pe, be, bpm])

  const handleGenreChange = (g: string) => {
    setGenreName(g)
    setExtOverride(null)
    setBpmOverride(null)
  }

  const handleLoadProject = (project: SavedProject) => {
    setText(project.text)
    setGenreName(project.genreName)
    setExtOverride(project.extOverride)
    setBpmOverride(project.bpmOverride)
    setSwing(project.swing)
    setViradas(project.viradas)
    setSelectedSkeletonId(project.selectedSkeletonId)
  }

  return (
    <div className="max-w-[1440px] mx-auto px-8 py-10 pb-20" style={{ background: 'var(--color-bg)' }}>

      {/* Barra de projetos */}
      <ProjectBar
        state={{ text, genreName, extOverride, bpmOverride, swing, viradas, selectedSkeletonId }}
        onLoad={handleLoadProject}
      />

      {/* Header */}
      <header className="mb-10">
        <div
          className="font-mono text-[10px] uppercase tracking-[4px] mb-3"
          style={{ color: 'var(--color-muted)' }}
        >
          Acordes → MIDI por Estilo
        </div>
        <h1
          className="font-sans text-5xl font-bold leading-tight"
          style={{ color: 'var(--color-ink)' }}
        >
          Reharm Studio
        </h1>
        <p className="text-base mt-2 max-w-lg leading-relaxed" style={{ color: 'var(--color-muted)' }}>
          Cole os acordes da música, escolha o estilo e o groove,
          e baixe o MIDI de piano e baixo — pronto pro Ableton.
        </p>
      </header>

      {/* 01 — Acordes */}
      <section id="acordes" className="mb-10 scroll-mt-6">
        <SectionHeader
          number="01"
          title="Cole os acordes"
          subtitle="Copie do Chordify ou Ultimate Guitar. Use C7 onde quiser dominante."
        />
        <ChordInput value={text} onChange={setText} reharm={reharm} bad={bad} />
      </section>

      {/* 02 — Estilo */}
      <section id="estilo" className="mb-10 scroll-mt-6">
        <SectionHeader number="02" title="Estilo" subtitle="Escolha o gênero e ajuste extensão e BPM." />
        <GenreSelector
          genre={genreName}
          ext={ext}
          bpm={bpm}
          onGenre={handleGenreChange}
          onExt={setExtOverride}
          onBpm={v => setBpmOverride(typeof v === 'function' ? v(bpm) : v)}
        />
      </section>

      {/* 03 — Campo Harmônico */}
      <section id="progressoes" className="mb-10 scroll-mt-6">
        <SectionHeader
          number="03"
          title="Campo Harmônico"
          subtitle="Escolha a tonalidade e clique nos acordes para montar sua progressão. Nunca vai errar."
        />
        <HarmonicField
          ext={ext}
          onExtChange={setExtOverride}
          onChordClick={chord => {
            const current = text.trim()
            setText(current ? `${current} ${chord.tok}` : chord.tok)
          }}
        />
      </section>

      {/* 04 — Groove */}
      <section id="groove" className="mb-10 scroll-mt-6">
        <SectionHeader
          number="04"
          title="Groove"
          subtitle="Swing e viradas definem o balanço rítmico do MIDI gerado."
        />
        <GrooveControls
          swing={swing}
          viradas={viradas}
          onSwing={setSwing}
          onViradas={v => {
            setViradas(v)
            if (v !== 'off' && swing === 50) setSwing(58)
          }}
        />
      </section>

      {/* 05 — Grid */}
      <section id="grid" className="mb-10 scroll-mt-6">
        <SectionHeader
          number="05"
          title="Grid rítmico"
          subtitle="Visualização dos eventos gerados no grid de 16 steps."
        />
        {parsedChords.length > 0 ? (
          <div className="card p-6">
            <StepGrid pianoEvents={pe} bassEvents={be} bars={parsedChords.length} bpm={bpm} />
          </div>
        ) : (
          <div className="card p-6">
            <p className="font-mono text-sm" style={{ color: 'var(--color-muted)' }}>
              Adicione acordes para ver o grid.
            </p>
          </div>
        )}
      </section>

      {/* 06 — Export */}
      <section id="export" className="mb-10 scroll-mt-6">
        <SectionHeader
          number="06"
          title="Resultado"
          subtitle="Ouça o preview e baixe os MIDIs separados por instrumento."
        />
        <ExportButtons
          chords={parsedChords}
          ext={ext}
          genre={genre}
          genreName={genreName}
          bpm={bpm}
          swing={swing}
          viradas={viradas}
          sectionName="remix"
          playing={playing}
          onPlay={handlePlay}
        />
      </section>

      {/* 07 — Instrumentos */}
      <section id="instrumentos" className="mb-10 scroll-mt-6">
        <SectionHeader
          number="07"
          title="Instrumentos sugeridos"
          subtitle={`Devices e dicas de produção para ${genreName}.`}
        />
        <InstrumentGuide genreName={genreName} inst={genre.inst} />
      </section>

    </div>
  )
}
