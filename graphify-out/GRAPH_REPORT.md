# Graph Report - feirinha-fasttrack  (2026-08-26)

## Corpus Check
- 22 files · ~3,576 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 82 nodes · 106 edges · 10 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7b692b8e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- webhook.ts
- App.jsx
- devDependencies
- package.json
- Fases
- dependencies
- PedidoForm.jsx

## God Nodes (most connected - your core abstractions)
1. `useAuth()` - 9 edges
2. `Fases` - 6 edges
3. `scripts` - 5 edges
4. `enviarMensagem()` - 4 edges
5. `api` - 4 edges
6. `ROADMAP Feirinha Fast Track` - 3 edges
7. `Dashboard()` - 3 edges
8. `FilaPedidos()` - 3 edges
9. `Login()` - 3 edges
10. `mensagemPagamentoConfirmado()` - 3 edges

## Surprising Connections (you probably didn't know these)
- `RotaProtegida()` --calls--> `useAuth()`  [EXTRACTED]
  public/src/App.jsx → public/src/auth.jsx
- `Dashboard()` --calls--> `useAuth()`  [EXTRACTED]
  public/src/pages/Dashboard.jsx → public/src/auth.jsx
- `FilaPedidos()` --calls--> `useAuth()`  [EXTRACTED]
  public/src/pages/FilaPedidos.jsx → public/src/auth.jsx
- `Login()` --calls--> `useAuth()`  [EXTRACTED]
  public/src/pages/Login.jsx → public/src/auth.jsx

## Import Cycles
- None detected.

## Communities (10 total, 0 thin omitted)

### Community 0 - "webhook.ts"
Cohesion: 0.19
Nodes (13): app, Bindings, Bindings, pedidosRouter, Bindings, MENSAGENS, webhookRouter, Env (+5 more)

### Community 1 - "App.jsx"
Cohesion: 0.26
Nodes (10): App(), RotaProtegida(), AuthContext, AuthProvider(), useAuth(), Dashboard(), FilaPedidos(), STATUS_COLORS (+2 more)

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

### Community 9 - "PedidoForm.jsx"
Cohesion: 0.33
Nodes (3): api, ITENS_CARDAPIO, PAGAMENTO_LABELS

## Knowledge Gaps
- **36 isolated node(s):** `Status`, `Fase 1: Setup Inicial`, `Fase 2: Backend API`, `Fase 3: Integração WhatsApp`, `Fase 4: Frontend React` (+31 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `devDependencies` to `package.json`?**
  _High betweenness centrality (0.081) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **What connects `Status`, `Fase 1: Setup Inicial`, `Fase 2: Backend API` to the rest of the system?**
  _36 weakly-connected nodes found - possible documentation gaps or missing edges._