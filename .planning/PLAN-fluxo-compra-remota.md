# PLAN - Fluxo Compra Remota + Chegada no Local

## Objetivo Simplificado
Cliente compra de qualquer lugar (casa, trabalho) → paga PIX → recebe link rastreio → quando chegar na feirinha clica "Cheguei" → entra na fila real da cozinha.

Remove: impressão térmica (fica para depois)
Foco: compra remota → pagamento → chegada física → preparo → retiro

---

## 1. TRÊS CANAIS DE COMPRA

### Canal A: Site/Página (PedidoForm.jsx)
**Como funciona hoje + melhorias:**

Cliente acessa `https://feirinha.ciavedana.com.br`
1. Preenche nome (opcional) + WhatsApp (obrigatório)
2. Escolhe itens do cardápio
3. Seleciona PIX
4. Clica "Finalizar Pedido"
5. Vê QR Code + copia-cola
6. Paga no app do banco
7. MercadoPago webhook confirma → pedido vai para "pago"
8. Cliente recebe WhatsApp: "Pagamento confirmado! Seu pedido #abc123 entrou na fila. Quando chegar na feirinha, clique aqui: [link rastreio]"

**Melhorias necessárias no PedidoForm:**
- Adicionar botão "Acompanhar pedido" na tela de sucesso → leva para `/rastrear/:id`
- Mostrar mensagem clara: "Pague e quando chegar no local, clique em 'Cheguei'"
- Se PIX, mostrar tempo estimado de espera (baseado em fila atual)

### Canal B: WhatsApp Bot (WA-AKG)
**Como funciona hoje:**

Cliente manda "oi" → bot mostra menu:
1️⃣ Ver cardápio e pedir
2️⃣ Rastrear pedido
3️⃣ Falar com atendente

Cliente escolhe 1 → escolhe itens → confirma → escolhe PIX → recebe link de pagamento (MercadoPago) + link rastreio

**Correção necessária:**
- Hoje o bot cria pedido com `origem='prepedido'` e PIX gera cobrança separada
- Precisa unificar: bot deve usar o mesmo fluxo do site (criar pedido → retornar link de pagamento PIX)
- Hoje o bot diz "PIX chegando em breve" — precisa enviar o link real do PIX

### Canal C: Pedido Físico no Local (Balcão)
**Como funciona hoje:**

Balcão cria pedido via "Pedido Balcão" (FilaPedidos.jsx → modal)
- Nome obrigatório
- Itens do cardápio
- Pagamento: dinheiro ou cartão (presencial)
- Status vai direto para "aguardando_pagamento" → "pago" (confirmação manual)

**Melhoria:**
- Adicionar opção PIX no balcão (gera QR para cliente pagar ali mesmo)
- Quando cliente paga no local, opcionalmente enviar WhatsApp com rastreio

---

## 2. FLUXO DE CHEGADA NO LOCAL

### O que acontece quando cliente chega:

**Estado atual:**
```
pago → cliente clica "Cheguei" → aguardando_retirada → cozinha inicia preparo
```

**Melhorias:**

1. **Link rastreio enviado no WhatsApp** após pagamento confirmado:
   ```
   ✅ Pagamento confirmado! Pedido #abc123
   📍 Quando chegar na feirinha, clique: https://feirinha.ciavedana.com.br/rastrear/abc123
   ```

2. **Página de rastreio** (`/rastrear/:id`):
   - Mostra status atual
   - Botão "📍 Cheguei" (só aparece se status = `pago`)
   - Quando clica → status = `aguardando_retirada`
   - Mostra posição na fila: "Você é o 3º na fila"
   - Tempo estimado: "Pronto em ~15 minutos"

3. **Notificação para cozinha/balcão:**
   - Quando alguém clica "Cheguei", aparece alerta especial na FilaPedidos e Cozinha
   - "Cliente Maria chegou! Pedido #abc123"

4. **Prioridade na fila:**
   - Pedidos com `aguardando_retirada` (cliente já no local) vão para o topo da cozinha
   - Mostrar separado na tela cozinha: "Clientes esperando no local"

---

## 3. CÓDIGO — O QUE PRECISA MUDAR

### 3.1 Backend — API (api/src/routes/pedidos.ts)

**Melhorias no POST /pedidos:**
```typescript
// Retornar link de rastreio junto com o pedido
return c.json({
  id,
  message: 'Pedido criado',
  rastreio_url: `https://feirinha.ciavedana.com.br/rastrear/${id}`,
  pix: pix ? { qr_code, qr_base64, expira_em } : null
});
```

**Melhorias no PATCH /pedidos/:id/cheguei:**
```typescript
// Adicionar: enviar WhatsApp para balcão quando cliente chega
// Adicionar: calcular posição na fila
// Adicionar: retornar tempo estimado
```

### 3.2 Backend — Bot WhatsApp (api/src/services/bot.ts)

**Corrigir fluxo PIX no bot:**
```typescript
// Hoje: diz "PIX chegando em breve"
// Deve: criar cobrança PIX real e enviar QR code + link pagamento

