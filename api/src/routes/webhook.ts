import { Hono } from 'hono';
import { enviarMensagem, mensagemPagamentoConfirmado, mensagemEmPreparo, mensagemPronto, mensagemCancelado } from '../services/whatsapp';
import { consultarPagamento } from '../services/pix';

type Bindings = {
  DB: D1Database;
  EVOLUTION_API_URL: string;
  EVOLUTION_API_KEY: string;
  EVOLUTION_INSTANCE: string;
  PIX_ACCESS_TOKEN?: string;
};

const webhookRouter = new Hono<{ Bindings: Bindings }>();

const MENSAGENS: Record<string, (nome: string, id: string) => string> = {
  pago: (nome, id) => mensagemPagamentoConfirmado(nome, id),
  em_preparo: (nome, id) => mensagemEmPreparo(nome, id),
  pronto: (nome, id) => mensagemPronto(nome, id),
  cancelado: (nome, id) => mensagemCancelado(nome, id),
};

webhookRouter.post('/pagamento-confirmado', async (c) => {
  const body = await c.req.json();
  const { pedido_id } = body;

  if (!pedido_id) {
    return c.json({ error: 'pedido_id obrigatório' }, 400);
  }

  const pedido = await c.env.DB.prepare(
    `SELECT * FROM pedidos WHERE id = ?`
  ).bind(pedido_id).first<Record<string, unknown>>();

  if (!pedido) {
    return c.json({ error: 'Pedido não encontrado' }, 404);
  }

  await c.env.DB.prepare(
    `UPDATE pedidos SET pagamento_confirmado = 1, status = 'pago', atualizado_em = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).bind(pedido_id).run();

  const mensagem = MENSAGENS.pago(pedido.cliente_nome as string || 'Cliente', pedido_id);
  const whatsappOk = await enviarMensagem(c.env, pedido.whatsapp as string, mensagem);

  return c.json({
    message: 'Pagamento confirmado e notificação enviada',
    whatsapp_enviado: whatsappOk,
  });
});

webhookRouter.post('/pix', async (c) => {
  const body = await c.req.json<{ action?: string; data?: { id: number } }>();

  const paymentId = body?.data?.id;
  if (!paymentId) {
    return c.json({ error: 'data.id obrigatório' }, 400);
  }

  const pagamento = await consultarPagamento(c.env, paymentId);
  if (!pagamento) {
    return c.json({ error: 'Falha ao consultar pagamento' }, 502);
  }

  const pedido = await c.env.DB.prepare(
    `SELECT * FROM pedidos WHERE pix_payment_id = ?`
  ).bind(paymentId).first<Record<string, unknown>>();

  if (!pedido) {
    return c.json({ error: 'Pedido não encontrado para payment_id' }, 404);
  }

  if (pagamento.status === 'approved') {
    await c.env.DB.prepare(
      `UPDATE pedidos SET pagamento_confirmado = 1, status = 'pago', atualizado_em = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).bind(pedido.id).run();

    const nome = pedido.cliente_nome as string || 'Cliente';
    const mensagem = mensagemPagamentoConfirmado(nome, pedido.id as string);
    await enviarMensagem(c.env, pedido.whatsapp as string, mensagem);
  }

  return c.json({ message: 'Recebido', status: pagamento.status });
});

webhookRouter.post('/status/:id', async (c) => {
  const id = c.req.param('id');
  const { status } = await c.req.json<{ status: string }>();

  const pedido = await c.env.DB.prepare(
    `SELECT * FROM pedidos WHERE id = ?`
  ).bind(id).first<Record<string, unknown>>();

  if (!pedido) {
    return c.json({ error: 'Pedido não encontrado' }, 404);
  }

  await c.env.DB.prepare(
    `UPDATE pedidos SET status = ?, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?`
  ).bind(status, id).run();

  const criarMensagem = MENSAGENS[status];
  if (criarMensagem) {
    const mensagem = criarMensagem(pedido.cliente_nome as string || 'Cliente', id);
    const whatsappOk = await enviarMensagem(c.env, pedido.whatsapp as string, mensagem);
    return c.json({ message: 'Status atualizado e notificação enviada', whatsapp_enviado: whatsappOk });
  }

  return c.json({ message: 'Status atualizado (sem mensagem)' });
});

export default webhookRouter;