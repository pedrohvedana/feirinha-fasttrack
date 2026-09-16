-- Sequências numéricas para IDs de pedidos
CREATE TABLE IF NOT EXISTS sequencias (
  tipo TEXT PRIMARY KEY,
  ultimo INTEGER NOT NULL DEFAULT 0
);

INSERT OR IGNORE INTO sequencias (tipo, ultimo) VALUES ('pedido', 0);

-- Índice auxiliar para ordenação rápida
CREATE INDEX IF NOT EXISTS idx_pedidos_criado_desc ON pedidos(criado_em DESC);