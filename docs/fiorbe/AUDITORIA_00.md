# ETAPA 00 — Auditoria e preparação (22/10/2026)

## 1. O que existe de fato

- **Projeto greenfield.** `E:\dev\fiorbe` contém só o kit de planejamento (`CLAUDE.md`, `docs/fiorbe/*`, `prompts/*`) e referências visuais. Não há `package.json`, código, framework, CSS, rotas, testes nem build. Nenhuma stack foi presumida.
- **Git:** inicializado nesta etapa, branch `main`; primeiro commit local feito após aprovação do usuário (docs + referências).
- **Ambiente:** Windows 10, Node 22.22.2, npm 12.0.1, git 2.53. pnpm não instalado. Cache do npm em `E:\npm-cache`. **C: com ~1 GB livre** → tudo deve ficar em E: (inclusive navegadores do Playwright: `PLAYWRIGHT_BROWSERS_PATH=E:\...`).
- **Navegador para capturas:** extensão Claude in Chrome disponível na sessão (ainda não usada; será testada na etapa 01, primeira com algo renderizável).
- **Baseline de testes:** não existe script de teste/lint/build para executar. Nada falha porque nada existe.

## 2. Assets e fontes de verdade

| Item | Situação | Uso permitido |
|---|---|---|
| Símbolo "F fluido" (fita 3D) | Escolhido pelos fundadores; **só raster gerado** (`referencias/identidade/01_.../01_...prancha_fitas_3D.png`) | Direção de arte da escultura (etapa 04) |
| Wordmark FIORBE | Duas linhas de estudo: (a) caixa alta larga estilo Exo 2 nas pranchas; (b) SVG geométrico de traço na V4 (`06_.../FiorbeMarkV4.dc.html`). **Nenhum aprovado como master** | Placeholder tipográfico marcado até aprovação |
| Paleta | **Conflito**: kit propõe `#071525 #0B1F3B #176BFF #16BADE #18B7A5 #68E7C6 #F5F8FC`; prancha aprovada mostra `#061A3A #0066FF #00D2FF #00C4B8 #0A0F1E #F7FAFF` | Decidir na etapa 01 com contraste medido |
| Tipografia | Prancha: Exo 2 SemiBold + Inter. Kit: avaliar Geist / Inter / Manrope | Comparar na etapa 01 |
| Fotos dos fundadores | Inexistentes | Placeholder editorial marcado (etapa 11) |
| Docs do Drive (fundação, briefing, produto) | **Não acessíveis desta sessão** — não verifiquei o conteúdo | Fatos vêm só de `CLAUDE.md` até alguém confirmar |
| Especificação do Motor Fiscal | Inexistente no repo | Página 13 deve ser honesta sobre "em desenvolvimento" |

As pranchas contêm números e contatos fictícios (`+1.000 empresas`, `99,9%`, `3x`, `nome@fiorbe.com.br`, `www.fiorbe.com.br`) — registrados em `referencias/README.md` como proibidos.

## 3. Inconsistências no próprio kit (decidir antes da etapa correspondente)

1. **Sub do hero:** IDENTIDADE ("Criamos software para transformar…") ≠ PLANO_MESTRE ("Construímos tecnologia… confiáveis"). → etapa 03
2. **Manifesto:** "A melhor tecnologia faz a complexidade desaparecer…" ≠ "Quando a tecnologia é bem construída…". → etapa 06
3. **Ecossistema:** "Começamos com um produto. Pensamos como uma empresa de tecnologia." ≠ "Começamos por um problema real…". → etapa 09
4. **Processo:** Entender·Projetar·Desenvolver·Aprender ≠ compreender, projetar, construir, aprender. → etapa 10
5. **Pilares:** 3 (Engenharia·Clareza·Evolução) ou 5 do briefing (Conexão·Inteligência·Fluidez·Clareza·Evolução). → etapa 08
6. **E-mail `fiorbeltda@gmail.com`:** o plano o chama de verificado, mas o "ltda" no endereço pode ser lido como alegação societária, que o próprio kit proíbe. Os fundadores precisam confirmar que querem esse endereço público. → etapa 02

