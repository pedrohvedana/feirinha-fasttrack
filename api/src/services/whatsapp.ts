interface Env {
  EVOLUTION_API_URL: string;
  EVOLUTION_API_KEY: string;
  EVOLUTION_INSTANCE: string;
}

export async function enviarMensagem(
  env: Env,
  numero: string,
  mensagem: string
): Promise<boolean> {
  try {
    const numeroFormatado = formatarNumero(numero);

    const response = await fetch(
      `${env.EVOLUTION_API_URL}/message/sendText/${env.EVOLUTION_INSTANCE}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': env.EVOLUTION_API_KEY
        },
        body: JSON.stringify({
          number: numeroFormatado,
          text: mensagem
        })
      }
    );

    if (!response.ok) {
      console.error(`Erro Evolution API: ${response.status}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Erro ao enviar mensagem WhatsApp:', error);
    return false;
  }
}

export async function enviarMenu(
  env: Env,
  numero: string,
  titulo: string,
  opcoes: string[]
): Promise<boolean> {
  try {
    const numeroFormatado = formatarNumero(numero);

    const sections = [{
      title: titulo,
      rows: opcoes.map((opcao, index) => ({
        title: opcao,
        rowId: `opcao_${index + 1}`
      }))
    }];

    const response = await fetch(
      `${env.EVOLUTION_API_URL}/message/sendList/${env.EVOLUTION_INSTANCE}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': env.EVOLUTION_API_KEY
        },
        body: JSON.stringify({
          number: numeroFormatado,
          title: titulo,
          buttonText: 'Ver opções',
          sections
        })
      }
    );

    return response.ok;
  } catch (error) {
    console.error('Erro ao enviar menu WhatsApp:', error);
    return false;
  }
}

function formatarNumero(numero: string): string {
  let limpo = numero.replace(/\D/g, '');

  if (limpo.startsWith('55')) {
    return limpo;
  }

  if (limpo.length === 11 || limpo.length === 10) {
    return `55${limpo}`;
  }

  return limpo;
}
