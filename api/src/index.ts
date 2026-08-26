import { Hono } from 'hono';
import { cors } from 'hono/cors';
import pedidosRouter from './routes/pedidos';
import webhookRouter from './routes/webhook';
import cardapioRouter from './routes/cardapio';

type Bindings = {
  DB: D1Database;
  EVOLUTION_API_URL: string;
  EVOLUTION_API_KEY: string;
  EVOLUTION_INSTANCE: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use('*', cors({
  origin: [
    'http://localhost:5173',
    'https://feirinha-ui.pages.dev',
    'https://master.feirinha-ui.pages.dev',
    'https://feirinha.ciavedana.com.br',
  ],
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE'],
}));

app.get('/', (c) => {
  return c.json({ status: 'ok', message: 'Feirinha Fast Track API' });
});

app.route('/pedidos', pedidosRouter);
app.route('/webhook', webhookRouter);
app.route('/cardapio', cardapioRouter);

export default app;
