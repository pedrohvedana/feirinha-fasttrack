# Graph Report - feirinha-fasttrack  (2026-08-26)

## Corpus Check
- 20 files · ~3,247 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 75 nodes · 89 edges · 9 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `fb9d3e63`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- webhook.ts
- App.jsx
- devDependencies
- package.json
- Fases
- dependencies

## God Nodes (most connected - your core abstractions)
1. `Fases` - 6 edges
2. `scripts` - 5 edges
3. `enviarMensagem()` - 4 edges
4. `api` - 4 edges
5. `ROADMAP Feirinha Fast Track` - 3 edges
6. `mensagemPagamentoConfirmado()` - 3 edges
7. `mensagemEmPreparo()` - 3 edges
8. `mensagemPronto()` - 3 edges
9. `pedidosRouter` - 2 edges
10. `webhookRouter` - 2 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (9 total, 0 thin omitted)

### Community 0 - "webhook.ts"
Cohesion: 0.21
Nodes (13): app, Bindings, Bindings, pedidosRouter, Bindings, MENSAGENS, webhookRouter, Env (+5 more)

### Community 1 - "App.jsx"
Cohesion: 0.20
Nodes (9): api, App(), Dashboard(), FilaPedidos(), STATUS_COLORS, STATUS_LABELS, ITENS_CARDAPIO, PAGAMENTO_LABELS (+1 more)

### Community 2 - "devDependencies"
Cohesion: 0.15
Nodes (13): autoprefixer, postcss, devDependencies, autoprefixer, postcss, tailwindcss, @tailwindcss/postcss, vite (+5 more)

### Community 3 - "package.json"
Cohesion: 0.20
Nodes (9): name, private, scripts, build, deploy, dev, preview, type (+1 more)

### Community 4 - "Fases"
Cohesion: 0.22
Nodes (8): Fase 1: Setup Inicial, Fase 2: Backend API, Fase 3: Integração WhatsApp, Fase 4: Frontend React, Fase 5: Deploy, Fases, ROADMAP Feirinha Fast Track, Status

### Community 5 - "dependencies"
Cohesion: 0.29
Nodes (7): dependencies, react, react-dom, react-router-dom, react, react-dom, react-router-dom

## Knowledge Gaps
- **33 isolated node(s):** `Status`, `Fase 1: Setup Inicial`, `Fase 2: Backend API`, `Fase 3: Integração WhatsApp`, `Fase 4: Frontend React` (+28 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `devDependencies` to `package.json`?**
  _High betweenness centrality (0.098) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **What connects `Status`, `Fase 1: Setup Inicial`, `Fase 2: Backend API` to the rest of the system?**
  _33 weakly-connected nodes found - possible documentation gaps or missing edges._