import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(join(here, '../../migrations_chatbot.sql'), 'utf-8');

describe('migrations_chatbot.sql', () => {
  it('tabela conversas: numero PK, passo, carrinho_json, paused_until', () => {
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS conversas');
    expect(sql).toContain('numero TEXT PRIMARY KEY');
    expect(sql).toContain("passo TEXT DEFAULT 'menu'");
    expect(sql).toContain("carrinho_json TEXT DEFAULT '[]'");
    expect(sql).toContain('paused_until DATETIME');
  });

  it('tabela atendimento_config: chave PK + valor', () => {
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS atendimento_config');
    expect(sql).toContain('chave TEXT PRIMARY KEY');
    expect(sql).toContain('valor TEXT NOT NULL');
  });

  it('tabela bot_msg_ids: key_id PK (loop guard)', () => {
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS bot_msg_ids');
    expect(sql).toContain('key_id TEXT PRIMARY KEY');
  });

  it('índices nas três tabelas', () => {
    expect(sql).toContain('idx_conversas_atualizado_em');
    expect(sql).toContain('idx_bot_msg_ids_criado_em');
  });
});