export type FakeRow = Record<string, unknown>;

export interface FakeD1State {
  conversas: FakeRow[];
  atendimento_config: FakeRow[];
  cardapio: FakeRow[];
  bot_msg_ids: FakeRow[];
  msg_ids: FakeRow[];
  pedidos: FakeRow[];
  spam_contador: FakeRow[];
}

export function criarlaFakeD1(initial?: Partial<FakeD1State>) {
  const tables: FakeD1State = {
    conversas: initial?.conversas ?? [],
    atendimento_config: initial?.atendimento_config ?? [],
    cardapio: initial?.cardapio ?? [],
    bot_msg_ids: initial?.bot_msg_ids ?? [],
    msg_ids: initial?.msg_ids ?? [],
    pedidos: initial?.pedidos ?? [],
    spam_contador: initial?.spam_contador ?? [],
  };
  const calls: string[] = [];

  const prepare = (sql: string) => {
    calls.push(sql);
    let args: unknown[] = [];

    const run = async () => {

      const lower = sql.toLowerCase();
  if (lower.includes('spam_contador')) {
    const [numero, janelaInicio, contagem] = args;
    const idx = tables.spam_contador.findIndex((r) => r.numero === numero);
    const row = { numero, janela_inicio: janelaInicio, contagem };
    if (idx >= 0) tables.spam_contador[idx] = row; else tables.spam_contador.push(row);
    return { meta: { changes: 1 } };
  }

      if (lower.includes('insert into msg_ids') || lower.includes('insert or ignore into msg_ids')) {
        if (tables.msg_ids.some((r) => r.id === args[0])) return { meta: { changes: 0 } };
        tables.msg_ids.push({ id: args[0], criado_em: new Date().toISOString() });
        return { meta: { changes: 1 } };
      }
      if (lower.includes('insert into bot_msg_ids') || lower.includes('insert or ignore into bot_msg_ids')) {
        if (tables.bot_msg_ids.some((r) => r.key_id === args[0])) return { meta: { changes: 0 } };
        tables.bot_msg_ids.push({ key_id: args[0], criado_em: new Date().toISOString() });
        return { meta: { changes: 1 } };
      }
      if (lower.includes('delete from bot_msg_ids')) {
        const antes = tables.bot_msg_ids.length;
        tables.bot_msg_ids = tables.bot_msg_ids.filter((r) => r.key_id !== args[0]);
        return { meta: { changes: antes - tables.bot_msg_ids.length } };
      }
      if (lower.includes('insert into pedidos')) {
        const [id, cliente_nome, whatsapp, itens_json, valor_total, pagamento_tipo, origem] = args;
        const row: FakeRow = {
          id: id || 'pedido-fake',
          cliente_nome: cliente_nome ?? null,
          whatsapp: whatsapp ?? null,
          itens_json,
          valor_total,
          pagamento_tipo,
          origem: origem ?? 'whatsapp',
          pagamento_confirmado: 0,
          status: 'aguardando_pagamento',
          criado_em: new Date().toISOString(),
          atualizado_em: new Date().toISOString(),
        };
        tables.pedidos.push(row);
        return { meta: { changes: 1 } };
      }
      if (lower.includes('insert into conversas')) {
        const [numero, passo, carrinho, cliente_nome, paused] = args;
        const pausedFinal = paused ?? (args.length === 2 ? new Date(Date.now() + 10 * 60000).toISOString() : null);
        const row: FakeRow = { numero, passo, carrinho_json: carrinho, cliente_nome: cliente_nome ?? null, paused_until: pausedFinal, atualizado_em: new Date().toISOString() };
        const i = tables.conversas.findIndex((r) => r.numero === numero);
        if (i >= 0) tables.conversas[i] = row;
        else tables.conversas.push(row);
        return { meta: { changes: 1 } };
      }
      if (lower.includes('update conversas')) {
        const numero = args[args.length - 1] as string;
        const i = tables.conversas.findIndex((r) => r.numero === numero);
        if (i >= 0) {
          if (lower.includes('paused_until')) tables.conversas[i] = { ...tables.conversas[i], paused_until: new Date(Date.now() + 10 * 60000).toISOString() };
          return { meta: { changes: 1 } };
        }
        return { meta: { changes: 0 } };
      }
      if (lower.includes('update pedidos')) {
        const id = args[args.length - 1] as string;
        const i = tables.pedidos.findIndex((r) => r.id === id);
        if (i >= 0) {
          const m = lower.match(/set ([a-z_]+) = '?([^',]+)'?/);
          if (m) {
            tables.pedidos[i] = { ...tables.pedidos[i], [m[1]]: m[2] };
          }
          tables.pedidos[i] = { ...tables.pedidos[i], atualizado_em: new Date().toISOString() };
          return { meta: { changes: 1 } };
        }
        return { meta: { changes: 0 } };
      }
      return { meta: { changes: 1 } };
    };

    const first = async () => {
      const lower = sql.toLowerCase();
      if (lower.includes('from msg_ids')) return tables.msg_ids.find((r) => r.id === args[0]) ?? null;
      if (lower.includes('from bot_msg_ids')) return tables.bot_msg_ids.find((r) => r.key_id === args[0]) ?? null;
      if (lower.includes('from conversas')) return tables.conversas.find((r) => r.numero === args[0]) ?? null;
      if (lower.includes('from atendimento_config')) return tables.atendimento_config.find((r) => r.chave === args[0]) ?? null;
      
  if (lower.includes('from spam_contador')) return tables.spam_contador.find((r) => r.numero === args[0]) ?? null;
  if (lower.includes('from pedidos')) {
    const pedido = tables.pedidos.find((r) => (String(r.id ?? '') === String(args[0])) || (String(r.pix_payment_id ?? '') === String(args[0])));
    return pedido ?? null;
  }
  return null;
    };

    const all = async () => {
      const lower = sql.toLowerCase();
      if (lower.includes('from cardapio')) return { results: tables.cardapio };
      if (lower.includes('from atendimento_config')) return { results: tables.atendimento_config };
      if (lower.includes('from pedidos')) {
        if (lower.includes('where id =')) {
          const p = tables.pedidos.find((r) => r.id === args[0]);
          return { results: p ? [p] : [] };
        }
        const m = lower.match(/status in \(([^)]+)\)/);
        if (m) {
          const statuses = m[1]
            .split(',')
            .map((s) => s.trim().replace(/'/g, '').replace(/"/g, ''))
            .filter(Boolean);
          const filtrados = tables.pedidos.filter((r) => statuses.includes(String(r.status)));
          return { results: filtrados };
        }
        return { results: tables.pedidos };
      }
      return { results: [] };
    };

    return {
      bind: (...a: unknown[]) => {
        args = a;
        return { bind: (...b: unknown[]) => ((args = b), { run, first, all }), run, first, all };
      },
      run,
      first,
      all,
    };
  };

  return { db: { prepare } as any, tables, calls };
}