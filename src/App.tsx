import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
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
import { SongSearch, type SongAnalysis } from './components/SongSearch'
import { TabPlayer, type TabPlayerHandle } from './components/TabPlayer'
import { ProgressionBrowser } from './components/ProgressionBrowser'
import type { Extension, ViradasMode, ReharmChord } from './types'
import type { SavedProject } from './lib/projects'
import { useAI } from './contexts/AIContext'
import { AIWizard } from './components/AIWizard'
import { AIPanel } from './components/AIPanel'
import { InlineWizard, type InlineWizardResult } from './components/InlineWizard'
import { GuideNarration } from './components/GuideNarration'


// Converte nome de nota para número (C=0, F=5, etc.)
const KEY_TO_NUM: Record<string, number> = {
  C:0,'C#':1,Db:1,D:2,'D#':3,Eb:3,E:4,F:5,'F#':6,Gb:6,G:7,'G#':8,Ab:8,A:9,'A#':10,Bb:10,B:11
}

// Extensão recomendada por estilo
const STYLE_EXT: Record<string, Extension> = {
  'House':'7','Deep House':'9','Gospel House':'9','Afro House':'9',
  'Lo-fi':'7','Jazz':'9','Pop':'tri','Techno':'tri',
}

// Mood recomendado por estilo
const STYLE_MOOD: Record<string, string[]> = {
  'House':['groovy'],'Deep House':['jazzy','suspended'],'Gospel House':['soulful','uplifting'],
  'Afro House':['tribal','groovy'],'Lo-fi':['suspended'],'Jazz':['jazzy'],'Techno':['dark'],
}

