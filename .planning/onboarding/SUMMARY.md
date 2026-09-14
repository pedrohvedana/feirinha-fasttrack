# Onboarding Summary - Feirinha Fast Track

## Quick Start
```bash
# Clone & setup
cd feirinha-fasttrack

# API
cd api && npm install && npm run dev

# Frontend
cd ../public && npm install && npm run dev
```

## Architecture at a Glance
```
Client (React/Pages) ──HTTPS──► API (Workers/Hono) ──D1──► SQLite
                                    │
                                    ├─── MercadoPago (PIX)
                                    └─── Evolution API (WhatsApp)
```

## Key Entry Points
| Route | Purpose | Auth |
|-------|---------|------|
| `/` | PedidoForm (cliente) | Público |
| `/rastrear/:id` | Tracking público | Público |
| `/fila` | FilaPedidos (balcão) | PIN 1234 |
| `/cozinha` | Cozinha (tela grande) | PIN 1234 |
| `/dashboard` | Stats + admin link | PIN 1234 |
| `/cardapio` | CardapioAdmin CRUD | PIN 1234 |

## Critical Flows

### 1. Pedido PIX (Automático)
```
POST /pedidos (pagamento_tipo: pix)
    │
    ▼
MercadoPago create payment
    │
    ▼
Returns: pix_payment_id, qr_code (base64), copia_cola
    │
    ▼
Client pays → MercadoPago webhook (payment.updated)
    │
    ▼
GET /v1/payments/{id} → status: approved
    │
    ▼
UPDATE pedido: pago + WhatsApp "fila"
```

### 2. Pagamento Manual (Dinheiro/Cartão)
```
POST /pedidos (pagamento_tipo: dinheiro|cartao)
    │
    ▼
Status: aguardando_pagamento (sem PIX)
    │
    ▼
Operator: POST /pedidos/{id}/confirmar-pagamento
    │
    ▼
UPDATE pedido: pago + WhatsApp "fila"
```

### 3. Fila → Cozinha → Entrega
```
GET /pedidos/fila/ativas (poll 5s)
    │  Includes: aguardando_pagamento, pago, em_preparo, pronto
    ▼
Audio alert (beep + speech) on new
    │
    ▼
Operator actions: confirmar, em_preparo, pronto
    │
    ▼
WhatsApp each transition
```

### 4. Auto-Cancel (Cron)
```
Cron */5 * * * *
    │
    ▼
SELECT aguardando_pagamento + pix + >15min
    │
    ▼
UPDATE cancelado + WhatsApp cancelado
```

## Database Schema Essentials
```sql
-- pedidos
id, cliente_nome, whatsapp, itens_json, valor_total,
pagamento_tipo, pagamento_confirmado, status,
pix_payment_id, pix_qr_code, pix_qr_base64, pix_expira_em

-- cardapio
id, nome, preco, ativo, ordem
```

## Secrets (Wrangler)
```bash
# API secrets
wrangler secret put PIX_ACCESS_TOKEN
wrangler secret put PIX_PAGADOR_EMAIL
wrangler secret put PIX_WEBHOOK_SECRET

# API vars (wrangler.toml)
EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE
PIX_EXPIRACAO_MINUTOS=30, PEDIDO_EXPIRA_MINUTOS=15
```

## Deploy Commands
```bash
# API
cd api && npm run deploy

# Frontend (production branch)
cd public && npm run build
npx wrangler pages deploy dist --project-name=feirinha-ui --branch=production

# Frontend (master branch - for master.feirinha-ui.pages.dev)
npx wrangler pages deploy dist --project-name=feirinha-ui --branch=master
```

## Common Tasks
| Task | Command |
|------|---------|
| Add cardápio item | POST /cardapio {nome, preco, ativo:1, ordem} |
| View logs | `wrangler tail feirinha-fasttrack-api` |
| DB query | `wrangler d1 execute feirinha-db --remote --command="SELECT * FROM pedidos"` |
| Test webhook | POST /webhook/pix {action: payment.updated, data: {id: 123}} |

## Troubleshooting
| Issue | Fix |
|-------|-----|
| Custom domain blocked | Cloudflare Dashboard → Security → disable Under Attack / WAF rules |
| Master branch stale | Deploy to master branch or push to GitHub |
| PIX not creating | Check PIX_ACCESS_TOKEN secret, MercadoPago account |
| WhatsApp not sending | Check Evolution API URL/key/instance, instance connected |
| Cron not running | Check wrangler.toml triggers, deployed version has cron |

## Project Structure for Navigation
```
.planning/
├── PROJECT.md          # Project identity & commands
├── REQUIREMENTS.md     # Functional/non-functional reqs
├── STATE.md            # Current status, issues, next actions
└── codebase/
    └── ARCHITECTURE.md # Detailed architecture map
```

## Next Session Start
```bash
cd feirinha-fasttrack
# Check .planning/STATE.md for current status
# Run: npx wrangler tail feirinha-fasttrack-api (in separate terminal)
# Continue from STATE.md "Next Actions"
```