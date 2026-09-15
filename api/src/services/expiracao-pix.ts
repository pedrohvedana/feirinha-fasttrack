import { mensagemCancelado, mensagemLembretePix } from './whatsapp';

export interface PedidoPix {
  id: string;
  cliente_nome: string | null;
  whatsapp: string;
  lembrete_enviado: number;
}

export interface ExpiraPixDeps {
  db: {
    prepare: (sql: string) => {
      bind: (...args: unknown[]) => {
        all: () => Promise<{ results?: PedidoPix[] }>;
        run: () => Promise<{ meta: { changes: number } }>;
      };
    };
  };
  enviar: (numero: string, mensagem: string) => Promise<boolean>;
}

export interface ExpiraPixConfig {
  expiraMin: number;
  lembreteMin: number;
}

export async function processarExpiracaoPix(
  deps: ExpiraPixDeps,
  config: ExpiraPixConfig,
): Promise<{ lembrados: PedidoPix[]; cancelados: PedidoPix[] }> {
  const lembrados = await buscarLembrar(deps, config);
  const cancelados = await buscarCancelar(deps, config);

  if (lembrados.length > 0) {
    await marcarLembreteEnviado(deps, lembrados);
    for (const p of lembrados) {
      const nome = p.cliente_nome ?? 'Cliente';
      const restantes = Math.max(config.expiraMin - config.lembreteMin, 1);
      await deps.enviar(p.whatsapp, mensagemLembretePix(nome, p.id, restantes));
    }
  }

  if (cancelados.length > 0) {
    await marcarCancelados(deps, cancelados);
    for (const p of cancelados) {
      const nome = p.cliente_nome ?? 'Cliente';
      await deps.enviar(p.whatsapp, mensagemCancelado(nome, p.id));
    }
  }

  return { lembrados, cancelados };
}

async function buscarLembrar(
  deps: ExpiraPixDeps,
  config: ExpiraPixConfig,
): Promise<PedidoPix[]> {
  const r = await deps.db
    .prepare(
      `SELECT id, cliente_nome, whatsapp, lembrete_enviado FROM pedidos
       WHERE status = 'aguardando_pagamento' AND pagamento_tipo = 'pix'
         AND lembrete_enviado = 0
         AND criado_em < datetime('now', '-' || ? || ' minutes')
         AND criado_em >= datetime('now', '-' || ? || ' minutes')`,
    )
    .bind(config.lembreteMin, config.expiraMin)
    .all();
  return r.results ?? [];
}

async function buscarCancelar(
  deps: ExpiraPixDeps,
  config: ExpiraPixConfig,
): Promise<PedidoPix[]> {
  const r = await deps.db
    .prepare(
      `SELECT id, cliente_nome, whatsapp, lembrete_enviado FROM pedidos
       WHERE status = 'aguardando_pagamento' AND pagamento_tipo = 'pix'
         AND criado_em < datetime('now', '-' || ? || ' minutes')`,
    )
    .bind(config.expiraMin)
    .all();
  return r.results ?? [];
}

async function marcarLembreteEnviado(deps: ExpiraPixDeps, pedidos: PedidoPix[]): Promise<void> {
  const ids = pedidos.map((p) => p.id);
  if (ids.length === 0) return;
  const placeholders = ids.map(() => '?').join(',');
  await deps.db
    .prepare(
      `UPDATE pedidos SET lembrete_enviado = 1, atualizado_em = CURRENT_TIMESTAMP
       WHERE id IN (${placeholders}) AND lembrete_enviado = 0`,
    )
    .bind(...ids)
    .run();
}

async function marcarCancelados(deps: ExpiraPixDeps, pedidos: PedidoPix[]): Promise<void> {
  const ids = pedidos.map((p) => p.id);
  if (ids.length === 0) return;
  const placeholders = ids.map(() => '?').join(',');
  await deps.db
    .prepare(
      `UPDATE pedidos SET status = 'cancelado', atualizado_em = CURRENT_TIMESTAMP
       WHERE id IN (${placeholders})`,
    )
    .bind(...ids)
    .run();
}