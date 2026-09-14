const URL_RASTREIO_BASE = 'https://feirinha.ciavedana.com.br/rastrear';

interface Env {
  EVOLUTION_API_URL: string;
  EVOLUTION_API_KEY: string;
  EVOLUTION_INSTANCE: string;
}

export async function enviarMensagem(env: Env, numero: string, mensagem: string): Promise<boolean> {
  try {
    const numeroFormatado = formatarNumero(numero);
    console.log(`Enviando WhatsApp para ${numeroFormatado}...`);

    const response = await fetch(
      `${env.EVOLUTION_API_URL}/message/sendText/${env.EVOLUTION_INSTANCE}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': env.EVOLUTION_API_KEY,
        },
        body: JSON.stringify({
          number: numeroFormatado,
          text: mensagem,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error(`Erro Evolution API: ${response.status} - ${error}`);
      return false;
    }

    const result = await response.json();
    console.log('WhatsApp enviado com sucesso:', result);
    return true;
  } catch (error) {
    console.error('Erro enviar mensagem WhatsApp:', error);
    return false;
  }
}

export function mensagemPagamentoConfirmado(nomeCliente: string, idPedido: string): string {
  return `Olá ${nomeCliente}!

Seu pedido *#${idPedido}* foi pago e entrou na fila!

Aguarde, em breve começaremos a preparar seu pedido. 🍽️

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

Pode vir buscar no balcão. Obrigado pela preferência! 😊

Acompanhe o status: ${URL_RASTREIO_BASE}/${idPedido}`;
}

export function mensagemCancelado(nomeCliente: string, idPedido: string): string {
  return `Olá ${nomeCliente}!

Seu pedido *#${idPedido}* foi cancelado por falta de pagamento.

Qualquer dúvida, fale conosco.`;
}

function formatarNumero(numero: string): string {
  let limpo = numero.replace(/\D/g, '');
  if (limpo.startsWith('55')) return limpo;
  if (limpo.length === 11 || limpo.length === 10) return `55${limpo}`;
  return limpo;
}