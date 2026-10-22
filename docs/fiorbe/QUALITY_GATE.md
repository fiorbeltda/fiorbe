# QUALITY GATE — REGRAS DE APROVAÇÃO

## Todo stage precisa passar por este checklist

- [ ] Realiza o objetivo da etapa, sem invadir etapas futuras nem apagar trabalho aprovado.
- [ ] Visual é intencional, distinto e alinhado a tokens e identidade FIORBE.
- [ ] Fatos e rótulos (produto, sociedade, marca) respeitam `IDENTIDADE_E_COPY.md`.
- [ ] Boa composição em desktop 1440×900, laptop 1280×800, tablet 768×1024, mobile 390×844 e 360×800.
- [ ] Tipografia não quebra, sem overflow horizontal, cortes de arte e botões inacessíveis.
- [ ] Hover, focus, active, touch e reduced-motion possuem comportamentos adequados.
- [ ] Scroll nativo não trava; links e CTAs reais; sem áreas clicáveis enganosas.
- [ ] Se WebGL falhar ou JS estiver desativado, o conteúdo essencial ainda aparece.
- [ ] Build/lint/typecheck/testes relevantes executados, se disponíveis, com resultados relatados fielmente.
- [ ] Capturas visuais (se houver navegador), comentários de revisão e riscos salvos.
- [ ] `ESTADO.md` atualizado; etapas anteriores permanecem intactas.
- [ ] Fundador aprovou visualmente antes de continuar.

## Metas finais (avaliar com dados reais)

- LCP ≤2,5 s, INP ≤200 ms, CLS ≤0,1 no p75; laboratório ≠ dados de campo.
- Verificar impacto de bundle JS, hidratação e GPU da escultura, inclusive mobile.
- SEO básico: title, description, OG funcional, headings semânticos, canonical após domínio confirmado, sitemap quando pertinente.
- Acessibilidade: teclado, foco visível, contraste, alvo touch, alt, navegação por headings, menus, reduced-motion e ausência de traps.
- Segurança: sem segredos, tokens, variáveis privadas no cliente; contato funcional sem expor endpoints inseguros; sem analytics antes de decidir privacidade/consentimento.
- Copy: produto em desenvolvimento e sociedade em formação onde relevante; nenhuma evidência fictícia.

## Formato obrigatório do relatório do Claude

```text
ETAPA:
STATUS: PRONTO PARA REVISÃO | BLOQUEADO | PARCIAL
O QUE FOI CRIADO:
ARQUIVOS MODIFICADOS:
DECISÕES VISUAIS:
COMO TESTAR/URL LOCAL:
SCREENSHOTS: (anexar ou dizer que não foi possível)
VERIFICAÇÕES EXECUTADAS: comando -> resultado
TESTES QUE NÃO FORAM EXECUTADOS:
NOTAS MOBILE/TECLADO/REDUCED MOTION:
RISCOS/PENDÊNCIAS:
ESTADO.md ATUALIZADO: sim/não
PRÓXIMO PASSO SUGERIDO: aguardar aprovação antes da etapa seguinte
```

## Rubrica humana de design (0–5 cada)

1. Composição e hierarquia (5 = leitura imediata, equilíbrio, respiro)
2. Identidade FIORBE (5 = memorável e reconhecível, não genérico)
3. Acabamento (5 = espaçamentos, bordas, luzes e estados impecáveis)
4. Clareza (5 = qualquer visitante entende a mensagem da seção)
5. Movimento (5 = significativo e fluido, sem excesso)
6. Responsividade (5 = mobile desenhado, não encolhido)

**Meta orientadora:** nenhum critério abaixo de 4 antes de aprovação final da etapa. É julgamento editorial, não substitui testes objetivos.
