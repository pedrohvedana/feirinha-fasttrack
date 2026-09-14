# Plan: Fluidez para Operador Solo

## Summary
Sistema exige que o operador (que faz pizza e atende) fique preso à tela. Este plano adiciona alerta sonoro/voz de pedido novo, Modo Cozinha (tela grande), confirmação automática de PIX (Mercado Pago copia-e-cola), auto-cancelamento de pedidos PIX abandonados e link público de rastreamento no WhatsApp.

## User Story
Como operador solo, quero que o sistema avise ativamente, confirme PIX sozinho e deixe o cliente auto-rastrear, para gastar energia fazendo pizza e atendendo.

## Problem → Solution
Tela sem alerta + confirmação manual de pagamento + cliente perguntando "cadê meu pedido" → Alertas sonoros/voz, PIX automático via webhook, tela grande de cozinha, auto-cancelamento e rastreamento público.

## Metadata
- **Complexity**: Large
- **Source PRD**: N/A
- **PRD Phase**: N/A
- **Estimated Files**: 14

---

## UX Design

### Features
1. Alerta sonoro + voz na Fila (beep + "Novo pedido de X")
2. Modo Cozinha `/cozinha` — tela grande escura, cards grandes, cronômetro, cor por tempo
3. PIX automático — Mercado Pago copia-e-cola + webhook; dinheiro/cartão seguem manual
4. Auto-cancelar PIX abandonado (cron 5min)
5. Rastreamento público `/rastrear/:id` + link no WhatsApp

---

## Files to Change

| File | Action | Feature |
|---|---|---|
| `public/src/pages/FilaPedidos.jsx` | UPDATE | 1 |
| `public/src/pages/Cozinha.jsx` | CREATE | 2 |
| `public/src/App.jsx` | UPDATE | 2, 5 |
| `public/src/pages/PedidoRastreio.jsx` | CREATE | 5 |
| `public/src/pages/PedidoForm.jsx` | UPDATE | 3 |
| `public/src/api.js` | UPDATE | 3 |
| `api/src/services/pix.ts` | CREATE | 3 |
| `api/src/routes/pedidos.ts` | UPDATE | 2, 3 |
| `api/src/routes/webhook.ts` | UPDATE | 3 |
| `api/src/services/whatsapp.ts` | UPDATE | 4, 5 |
| `api/src/index.ts` | UPDATE | 4 |
| `api/wrangler.toml` | UPDATE | 3, 4 |
| D1 migração | EXEC | 3 |
| `.claude/PRPs/plans/fluidez-operador-solo.plan.md` | CREATE | - |

---

## D1 Migration

```sql
ALTER TABLE pedidos ADD COLUMN pix_payment_id INTEGER;
ALTER TABLE pedidos ADD COLUMN pix_qr_code TEXT;
ALTER TABLE pedidos ADD COLUMN pix_qr_base64 TEXT;
ALTER TABLE pedidos ADD COLUMN pix_expira_em DATETIME;
```

## Secrets

```bash
npx wrangler secret put PIX_ACCESS_TOKEN
npx wrangler secret put PIX_WEBHOOK_SECRET
```

## Step-by-Step Tasks

### Task 1: Alerta sonoro + voz na Fila
- Compare IDs vistos (useRef Set) com novos em carregar(); dier dispara beep + voz.
- Botão "Ativar som" (AudioContext requer gesto), persistir em localStorage.

### Task 2: Modo Cozinha
- Query fila/ativas inclui `atualizado_em`.
- Cozinha.jsx: cards grandes, cronômetro 1s, cor por tempo (verde <10, amarelo 10-20, vermelho >20), exibe pago/em_preparo/pronto.

### Task 3: PIX automático
- services/pix.ts: criarCobranca (POST /v1/payments MP), validarWebhook.
- pedidos.ts POST: se pix e token, cria cobrança, grava qr; retorna pix no response.
- webhook.ts `/webhook/pix`: GET payment, se approved → status pago + WhatsApp.
- PedidoForm: mostra QR (base64 img) + copia-cola; dinheiro/cartão sem mudança.

### Task 4: Cron auto-cancelar
- wrangler.toml [triggers] crons. index.ts scheduled: UPDATE aguardando_pagamento pix > 15min → cancelado + WhatsApp.

### Task 5: Rastreamento
- PedidoRastreio.jsx público, poll buscarPedido 5s.
- whatsapp.ts: templates com link /rastrear/{id}.

---

## Validation

```bash
cd api && npx wrangler dev && npx wrangler d1 execute feirinha-db --remote --file=migrations_pix.sql && npx wrangler deploy
cd public && npx vite build && npx wrangler pages deploy dist --project-name=feirinha-ui --branch=main --commit-dirty=true
```

## Risks
- MP token/2FA — mitigado com fallback manual.
- Webhook indisponível — poll GET payment no frontend 5s.
- Autoplay áudio — botão "Ativar som".