# ChordFlip Redesign — Design Spec
**Data:** 2026-06-02 (atualizado após teste com agente iniciante)
**Escopo:** Fluxo Wizard → Guided Discovery + export MIDI por instrumento separado

---

## Usuário-alvo

Produtor iniciante sem teoria musical:
- Não entende Fmaj7, graus romanos, borrowed chords — nada de tecniquês
- Usa ChordFy hoje: busca música → pega escala → vai pro Ableton
- No Ableton: sabe arrastar MIDI, criar faixas, usar VSTs
- Quer harmonia mais rica sem estudar teoria

**Princípio de linguagem:** zero substantivos técnicos em qualquer texto da UI. Só metáforas sensoriais — *pesado, flutuante, cheio, urgente, quente*. Se um iniciante sem teoria não entende a palavra, ela não entra.

---

## Problemas do SidebarPage atual

1. Análise harmônica no centro — iniciante fecha o app
2. 3 colunas simultâneas sem orientação — não sabe por onde começar
3. "Gerar remix" antes de ouvir qualquer coisa — quer ouvir primeiro
4. 4 MiniPlayers ao mesmo tempo sem diferenciação — paralisia de escolha
5. Download → um arquivo MIDI só → abre no Ableton como uma faixa → não sabe que instrumento colocar → abandona

---

## Fluxo Geral

```
[Home] Wizard (4 perguntas)
   ↓ conclui
[Guided Discovery] Ouvir → Entender → Escolher → Baixar
   ↓ link discreto
[Modo Avançado] Studio completo (sem mudanças)
```

---

## Seção 1 — Wizard (Home)

Componente `AIWizard.tsx` já existe. 4 passos progressivos, tela cheia:

| Passo | Pergunta | Input |
|---|---|---|
| 1 | Qual música você quer remixar? | Autocomplete iTunes |
| 2 | Qual estilo? | Chips: House / Deep / Lo-fi / Jazz / Techno... |
| 3 | Qual BPM? | Slider com sugestão da análise |
| 4 | Qual feeling? | Chips: Groovy / Soulful / Dark / Tribal... |

**Análise em background:** ao selecionar a música no passo 1, `AIWizard` dispara `fetch('/api/analyze-song', { body: { songId, title, artist } })` e armazena a Promise em ref. Ao confirmar no passo 4, aguarda a Promise (geralmente já resolvida) antes de chamar `onComplete`.

**Callback:** `onComplete({ song, style, bpm, feeling, analysis })` → `App.tsx` muda para `appMode === 'results'`.

---

## Seção 2 — Guided Discovery (ResultsPage)

A tela de resultado não é uma grade de players — é uma jornada em 4 blocos sequenciais. O download só aparece depois que o usuário ouviu e entendeu o que está levando.

---

### Bloco A — O que foi criado

```
[cover pequena]  Blinding Lights — The Weeknd
                 House · 128 BPM

[texto do AI Coach — 2 a 3 frases]
```

O AI Coach fala em linguagem de produtor, sem nenhum termo técnico. Ver Seção 3 para regras do prompt.

---

### Bloco B — Ouça o arranjo completo

Botão grande de play. Toca todos os elementos juntos: kick, clap, hihat, piano, baixo, arpejo, pad, lead.

Seções visíveis como pills: **Intro → Drop → Break → Outro**

O usuário ouve o resultado inteiro antes de qualquer decisão.

---

### Bloco C — O que compõe este remix

Cada elemento apresentado individualmente, com explicação de valor em linguagem acessível e botão de ouvir isolado:

| Elemento | Explicação | Ação |
|---|---|---|
| Piano | "Dá a harmonia — o corpo da música" | ▶ ouvir só |
| Bass | "Dá o groove — o que faz a cabeça balançar" | ▶ ouvir só |
| Arpejo | "Dá movimento — notas que sobem e descem" | ▶ ouvir só |
| Pad | "Dá profundidade — preenche o espaço" | ▶ ouvir só |
| Lead | "Dá a melodia — a voz que guia" | ▶ ouvir só |

**Nota:** bateria (kick, clap, hihat) aparece no preview mas não vai no MIDI exportado. Aviso visível neste bloco: *"A bateria toca no preview — adicione a sua no Ableton."*

---

### Bloco D — Escolha sua versão

