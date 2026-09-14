function formatoExpiraMP(data: Date): string {
  const local = new Date(data.getTime() - 3 * 60 * 60 * 1000);
  return local.toISOString().slice(0, 23) + '-03:00';
}

export type PixCobranca = {
  payment_id: number;
  qr_code: string;
  qr_base64: string;
  expira_em: string;
  status: string;
};

type Env = {
  PIX_ACCESS_TOKEN?: string;
  PIX_WEBHOOK_SECRET?: string;
  PIX_PAGADOR_EMAIL?: string;
  PIX_EXPIRACAO_MINUTOS?: string;
};

const MP_API = 'https://api.mercadopago.com';

export async function criarCobrancaPix(
  env: Env,
  pedido: { id: string; valor_total: number; whatsapp?: string }
): Promise<PixCobranca | null> {
  const token = env.PIX_ACCESS_TOKEN;
  console.log('[PIX] Token presente:', !!token);
  if (!token) {
    console.log('[PIX] Token não configurado');
    return null;
  }

  const expiraMin = Number(env.PIX_EXPIRACAO_MINUTOS || '30');
  const expiraEmDate = new Date(Date.now() + expiraMin * 60_000);
  const expiraEm = formatoExpiraMP(expiraEmDate);
  const pagadorEmail = env.PIX_PAGADOR_EMAIL || 'comprador@feirinha.local';

  const body = {
    transaction_amount: Number(pedido.valor_total),
    description: `Pedido #${pedido.id}`,
    payment_method_id: 'pix',
    payer: { email: pagadorEmail },
    external_reference: pedido.id,
    notification_url: 'https://feirinha-fasttrack-api.pedro-vedana.workers.dev/webhook/pix',
    date_of_expiration: expiraEm,
  };

  console.log('[PIX] Criando cobrança para pedido:', pedido.id);

  const res = await fetch(`${MP_API}/v1/payments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': pedido.id,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`[PIX] Erro Mercado Pago criar cobrança: ${res.status} - ${err}`);
    return null;
  }

  const data = (await res.json()) as {
    id: number;
    status: string;
    point_of_interaction?: { transaction_data?: { qr_code: string; qr_code_base64: string } };
  };

  const tx = data.point_of_interaction?.transaction_data;
  if (!data.id || !tx?.qr_code) {
    console.error('[PIX] Resposta MP sem qr_code', JSON.stringify(data).slice(0, 300));
    return null;
  }

  console.log('[PIX] Cobrança criada com sucesso:', data.id);
  return {
    payment_id: data.id,
    qr_code: tx.qr_code,
    qr_base64: tx.qr_code_base64 || '',
    expira_em: expiraEm,
    status: data.status,
  };
}

export async function consultarPagamento(
  env: Env,
  paymentId: number
): Promise<{ status: string; payment_id: number } | null> {
  const token = env.PIX_ACCESS_TOKEN;
  if (!token || !paymentId) return null;

  const res = await fetch(`${MP_API}/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`[PIX] Erro MP consultar pagamento: ${res.status} - ${err}`);
    return null;
  }

  const data = (await res.json()) as { id: number; status: string };
  return { payment_id: data.id, status: data.status };
}