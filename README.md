# Feirinha Fast Track

Sistema completo de atendimento para feirinha com pedidos por link, gerenciamento de fila e notificações WhatsApp automáticas.

## Stack

- **API**: Cloudflare Workers com Hono.js
- **Banco**: Cloudflare D1 (SQLite edge)
- **Frontend**: React + Vite + Tailwind CSS
- **WhatsApp**: Evolution API + WA-AKG (dual-provider)

## Estrutura

```
feirinha-fasttrack/
├── api/     Cloudflare Worker (API Backend)
├── public/  React Frontend (Cloudflare Pages)
└── README.md
```

## Setup

### API
```bash
cd api
npm install
npm run dev
```

### Frontend
```bash
cd public
npm install
npm run dev
```

## Deploy
```bash
# API
cd api
npm run deploy

# Frontend
cd public
npm run build
npx wrangler pages deploy dist
```

## Fluxo Pedido

1. Cliente acessa o link do pedido
2. Monta o pedido e escolhe a forma de pagamento
3. Pagamento PIX: copia-e-cola gerado automaticamente
4. Balconista confirma o pagamento
5. WhatsApp: "Está na fila! Tempo estimado: 5-10min"
6. Pedido sai para o preparo
7. Balconista marca como "Pronto"
8. WhatsApp: "Seu pedido está pronto para retirada!"

## Integração WhatsApp (dual-provider)

Envio de mensagens usa provedor configurável via variável `WHATSAPP_PROVIDER`:

| Variável | Descrição | Default |
|---|---|---|
| `WHATSAPP_PROVIDER` | `evolution` ou `wa-akg` | `evolution` |
| `WA_AKG_BASE_URL` | URL pública do gateway WA-AKG | `https://wa-akg.ciavedana.com.br` |
| `WA_AKG_API_KEY` | API Key gerada no painel WA-AKG | vazio (desativado) |
| `WA_AKG_SESSION` | ID da sessão WhatsApp no WA-AKG | `feirinha` |

- Com `WA_AKG_API_KEY` vazio, o provider `wa-akg` é ignorado e o fluxo usa apenas a Evolution.
- Falha no provider principal dispara fallback automático para o outro (ex.: Evolution caiu -> tenta WA-AKG).
- Roteador implementado em `api/src/services/whatsapp.ts` (`enviarMensagem`).
- Endpoint WA-AKG usado: `POST {WA_AKG_BASE_URL}/api/messages/{session}/{jid}/send` com header `X-API-Key` e body `{"message":{"text": ...}}`.

### Passo a passo infra VPS (paralelo à Evolution)

1. Na VPS, subir o WA-AKG usando o docker-compose oficial do repo `mrifqidaffaaditya/WA-AKG` (já inclui MySQL).
2. Criar superadmin: `npm run make-admin admin@exemplo.com senha`.
3. Acessar o dashboard e conectar a sessão WhatsApp por QR code (número dedicado).
4. Configurar proxy reverso (nginx) para publicar na URL `https://wa-akg.ciavedana.com.br` (porta padrão 3030).
5. No painel WA-AKG, gerar a API Key do usuário.
6. Preencher `WA_AKG_API_KEY` e `WA_AKG_SESSION` no `api/wrangler.toml` e fazer deploy: `npm run deploy`.