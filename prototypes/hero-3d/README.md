# Protótipo isolado — hero interativo FIORBE

Protótipo técnico e visual. **Não é o site definitivo** nem a Camada B da Etapa 01. Tokens, fonte e textos são candidatos não aprovados.

## Rodar

```bash
cd E:\dev\fiorbe\prototypes\hero-3d
npm install          # dependências ficam neste diretório (E:)
npm run dev          # http://localhost:3100
```

Parâmetros de URL úteis:

| Parâmetro | Efeito |
|---|---|
| `?debug` | mostra tier, DPR, fps e progresso; expõe `window.__fiorbe.bench()` |
| `?tier=low\|mid\|high` | força o perfil de qualidade |
| `?nowebgl` | força o fallback (poster) |
| `?pose=x,y,z` | testa outra pose de repouso (radianos) |
| `?tone=aces\|agx` | compara tone mapping (padrão: Neutral) |

## Scripts de verificação (Playwright local, Chromium já instalado em `E:\BrendonData\Caches\Playwright`)

```bash
node scripts/capture.mjs            # 5 larguras, cursor, arraste, scroll ida/volta, reduced motion, sem WebGL, sem JS
node scripts/still.mjs nome 1440 900 [query]
node scripts/sheet.mjs nome "pose=..." "pose=..."   # folha de contato para direção de arte
node scripts/poster.mjs             # regenera public/hero-poster.png a partir do próprio render
```

Capturas vão para `captures/` (fora do git).

Documentação completa: `docs/fiorbe/HERO_PROTOTIPO.md`.