## 4. Proposta de stack (NÃO instalada)

| Camada | Proposta | Por quê / custo |
|---|---|---|
| Framework | **Next.js 16 (App Router) + React 19 + TypeScript strict** | Plano já presume; SSG para conteúdo; `next/font` auto-hospeda fontes; deploy simples na Vercel |
| Estilo | **CSS custom properties (`tokens.css`) + CSS Modules** | Zero runtime, zero dependência; tokens como fonte única. Alternativa: Tailwind v4 com `@theme` mapeando os mesmos tokens |
| Fontes | `next/font` (Google ou pacote `geist`) | Sem CLS, sem request a terceiros em runtime |
| Motion | CSS primeiro; `motion` só se uma microinteração precisar; GSAP ScrollTrigger **só** na etapa 05 se CSS/`motion` não bastar | Orçamento do MOTION_SPEC |
| 3D | `three` (+ talvez `@react-three/fiber`) **só na etapa 04**, `dynamic(..., { ssr:false })` na rota `/` | Não entra no bundle das outras rotas |
| QA | ESLint + `tsc --noEmit` desde a etapa 01; Playwright + axe smoke a partir da 02; Lighthouse como diagnóstico | Relatórios com resultado real |

Versões atuais no npm (consultadas hoje): next 16.4.2, react 19.3.1, three 0.186.1, @react-three/fiber 9.8.2, gsap 3.15.0, motion 14.6.0, tailwindcss 4.3.3, @playwright/test 1.64.1.

## 5. Plano de arquivos (criado a partir da etapa 01, não agora)

```text
src/
  app/
    layout.tsx · page.tsx · globals.css
    produtos/motor-fiscal/page.tsx      (etapa 13)
    lab/page.tsx                        (etapa 01 — design lab, noindex, removido na 15)
  components/
    layout/  SiteHeader · SiteFooter · Container · Section
    brand/   Wordmark (placeholder) · RibbonScene · RibbonPoster
    sections/ Hero · Manifesto · MotorFiscalIntro · Principles · Ecosystem · Approach · Founders · FinalCTA
    ui/      Button · TextLink · Eyebrow · SectionHeading · Badge
  content/   home.ts · motor-fiscal.ts      (toda a copy num lugar só)
  styles/    tokens.css
  lib/       motion.ts (reduced-motion, easings em JS espelhando tokens)
public/brand/  (vazio até haver asset aprovado)
```

Seções e âncoras: `#visao` (manifesto), `#motor-fiscal`, `#abordagem`, `#fundadores`, `#contato`.

## 6. Regras de tokens propostas

- Duas camadas: **primitivos** (`--blue-500`, `--teal-400`…) e **semânticos** (`--bg-canvas`, `--surface-1/2/3`, `--text-primary/secondary/muted`, `--border-subtle/strong`, `--accent`, `--focus-ring`). Componentes só usam semânticos.
- Nenhum hex, `px` de espaçamento, fonte ou easing literal em componente. Escala de espaço em 4px (`--space-1…12`), raios `--radius-s/m/l`, `--z-header/menu/overlay`, motion conforme MOTION_SPEC.
- Contraste mínimo: texto 4.5:1, texto grande e UI 3:1, medido e registrado no ESTADO.
- Tema escuro é o padrão; uma superfície clara editorial pode existir como seção, não como "modo".

## 7. Riscos prioritários

1. **Sem logo/wordmark vetorial aprovado** — header e hero dependem disso. Mitigação: placeholder tipográfico explicitamente provisório; pedir aos fundadores qual linha de wordmark seguir.
2. **Expectativa da escultura** — as referências são renders fotorrealistas; WebGL em tempo real num celular médio não atinge isso. Mitigação: poster estático de alta qualidade como base (LCP) e 3D como camada progressiva; fallback honesto se não chegar ao nível.
3. **Paleta em conflito** (seção 2) — resolver na 01 antes de qualquer componente.
4. **Copy não verificada** com os docs do Drive — tudo segue marcado como proposta.
5. **Disco C: cheio** — instalações e caches precisam apontar para E:.
6. **E-mail público** com "ltda" (seção 3.6).
