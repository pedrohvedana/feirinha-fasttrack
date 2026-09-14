import { criarApp, type Bindings } from './app';
import { enviarMensagem } from './services/whatsapp';
import { processarExpiracaoPix } from './services/expiracao-pix';

const app = criarApp();

async function scheduled(
  controller: ScheduledController,
  env: Bindings,
  ctx: ExecutionContext
): Promise<void> {
  const expiraMin = Number(env.PEDIDO_EXPIRA_MINUTOS ?? '15');
  const lembreteMin = Number(env.PIX_LEMBRETE_MINUTOS ?? '8');

  await processarExpiracaoPix(
    {
      db: env.DB,
      enviar: (numero, mensagem) => enviarMensagem(env, numero, mensagem),
    },
    { expiraMin, lembreteMin },
  );
}

export default {
  fetch: app.fetch,
  scheduled,
};