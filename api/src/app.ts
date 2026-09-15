import { Hono } from 'hono';
import { cors } from 'hono/cors';
import pedidosRouter from './routes/pedidos';
import webhookRouter from './routes/webhook';
import cardapioRouter from './routes/cardapio';
import rastrearRouter from './routes/rastrear';
import whatsappRouter from './routes/whatsapp';

export type Bindings = Env & {
  WA_AKG_API_KEY: string;
  WA_AKG_WEBHOOK_SECRET: string;
  PIX_ACCESS_TOKEN: string;
  PIX_LEMBRETE_MINUTOS?: string;
};

export function criarApp() {
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

  app.get('/', (c) => c.json({ status: 'ok', message: 'Feirinha Fast Track API' }));

  app.route('/pedidos', pedidosRouter);
  app.route('/webhook', webhookRouter);
  app.route('/cardapio', cardapioRouter);
  app.route('/rastrear', rastrearRouter);
  app.route('/webhook', whatsappRouter);

  return app;
}