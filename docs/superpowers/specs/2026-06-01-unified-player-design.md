# Reharm Player — Visão Unificada

**Data:** 2026-06-01  
**Status:** Aprovado

## Problema

O app gera progressões harmônicas e exporta MIDI, mas o preview de áudio é uma caixa preta — o usuário ouve tudo junto sem controle por trilha. Não há kick/metrônomo visual, não há como isolar piano, baixo ou harmonia separadamente.

## Solução

Nova seção **"Player"** com trilhas empilhadas, kick como referência rítmica, controles de solo/mute por trilha e seletor de timbre na trilha harmônica.

## Escopo

**Inclui:**
- Kick track (4-on-the-floor ou half-time por gênero)
- Chords track (notas do piano re-roteadas para timbre selecionável)
- Bass track (eventos existentes do `genEvents()`)
- Mute por trilha (silencia a trilha no playback)
- Solo por trilha (silencia todas as outras)
- Seletor de timbre na trilha Chords: Pad | Pluck | Lead | Piano
- Grid visual de 16 steps por barra (igual ao StepGrid existente)

**Não inclui:**
- Edição de notas
- Exportação separada por trilha (já coberto pelo ExportButtons)
- Geração de novas notas além das já existentes
- Strings ou outros instrumentos além dos 3 definidos

## Arquitetura

### Novos arquivos

```
src/
  components/
    UnifiedPlayer.tsx     — container principal
    TrackRow.tsx          — linha individual de trilha (M, S, grid)
  core/
    kick-pattern.ts       — gerador de eventos de kick por gênero
  audio/
    timbres.ts            — presets de timbre para Tone.js
```

### Modificações

- `src/audio/player.ts` — nova função `playUnified()` com suporte a mute/solo/timbre
- `src/App.tsx` — adicionar seção 05.5 com `<UnifiedPlayer />`
- `src/i18n/pt-BR.ts` + `en.ts` + `es.ts` — strings da nova seção

### Interface do UnifiedPlayer

```tsx
interface UnifiedPlayerProps {
  pianoEvents: MidiEvent[]
  bassEvents: MidiEvent[]
  bpm: number
  genre: GenreDefinition
  genreName: string
  swing: number
  viradas: ViradasMode
}
```

### Estado interno

```ts
type Timbre = 'pad' | 'pluck' | 'lead' | 'piano'
type TrackId = 'kick' | 'chords' | 'bass'

state: {
  playing: boolean
  muted: Set<TrackId>
  solo: TrackId | null
  timbre: Timbre
}
```

### Engine de áudio

`playUnified()` recebe eventos de cada trilha + estado de mute/solo + timbre:

1. Resolve quais trilhas tocam: se `solo` está ativo, só essa toca. Senão, todas as não-mutadas.
2. Cria sintetizadores por trilha:
   - Kick: `MembraneSynth` do Tone.js (nota C1, attack curto)
   - Chords: `PolySynth` com parâmetros do timbre selecionado
   - Bass: `MonoSynth` existente
3. Dispara eventos no timeline do Tone.js
4. Callback `onEnd` ao terminar

### Timbres (Chords)

| Timbre | Oscilador | Attack | Release | Efeito |
|--------|-----------|--------|---------|--------|
| Piano  | fatsawtooth (existente) | 0.03 | 0.8 | Reverb leve |
| Pad    | sine | 0.4 | 2.0 | Reverb alto, chorus |
| Pluck  | triangle | 0.01 | 0.3 | Delay curto |
| Lead   | sawtooth | 0.02 | 0.5 | Distortion leve |

### Kick pattern

```ts
// 4-on-the-floor (House, Deep House, Techno)
steps: [0, 4, 8, 12]  // beats do compasso 4/4

// Half-time (Lo-fi, Jazz)
steps: [0, 8]

// Off (nenhum)
steps: []
```

Mapeado por `genreName` em `kick-pattern.ts`.

## Visual

```
[ ▶ Play ]  [ ■ Stop ]   BPM: 120

  Kick    [M][S]  ● · · · ● · · · ● · · · ● · · ·
  Chords  [M][S]  [Pad ▾] ██ · · █ · · ██ · · █ · ·
  Bass    [M][S]  █ · · · · █ · · · · █ · · · · █ ·
```

- Trilha mutada: opacidade 40%, label riscado
- Trilha em solo: badge "SOLO" destacado com cor primária
- Kick: dots `●` nas posições ativas, estilo diferenciado (branco/ouro)
- Seletor de timbre: dropdown pequeno só na trilha Chords

## Localização

Novas chaves i18n:

```
player.title = "Player"
player.kick = "Kick"
player.chords = "Chords"
player.bass = "Bass"
player.mute = "M"
player.solo = "S"
player.timbrePad = "Pad"
player.timbrePluck = "Pluck"
player.timbreLead = "Lead"
player.timbrePiano = "Piano"
```

## Dependências

- Tone.js `MembraneSynth` (já no pacote, não usado ainda)
- Eventos existentes de `genEvents()` — sem mudança no core

## Critérios de sucesso

1. Usuário clica Play — ouve kick + chords + bass sincronizados
2. Mutar Bass — kick e chords continuam, bass silencia imediatamente
3. Solar Piano — só chords toca, kick e bass silenciam
4. Trocar timbre para Pad — sons mudam sem parar o playback (na próxima pressão de Play)
5. Grid mostra steps ativos corretamente por barra
