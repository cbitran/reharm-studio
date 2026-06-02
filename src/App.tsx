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
import { SimpleWizard, type SimpleWizardResult } from './components/SimpleWizard'
import { ResultsPage } from './components/ResultsPage'
import type { Extension, ViradasMode, ReharmChord } from './types'
import type { SavedProject } from './lib/projects'
import { useAI } from './contexts/AIContext'
import { AIWizard } from './components/AIWizard'
import { AIPanel } from './components/AIPanel'


const KEY_TO_NUM: Record<string, number> = {
  C:0,'C#':1,Db:1,D:2,'D#':3,Eb:3,E:4,F:5,'F#':6,Gb:6,G:7,'G#':8,Ab:8,A:9,'A#':10,Bb:10,B:11
}

const STYLE_EXT: Record<string, Extension> = {
  'House':'7','Deep House':'9','Gospel House':'9','Afro House':'9',
  'Lo-fi':'7','Jazz':'9','Pop':'tri','Techno':'tri',
}

const STYLE_MOOD: Record<string, string[]> = {
  'House':['groovy'],'Deep House':['jazzy','suspended'],'Gospel House':['soulful','uplifting'],
  'Afro House':['tribal','groovy'],'Lo-fi':['suspended'],'Jazz':['jazzy'],'Techno':['dark'],
}

export default function App() {
  const { t } = useTranslation()

  // --- Roteamento principal ---
  const [appMode, setAppMode] = useState<'home' | 'results' | 'advanced'>('home')
  const [wizardResult, setWizardResult] = useState<SimpleWizardResult | null>(null)

  // --- Estado do studio avançado ---
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

  useEffect(() => {
    updateSession({ style: genreName, bpm, tonicNum: autoTonic })
  }, [genreName, bpm, autoTonic])

  const handleAIApply = useCallback((suggestedChords: string[]) => {
    setText(suggestedChords.join(' '))
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

  const enterAdvanced = useCallback((result?: SimpleWizardResult) => {
    if (result) {
      setText(result.analysis.progression)
      if (GENRES[result.genreName]) setGenreName(result.genreName)
      setBpmOverride(result.bpm)
      const suggestedExt = STYLE_EXT[result.genreName]
      if (suggestedExt) setExtOverride(suggestedExt)
      const tonicNum = KEY_TO_NUM[result.analysis.key]
      if (tonicNum !== undefined) setAutoTonic(tonicNum)
      const moods = STYLE_MOOD[result.genreName] ?? []
      setAutoMoods(moods)
    }
    setAppMode('advanced')
  }, [])

  // --- Roteamento ---

  if (appMode === 'home') {
    return (
      <SimpleWizard
        onComplete={(result) => {
          setWizardResult(result)
          setAppMode('results')
        }}
        onAdvanced={() => enterAdvanced()}
      />
    )
  }

  if (appMode === 'results' && wizardResult) {
    return (
      <ResultsPage
        analysis={wizardResult.analysis}
        song={wizardResult.song}
        genreName={wizardResult.genreName}
        bpm={wizardResult.bpm}
        onAdvanced={() => enterAdvanced(wizardResult)}
        onBack={() => setAppMode('home')}
      />
    )
  }

  // --- Studio avançado ---
  return (
    <div className="max-w-[1440px] mx-auto px-8 py-10 pb-20" style={{ background: 'var(--color-bg)' }}>

      {/* Voltar ao início */}
      <div className="mb-4">
        <button
          onClick={() => setAppMode('home')}
          className="font-mono text-xs opacity-60 hover:opacity-100 transition-opacity"
          style={{ color: 'var(--color-muted)' }}
        >
          ← Início
        </button>
      </div>

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
          subtitle={t('sections.searchHint', 'Digite o artista e a música que quer remixar.')}
        />
        <SongSearch
          onAnalysis={(analysis: SongAnalysis) => {
            setText(analysis.progression)
            if (analysis.remix_guide?.bpm) setBpmOverride(analysis.remix_guide.bpm)
            const suggestedExt = STYLE_EXT[analysis.remix_guide?.style ?? genreName]
            if (suggestedExt) setExtOverride(suggestedExt)
            const tonicNum = KEY_TO_NUM[analysis.key]
            if (tonicNum !== undefined) setAutoTonic(tonicNum)
            const moods = STYLE_MOOD[analysis.remix_guide?.style ?? genreName] ?? []
            setAutoMoods(moods)
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
        <h1
          className="font-sans text-5xl font-bold leading-tight"
          style={{ color: 'var(--color-ink)' }}
        >
          {t('hero.title')}
        </h1>
      </header>

      {/* 01 — Acordes */}
      <section id="acordes" className="mb-10 scroll-mt-6">
        <SectionHeader number="01" title={t('sections.chords')} subtitle={t('sections.chordsHint')} />
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
        <SectionHeader number="04" title={t('sections.groove')} subtitle={t('sections.grooveHint')} />
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
        <SectionHeader number="05" title={t('sections.grid')} subtitle={t('sections.gridHint')} />
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
            ext={ext}
            feeling={aiSession.feeling.join(', ')}
            onLoadTab={p => tabPlayerRef.current?.loadTab(p)}
            onChordClick={handleChordAdd}
          />
        </section>
      )}

      {/* 06 — Export */}
      <section id="export" className="mb-10 scroll-mt-6">
        <SectionHeader number="06" title={t('sections.export')} subtitle={t('sections.exportHint')} />
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
