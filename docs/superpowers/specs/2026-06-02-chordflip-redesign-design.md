# ChordFlip Redesign — Design Spec
**Data:** 2026-06-02  
**Escopo:** Fluxo wizard → resultado + export MIDI por instrumento separado

---

## Contexto e Problema

### Usuário-alvo
Produtor iniciante sem teoria musical. Perfil:
- Não entende Fmaj7, graus romanos, borrowed chords
- Usa ChordFy hoje: busca música → pega escala → vai pro Ableton
- No Ableton: sabe arrastar MIDI, criar faixas, usar VSTs. Não empilha acordes
- Quer harmonia mais rica sem estudar teoria

### Problemas do SidebarPage atual
1. Análise harmônica no centro (borrowed chords, modo Dórico) — iniciante fecha o app
2. 3 colunas simultâneas sem orientação — não sabe por onde começar
3. "Gerar remix" antes de ouvir qualquer coisa — quer ouvir primeiro, escolher depois
4. 4 MiniPlayers simultâneos sem diferenciação clara — paralisia de escolha
5. Download → um arquivo MIDI só → abre no Ableton como uma faixa → não sabe que instrumento colocar → abandona

---

## Fluxo Geral

```
[Home] AIWizard (4 passos, tela cheia progressiva)
   ↓ completa
[ResultsPage] AI Coach + 4 MiniPlayers + Export por instrumento
   ↓ link discreto no rodapé
[Advanced] Studio completo (sem mudanças)
```

---

## Seção 1 — AIWizard (Home)

Componente `AIWizard.tsx` já existe. Mantém a estrutura de 4 passos progressivos:

| Passo | Pergunta | Input |
|---|---|---|
| 1 | Qual música você quer remixar? | Autocomplete iTunes |
| 2 | Qual estilo? | Chips: House / Deep / Lo-fi / Jazz / Techno... |
| 3 | Qual BPM? | Slider com sugestão da análise |
| 4 | Qual feeling? | Chips: Groovy / Soulful / Dark / Tribal... |

**Análise em background:** ao selecionar a música no passo 1, `AIWizard` dispara `fetch('/api/analyze-song', { body: { songId, title, artist } })` e armazena a Promise em ref. Quando o usuário chega ao passo 4 e confirma, aguarda a Promise (geralmente já resolvida) antes de chamar `onComplete`.

**Callback de conclusão:** `AIWizard` chama `onComplete({ song, style, bpm, feeling, analysis })` → `App.tsx` muda `appMode` para `'results'` e passa os dados para `ResultsPage`.

---

## Seção 2 — ResultsPage

### Layout
```
[Cover pequena]  Nome da música — Artista
                 Estilo · BPM · N acordes

[AI Coach — 3 frases em linguagem de produtor]

[MiniPlayer 1: 3 notas — "Clean"]
[MiniPlayer 2: 4 notas — "Quente"]
[MiniPlayer 3: 5 notas — "Rico"]
[MiniPlayer 4: 6 notas — "Completo"]

[Botão: Baixar tudo →  zip com todos os instrumentos]

[Link discreto: → Modo avançado]
```

### Labels dos MiniPlayers

| Extensão | Label principal | Tagline |
|---|---|---|
| tri (3 notas) | Clean | Direto ao ponto |
| 7 (4 notas) | Quente | Mais corpo |
| 9 (5 notas) | Rico | Harmonia densa |
| 11 (6 notas) | Completo | Arranjo cheio |

### O que NÃO aparece na ResultsPage
- Progressão em graus romanos
- Análise de borrowed chords
- "Guia do remix" técnico
- Análise de seções detalhada

Esses elementos ficam disponíveis apenas no **Modo Avançado**.

---

## Seção 3 — AI Coach Summary

Bloco de texto no topo da ResultsPage, gerado pelo Groq.

### Formato
```
"Essa progressão tem energia melancólica com urgência. Funciona bem em House
porque o baixo sustentado dá peso sem perder o movimento. O piano com 5 notas
vai soar mais denso — ótimo pra criar aquele feeling noturno."
```

### Regras para o prompt do Groq
- Máximo 3 frases
- Zero termos de teoria musical (sem Fmaj7, modo dórico, ii-V-I, etc.)
- Foco em: como soa emocionalmente, por que funciona no estilo escolhido, qual das 4 versões favorece qual mood
- Campo novo no response schema: `explanation: string`
- Adicionado a `api/analyze-song.ts`

---

## Seção 4 — Export MIDI por Instrumento

### Download individual (por MiniPlayer)
Botão "Baixar" em cada MiniPlayer gera zip com os instrumentos melódicos separados:

```
blinding-lights-house-4notas/
  piano.mid
  bass.mid
  arpejo.mid
  pad.mid
  lead.mid
```

### "Baixar tudo"
Botão no rodapé da ResultsPage gera zip master com as 4 extensões:

```
blinding-lights-house/
  3notas/
    piano.mid  bass.mid  arpejo.mid  pad.mid  lead.mid
  4notas/
    piano.mid  bass.mid  arpejo.mid  pad.mid  lead.mid
  5notas/
    ...
  6notas/
    ...
```

### Bateria
Não incluída no MIDI (Tone.js / MembraneSynth não gera pitch definido para percussão).  
Aviso visível antes do botão de download: *"Bateria não inclusa — adicione sua bateria no Ableton."*

### Implementação
`handleExport` em `MiniPlayer.tsx` já usa `fflate` + `trackBytes`. A mudança é iterar sobre cada instrumento gerando **um arquivo `.mid` separado por instrumento** (cada um com uma única track), agrupados num zip via `fflate.zipSync`. Não usar multi-channel num arquivo só — DAWs como Ableton tratam melhor arquivos individuais.

---

## Seção 5 — Arquivos a Modificar

| Arquivo | Mudança |
|---|---|
| `src/App.tsx` | `appMode === 'home'` renderiza `AIWizard`; callback `onComplete` → `setAppMode('results')` passando dados |
| `src/components/AIWizard.tsx` | Adaptar `onComplete` callback para incluir `analysis`; disparar análise Groq em background no passo 1 |
| `src/components/ResultsPage.tsx` | Adicionar: AI Coach summary no topo, labels/taglines nos MiniPlayers, botão "Baixar tudo" no rodapé |
| `src/components/MiniPlayer.tsx` | `handleExport` → gerar zip com arquivos separados por instrumento |
| `api/analyze-song.ts` | Prompt Groq: adicionar campo `explanation` (3 frases, linguagem de produtor, zero teoria) |
| `src/components/SidebarPage.tsx` | Sem mudanças (mantido como referência, não acessível do fluxo principal) |

---

## O que não muda
- Studio avançado (`appMode === 'advanced'`) — sem alterações
- Tone.js / síntese de áudio — sem alterações
- GENRES, density, groove — sem alterações
- Piano roll (PianoRollMini) — mantido nos MiniPlayers
- TabPlayer como Remix Preview na ResultsPage — mantido

---

## Critérios de sucesso
1. Usuário sem teoria musical completa o fluxo wizard → ouve → baixa sem se perder
2. Arquivo zip baixado abre no Ableton como múltiplas faixas organizadas (uma por instrumento)
3. AI Coach summary não contém nenhum termo de teoria musical
4. Bateria tem aviso claro antes do download
