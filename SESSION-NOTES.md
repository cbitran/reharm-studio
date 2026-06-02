# Reharm Studio — Spec do Produto
_Sessão de brainstorming: 01/06/2026_

---

## Visão

Ferramenta web que transforma o nome de uma música em progressões harmônicas ricas, prontas para remix — separadas por instrumento, exportadas em MIDI, adaptadas ao gênero e BPM escolhidos pelo produtor.

O produtor não precisa saber teoria musical. Ele informa a música de referência, o BPM alvo e o estilo. O sistema faz o resto.

---

## Problema

Produtores que fazem remixes sabem o que querem recriar mas não sabem como construir progressões ricas e adequadas ao gênero alvo. O projeto original (reharm-studio.html) resolveu parcialmente isso, mas era engessado: só transformava progressões coladas manualmente, sem inteligência, sem variedade harmônica real (9ª, 11ª, alterações), sem estrutura por seção.

---

## Persona

**Bitran** — DJ/produtor brasileiro, Ableton Live. Tem intuição musical, bom ouvido, mas pouco mapeamento teórico. Workflow: identifica a música que quer remixar → precisa de progressões harmônicas ricas pro gênero que produz → arrasta os MIDIs pro Ableton → constrói o restante do arranjo.

---

## Fluxo Principal (MVP)

```
1. Usuário digita o nome da música
   ex: "Lionel Richie — Stuck on You"

2. Sistema pesquisa e identifica automaticamente:
   → Tonalidade (F maior)
   → Progressão original (Fmaj7 – Am7 – Bbmaj7 – C7)
   → Estrutura da música (Intro / Verso / Refrão / Bridge)
   → Caráter emocional (soul, R&B, emocional, quente)

3. Usuário define:
   → BPM alvo (ex: 124)
   → Estilo alvo (House / Deep House / Gospel House / Afro House / Jazz / etc.)

4. Sistema gera — por seção, por instrumento:
   → 3–5 progressões com voicings ricos (7ª, 9ª, 11ª, alterações)
   → Preview de áudio para cada progressão
   → Explicação do caráter de cada sugestão

5. Usuário escolhe a progressão que quer para cada seção

6. Sistema exporta MIDIs separados por instrumento e seção:
   stuck-on-you-verse-piano.mid
   stuck-on-you-verse-bass.mid
   stuck-on-you-verse-strings.mid
   stuck-on-you-chorus-piano.mid
   ...
```

---

## Decisões de Design

### Input
- Campo: nome da música (pesquisa automática via web + Claude API)
- Campo: BPM alvo (manual)
- Campo: estilo alvo (seletor)
- Campos manuais disponíveis como fallback (se pesquisa não encontrar)
- Suporte a variações por seção (a música pode mudar de campo harmônico)

