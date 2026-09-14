# Architecture Map - Feirinha Fast Track

## System Overview
**Type**: Edge serverless full-stack (Workers + Pages + D1)
**Stack**: Cloudflare Workers (Hono) + React/Vite + Cloudflare D1 (SQLite) + Evolution API (WhatsApp)
**Deploy**: Workers API + Pages Frontend + Custom Domain

## Directory Structure
```
feirinha-fasttrack/
├── api/                    # Cloudflare Worker (TypeScript)
│   ├── src/
│   │   ├── index.ts        # Entry point, routes, cron scheduler
│   │   ├── routes/
│   │   │   ├── pedidos.ts      # Pedidos CRUD, PIX creation, fila, stats
│   │   │   ├── webhook.ts      # MercadoPago webhook, status updates
│   │   │   ├── cardapio.ts     # Cardápio CRUD
│   │   │   └── rastrear.ts     # Public tracking endpoint
│   │   └── services/
│   │       ├── pix.ts          # MercadoPago PIX integration
│   │       └── whatsapp.ts     # Evolution API WhatsApp messages
│   ├── schema.sql            # D1 database schema
│   ├── migrations_pix.sql    # PIX columns migration
│   ├── wrangler.toml         # Worker config + secrets/vars
│   └── package.json
├── public/                   # React Frontend (Vite + Tailwind v4)
│   ├── src/
│   │   ├── App.jsx           # Routing, auth protection
│   │   ├── api.js            # API client
│   │   ├── pages/
│   │   │   ├── PedidoForm.jsx      # Client order + PIX QR code
│   │   │   ├── FilaPedidos.jsx     # Kitchen queue with audio alerts
│   │   │   ├── Cozinha.jsx         # Kitchen view with timers
│   │   │   ├── Dashboard.jsx       # Stats + cardápio admin
│   │   │   ├── CardapioAdmin.jsx   # Item CRUD
│   │   │   └── PedidoRastreio.jsx  # Public tracking
│   │   └── components/
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
└── .planning/                # GSD planning artifacts
```

## Key Components

### API Layer (Workers)
| File | Purpose |
|------|---------|
| `src/index.ts` | App entry, CORS, cron (auto-cancel 15min), route mounting |
| `src/routes/pedidos.ts` | Create pedido, list, fila/ativas, stats, confirmar-pagamento |
| `src/routes/webhook.ts` | MercadoPago webhook (payment.updated), manual status |
| `src/routes/cardapio.ts` | Cardápio CRUD (ativo/inativo, ordem) |
| `src/routes/rastrear.ts` | Public GET /rastrear/:id |
| `src/services/pix.ts` | MercadoPago create payment, query payment |
| `src/services/whatsapp.ts` | Evolution API send, message templates |

### Frontend Layer (Pages)
| File | Purpose |
|------|---------|
| `src/App.jsx` | Routes, RotaProtegida (PIN 1234), auth context |
| `src/api.js` | Fetch wrapper to Workers API |
| `src/pages/PedidoForm.jsx` | Client order form, shows PIX QR/copia-cola |
| `src/pages/FilaPedidos.jsx` | Queue view, audio beep + speech alerts |
| `src/pages/Cozinha.jsx` | Kitchen cards, live timers (green/yellow/red) |
| `src/pages/Dashboard.jsx` | Stats, cardápio admin link |
| `src/pages/CardapioAdmin.jsx` | CRUD items (nome, preco, ativo, ordem) |

### Database (D1)
| Table | Key Columns |
|-------|-------------|
| `pedidos` | id, cliente_nome, whatsapp, itens_json, valor_total, pagamento_tipo, pagamento_confirmado, status, criado_em, atualizado_em, pix_payment_id, pix_qr_code, pix_qr_base64, pix_expira_em |
| `cardapio` | id, nome, preco, ativo, ordem, criado_em |

## Data Flow
1. **Client** → `POST /pedidos` → Creates pedido + MercadoPago PIX charge → Returns QR code + copia-cola
2. **Client pays PIX** → MercadoPago → `POST /webhook/pix` (payment.updated) → Queries payment → If `approved` updates pedido to `pago` + sends WhatsApp
3. **Manual payment** (dinheiro/cartão) → Operator clicks confirm → `POST /pedidos/:id/confirmar-pagamento` → Updates to `pago` + WhatsApp
4. **Kitchen** → Polls `GET /pedidos/fila/ativas` (includes `aguardando_pagamento`, `pago`, `em_preparo`, `pronto`) → Audio alerts on new
5. **Operator** → Updates status via `PATCH /pedidos/:id/status` → WhatsApp notifications
6. **Cron** (every 5 min) → Cancels `aguardando_pagamento` PIX > 15 min → WhatsApp cancelado

## Auth
- **PIN**: `1234` (localStorage `auth_pin`)
- **Protected routes**: `/fila`, `/dashboard`, `/cardapio`, `/cozinha`
- **Public**: `/` (PedidoForm), `/rastrear/:id`

## External Integrations
- **MercadoPago**: PIX payments (access token secret, payer email secret)
- **Evolution API**: WhatsApp sending (URL, key, instance in wrangler.toml vars)

## Scheduled Jobs
- **Cron**: `*/5 * * * *` → Auto-cancel abandoned PIX orders (15 min threshold from `PEDIDO_EXPIRA_MINUTOS`)