import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processarExpiracaoPix, type PedidoPix } from './expiracao-pix';

function makeDb(rows: { lembrados: PedidoPix[]; cancelados: PedidoPix[] }) {
  const updates: string[] = [];
  const db = {
    prepare: vi.fn((sql: string) => {
      const lower = sql.toLowerCase();
      const bind = (...args: unknown[]) => ({
        all: async () => {
          if (lower.includes('lembrete_enviado = 0')) return { results: rows.lembrados };
          return { results: rows.cancelados };
        },
        run: async () => {
          updates.push(sql);
          return { meta: { changes: args.length } };
        },
      });
      return { bind };
    }),
  };
  return { db, updates };
}

describe('processarExpiracaoPix', () => {
  let enviado: Array<{ numero: string; msg: string }>;
  const enviar = vi.fn(async (numero: string, msg: string) => {
    enviado.push({ numero, msg });
    return true;
  });

  beforeEach(() => {
    enviado = [];
    enviar.mockClear();
  });

  it('não envia nada quando não há pedidos', async () => {
    const { db } = makeDb({ lembrados: [], cancelados: [] });
    await processarExpiracaoPix({ db: db as any, enviar }, { expiraMin: 15, lembreteMin: 8 });
    expect(enviado.length).toBe(0);
  });

  it('envia lembrete para pedidos entre 8 e 15min e marca lembrete_enviado', async () => {
    const pedido: PedidoPix = { id: 'abc', cliente_nome: 'Maria', whatsapp: '5511999887766', lembrete_enviado: 0 };
    const { db, updates } = makeDb({ lembrados: [pedido], cancelados: [] });
    await processarExpiracaoPix({ db: db as any, enviar }, { expiraMin: 15, lembreteMin: 8 });

    expect(enviado.length).toBe(1);
    expect(enviado[0].numero).toBe('5511999887766');
    expect(enviado[0].msg).toContain('#abc');
    expect(enviado[0].msg).toContain('7 minutos');
    expect(enviado[0].msg).toContain('/rastrear/abc');
    const updateSql = updates.join(' ');
    expect(updateSql.toLowerCase()).toContain('lembrete_enviado = 1');
  });

  it('não envia lembrete para pedido já lembrado (lembrete_enviado = 1)', async () => {
    const pedido: PedidoPix = { id: 'abc', cliente_nome: 'Maria', whatsapp: '5511999887766', lembrete_enviado: 1 };
    const { db } = makeDb({ lembrados: [], cancelados: [] });
    // Mesmo que exista o pedido, se o SELECT de lembrar não o retorna (já lembrado),
    // não deve reenviar.
    await processarExpiracaoPix({ db: db as any, enviar }, { expiraMin: 15, lembreteMin: 8 });
    expect(enviado.length).toBe(0);
  });

  it('cancela e envia aviso para pedidos após 15min', async () => {
    const pedido: PedidoPix = { id: 'def', cliente_nome: 'João', whatsapp: '5511999887777', lembrete_enviado: 0 };
    const { db, updates } = makeDb({ lembrados: [], cancelados: [pedido] });
    await processarExpiracaoPix({ db: db as any, enviar }, { expiraMin: 15, lembreteMin: 8 });

    expect(enviado.length).toBe(1);
    expect(enviado[0].msg).toContain('cancelado');
    const updateSql = updates.join(' ');
    expect(updateSql.toLowerCase()).toContain("status = 'cancelado'");
  });

  it('processa lembrete e cancelamento juntos', async () => {
    const lembrar: PedidoPix = { id: 'aaa', cliente_nome: 'Ana', whatsapp: '5511', lembrete_enviado: 0 };
    const cancelar: PedidoPix = { id: 'bbb', cliente_nome: 'Bia', whatsapp: '5522', lembrete_enviado: 0 };
    const { db } = makeDb({ lembrados: [lembrar], cancelados: [cancelar] });
    const res = await processarExpiracaoPix({ db: db as any, enviar }, { expiraMin: 15, lembreteMin: 8 });

    expect(res.lembrados).toHaveLength(1);
    expect(res.cancelados).toHaveLength(1);
    expect(enviado.length).toBe(2);
  });
});