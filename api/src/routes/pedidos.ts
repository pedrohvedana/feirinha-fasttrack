import { Hono } from 'hono';
import { enviarMensagem, mensagemPagamentoConfirmado, mensagemEmPreparo, mensagemPronto } from '../services/whatsapp';
import { criarCobrancaPix } from '../services/pix';

type Bindings = {
  DB: D1Database;
  EVOLUTION_API_URL: string;
  EVOLUTION_API_KEY: string;
  EVOLUTION_INSTANCE: string;
  PIX_ACCESS_TOKEN?: string;
  PIX_PAGADOR_EMAIL?: string;
  PIX_EXPIRACAO_MINUTOS?: string;
};

type Pedido = {
  id: string;
  cliente_nome: string | null;
  whatsapp: string;
  itens_json: string;
  valor_total: number;
  pagamento_tipo: string;
  pagamento_confirmado: number;
  status: string;
  criado_em: string;
  atualizado_em: string;
  pix_payment_id?: number | null;
  pix_qr_code?: string | null;
  pix_qr_base64?: string | null;
  pix_expira_em?: string | null;
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

  let pix = null;
  if (pagamento_tipo === 'pix') {
    const cobranca = await criarCobrancaPix(c.env, { id, valor_total, whatsapp });
if (cobranca) {
    await c.env.DB.prepare(
      `UPDATE pedidos SET pix_payment_id = ?, pix_qr_code = ?, pix_qr_base64 = ?, pix_expira_em = ?
       WHERE id = ?`
    ).bind(cobranca.payment_id, cobranca.qr_code, cobranca.qr_base64, cobranca.expira_em, id).run();
      pix = { qr_code: cobranca.qr_code, qr_base64: cobranca.qr_base64, expira_em: cobranca.expira_em };
    }
  }

  return c.json({ id, message: 'Pedido criado com sucesso', pix }, 201);
});

pedidosRouter.get('/', async (c) => {
  const results = await c.env.DB.prepare(
    `SELECT * FROM pedidos ORDER BY criado_em DESC LIMIT 50`
  ).all();
  return c.json(results);
});

pedidosRouter.get('/stats/hoje', async (c) => {
  const result = await c.env.DB.prepare(
    `SELECT
       COUNT(*) as total,
       SUM(CASE WHEN status = 'entregue' THEN 1 ELSE 0 END) as entregues,
       SUM(CASE WHEN status IN ('pago', 'em_preparo') THEN 1 ELSE 0 END) as em_andamento,
       COALESCE(SUM(CASE WHEN status = 'entregue' THEN valor_total ELSE 0 END), 0) as receita_total
     FROM pedidos
     WHERE DATE(criado_em) = DATE('now')`
  ).first();
  return c.json(result);
});

pedidosRouter.get('/fila/ativas', async (c) => {
  const results = await c.env.DB.prepare(
    `SELECT id, cliente_nome, whatsapp, itens_json, valor_total, pagamento_tipo, status, criado_em, atualizado_em
     FROM pedidos
     WHERE status IN ('aguardando_pagamento', 'pago', 'em_preparo', 'pronto')
     ORDER BY atualizado_em ASC`
  ).all();
  return c.json(results);
});

pedidosRouter.get('/:id', async (c) => {
  const id = c.req.param('id');
  const pedido = await c.env.DB.prepare(
    `SELECT * FROM pedidos WHERE id = ?`
  ).bind(id).first<Pedido>();
  if (!pedido) return c.json({ error: 'Pedido não encontrado' }, 404);
  return c.json(pedido);
});

pedidosRouter.patch('/:id/status', async (c) => {
  const id = c.req.param('id');
  const { status } = await c.req.json();
  const statusValidos = ['aguardando_pagamento', 'pago', 'em_preparo', 'pronto', 'entregue', 'cancelado'];
  if (!statusValidos.includes(status)) {
    return c.json({ error: 'Status inválido' }, 400);
  }

  const result = await c.env.DB.prepare(
    `UPDATE pedidos SET status = ?, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?`
  ).bind(status, id).run();

  if (result.meta.changes === 0) {
    return c.json({ error: 'Pedido não encontrado' }, 404);
  }

  const pedido = await c.env.DB.prepare(
    `SELECT * FROM pedidos WHERE id = ?`
  ).bind(id).first<Pedido>();

  if (pedido) {
    const nome = pedido.cliente_nome || 'Cliente';
    let msg = '';
    if (status === 'pago') msg = mensagemPagamentoConfirmado(nome, id);
    else if (status === 'em_preparo') msg = mensagemEmPreparo(nome, id);
    else if (status === 'pronto') msg = mensagemPronto(nome, id);

    if (msg) {
      await enviarMensagem(c.env, pedido.whatsapp, msg);
    }
  }

  return c.json({ message: `Status atualizado para ${status}` });
});

pedidosRouter.post('/:id/confirmar-pagamento', async (c) => {
  const id = c.req.param('id');
  const result = await c.env.DB.prepare(
    `UPDATE pedidos SET pagamento_confirmado = 1, status = 'pago', atualizado_em = CURRENT_TIMESTAMP WHERE id = ?`
  ).bind(id).run();

  if (result.meta.changes === 0) {
    return c.json({ error: 'Pedido não encontrado' }, 404);
  }

  const pedido = await c.env.DB.prepare(
    `SELECT * FROM pedidos WHERE id = ?`
  ).bind(id).first<Pedido>();

  if (pedido) {
    const nome = pedido.cliente_nome || 'Cliente';
    const msg = mensagemPagamentoConfirmado(nome, id);
    await enviarMensagem(c.env, pedido.whatsapp, msg);
  }

  return c.json({ message: 'Pagamento confirmado' });
});

pedidosRouter.get('/rastrear/:id', async (c) => {
  const id = c.req.param('id');
  const pedido = await c.env.DB.prepare(`SELECT * FROM pedidos WHERE id = ?`).bind(id).first<Pedido>();
  if (!pedido) return c.json({ error: 'Pedido não encontrado' }, 404);
  return c.json({
    id: pedido.id,
    cliente_nome: pedido.cliente_nome,
    status: pedido.status,
    valor_total: pedido.valor_total,
    itens_json: pedido.itens_json,
    criado_em: pedido.criado_em,
    atualizado_em: pedido.atualizado_em,
  });
});

export default pedidosRouter;