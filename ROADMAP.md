# ROADMAP - Feirinha Fast Track

## Status
- **Projeto**: Feirinha Fast Track
- **Stack**: Cloudflare Workers + D1 + React/Vite + Evolution API
- **Início**: 26/08/2026
- **Responsável**: Pedro

---

## Fases

### Fase 1: Setup Inicial ✅
- [x] Criar estrutura pastas
- [x] Configurar package.json
- [x] Criar wrangler.toml
- [x] Criar schema.sql
- [x] Criar entry point Hono
- [x] Criar rotas API
- [x] Criar serviço WhatsApp

### Fase 2: Backend API ⏳
- [ ] Configurar D1 no Cloudflare (obter database_id)
- [ ] Testar CRUD completo pedidos
- [ ] Testar envio mensagens WhatsApp
- [ ] Criar autenticação balconista
- [ ] Deploy API Cloudflare Workers

### Fase 3: Integração WhatsApp ⏳
- [ ] Configurar Evolution API VPS
- [ ] Testar envio mensagens texto
- [ ] Implementar fluxo notificações automáticas
- [ ] Adicionar confirmação pagamento webhook

### Fase 4: Frontend React ⏳
- [ ] Inicializar React Vite Tailwind
- [ ] Criar PedidoForm (cliente)
- [ ] Criar FilaPedidos (balconista)
- [ ] Criar Dashboard (stats)
- [ ] Implementar auto-refresh

### Fase 5: Deploy ⏳
- [ ] Deploy API Workers
- [ ] Deploy Frontend Pages
- [ ] Configurar domínio
- [ ] Testar fluxo completo