export default function App() {
  const { t } = useTranslation()
  const [text, setText] = useState('F Am Bb C')
  const [genreName, setGenreName] = useState('House')
  const [extOverride, setExtOverride] = useState<Extension | null>(null)
  const [bpmOverride, setBpmOverride] = useState<number | null>(null)
  const [swing, setSwing] = useState(58)
  const [viradas, setViradas] = useState<ViradasMode>('antecip')
  const [playing, setPlaying] = useState(false)
  const [selectedSkeletonId, setSelectedSkeletonId] = useState<string | null>(null)
  const [autoTonic, setAutoTonic] = useState<number | null>(null)
  const [autoMoods, setAutoMoods] = useState<string[]>([])

  const genre = GENRES[genreName]!
  const ext = extOverride ?? genre.ext
  const bpm = bpmOverride ?? genre.bpm

  const { updateSession, badges, session: aiSession } = useAI()
  const tabPlayerRef = useRef<TabPlayerHandle>(null)

  // Controla o fluxo de entrada: wizard → guia passo a passo → studio completo
  const [inlineWizardDone, setInlineWizardDone] = useState(false)
  const [guideStep, setGuideStep] = useState(0)   // 0-3: etapas do guia
  const [guideDone, setGuideDone] = useState(false) // true: studio completo
  const [wizardResult, setWizardResult] = useState<InlineWizardResult | null>(null)

  // Sincroniza estado do App com o AIContext para que a IA sempre tenha o snapshot atual
  useEffect(() => {
    updateSession({
      style: genreName,
      bpm,
      tonicNum: autoTonic,
    })
  }, [genreName, bpm, autoTonic])

  const handleAIApply = useCallback((suggestedChords: string[]) => {
    setText(suggestedChords.join(' '))
  }, [])

  const handleInlineWizardComplete = useCallback((result: InlineWizardResult) => {
    // Aplica a sugestão da IA no estado do App
    setText(result.chords.join(' '))
    if (GENRES[result.style]) {
      setGenreName(result.style)
      setExtOverride(STYLE_EXT[result.style] ?? null)
    }
    setBpmOverride(result.bpm)
    if (STYLE_MOOD[result.style]) setAutoMoods(STYLE_MOOD[result.style])
    setWizardResult(result)
    setGuideStep(0)
    setInlineWizardDone(true)
  }, [])

  const handleGuideNext = useCallback(() => {
    setGuideStep(s => s + 1)
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50)
  }, [])

  const handleChordAdd = useCallback((chord: string) => {
    setText(prev => {
      const trimmed = prev.trim()
      return trimmed ? `${trimmed} ${chord}` : chord
    })
  }, [])

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

  // Tela de entrada: wizard inline
  if (!inlineWizardDone) {
    return (
      <div className="max-w-[1440px] mx-auto px-8" style={{ background: 'var(--color-bg)' }}>
        <InlineWizard
          onComplete={handleInlineWizardComplete}
          onSkip={() => { setInlineWizardDone(true); setGuideDone(true) }}
        />
        <AIWizard />
        <AIPanel onApply={handleAIApply} />
      </div>
    )
  }

  // Fluxo guiado pós-wizard (4 passos progressivos)
  if (!guideDone && wizardResult) {
    return (
      <div className="max-w-[1440px] mx-auto px-8 py-10 pb-20" style={{ background: 'var(--color-bg)' }}>
        <GuideNarration
          step={guideStep}
          result={wizardResult}
          onNext={handleGuideNext}
          onDone={() => setGuideDone(true)}
        />

        {/* Remix Preview — visível desde o passo 0 */}
        {parsedChords.length > 0 && (
          <section className="mb-6">
            <TabPlayer
              ref={tabPlayerRef}
              initialChords={text}
              genre={genre}
              genreName={genreName}
              bpm={bpm}
              ext={ext}
              swing={swing}
              viradas={viradas}
            />
          </section>
        )}

        {/* Progression Browser — aparece junto com o player */}
        {parsedChords.length > 0 && aiSession.song && (
          <section className="mb-10">
            <ProgressionBrowser
              artist={aiSession.song.artist}
              title={aiSession.song.title}
              mainChords={text}
              style={genreName}
              bpm={bpm}
              feeling={aiSession.feeling.join(', ')}
              onLoadTab={p => tabPlayerRef.current?.loadTab(p)}
              onChordClick={handleChordAdd}
            />
          </section>
        )}

        {/* Campo Harmônico — aparece no passo 1 */}
        {guideStep >= 1 && (
          <section className="mb-10">
            <HarmonicField
              ext={ext}
              onExtChange={setExtOverride}
              tonicOverride={autoTonic}
              moodOverride={autoMoods}
              badges={badges}
              onChordClick={chord => {
                const current = text.trim()
                setText(current ? `${current} ${chord.tok}` : chord.tok)
              }}
            />
          </section>
        )}

        <AIWizard />
        <AIPanel onApply={handleAIApply} />
      </div>
    )
  }

  return (
    <div className="max-w-[1440px] mx-auto px-8 py-10 pb-20" style={{ background: 'var(--color-bg)' }}>

      {/* Barra de projetos */}
      <ProjectBar
        state={{ text, genreName, extOverride, bpmOverride, swing, viradas, selectedSkeletonId }}
        onLoad={handleLoadProject}
      />

      {/* 00 — Busca por música */}
      <section className="mb-10">
        <SectionHeader
          number="00"
          title={t('sections.search', 'Buscar música')}
          subtitle={t('sections.searchHint', 'Digite o artista e a música que quer remixar. O sistema identifica a tonalidade e gera o guia do remix.')}
        />
        <SongSearch
          onAnalysis={(analysis: SongAnalysis) => {
            // Preenche acordes
            setText(analysis.progression)
            // Ajusta BPM para o estilo alvo
            if (analysis.remix_guide?.bpm) setBpmOverride(analysis.remix_guide.bpm)
            // Seleciona extensão ideal para o estilo
            const suggestedExt = STYLE_EXT[analysis.remix_guide?.style ?? genreName]
            if (suggestedExt) setExtOverride(suggestedExt)
            // Define tonalidade no campo harmônico
            const tonicNum = KEY_TO_NUM[analysis.key]
            if (tonicNum !== undefined) setAutoTonic(tonicNum)
            // Ativa moods compatíveis
            const moods = STYLE_MOOD[analysis.remix_guide?.style ?? genreName] ?? []
            setAutoMoods(moods)
            // Ativa viradas para estilos que precisam de groove
            if (['House','Deep House','Gospel House','Afro House'].includes(analysis.remix_guide?.style ?? '')) {
              setViradas('antecip')
              setSwing(58)
            }
          }}
          targetStyle={genreName}
          targetBpm={bpm}
        />
      </section>

      {/* Header */}
      <header className="mb-10">
        <div
          className="font-mono text-[10px] uppercase tracking-[4px] mb-3"
          style={{ color: 'var(--color-muted)' }}
        >
          {t('hero.kicker')}
        </div>
        <h1
          className="font-sans text-5xl font-bold leading-tight"
          style={{ color: 'var(--color-ink)' }}
        >
          {t('hero.title')}
        </h1>
        <p className="text-base mt-2 max-w-lg leading-relaxed" style={{ color: 'var(--color-muted)' }}>
          {t('hero.subtitle')}
        </p>
      </header>

      {/* 01 — Acordes */}
      <section id="acordes" className="mb-10 scroll-mt-6">
        <SectionHeader
          number="01"
          title={t('sections.chords')}
          subtitle={t('sections.chordsHint')}
        />
        <ChordInput value={text} onChange={setText} reharm={reharm} bad={bad} />
      </section>

      {/* 02 — Estilo */}
      <section id="estilo" className="mb-10 scroll-mt-6">
        <SectionHeader number="02" title={t('sections.style')} subtitle={t('sections.styleHint')} />
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
          title={t('sections.harmonic')}
          subtitle={t('sections.harmonicHint')}
        />
        <HarmonicField
          ext={ext}
          onExtChange={setExtOverride}
          tonicOverride={autoTonic}
          moodOverride={autoMoods}
          badges={badges}
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
          title={t('sections.groove')}
          subtitle={t('sections.grooveHint')}
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
          title={t('sections.grid')}
          subtitle={t('sections.gridHint')}
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

      {/* 05.5 — Remix Preview */}
      {parsedChords.length > 0 && (
        <section id="remix-preview" className="mb-6 scroll-mt-6">
          <SectionHeader
            number="05.5"
            title={t('sections.player', 'Remix Preview')}
            subtitle={t('sections.playerHint', '')}
          />
          <TabPlayer
            ref={tabPlayerRef}
            initialChords={text}
            genre={genre}
            genreName={genreName}
            bpm={bpm}
            ext={ext}
            swing={swing}
            viradas={viradas}
          />
        </section>
      )}

      {/* 05.6 — Progression Browser */}
      {parsedChords.length > 0 && aiSession.song && (
        <section id="progression-browser" className="mb-10 scroll-mt-6">
          <ProgressionBrowser
            artist={aiSession.song.artist}
            title={aiSession.song.title}
            mainChords={text}
            style={genreName}
            bpm={bpm}
            feeling={aiSession.feeling.join(', ')}
            onLoadTab={p => tabPlayerRef.current?.loadTab(p)}
            onChordClick={handleChordAdd}
          />
        </section>
      )}

      {/* 06 — Export */}
      <section id="export" className="mb-10 scroll-mt-6">
        <SectionHeader
          number="06"
          title={t('sections.export')}
          subtitle={t('sections.exportHint')}
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
          songName={aiSession.song ? `${aiSession.song.title} ${aiSession.song.artist}` : undefined}
          playing={playing}
          onPlay={handlePlay}
        />
      </section>

      {/* 07 — Instrumentos */}
      <section id="instrumentos" className="mb-10 scroll-mt-6">
        <SectionHeader
          number="07"
          title={t('sections.instruments')}
          subtitle={`${t('sections.instruments')} · ${genreName}`}
        />
        <InstrumentGuide genreName={genreName} inst={genre.inst} />
      </section>

      <AIWizard />
      <AIPanel onApply={handleAIApply} />

    </div>
  )
}
