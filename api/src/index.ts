import { criarApp, type Bindings } from './app';
import { mensagemCancelado, enviarMensagem } from './services/whatsapp';

const app = criarApp();

async function scheduled(
  controller: ScheduledController,
  env: Bindings,
  ctx: ExecutionContext
): Promise<void> {
  const expiraMin = Number(env.PEDIDO_EXPIRA_MINUTOS ?? '15');

  const afetados = await env.DB.prepare(
    `SELECT id, cliente_nome, whatsapp FROM pedidos
     WHERE status = 'aguardando_pagamento' AND pagamento_tipo = 'pix'
       AND criado_em < datetime('now', '-' || ? || ' minutes')`
  ).bind(expiraMin).all<{ id: string; cliente_nome: string | null; whatsapp: string }>();

  const ids = afetados.results?.map((p) => p.id) ?? [];
  if (ids.length > 0) {
    const placeholders = ids.map(() => '?').join(',');
    await env.DB.prepare(
      `UPDATE pedidos SET status = 'cancelado', atualizado_em = CURRENT_TIMESTAMP
       WHERE id IN (${placeholders})`
    ).bind(...ids).run();
  }

  for (const p of afetados.results ?? []) {
    const nome = p.cliente_nome ?? 'Cliente';
    const msg = mensagemCancelado(nome, p.id);
    await enviarMensagem(env, p.whatsapp, msg);
  }
}

export default {
  fetch: app.fetch,
  scheduled,
};