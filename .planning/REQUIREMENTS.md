# Requirements - Feirinha Fast Track

## Project Vision
Sistema completo de atendimento para feirinha: pedidos via link público, fila de preparo com alertas sonoros/voz, pagamentos PIX automáticos (MercadoPago) com confirmação via webhook, notificações WhatsApp automáticas (Evolution API), dashboard de estatísticas, gestão de cardápio.

## Functional Requirements

### FR1 - Pedido do Cliente (Público)
- [x] Formulário público: nome, WhatsApp, itens do cardápio, forma pagamento (PIX/dinheiro/cartão)
- [x] PIX: gera cobrança MercadoPago, retorna QR code base64 + copia-e-cola
- [x] Dinheiro/Cartão: cria pedido `aguardando_pagamento`, sem PIX
- [x] Rastreamento público `/rastrear/:id` com link WhatsApp
- [x] Validação campos obrigatórios

### FR2 - Fila de Pedidos (Balcão)
- [x] Lista pedidos ativos: `aguardando_pagamento`, `pago`, `em_preparo`, `pronto`
- [x] Auto-refresh (polling 5s)
- [x] Alerta sonoro (beep) + voz (speechSynthesis) novos pedidos
- [x] Botão ativar/desativar som
- [x] Ações: confirmar pagamento manual, avançar status (em_preparo → pronto)

### FR3 - Cozinha (Tela Grande)
- [x] Cards grandes por pedido (modo cozinha)
- [x] Timer vivo por pedido (criado_em → agora)
- [x] Cores: verde <10min, amarelo 10-20min, vermelho >20min
- [x] Status visual: pago/em_preparo/pronto
- [x] Filtro apenas pedidos em preparo

### FR4 - Pagamentos PIX (MercadoPago)
- [x] Cria cobrança PIX via API MercadoPago
- [x] Webhook `payment.updated` consulta status
- [x] Auto-confirma quando `approved` → atualiza pedido + WhatsApp
- [x] Expiração 30 min (`PIX_EXPIRACAO_MINUTOS`)
- [x] Fallback confirmação manual

### FR5 - WhatsApp Notificações (Evolution API)
- [x] Pedido criado (opcional - atualmente só em confirmação)
- [x] Pagamento confirmado → "Seu pedido entrou na fila! Tempo estimado..."
- [x] Em preparo → "Seu pedido está sendo preparado"
- [x] Pronto → "Seu pedido está pronto para retirada!"
- [x] Cancelado → "Seu pedido foi cancelado"
- [x] Template mensagens com link rastreamento

### FR6 - Dashboard & Admin
- [x] Stats hoje: total, entregues, em andamento, receita
- [x] Cardápio admin: CRUD itens (nome, preço, ativo, ordem)
- [x] Auth PIN 1234 protege rotas admin

### FR7 - Auto-Cancelamento (Cron)
- [x] Cron `*/5 * * * *` cancela pedidos `aguardando_pagamento` + PIX > 15 min
- [x] Envia WhatsApp cancelado
- [x] Config `PEDIDO_EXPIRA_MINUTOS`

## Non-Functional Requirements
- **Performance**: Edge Workers (<100ms), Pages CDN
- **Segurança**: Secrets Wrangler (PIX token, WhatsApp key), PIN auth frontend
- **Confiabilidade**: Idempotency key PIX, webhook status check
- **Usabilidade**: Mobile-first, PWA-ready, offline queue
- **Observabilidade**: Console logs, cron logs

## Stack & Infrastructure
| Layer | Technology |
|-------|------------|
| API | Cloudflare Workers (Hono 4.4, TypeScript) |
| DB | Cloudflare D1 (SQLite edge) |
| Frontend | React 19, Vite 8, Tailwind v4, React Router 7 |
| Deploy API | `wrangler deploy` |
| Deploy Frontend | `wrangler pages deploy dist --project-name=feirinha-ui` |
| Payments | MercadoPago PIX |
| WhatsApp | Evolution API (self-hosted VPS) |
| Domain | feirinha.ciavedana.com.br (Cloudflare Pages custom domain) |
| Auth | PIN 1234 (localStorage) |