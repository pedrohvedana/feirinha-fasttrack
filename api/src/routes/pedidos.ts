import { Hono } from 'hono';
import { enviarMensagem, mensagemPagamentoConfirmado, mensagemEmPreparo, mensagemPronto } from '../services/whatsapp';

type Bindings = {
  DB: D1Database;
  EVOLUTION_API_URL: string;
  EVOLUTION_API_KEY: string;
  EVOLUTION_INSTANCE: string;
};

const pedidosRouter = new Hono<{ Bindings: Bindings }>();

pedidosRouter.post('/', async (c) => {
  const body = await c.req.json();
  const { cliente_nome, whatsapp, itens_json, valor_total, pagamento_tipo } = body;

  if (!whatsapp || !itens_json || !valor_total || !pagamento_tipo) {
    return c.json({ error: 'Campos obrigatórios faltando' }, 400);
  }

  const id = crypto.randomUUID().slice(0, 8);
  const itens = typeof itens_json === 'string' ? itens_json : JSON.stringify(itens_json);

  const stmt = c.env.DB.prepare(
    `INSERT INTO pedidos (id, cliente_nome, whatsapp, itens_json, valor_total, pagamento_tipo, status)
     VALUES (?, ?, ?, ?, ?, ?, 'aguardando_pagamento')`
  );

  await stmt.bind(id, cliente_nome || null, whatsapp, itens, valor_total, pagamento_tipo).run();

  return c.json({ id, message: 'Pedido criado com sucesso' }, 201);
});

pedidosRouter.get('/', async (c) => {
  const results = await c.env.DB.prepare(
    `SELECT * FROM pedidos ORDER BY criado_em DESC LIMIT 50`
  ).all();

  return c.json(results);
});

pedidosRouter.get('/:id', async (c) => {
  const id = c.req.param('id');
  const pedido = await c.env.DB.prepare(
    `SELECT * FROM pedidos WHERE id = ?`
  ).bind(id).first();

  if (!pedido) {
    return c.json({ error: 'Pedido não encontrado' }, 404);
  }

  return c.json(pedido);
});

pedidosRouter.patch('/:id/status', async (c) => {
  const id = c.req.param('id');
  const { status } = await c.req.json();

  const statusValidos = [
    'aguardando_pagamento',
    'pago',
    'em_preparo',
    'pronto',
    'entregue',
    'cancelado'
  ];

  if (!statusValidos.includes(status)) {
    return c.json({ error: 'Status inválido' }, 400);
  }

  const result = await c.env.DB.prepare(
    `UPDATE pedidos SET status = ?, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?`
  ).bind(status, id).run();

  if (result.meta.changes === 0) {
    return c.json({ error: 'Pedido não encontrado' }, 404);
  }

  // Enviar WhatsApp conforme status
  const pedido = await c.env.DB.prepare(
    `SELECT * FROM pedidos WHERE id = ?`
  ).bind(id).first();

  if (pedido && pedido.whatsapp) {
    const nome = pedido.cliente_nome || 'Cliente';
    let mensagem = '';

    if (status === 'em_preparo') {
      mensagem = mensagemEmPreparo(nome, id);
    } else if (status === 'pronto') {
      mensagem = mensagemPronto(nome, id);
    }

    if (mensagem) {
      await enviarMensagem(c.env, pedido.whatsapp as string, mensagem);
    }
  }

  return c.json({ message: `Status atualizado para ${status}` });
});

pedidosRouter.post('/:id/confirmar-pagamento', async (c) => {
  const id = c.req.param('id');

  const result = await c.env.DB.prepare(
    `UPDATE pedidos SET pagamento_confirmado = 1, status = 'pago', atualizado_em = CURRENT_TIMESTAMP
     WHERE id = ? AND pagamento_confirmado = 0`
  ).bind(id).run();

  if (result.meta.changes === 0) {
    return c.json({ error: 'Pedido não encontrado ou já confirmado' }, 404);
  }

  // Buscar pedido para enviar WhatsApp
  const pedido = await c.env.DB.prepare(
    `SELECT * FROM pedidos WHERE id = ?`
  ).bind(id).first();

  if (pedido && pedido.whatsapp) {
    const nome = pedido.cliente_nome || 'Cliente';
    const mensagem = mensagemPagamentoConfirmado(nome, id);
    await enviarMensagem(c.env, pedido.whatsapp as string, mensagem);
  }

  return c.json({
    message: 'Pagamento confirmado',
    pedido
  });
});

pedidosRouter.get('/fila/ativas', async (c) => {
  const results = await c.env.DB.prepare(
    `SELECT id, cliente_nome, whatsapp, itens_json, valor_total, pagamento_tipo, status, criado_em
     FROM pedidos
     WHERE status IN ('pago', 'em_preparo', 'pronto')
     ORDER BY criado_em ASC`
  ).all();

  return c.json(results);
});

pedidosRouter.get('/stats/hoje', async (c) => {
  const stats = await c.env.DB.prepare(
    `SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'entregue' THEN 1 ELSE 0 END) as entregues,
      SUM(CASE WHEN status IN ('pago', 'em_preparo') THEN 1 ELSE 0 END) as em_andamento,
      SUM(CASE WHEN pagamento_confirmado = 1 THEN valor_total ELSE 0 END) as receita_total
     FROM pedidos
     WHERE date(criado_em) = date('now')`
  ).first();

  return c.json(stats);
});

export default pedidosRouter;
