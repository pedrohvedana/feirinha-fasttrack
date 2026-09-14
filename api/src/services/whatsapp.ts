const URL_RASTREIO_BASE = 'https://feirinha.ciavedana.com.br/rastrear';

export interface Env {
  EVOLUTION_API_URL: string;
  EVOLUTION_API_KEY: string;
  EVOLUTION_INSTANCE: string;
  WHATSAPP_PROVIDER: string; // 'evolution' ou 'wa-akg'
  WA_AKG_BASE_URL: string;
  WA_AKG_API_KEY: string;
  WA_AKG_SESSION: string;
}

const WA_AKG_TIMEOUT_MS = 8000;

async function enviarViaEvolution(env: Env, numero: string, mensagem: string): Promise<boolean> {
  try {
    const numeroFormatado = formatarNumero(numero);
    console.log(`[Evolution] Enviando para ${numeroFormatado}...`);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), WA_AKG_TIMEOUT_MS);
    const response = await fetch(
      `${env.EVOLUTION_API_URL}/message/sendText/${env.EVOLUTION_INSTANCE}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: env.EVOLUTION_API_KEY },
        body: JSON.stringify({ number: numeroFormatado, text: mensagem }),
        signal: controller.signal,
      },
    );
    clearTimeout(timer);
    if (!response.ok) {
      const error = await response.text();
      console.error(`[Evolution] Erro: ${response.status} - ${error}`);
      return false;
    }
    console.log('[Evolution] Mensagem enviada com sucesso.');
    return true;
  } catch (error) {
    console.error('[Evolution] Erro fatal:', error);
    return false;
  }
}

async function enviarViaWaAkg(env: Env, numero: string, mensagem: string): Promise<boolean> {
  try {
    if (!env.WA_AKG_API_KEY) {
      console.warn('[WA-AKG] Chave WA_AKG_API_KEY não configurada. Pulando.');
      return false;
    }

    const jid = formatarNumero(numero).replace(/[^0-9]/g, '') + '@s.whatsapp.net';
    const url = `${env.WA_AKG_BASE_URL}/api/messages/${env.WA_AKG_SESSION}/${jid}/send`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), WA_AKG_TIMEOUT_MS);
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': env.WA_AKG_API_KEY },
      body: JSON.stringify({ message: { text: mensagem } }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!response.ok) {
      const error = await response.text();
      console.error(`[WA-AKG] Erro: ${response.status} - ${error}`);
      return false;
    }

    console.log('[WA-AKG] Mensagem enviada com sucesso.');
    return true;
  } catch (error) {
    console.error('[WA-AKG] Erro fatal:', error);
    return false;
  }
}

export async function enviarMensagem(env: Env, numero: string, mensagem: string): Promise<boolean> {
  const provider = (env.WHATSAPP_PROVIDER || 'evolution').toLowerCase();

  if (provider === 'wa-akg') {
    const ok = await enviarViaWaAkg(env, numero, mensagem);
    if (!ok) {
      console.warn('[WA-AKG] Falhou. Fallback para Evolution.');
      return enviarViaEvolution(env, numero, mensagem);
    }
    return ok;
  }

  const ok = await enviarViaEvolution(env, numero, mensagem);
  if (!ok) {
    console.warn('[Evolution] Falhou. Fallback para WA-AKG.');
    return enviarViaWaAkg(env, numero, mensagem);
  }
  return ok;
}

export function mensagemPagamentoConfirmado(nomeCliente: string, idPedido: string): string {
  return `Olá ${nomeCliente}!

Seu pedido *#${idPedido}* foi pago e entrou na fila!
Aguarde, breve começaremos a preparar seu pedido. 🍽️

Acompanhe o status: ${URL_RASTREIO_BASE}/${idPedido}`;
}

export function mensagemEmPreparo(nomeCliente: string, idPedido: string): string {
  return `Olá ${nomeCliente}!

Seu pedido *#${idPedido}* está sendo preparado agora!
Tempo estimado: 5-10 minutos.

Acompanhe o status: ${URL_RASTREIO_BASE}/${idPedido}`;
}

export function mensagemPronto(nomeCliente: string, idPedido: string): string {
  return `Olá ${nomeCliente}!

Seu pedido *#${idPedido}* está *PRONTO*!
Pode vir buscar no balcão. Obrigado pela preferência!

Acompanhe o status: ${URL_RASTREIO_BASE}/${idPedido}`;
}

export function mensagemCancelado(nomeCliente: string, idPedido: string): string {
  return `Olá ${nomeCliente}!

Seu pedido *#${idPedido}* foi cancelado por falta de pagamento.
Qualquer dúvida, fale conosco.`;
}

export function mensagemLembretePix(nomeCliente: string, idPedido: string, minutosRestantes: number): string {
  return `Olá ${nomeCliente}! ⏳

Seu pedido *#${idPedido}* ainda aguarda o pagamento do *PIX*.
Ele será cancelado em *${minutosRestantes} minutos* se o pagamento não for confirmado.

Acompanhe: ${URL_RASTREIO_BASE}/${idPedido}`;
}

export function URL_Rastreio(pedidoId: string): string {
  return `${URL_RASTREIO_BASE}/${pedidoId}`;
}

function formatarNumero(numero: string): string {
  let limpo = numero.replace(/[^0-9]/g, '');
  if (limpo.length === 11 && limpo.startsWith('0')) {
    limpo = '55' + limpo.substring(1);
  }
  if (limpo.length === 10) {
    limpo = '55' + limpo;
  }
  if (!limpo.startsWith('55')) {
    limpo = '55' + limpo;
  }
  return limpo;
}
