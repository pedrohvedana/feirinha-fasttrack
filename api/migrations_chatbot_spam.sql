-- Anti-spam: janela deslizante 10 msg/min por numero
CREATE TABLE IF NOT EXISTS spam_contador (
  numero TEXT PRIMARY KEY,
  janela_inicio DATETIME NOT NULL,
  contagem INTEGER NOT NULL DEFAULT 0,
  atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_spam_contador_atualizado_em
  ON spam_contador (atualizado_em);