### Progressões
- **Modelo híbrido (aprovado):** biblioteca de esqueletos harmônicos curados + enriquecimento automático por estilo
- Esqueleto: graus da escala (I–IV–V, ii–V–I, I–iii–IV–V, etc.)
- Enriquecimento: voicings com extensões adequadas ao estilo (9ª, #11, 13ª, alterações)
- Sistema sugere 3–5 variantes por seção, cada uma com caráter diferente

### Instrumentos
- Cada instrumento tem 3 dimensões: papel harmônico, padrão rítmico, registro
- Presets por gênero (House: Piano + Bass + Strings)
- Qualquer gênero, qualquer instrumento — não limitado a House
- Para instrumentos sem preset, usuário pode definir o padrão rítmico

### Export
- MIDI separado por instrumento + seção
- Nomeado com: música + seção + instrumento
- Formatos: piano.mid, bass.mid, strings.mid, full.mid

---

## Arquitetura Técnica

```
Frontend   →  React 18 + Vite + TypeScript
Estilo     →  Tailwind CSS (dark, profissional — definido em sessão de design)
Áudio      →  Tone.js (preview)
MIDI       →  Custom writer (já implementado e testado no protótipo)

Backend    →  Node.js (necessário para Claude API + pesquisa web)
AI         →  Claude API (análise de músicas, geração de progressões)
Pesquisa   →  Web search / MusicBrainz para identificar tonalidade e acordes

Deploy     →  Frontend: Vercel | Backend: Railway ou Fly.io
```

**Por que web (não desktop):**
- Depende de internet de qualquer forma (Claude API)
- Acesso imediato sem instalação
- Atualizações instantâneas na biblioteca de progressões
- Mais acessível para outros produtores

---

## Base Existente (porta do protótipo)

O arquivo `reharm-studio_1.html` (Downloads) tem código testado e funcional:
- Parser de acordes (regex + quality table, ~25 qualidades)
- Reharmonizador (reVoice + classify, tri/7/9)
- MIDI writer (SMF type 0 e 1, VLQ, TPQ 480)
- Groove engine (swing 50–66%, viradas: reto / antecipação / viradas+)
- Preview Tone.js (PolySynth piano + MonoSynth bass)
- 5 gêneros com presets (House, Deep House, Lo-fi, Pop, Techno)

Todo esse código vai para os módulos core do projeto React.

---

## O que falta em relação ao protótipo

| Feature | Status |
|---|---|
| Pesquisa automática por nome da música | ❌ Novo |
| Claude API para análise e geração | ❌ Novo |
| Estrutura por seções da música | ❌ Novo |
| Galeria de progressões com seleção | ❌ Novo |
| Voicings com 9ª, 11ª, alterações reais | ❌ Novo |
| Exportar por instrumento + seção | ❌ Novo |
| Suporte a qualquer gênero/instrumento | ❌ Novo |
| Grid visual 16-step (F7 do PRD) | ❌ Pendente |
| Interface profissional (design session) | ❌ Pendente |

---

## Status do MVP (01/06/2026)

| Feature | Status |
|---|---|
| React + Vite + TypeScript | ✅ |
| Parser de acordes | ✅ |
| Reharmonizador (9ª, 11ª) | ✅ |
| Groove engine (swing + viradas) | ✅ |
| MIDI writer (piano/bass/full) | ✅ |
| Preview Tone.js | ✅ |
| 8 gêneros | ✅ |
| Galeria de 12 progressões curadas | ✅ |
| Grid visual 16-step | ✅ |
| Layout sidebar + dois temas (light/dark) | ✅ |
| Salvar/carregar projetos (localStorage) | ✅ |
| BPM spinner customizado | ✅ |
| Plus Jakarta Sans (sem serifadas) | ✅ |
| Centralizado 1440px | ✅ |

## Backlog — Fase 2

- **Grid harmônico interativo** — clicar num compasso troca o grau da escala; sistema atualiza automaticamente os outros compassos; arrastar blocos muda o ritmo. Base (`scale.ts`) já criada.
- **Construtor de progressões guiado** — paleta de graus diatônicos, usuário monta a progressão clicando; sistema orienta o próximo passo com base no movimento harmônico
- **Backend + Claude API** — digitar nome da música → sistema detecta tonalidade, acordes, estrutura
- **Estrutura por seções** — verso/refrão/bridge com campos independentes
- **Mais esqueletos de progressão** — curados pelo Bitran, especialmente House gospel e afro

## Deploy
- Frontend: Vercel (quando pronto)
- Backend: Railway (fase 2)

---

## Exemplo de Uso Real

> "Estou fazendo o remix de Stuck on You — Lionel Richie"
> BPM: 124 | Estilo: Deep House

Sistema identifica: F maior, I–iii–IV–V, caráter soul/gospel
Sistema sugere:
- `Fmaj9 – Am11 – Bbmaj9 – C9` — original enriquecida
- `Fmaj9 – Dm9 – Bbmaj7 – C9` — gospel house (Am → Dm)
- `Fmaj9 – Gm9 – C9 – Fmaj9` — ii–V–I deep europeu
- `Fmaj9 – Ebmaj7 – Bbmaj9 – C9` — modal/afro

Exporta: piano, bass, strings — por seção — prontos pro Ableton.

---

## UX Redesign — Brainstorming 01/06/2026

### Visão do produto v2

Co-criação musical assistida por IA. O sistema é um parceiro criativo que entra quando chamado — não um modo separado.

### Os três perfis (um só fluxo)

| Perfil | Comportamento |
|---|---|
| Expert Solo | Nunca chama a IA. Usa ferramentas direto. |
| Collab Total | Chama a IA logo no início, antes de qualquer escolha. |
| Híbrido | Começa sozinho, chama a IA quando trava. |

### Fluxo principal (Seção 1 — APROVADA)

**Estado inicial: sempre Solo**
Usuário entra com acesso direto a todas as ferramentas. Sem wizard, sem bloqueio.

**Botão "Chamar IA" — sempre visível**
Fixo, discreto. Ao clicar, IA lê o estado atual e entra como parceira a partir dali.

**IA no início (zero state) — Wizard:**
1. "Qual música?" → busca iTunes + análise Groq (guarda, não exibe)
2. "Que estilo?" → chips
3. "Que BPM?" → slider com sugestão
4. "Qual feeling?" → chips (Groovy, Soulful, Dark, Tribal, Jazzy...)
5. IA cruza análise da música + intenção do usuário → gera sugestão via Groq

**IA no meio (estado parcial):**
Lê silenciosamente: música, acordes, estilo, BPM, campo harmônico.
Responde com contexto: *"Vejo que você está em Ré menor, House a 124 BPM..."*

**Entrega:**
Remix Preview + Campo Harmônico com badges por acorde:
- 🟢 Ótima escolha
- 🟡 Funciona com ressalva
- 🔴 Foge do contexto
Clicar no badge → explicação de 2 linhas do Groq.

### Seções 2–8 (redigidas 01/06/2026 — ver spec completo)

`docs/superpowers/specs/2026-06-01-ux-redesign-v2.md`

- Seção 2: Botão no Navbar, 4 estados, observação silenciosa sem calls automáticas
- Seção 3: Wizard modal 4 passos (Música → Estilo → BPM → Feeling)
- Seção 4: Painel lateral 360px, IA abre com contexto já lido
- Seção 5: Chips de acordes + ações Aceitar/Editar/Descartar
- Seção 6: Badges 🟢🟡🔴 por acorde, popover Groq, 1 call por mudança
- Seção 7: Remix Preview sem mudanças estruturais
- Seção 8: Lista do que não muda + novas chaves i18n

### Implicação técnica principal
`analyze-song.ts` precisa receber style + BPM + feeling do usuário.
O prompt do Groq deve cruzar análise da música + intenção → progressão personalizada.
Spec do plano de implementação: `docs/superpowers/plans/` (ainda não escrito).
