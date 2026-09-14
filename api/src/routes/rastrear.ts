import { Hono } from 'hono';

type Bindings = {
  DB: D1Database;
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

const rastrearRouter = new Hono<{ Bindings: Bindings }>();

rastrearRouter.get('/:id', async (c) => {
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

export default rastrearRouter;