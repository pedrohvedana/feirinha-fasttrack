# PLAN - Atendimento/chatbot WhatsApp via WA-AKG

## Objetivo
Bot de vendas + atendimento completo no WhatsApp da feirinha (5511921148727)
com lógica própria no Worker Cloudflare, reaproveitando o fluxo PIX existente.

## Contexto verificado
- WA-AKG sessão `feirinha` CONNECTED, número 5511921148727
- Envio: POST /api/messages/feirinha/{jid}/send (x-api-key) — testado real p/ 5515997646555
- Webhooks: message.received / message.sent, HMAC-SHA256 (X-Webhook-Signature)
- Registro: POST /api/webhooks/feirinha {name, url, secret, events}
- Bot nativo WA-AKG ativo (#ping/#menu) → desligar p/ resposta única
- Worker hoje só envia; reusa POST /pedidos + criarCobrancaPix + /webhook/pix
- Atendente: você, responde pelo painel WA-AKG; ping WhatsApp p/ 5515997646555

## Arquitetura
Cliente WA <-> WA-AKG (5511...727) -> webhook HMAC -> Worker /webhook/whatsapp
  -> services/bot.ts (máquina estados) -> D1 conversas + atendimento_config
  -> resposta via enviarViaWaAkg (mesmo canal)

## Etapas

### 1. Schema D1
- `conversas`: numero PK, passo, carrinho_json, cliente_nome, paused_until, atualizado_em (idx)
- `atendimento_config`: key-value (horario, localizacao, duvidas JSON, bem_vindo,
  atendente_numero=5515997646555, atendente_nome)
- Seed default; editável por script sem redeploy

### 2. routes/whatsapp.ts (webhook entrada)
- POST /webhook/whatsapp: valida HMAC (crypto.subtle timing-safe, secret WA_AKG_WEBHOOK_SECRET)
- Filtra fromMe/grupos/news; dedupe por key.id (exactly-once); 200 rápido + ctx.waitUntil
- Despacha onReceived / onSent p/ bot.ts

### 3. services/bot.ts
- onReceived (cliente→bot), exceto se passo=humano ou paused_until>now (então só ping):
  - Menu numérico: cardápio ativo D1 + opções [cardápio, rastrear <id>, falar humano, cancelar]
  - Fluxo venda: item → qtd (≤50) → carrinho+total → confirmar → [pix|dinheiro]
  - PIX: POST /pedidos (reusa criarCobrancaPix) → copia-e-cola; /webhook/pix confirma
  - Dinheiro: pedido + aviso cozinha
  - Atendimento completo: cardápio/preços, local, horário, rastreio, FAQ keywords, ajuda
  - `#falar humano`: passo=humano, mudo + ping atendente
- onSent (atendente→cliente):
  - Envio do bot (flag resposta_bot) → ignora (loop guard)
  - Manual → paused_until=now+10min; se humano, mantém mudo até #menu
  - Ping atendente se nova msg cliente em humano (dedupe por thread)

### 4. Registrar webhook + config WA-AKG
- POST /api/webhooks/feirinha events:[message.received, message.sent]
- PATCH /api/sessions/feirinha/bot-config {enabled:false}
- Secret WA_AKG_WEBHOOK_SECRET (Cloudflare, fora do toml)

### 5. Segurança
- HMAC obrigatório (401 sem/inválido); validação numérica itens (≤20) qtd (≤50);
  número sanitizado; queries parametrizadas; anti-spam janela (10 msg/min)

### 6. Testes (TDD RED→GREEN, ≥80% cobertura)
- Unit/bot: transições estado, total carrinho, validação, FAQ, silêncio humano/paused,
  ignora self resposta_bot
- Integração/webhook: 401 sem assinatura, 200 válida, ignora fromMe/grupo, dedupe
- E2E manual: conversa completa real, #falar humano, resposta painel → ping + bot mudo

### 7. Deploy
- wrangler secret put WA_AKG_WEBHOOK_SECRET → migração D1 → wrangler deploy
- Registrar webhook + desligar bot nativo + seed atendimento_config
- Commits por checkpoint na branch feat/wa-akg-integration

## Decisões fechadas
- Resposta sempre via WA-AKG (mesmo canal), sem router Evolution
- Ping WhatsApp p/ 5515997646555 com nome do atendente
- Escopo: atendimento completo (venda + rastreio + FAQ/horários/local)
- Estado em D1; expiração/reset 15min no cron existente
- message.sent não gera resposta: pausa 10min + notificação

## Riscos / mitigação
- Dupla resposta (bot interno) → desligar bot nativo WA-AKG
- Loop bot↔pausa → flag resposta_bot ignora self-envio
- Webhook público → HMAC obrigatório + anti-spam