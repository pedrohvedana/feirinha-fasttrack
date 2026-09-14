# Project - Feirinha Fast Track

## Identity
- **Name**: Feirinha Fast Track
- **Type**: Full-stack edge serverless (Workers + Pages + D1)
- **Domain**: feirinha.ciavedana.com.br
- **Owner**: Pedro
- **Started**: 26/08/2026
- **Stack**: Cloudflare Workers (Hono/TS) + React/Vite/Tailwind + D1 + MercadoPago + Evolution API

## Purpose
Sistema de pedidos para feirinha: clientes pedem via link, escolhem PIX/dinheiro/cartão, balconista gerencia fila com alertas sonoros, cozinha vê timers coloridos, WhatsApp notifica automaticamente, PIX confirma via webhook MercadoPago.

## Architecture Summary
- **API**: Cloudflare Workers Hono.js (TypeScript) - edge runtime
- **Database**: Cloudflare D1 (SQLite at edge)
- **Frontend**: React 19 + Vite 8 + Tailwind v4 + React Router 7 - Cloudflare Pages
- **Payments**: MercadoPago PIX (webhook auto-confirm)
- **WhatsApp**: Evolution API (self-hosted VPS)
- **Auth**: PIN 1234 (localStorage) protecting admin routes
- **Cron**: Auto-cancel abandoned PIX orders (15min threshold)

## Key Files
| Path | Description |
|------|-------------|
| `api/src/index.ts` | Worker entry, routes, cron |
| `api/src/routes/pedidos.ts` | Pedidos CRUD, PIX, fila, stats |
| `api/src/routes/webhook.ts` | MercadoPago webhook, status updates |
| `api/src/routes/cardapio.ts` | Cardápio CRUD |
| `api/src/routes/rastrear.ts` | Public tracking |
| `api/src/services/pix.ts` | MercadoPago integration |
| `api/src/services/whatsapp.ts` | Evolution API + templates |
| `public/src/App.jsx` | Routing, auth guard |
| `public/src/pages/PedidoForm.jsx` | Client order + PIX display |
| `public/src/pages/FilaPedidos.jsx` | Queue + audio alerts |
| `public/src/pages/Cozinha.jsx` | Kitchen view + timers |
| `public/src/pages/Dashboard.jsx` | Stats + admin link |
| `public/src/pages/CardapioAdmin.jsx` | Item CRUD |

## Commands
```bash
# API dev
cd api && npm run dev

# API deploy
cd api && npm run deploy

# Frontend dev
cd public && npm run dev

# Frontend build + deploy
cd public && npm run build && npx wrangler pages deploy dist --project-name=feirinha-ui

# DB init (remote)
cd api && npm run db:init
```

## Environments
| Env | API | Frontend |
|-----|-----|----------|
| Dev | `wrangler dev` | `vite` |
| Prod | `https://feirinha-fasttrack-api.pedro-vedana.workers.dev` | `https://feirinha-ui.pages.dev` |
| Custom | - | `https://feirinha.ciavedana.com.br` |

## GSD Configuration
- Planning dir: `.planning/`
- Roadmap: `ROADMAP.md`
- Requirements: `.planning/REQUIREMENTS.md`
- State: `.planning/STATE.md`
- Architecture: `.planning/codebase/ARCHITECTURE.md`

## Next Milestone Candidates
1. **Push GitHub master** → sync master branch Pages deploy
2. **WAF fix custom domain** → Cloudflare dashboard Security settings
3. **WhatsApp on order creation** → notify client immediately
4. **Status "entregue" + revenue** → complete order lifecycle
5. **PWA/offline** → service worker, background sync