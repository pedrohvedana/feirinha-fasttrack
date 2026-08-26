# Feirinha Fast Track

Sistema completo de atendimento para feirinha com pedidos via link, gerenciamento de fila e notificações WhatsApp automáticas.

## Stack
- **API**: Cloudflare Workers com Hono.js
- **Banco**: Cloudflare D1 (SQLite edge)
- **Frontend**: React + Vite + Tailwind CSS
- **WhatsApp**: Evolution API

## Estrutura
```
feirinha-fasttrack/
├── api/           # Cloudflare Worker (API Backend)
├── public/        # React Frontend (Cloudflare Pages)
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

## Fluxo do Pedido
1. Cliente acessa link do pedido
2. Monta pedido e escolhe forma pagamento
3. Pagamento PIX: copia-cola gerado automaticamente
4. Balconista confirma pagamento
5. WhatsApp: "Está na fila! Tempo estimado: 5-10min"
6. Pedido sai para preparo
7. Balconista marca como "Pronto"
8. WhatsApp: "Seu pedido está pronto para retirada!"
