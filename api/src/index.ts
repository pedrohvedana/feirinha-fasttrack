import { Hono } from 'hono';
import { cors } from 'hono/cors';
import pedidosRouter from './routes/pedidos';
import webhookRouter from './routes/webhook';
import cardapioRouter from './routes/cardapio';
import rastrearRouter from './routes/rastrear';
import { enviarMensagem, mensagemCancelado } from './services/whatsapp';

type Bindings = {
  DB: D1Database;
  EVOLUTION_API_URL: string;
  EVOLUTION_API_KEY: string;
  EVOLUTION_INSTANCE: string;
  WHATSAPP_PROVIDER: string;
  WA_AKG_BASE_URL: string;
  WA_AKG_API_KEY: string;
  WA_AKG_SESSION: string;
  PIX_ACCESS_TOKEN: string;
  PEDIDO_EXPIRA_MINUTOS: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use('*', cors({
  origin: [
    'http://localhost:5173',
    'https://feirinha-ui.pages.dev',
    'https://master.feirinha-ui.pages.dev',
    'https://feirinha.ciavedana.com.br',
  ],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
}));

app.get('/', (c) => {
  return c.json({ status: 'ok', message: 'Feirinha Fast Track API' });
});

app.route('/pedidos', pedidosRouter);
app.route('/webhook', webhookRouter);
app.route('/cardapio', cardapioRouter);
app.route('/rastrear', rastrearRouter);

async function scheduled(
  controller: ScheduledController,
  env: Bindings,
  ctx: ExecutionContext
): Promise<void> {
  const expiraMin = Number(env.PEDIDO_EXPIRA_MINUTOS || '15');

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