# Graph Report - feirinha-fasttrack  (2026-08-26)

## Corpus Check
- 24 files · ~4,452 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 89 nodes · 114 edges · 14 communities (11 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d0550b8d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- webhook.ts
- useAuth
- devDependencies
- package.json
- Fases
- dependencies
- api.js
- index.ts
- App.jsx
- FilaPedidos.jsx
- schema.sql

## God Nodes (most connected - your core abstractions)
1. `useAuth()` - 8 edges
2. `Fases` - 6 edges
3. `api` - 5 edges
4. `scripts` - 5 edges
5. `enviarMensagem()` - 4 edges
6. `ROADMAP Feirinha Fast Track` - 3 edges
7. `mensagemPagamentoConfirmado()` - 3 edges
8. `mensagemEmPreparo()` - 3 edges
9. `mensagemPronto()` - 3 edges
10. `cardapioRouter` - 2 edges

## Surprising Connections (you probably didn't know these)
- `Dashboard()` --calls--> `useAuth()`  [EXTRACTED]
  public/src/pages/Dashboard.jsx → public/src/auth.jsx
- `Login()` --calls--> `useAuth()`  [EXTRACTED]
  public/src/pages/Login.jsx → public/src/auth.jsx

## Import Cycles
- None detected.

## Communities (14 total, 3 thin omitted)

### Community 0 - "webhook.ts"
Cohesion: 0.24
Nodes (11): Bindings, pedidosRouter, Bindings, MENSAGENS, webhookRouter, Env, enviarMensagem(), formatarNumero() (+3 more)

### Community 1 - "useAuth"
Cohesion: 0.39
Nodes (5): AuthContext, AuthProvider(), useAuth(), Dashboard(), Login()

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

### Community 9 - "api.js"
Cohesion: 0.38
Nodes (3): api, CardapioAdmin(), PAGAMENTO_LABELS

### Community 10 - "index.ts"
Cohesion: 0.40
Nodes (4): app, Bindings, Bindings, cardapioRouter

## Knowledge Gaps
- **38 isolated node(s):** `STATUS_COLORS`, `STATUS_LABELS`, `pedidos`, `cardapio`, `Bindings` (+33 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `devDependencies` to `package.json`?**
  _High betweenness centrality (0.069) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **What connects `STATUS_COLORS`, `STATUS_LABELS`, `pedidos` to the rest of the system?**
  _38 weakly-connected nodes found - possible documentation gaps or missing edges._