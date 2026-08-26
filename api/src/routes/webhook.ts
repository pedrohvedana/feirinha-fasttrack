import { Hono } from 'hono';
import { enviarMensagem } from '../services/whatsapp';

type Bindings = {
  DB: D1Database;
  EVOLUTION_API_URL: string;
  EVOLUTION_API_KEY: string;
  EVOLUTION_INSTANCE: string;
};

const webhookRouter = new Hono<{ Bindings: Bindings }>();

const MENSAGENS: Record<string, (nome?: string) => string> = {
  pago: (nome) => `Olá${nome ? ` ${nome}` : ''}! Seu pagamento foi confirmado! 🎉\nEstá na fila de preparo.\nTempo estimado: 5-10 minutos.`,
  em_preparo: (nome) => `Olá${nome ? ` ${nome}` : ''}! Seu pedido está sendo preparado agora! 👨‍🍳\nTempo estimado: 5 minutos.`,
  pronto: (nome) => `Olá${nome ? ` ${nome}` : ''}! Seu pedido está PRONTO para retirada! ✅\nPode vir buscar no balcão.`,
  cancelado: (nome) => `Olá${nome ? ` ${nome}` : ''}! Seu pedido foi cancelado.\nQualquer dúvida, fale conosco.`,
};

webhookRouter.post('/pagamento-confirmado', async (c) => {
  const body = await c.req.json();
  const { pedido_id } = body;

  if (!pedido_id) {
    return c.json({ error: 'pedido_id obrigatório' }, 400);
  }

  const pedido = await c.env.DB.prepare(
    `SELECT * FROM pedidos WHERE id = ?`
  ).bind(pedido_id).first() as Record<string, unknown> | null;

  if (!pedido) {
    return c.json({ error: 'Pedido não encontrado' }, 404);
  }

  await c.env.DB.prepare(
    `UPDATE pedidos SET pagamento_confirmado = 1, status = 'pago', atualizado_em = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).bind(pedido_id).run();

  const mensagem = MENSAGENS.pago(pedido.cliente_nome as string);
  const whatsappOk = await enviarMensagem(c.env, pedido.whatsapp as string, mensagem);

  return c.json({
    message: 'Pagamento confirmado e notificação enviada',
    whatsapp_enviado: whatsappOk
  });
});

webhookRouter.post('/status/:id', async (c) => {
  const id = c.req.param('id');
  const { status } = await c.req.json();

  const pedido = await c.env.DB.prepare(
    `SELECT * FROM pedidos WHERE id = ?`
  ).bind(id).first() as Record<string, unknown> | null;

  if (!pedido) {
    return c.json({ error: 'Pedido não encontrado' }, 404);
  }

  await c.env.DB.prepare(
    `UPDATE pedidos SET status = ?, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?`
  ).bind(status, id).run();

  const criarMensagem = MENSAGENS[status];
  if (criarMensagem) {
    const mensagem = criarMensagem(pedido.cliente_nome as string);
    const whatsappOk = await enviarMensagem(c.env, pedido.whatsapp as string, mensagem);
    return c.json({
      message: `Status atualizado para ${status}`,
      whatsapp_enviado: whatsappOk
    });
  }

  return c.json({ message: `Status atualizado para ${status}` });
});

export { webhookRouter };