4 cards. Ao clicar num card, toca automaticamente o arranjo naquela versão — a diferença é auditiva, não explicada.

| Card | Label | Tagline |
|---|---|---|
| 3 notas | Clean | Direto ao ponto |
| 4 notas | Quente | Mais corpo |
| 5 notas | Rico | Harmonia densa |
| 6 notas | Completo | Arranjo cheio |

**Autoplay ao selecionar:** clicar num card dispara imediatamente o player daquela versão. Sem explicação extra — o usuário ouve a diferença.

**Download por versão:** botão "Baixar [versão]" aparece no card selecionado.

**Baixar tudo:** sempre disponível no rodapé, gera zip master com as 4 versões organizadas por instrumento.

**Link discreto:** `→ Explorar no modo avançado` no rodapé (piano roll, step grid, tudo).

---

## Seção 3 — AI Coach Summary (Bloco A)

Gerado pelo Groq. Campo novo no response schema: `explanation: string`.

### Regras absolutas para o prompt
- Máximo 3 frases
- **Zero tecniquês:** proibido Fmaj7, modo dórico, ii-V-I, progressão, acorde, extensão, tônica, dominante, borrowed, grau, escala — qualquer termo de teoria musical
- Só metáforas sensoriais: *pesado, flutuante, urgente, quente, cheio, melancólico, tenso, leve*
- Foco em: como soa emocionalmente, por que funciona no estilo escolhido, o que a versão com mais notas muda na sensação

### Exemplo válido
*"Essa música tem uma tensão que não resolve — parece que algo está prestes a acontecer. Em House isso funciona muito bem porque o peso do baixo segura tudo enquanto o piano flutua por cima. Com mais notas o som fica mais cheio e denso, quase sufocante no bom sentido."*

### Exemplo inválido (tecniquês)
*"A progressão usa um acorde emprestado do modo paralelo, criando tensão harmônica que resolve na tônica..."* ← nunca

---

## Seção 4 — Export MIDI por Instrumento

### Download por versão (Bloco D)
Zip com os instrumentos melódicos em arquivos separados:

```
blinding-lights-house-4notas/
  piano.mid
  bass.mid
  arpejo.mid
  pad.mid
  lead.mid
```

### "Baixar tudo" (rodapé)
Zip master com as 4 versões organizadas:

```
blinding-lights-house/
  3notas/
    piano.mid  bass.mid  arpejo.mid  pad.mid  lead.mid
  4notas/
    piano.mid  bass.mid  arpejo.mid  pad.mid  lead.mid
  5notas/  ...
  6notas/  ...
```

### Implementação
`handleExport` em `MiniPlayer.tsx` já usa `fflate` + `trackBytes`. Mudar para iterar sobre cada instrumento gerando **um arquivo `.mid` por instrumento** (uma única track cada), agrupados no zip. Não usar multi-channel num arquivo só — Ableton trata melhor arquivos individuais.

---

## Seção 5 — Arquivos a Modificar

| Arquivo | Mudança |
|---|---|
| `src/App.tsx` | `appMode === 'home'` renderiza `AIWizard`; `onComplete` → `setAppMode('results')` |
| `src/components/AIWizard.tsx` | `onComplete` inclui `analysis`; dispara fetch Groq em background no passo 1 |
| `src/components/ResultsPage.tsx` | Reescrever layout: Blocos A/B/C/D em sequência vertical |
| `src/components/MiniPlayer.tsx` | `handleExport` → zip com arquivos separados por instrumento |
| `api/analyze-song.ts` | Adicionar campo `explanation` ao schema Groq com regras de linguagem |
| `src/components/SidebarPage.tsx` | Sem mudanças (mantido, não acessível do fluxo principal) |

---

## O que não muda
- Studio avançado (`appMode === 'advanced'`) — intacto
- Tone.js / síntese de áudio — intacto
- GENRES, density, groove, arranger — intactos
- PianoRollMini — disponível no modo avançado

---

## Critérios de sucesso
1. Iniciante sem teoria completa o fluxo sem se perder
2. Nenhum texto da UI usa tecniquês — zero
3. Ao clicar num card no Bloco D, o arranjo toca automaticamente
4. Zip baixado abre no Ableton com um arquivo por instrumento
5. Bateria tem aviso claro antes de qualquer download
