# Current State - Feirinha Fast Track (27/08/2026)

## Completed Phases
| Phase | Status | Notes |
|-------|--------|-------|
| Setup Inicial | ✅ Done | Estrutura, configs, schema |
| Backend API | ✅ Done | CRUD, WhatsApp, Auth, Deploy |
| WhatsApp Integration | ✅ Done | Evolution API, templates, webhook |
| Frontend React | ✅ Done | PedidoForm, Fila, Dashboard, Cozinha |
| Deploy | ✅ Done | Workers + Pages + Custom domain |

## Deployed Versions
| Component | URL | Version |
|-----------|-----|---------|
| API | https://feirinha-fasttrack-api.pedro-vedana.workers.dev | `bf4e3ca7` |
| Frontend (prod) | https://feirinha-ui.pages.dev | latest |
| Frontend (master) | https://master.feirinha-ui.pages.dev | needs push |
| Custom Domain | https://feirinha.ciavedana.com.br | blocked by Cloudflare WAF |

## Working Features (Tested 27/08)
- [x] `POST /pedidos` cria pedido + PIX QR code + copia-cola
- [x] `GET /rastrear/:id` rastreamento público
- [x] `GET /pedidos/fila/ativas` inclui `aguardando_pagamento`
- [x] Cozinha cards + timers coloridos
- [x] `POST /pedidos/:id/confirmar-pagamento` manual
- [x] `POST /webhook/pix` consulta MercadoPago, auto-aprova `approved`
- [x] Cron `*/5 * * * *` cancela PIX > 15min
- [x] WhatsApp notificações (confirmado, preparo, pronto, cancelado)
- [x] Dashboard stats + Cardápio admin CRUD
- [x] PIN auth protege rotas admin

## Known Issues
1. **Custom domain WAF block**: `feirinha.ciavedana.com.br` travado Cloudflare Security - precisa desligar dashboard
2. **master branch outdated**: `master.feirinha-ui.pages.dev` mostra cardápio antigo - precisa push ou deploy branch master
3. **Pedido criado não envia WhatsApp**: Design atual só envia na confirmação (pago) - pode adicionar se quiser
4. **Receita_total = 0**: Stats soma apenas pedidos `entregue` (nenhum entregue ainda)

## Secrets Configured (Wrangler)
- `PIX_ACCESS_TOKEN` - MercadoPago access token
- `PIX_PAGADOR_EMAIL` - Email fallback pagador
- `PIX_WEBHOOK_SECRET` - Para validação webhook (não usado ainda)
- Vars em wrangler.toml: EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE, PIX_EXPIRACAO_MINUTOS, PEDIDO_EXPIRA_MINUTOS

## Database Schema (D1)
```sql
-- pedidos
id TEXT PK, cliente_nome, whatsapp, itens_json, valor_total REAL,
pagamento_tipo, pagamento_confirmado INTEGER, status,
criado_em, atualizado_em,
pix_payment_id, pix_qr_code, pix_qr_base64, pix_expira_em

-- cardapio
id INTEGER PK, nome, preco REAL, ativo INTEGER, ordem INTEGER, criado_em
```

## Next Actions (Priority)
1. Push to GitHub master branch (sync master.feirinha-ui.pages.dev)
2. Fix custom domain WAF in Cloudflare dashboard
3. Optional: WhatsApp na criação do pedido
4. Optional: Status "entregue" + receita real
5. Optional: PWA/offline support