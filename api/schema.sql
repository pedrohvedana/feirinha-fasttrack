CREATE TABLE IF NOT EXISTS pedidos (
  id TEXT PRIMARY KEY DEFAULT (hex(randomblob(8))),
  cliente_nome TEXT,
  whatsapp TEXT NOT NULL,
  itens_json TEXT NOT NULL,
  valor_total REAL NOT NULL,
  pagamento_tipo TEXT CHECK(pagamento_tipo IN ('pix', 'cartao', 'dinheiro')),
  pagamento_confirmado INTEGER DEFAULT 0,
  status TEXT DEFAULT 'aguardando_pagamento',
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pedidos_status ON pedidos(status);
CREATE INDEX IF NOT EXISTS idx_pedidos_whatsapp ON pedidos(whatsapp);
CREATE INDEX IF NOT EXISTS idx_pedidos_criado_em ON pedidos(criado_em);

CREATE TABLE IF NOT EXISTS cardapio (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  preco REAL NOT NULL,
  ativo INTEGER DEFAULT 1,
  ordem INTEGER DEFAULT 0,
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cardapio_ativo ON cardapio(ativo);
CREATE INDEX IF NOT EXISTS idx_cardapio_ordem ON cardapio(ordem);

-- Chatbot WhatsApp (WA-AKG)
CREATE TABLE IF NOT EXISTS conversas (
  numero TEXT PRIMARY KEY,
  passo TEXT DEFAULT 'menu',
  carrinho_json TEXT DEFAULT '[]',
  cliente_nome TEXT,
  paused_until DATETIME,
  atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_conversas_atualizado_em ON conversas(atualizado_em);

CREATE TABLE IF NOT EXISTS atendimento_config (
  chave TEXT PRIMARY KEY,
  valor TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bot_msg_ids (
  key_id TEXT PRIMARY KEY,
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bot_msg_ids_criado_em ON bot_msg_ids(criado_em);

CREATE TABLE IF NOT EXISTS msg_ids (
  id TEXT PRIMARY KEY,
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO atendimento_config (chave, valor) VALUES
  ('atendente_numero', '5515997646555'),
  ('atendente_nome', 'Rafael'),
  ('bem_vindo', 'Olá! Bem-vindo(a) à Feirinha Fast Track 🍽️
Escolha uma opção:
1️⃣ Ver cardápio e pedir
2️⃣ Rastrear pedido
3️⃣ Horário e localização
4️⃣ Dúvidas frequentes
5️⃣ Falar com atendente
0️⃣ Cancelar');
