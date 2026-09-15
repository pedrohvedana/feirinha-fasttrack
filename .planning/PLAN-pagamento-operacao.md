# PLAN - Cancelamentos, Lançamentos e Operação Feirinha

## Objetivo
Melhorar fluxo financeiro (cancelamentos/estornos) e operacional (lançamentos/filia) para feirinha de rua, focando em:
1. Estorno PIX automático
2. Cancelamento com histórico
3. Lançamento manual (despesa/receita)
4. Relatórios financeiros
5. Operação mais rápida (impressão térmica, atalhos)

---

## 1. Cancelamento e Estorno PIX

### Problema Atual
- Status `cancelado` existe mas não desfaz pagamento PIX
- Se cliente paga e cancela depois, precisa reembolso manual no MercadoPago
- Sem rastreio de quem cancelou (cliente, balconista, sistema)

### Solução

**1.1 Fluxo de Cancelamento com Estorno**
```
Cliente clica "Cancelar pedido" (antes pago)
  → API PATCH /pedidos/:id/cancelar { motivo }
  → Se status = pago (PIX):
     → Chama MercadoPago POST /payments/{payment_id}/refunds
     → Atualiza pedido: status='cancelado', cancelado_em, cancelado_por, refund_id
     → Envia WhatsApp: "Seu pedido foi cancelado, estorno em andamento"
  → Se status != pago:
     → Só atualiza status + histórico
```

**Campos novos em pedidos:**
```sql
cancelado_em DATETIME,
cancelado_por TEXT, -- 'cliente' | 'balconista' | 'sistema'
cancelamento_motivo TEXT,
refund_id INTEGER, -- MercadoPago refund ID
estorno_status TEXT, -- 'pending' | 'refunded' | 'failed'
```

**APIs novas:**
- `PATCH /pedidos/:id/cancelar` - cancelamento genérico
- `GET /pedidos/:id/estorno` - status estorno (se PIX)
- `POST /pedidos/:id/estornar` - disparar estorno manual (case falhe automático)

**Validação:**
- Só pode cancelar se `aguardando_pagamento`, `pago`, ou `em_preparo` (antes pronto)
- Cliente só cancela se `origem != balcao` e até X minutos após criação
- Balcão/cozinha cancela qualquer um

**Testes necessários:**
- Cancelamento antes pagamento → status='cancelado', sem estorno
- Cancelamento após pagamento PIX → chama refund, atualiza campos
- Cancelamento após pagamento cartão/dinheiro → marca 'cancelado', estorno manual
- Client cancela pedido de outro cliente → 403
- Erro no refund API → status fica 'pago_cancelado_pendente' (estorno manual)

**Arquivos afetados:**
- `api/src/routes/pedidos.ts` - novas rotas cancelar/estornar
- `api/src/services/pix.ts` - função `estornarPagamento()`
- `api/src/services/whatsapp.ts` - template "pedido cancelado + estorno"
- `public/src/pages/FilaPedidos.jsx` - botão cancelar
- `public/src/pages/PedidoRastreio.jsx` - cliente poder cancelar (se permitido)
- `schema.sql` - novos campos

---

## 2. Lançamentos Financeiros

### Problema Atual
- Só conta receita de pedidos `entregue`
- Não rastreia despesas (compra ingredientes, gás, etc)
- Sem visão lucro real

### Solução

**2.1 Tabela `lancamentos`**
```sql
CREATE TABLE lancamentos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo TEXT CHECK(tipo IN ('receita', 'despesa')), -- NOT NULL,
  categoria TEXT, -- 'venda', 'ingredientes', 'gás', 'limpeza', 'outro'
  descricao TEXT,
  valor REAL NOT NULL,
  data DATE DEFAULT CURRENT_DATE,
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
  criado_por TEXT -- opcional: quem lançou
);

CREATE INDEX idx_lancamentos_data ON lancamentos(data);
CREATE INDEX idx_lancamentos_tipo ON lancamentos(tipo);
```

**2.2 Lógica de Vendas Automáticas**
Quando pedido muda para `entregue`:
- Inserir lançamento: tipo='receita', categoria='venda', valor=valor_total, descricao="Pedido #{id}"

**2.3 API**
- `POST /lancamentos` - criar manual (despesa/receita avulsa)
- `GET /lancamentos` - listar (filtros: data_inicio, data_fim, tipo, categoria)
- `GET /lancamentos/resumo` - total receita, total despesa, lucro líquido por período
- `DELETE /lancamentos/:id` - remover (soft delete, mantém histórico)

**2.4 Interface**
- Dashboard → aba "Financeiro"
- Formulário rápido: [data], [tipo], [categoria dropdown], [valor], [descrição]
- Tabela com paginação
- Botão "Exportar CSV" (período selecionado)

**Testes:**
- Pedido entregue → cria lançamento automático
- Lançamento manual despesa → desconta lucro
- Filtro por período retorna correto
- CSV export tem formato correto

**Arquivos:**
- `api/src/routes/financeiro.ts` (novo)
- `public/src/pages/Financeiro.jsx` (novo)
- `public/src/App.jsx` - rota `/financeiro`
- `schema.sql` - tabela + triggers se necessário

---

## 3. Melhoria de Operação (Fila/Cozinha)

### Problema Atual
- Balcão precisa visualizar fila toda hora (polling 5s)
- Impressão térmica não existe (cozinha usa tela)
- Sem atalhos para ações comuns

### Solução

