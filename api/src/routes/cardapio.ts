import { Hono } from 'hono';

type Bindings = {
  DB: D1Database;
};

const cardapioRouter = new Hono<{ Bindings: Bindings }>();

cardapioRouter.get('/', async (c) => {
  const results = await c.env.DB.prepare(
    `SELECT * FROM cardapio WHERE ativo = 1 ORDER BY ordem ASC`
  ).all();
  return c.json(results);
});

cardapioRouter.get('/todos', async (c) => {
  const results = await c.env.DB.prepare(
    `SELECT * FROM cardapio ORDER BY ordem ASC`
  ).all();
  return c.json(results);
});

cardapioRouter.post('/', async (c) => {
  const body = await c.req.json();
  const { nome, preco, ordem } = body;

  if (!nome || preco === undefined) {
    return c.json({ error: 'Nome e preço são obrigatórios' }, 400);
  }

  const result = await c.env.DB.prepare(
    `INSERT INTO cardapio (nome, preco, ordem) VALUES (?, ?, ?)`
  ).bind(nome, preco, ordem || 0).run();

  return c.json({ id: result.meta.last_row_id, message: 'Item adicionado' }, 201);
});

cardapioRouter.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const { nome, preco, ativo, ordem } = body;

  const fields = [];
  const values = [];

  if (nome !== undefined) { fields.push('nome = ?'); values.push(nome); }
  if (preco !== undefined) { fields.push('preco = ?'); values.push(preco); }
  if (ativo !== undefined) { fields.push('ativo = ?'); values.push(ativo ? 1 : 0); }
  if (ordem !== undefined) { fields.push('ordem = ?'); values.push(ordem); }

  if (fields.length === 0) {
    return c.json({ error: 'Nenhum campo para atualizar' }, 400);
  }

  values.push(id);
  const result = await c.env.DB.prepare(
    `UPDATE cardapio SET ${fields.join(', ')} WHERE id = ?`
  ).bind(...values).run();

  if (result.meta.changes === 0) {
    return c.json({ error: 'Item não encontrado' }, 404);
  }

  return c.json({ message: 'Item atualizado' });
});

cardapioRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const result = await c.env.DB.prepare(
    `DELETE FROM cardapio WHERE id = ?`
  ).bind(id).run();

  if (result.meta.changes === 0) {
    return c.json({ error: 'Item não encontrado' }, 404);
  }

  return c.json({ message: 'Item removido' });
});

export default cardapioRouter;
