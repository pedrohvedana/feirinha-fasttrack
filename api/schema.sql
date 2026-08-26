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
