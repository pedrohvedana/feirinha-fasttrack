# Graph Report - feirinha-fasttrack  (2026-09-14)

## Corpus Check
- 59 files · ~21,567 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 362 nodes · 453 edges · 31 communities (25 shown, 6 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c789c473`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- services/whatsapp.ts
- App.jsx
- routes/whatsapp.test.ts
- public/package.json
- Fases
- Plan: Fluidez para Operador Solo
- Onboarding Summary - Feirinha Fast Track
- Functional Requirements
- Architecture Map - Feirinha Fast Track
- Project - Feirinha Fast Track
- schema.sql
- Current State - Feirinha Fast Track (27/08/2026)
- migrations_pix.sql
- devDependencies
- compilerOptions
- Feirinha Fast Track
- test-api.js
- bot.ts
- Etapas
- app.ts
- migrations_chatbot.sql
- migrations_chatbot.test.ts
- migrations_chatbot_msg_ids.sql
- migrations_chatbot_spam.sql
- worker-configuration.d.ts
- migrations_chatbot_lembrete.sql

## God Nodes (most connected - your core abstractions)
1. `useAuth()` - 13 edges
2. `Plan: Fluidez para Operador Solo` - 12 edges
3. `Onboarding Summary - Feirinha Fast Track` - 12 edges
4. `processarExpiracaoPix()` - 11 edges
5. `compilerOptions` - 10 edges
6. `enviarMensagem()` - 9 edges
7. `Project - Feirinha Fast Track` - 9 edges
8. `Etapas` - 8 edges
9. `api` - 8 edges
10. `Functional Requirements` - 8 edges

## Surprising Connections (you probably didn't know these)
- `makeEnv()` --calls--> `criarlaFakeD1()`  [EXTRACTED]
  api/src/services/bot-flow.test.ts → api/src/test/fake-d1.ts
- `postRoute()` --calls--> `criarApp()`  [EXTRACTED]
  api/src/routes/webhook.test.ts → api/src/app.ts
- `makeEnv()` --calls--> `criarlaFakeD1()`  [EXTRACTED]
  api/src/routes/webhook.test.ts → api/src/test/fake-d1.ts
- `makeEnv()` --calls--> `criarlaFakeD1()`  [EXTRACTED]
  api/src/routes/whatsapp.test.ts → api/src/test/fake-d1.ts
- `RotaProtegida()` --calls--> `useAuth()`  [EXTRACTED]
  public/src/App.jsx → public/src/auth.jsx

## Import Cycles
- None detected.

## Communities (31 total, 6 thin omitted)

### Community 0 - "services/whatsapp.ts"
Cohesion: 0.11
Nodes (26): app, scheduled(), Bindings, Pedido, pedidosRouter, Bindings, MENSAGENS, webhookRouter (+18 more)

### Community 1 - "App.jsx"
Cohesion: 0.12
Nodes (21): api, App(), RotaProtegida(), AuthContext, AuthProvider(), useAuth(), CardapioAdmin(), Cozinha() (+13 more)

### Community 2 - "routes/whatsapp.test.ts"
Cohesion: 0.12
Nodes (16): criarApp(), makeEnv(), postRoute(), assinar(), makeCtx(), makeEnv(), post(), consultarPagamento() (+8 more)

### Community 3 - "public/package.json"
Cohesion: 0.07
Nodes (29): autoprefixer, postcss, dependencies, react, react-dom, react-router-dom, devDependencies, autoprefixer (+21 more)

### Community 4 - "Fases"
Cohesion: 0.22
Nodes (8): Fase 1: Setup Inicial, Fase 2: Backend API, Fase 3: Integração WhatsApp, Fase 4: Frontend React, Fase 5: Deploy, Fases, ROADMAP Feirinha Fast Track, Status

### Community 5 - "Plan: Fluidez para Operador Solo"
Cohesion: 0.11
Nodes (18): D1 Migration, Features, Files to Change, Metadata, Plan: Fluidez para Operador Solo, Problem → Solution, Risks, Secrets (+10 more)

### Community 9 - "Onboarding Summary - Feirinha Fast Track"
Cohesion: 0.12
Nodes (16): 1. Pedido PIX (Automático), 2. Pagamento Manual (Dinheiro/Cartão), 3. Fila → Cozinha → Entrega, 4. Auto-Cancel (Cron), Architecture at a Glance, Common Tasks, Critical Flows, Database Schema Essentials (+8 more)

### Community 10 - "Functional Requirements"
Cohesion: 0.15
Nodes (12): FR1 - Pedido do Cliente (Público), FR2 - Fila de Pedidos (Balcão), FR3 - Cozinha (Tela Grande), FR4 - Pagamentos PIX (MercadoPago), FR5 - WhatsApp Notificações (Evolution API), FR6 - Dashboard & Admin, FR7 - Auto-Cancelamento (Cron), Functional Requirements (+4 more)

### Community 11 - "Architecture Map - Feirinha Fast Track"
Cohesion: 0.17
Nodes (11): API Layer (Workers), Architecture Map - Feirinha Fast Track, Auth, Data Flow, Database (D1), Directory Structure, External Integrations, Frontend Layer (Pages) (+3 more)

### Community 12 - "Project - Feirinha Fast Track"
Cohesion: 0.20
Nodes (9): Architecture Summary, Commands, Environments, GSD Configuration, Identity, Key Files, Next Milestone Candidates, Project - Feirinha Fast Track (+1 more)

### Community 13 - "schema.sql"
Cohesion: 0.29
Nodes (6): atendimento_config, bot_msg_ids, cardapio, conversas, msg_ids, pedidos

### Community 14 - "Current State - Feirinha Fast Track (27/08/2026)"
Cohesion: 0.22
Nodes (8): Completed Phases, Current State - Feirinha Fast Track (27/08/2026), Database Schema (D1), Deployed Versions, Known Issues, Next Actions (Priority), Secrets Configured (Wrangler), Working Features (Tested 27/08)

### Community 16 - "devDependencies"
Cohesion: 0.07
Nodes (26): dependencies, hono, devDependencies, @cloudflare/workers-types, @types/node, typescript, vitest, @vitest/coverage-v8 (+18 more)

### Community 17 - "compilerOptions"
Cohesion: 0.13
Nodes (14): compilerOptions, esModuleInterop, jsx, jsxImportSource, module, moduleResolution, skipLibCheck, strict (+6 more)

### Community 18 - "Feirinha Fast Track"
Cohesion: 0.18
Nodes (10): API, Deploy, Estrutura, Feirinha Fast Track, Fluxo Pedido, Frontend, Integração WhatsApp (dual-provider), Passo a passo infra VPS (paralelo à Evolution) (+2 more)

### Community 19 - "test-api.js"
Cohesion: 0.50
Nodes (3): http, options, req

### Community 20 - "bot.ts"
Cohesion: 0.14
Nodes (16): AtendimentoConfig, BotDeps, calcularTotal(), CarrinhoItem, Conversa, criarBot(), makeEnv(), ItemCardapio (+8 more)

### Community 21 - "Etapas"
Cohesion: 0.13
Nodes (14): 1. Schema D1, 2. routes/whatsapp.ts (webhook entrada), 3. services/bot.ts, 4. Registrar webhook + config WA-AKG, 5. Segurança, 6. Testes (TDD RED→GREEN, ≥80% cobertura), 7. Deploy, Arquitetura (+6 more)

### Community 22 - "app.ts"
Cohesion: 0.11
Nodes (15): Bindings, Bindings, cardapioRouter, Bindings, Pedido, rastrearRouter, Env, whatsappRouter (+7 more)

### Community 23 - "migrations_chatbot.sql"
Cohesion: 0.50
Nodes (3): atendimento_config, bot_msg_ids, conversas

## Knowledge Gaps
- **188 isolated node(s):** `pedidos`, `pedidos`, `cardapio`, `conversas`, `atendimento_config` (+183 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `criarlaFakeD1()` connect `routes/whatsapp.test.ts` to `bot.ts`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **Why does `Bindings` connect `app.ts` to `services/whatsapp.ts`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._
- **What connects `pedidos`, `pedidos`, `cardapio` to the rest of the system?**
  _188 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `services/whatsapp.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1066066066066066 - nodes in this community are weakly interconnected._
- **Should `App.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.12100840336134454 - nodes in this community are weakly interconnected._
- **Should `routes/whatsapp.test.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11692307692307692 - nodes in this community are weakly interconnected._
- **Should `public/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._