if (pagamentoTipo === 'pix') {
  const cobranca = await criarCobrancaPix(c.env, { id, valor_total: total, whatsapp: numero });
  // Enviar QR code como imagem ou texto do copia-e-cola
  await responder(numero, `✅ Pedido #${id} criado!\n\nPIX para pagamento:\n${cobranca.qr_code}\n\nOu acesse: ${URL_Rastreio(id)}\n\nQuando chegar na feirinha, clique no link acima!`);
}
```

### 3.3 Frontend — Página Rastreio (public/src/pages/PedidoRastreio.jsx)

**Melhorias necessárias:**
```jsx
// Adicionar posição na fila
const [posicao, setPosicao] = useState(null);

async function buscarPosicao() {
  const fila = await api.filaAtivas();
  const meuIndice = fila.results.findIndex(p => p.id === id);
  if (meuIndice >= 0) setPosicao(meuIndice + 1);
}

// Mostrar no card:
{pedido.status === 'pago' && (
  <div className="bg-blue-50 p-4 rounded-xl text-center">
    <p className="text-lg font-bold">Você é o cliente #{posicao}</p>
    <p className="text-sm text-gray-600">Tempo estimado: ~{posicao * 8} min</p>
    <button onClick={marcarChegada}>📍 Cheguei na feirinha!</button>
  </div>
)}

{pedido.status === 'aguardando_retirada' && (
  <div className="bg-violet-50 p-4 rounded-xl text-center">
    <p className="text-lg font-bold">Você está na fila!</p>
    <p className="text-sm text-gray-600">Avisamos a cozinha. Aguarde ser chamado.</p>
  </div>
)}
```

### 3.4 Frontend — FilaPedidos / Cozinha

**FilaPedidos:**
- Destacar pedidos com `aguardando_retirada` (badge "Cliente chegou!")
- Som especial quando cliente chega

**Cozinha:**
- Ordenar: primeiro `aguardando_retirada`, depois `pago`, depois `em_preparo`
- Badge especial para quem está esperando no local

---

## 4. COMUNICAÇÃO (WhatsApp)

**Mensagens no fluxo:**

1. **Pedido criado (com PIX):**
   ```
   🍕 Pedido #abc123 criado!
   Total: R$ 45,00
   PIX: [copia-e-cola]
   📍 Quando chegar, acesse: feirinha.ciavedana.com.br/rastrear/abc123
   ```

2. **Pagamento confirmado:**
   ```
   ✅ Pagamento confirmado!
   Seu pedido #abc123 está na fila.
   📍 Quando chegar na feirinha, clique: feirinha.ciavedana.com.br/rastrear/abc123
   ```

3. **Cliente chegou (balcão recebe):**
   ```
   🔔 Cliente chegou!
   Maria — Pedido #abc123 (2x Calabresa)
   ```

4. **Pedido pronto:**
   ```
   🎉 Pedido #abc123 pronto!
   Pode retirar no balcão.
   ```

---

## 5. IMPLEMENTAÇÃO — ORDEM

### Passo 1: API retorna rastreio_url
- Arquivo: `api/src/routes/pedidos.ts`
- Mudança: adicionar `rastreio_url` no retorno do POST /pedidos
- Esforço: 5 min

### Passo 2: Bot WhatsApp envia link real
- Arquivo: `api/src/services/bot.ts`
- Mudança: chamar criarCobrancaPix e enviar link + QR
- Esforço: 30 min

### Passo 3: Página Rastreio melhorada
- Arquivo: `public/src/pages/PedidoRastreio.jsx`
- Mudança: posição na fila, botão Cheguei melhorado, tempo estimado
- Esforço: 45 min

### Passo 4: Cozinha prioriza quem chegou
- Arquivo: `public/src/pages/Cozinha.jsx`
- Mudança: ordenar aguardando_retirada primeiro, badge especial
- Esforço: 15 min

### Passo 5: WhatsApp quando chega
- Arquivo: `api/src/routes/pedidos.ts` (rota /cheguei)
- Mudança: enviar WhatsApp para balcão
- Esforço: 15 min

---

## 6. TESTES

| Cenário | Esperado |
|---------|----------|
| Cliente compra via site com PIX | Retorna QR + link rastreio |
| Cliente compra via WhatsApp | Retorna QR real + link rastreio |
| Cliente clica "Cheguei" | Status muda para `aguardando_retirada` |
| Posição na fila | Mostra número correto |
| Cozinha prioriza | `aguardando_retirada` aparece primeiro |
| Balcão recebe notificação | WhatsApp avisa quando cliente chega |

---

## 7. NÃO FAZER AGORA (deixado para depois)

- Impressão térmica 80mm
- Cancelamento/estorno automático PIX
- Dashboard financeiro completo
- PWA/offline
- Multi-ponto

Foco total: **compra remota + chegada no local → fila funcionando**