**3.1 Impressão Térmica 80mm**
- Gerar cupom quando pedido muda para `pago` ou `em_preparo`
- Dados: ID, cliente, itens, total, horário, observações
- Integração: API gera PDF → envia para impressora IP (ESC/POS) ou salva PDF para compartilhar

Implementação:
- API: `GET /pedidos/:id/cupom` → PDF ou texto formatado
- Frontend: botão "Imprimir cupom" em FilaPedidos/Cozinha → abre PDF
- Alternativa: integrar com impressora WebUSB (em futuro)

**3.2 Atalhos Teclados**
- FilaPedidos: `Ctrl+Enter` → confirmar pagamento; `Ctrl+P` → imprimir; `E` → entregar
- Cozinha: `Espaço` → iniciar preparo; `Enter` → marcar pronto

**3.3 Notificación Visual Ativa**
- FilaPedidos: pedido novo pisca borda verde 3s
- Cozinha: timer acima 20min em vermelho piscante

**3.4 Histórico de Hoje**
- Dashboard: listar últimos 10 pedidos entregues
- Botão "Ver mais" para página separada

---

## 4. Relatórios / Dashboard

**4.1 Métricas Importantes**
- Vendas por hora (heatmap)
- Ticket médio
- Taxa conversão PIX (xing, ewho paga, qto tempo demora)
- Produtos mais vendidos
- Perda por cancelamento

**4.2 Export**
- CSV diário automático (cron job salva em D1 ou envia WhatsApp/email)
- Filtros: hoje, esta semana, este mês, customizado

**4.3 Alertas**
- Meta diária não atingida → WhatsApp balcão
- PIX vencendo em 5min → WhatsApp cliente

---

## 5. Segurança / Auditoria

**5.1 Log de Ações**
```sql
CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_tipo TEXT, -- 'balconista', 'cozinha', 'sistema'
  acao TEXT, -- 'criou_pedido', 'cancelou_pedido', 'alterou_cardapio'
  entidade TEXT, -- 'pedido:abc123'
  detalhes TEXT, -- JSON
  ip TEXT,
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

Aplicar em:
- Login PIN
- Criar/cancelar pedido
- Atualizar status
- Modificar cardápio
- Criar/editar lançamento

---

## 6. Deploy / Infra

**6.1 Backups**
- Export D1 diário para GitHub Repo privado (json)
- Restauração: script `wrangler d1 execute` import

**6.2 Monitoramento**
- Uptime Robot (free) ping `https://feirinha-fasttrack-api.pedro-vedana.workers.dev/`
- Alerta WhatsApp se standby > 1min

**6.3 Performance**
- Frontend: service worker cache (PWA)
- API: cache cardápio 5min (D1 em memória ou KV)

---

## PRIORIZAÇÃO (P0/P1/P2)

### P0 (Core - Próxima Sprint)
| Função | Valor | Esforço |
|--------|-------|---------|
| **Estorno automático PIX** | Alto | M |
| **Lançamento automático venda** | Alto | S |
| **Log básico de ações** | Médio | S |
| **Atalhos teclado** | Baixo | S |

### P1 (Próximas 2 semanas)
| Função | Valor | Esforço |
|--------|-------|---------|
| **Impressão térmica** | Alto | L |
| **Dashboard financeiro** | Alto | M |
| **Export CSV** | Médio | S |
| **PWA/offline** | Médio | M |

### P2 (Melhoria Contínua)
| Função | Valor | Esforço |
|--------|-------|---------|
| **Relatórios avançados** | Médio | M |
| **Notificações WhatsApp customizáveis** | Baixo | S |
| **Multi-ponto (várias feirinhas)** | Alto | L |
| **Modo treinamento (dados fake)** | Baixo | S |

---

## SEQUÊNCIA RECOMENDADA

**Semana 1: P0**
1. Estorno PIX (mais complexo, mais valor)
2. Log de ações básico
3. Atalhos teclado (rápido wins)

**Semana 2-3: P1**
1. Lançamento automático + dashboard financeiro
2. Impressão térmica (teste hardware)
3. Export CSV

**Semana 4: Estabilização**
1. Testes cobertura estorno (≥80%)
2. Deploy produção + monitoramento
3. Documentação operacional

---

## BUGS IDENTIFICADOS (correrir imediato)

1. **bot.ts:81.2% branch** - caminho `tratarVenda` quando `item` não encontrado no carrinho (line 265-269) não tem teste de fallback
2. **webhook.ts:50% functions** - 2 funções não testadas
3. **Rotas sem rate limiting** - `/pedidos` pode ser flooded (mitigar com CORS + validação payload)
4. **Frontend polling 5s** sem debounce se API lenta - usar exponential backoff

---

## COMANÇO IMEDIATO

1. **Checklist: Estorno PIX**
   - [ ] Nova migration D1: campos cancelamento/estorno
   - [ ] `pix.ts`: função `estornarPagamento(payment_id)`
   - [ ] `pedidos.ts`: `PATCH /pedidos/:id/cancelar` com lógica estorno
   - [ ] Testes unitários mock MercadoPago
   - [ ] Frontend: botão cancelar com confirmação

2. **Checklist: Lançamento**
   - [ ] Tabela `lancamentos`
   - [ ] Trigger on status='entregue' → inserir lançamento
   - [ ] Rota GET resumo (hoje/semana/mes)
   - [ ] Dashboard página financeiro

3. **Checklist: Atalhos**
   - [ ] useEffect keydown listeners
   - [ ] Priorizar ações comuns

Quer que eu #state comece implementação do P0 (estorno PIX) ou planeje mais P1 antes de codificar?