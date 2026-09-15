-- Migração chatbot WhatsApp (WA-AKG)
-- 1. Conversas: estado da máquina de estados por número do cliente
CREATE TABLE IF NOT EXISTS conversas (
  numero TEXT PRIMARY KEY,
  passo TEXT DEFAULT 'menu',
  carrinho_json TEXT DEFAULT '[]',
  cliente_nome TEXT,
  paused_until DATETIME,
  atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_conversas_atualizado_em ON conversas(atualizado_em);

-- 2. Config de atendimento (key-value editável sem redeploy)
CREATE TABLE IF NOT EXISTS atendimento_config (
  chave TEXT PRIMARY KEY,
  valor TEXT NOT NULL
);

-- 3. Loop guard: IDs das mensagens enviadas pelo próprio bot
--    (message.sent com key.id desta tabela é ignorado = não é atendente manual)
CREATE TABLE IF NOT EXISTS bot_msg_ids (
  key_id TEXT PRIMARY KEY,
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bot_msg_ids_criado_em ON bot_msg_ids(criado_em);