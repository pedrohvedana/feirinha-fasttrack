import { Hono } from 'hono';
import { criarBot } from '../services/bot';
import type { Bindings } from '../app';
import { registrarContagemSpam } from '../services/antispam';

type Env = { Bindings: Bindings };

async function assinaturaValida(secret: string | undefined, body: string, signature: string | null): Promise<boolean> {
  if (!secret) return false;
  if (!signature || !signature.startsWith('sha256=')) return false;
  const fornecido = signature.slice('sha256='.length);
  if (fornecido.length !== 64) return false;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, enc.encode(body));
  const esperado = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('');

  let diff = 0;
  for (let i = 0; i < esperado.length; i++) {
    diff |= fornecido.charCodeAt(i) ^ esperado.charCodeAt(i);
  }
  return diff === 0;
}

function extrairTexto(payload: any): string {
  const t = payload?.type;
  if (t === 'TEXT' || t === 'IMAGE' || t === 'VIDEO') return (payload?.content ?? '').trim();
  return '';
}

const whatsappRouter = new Hono<Env>();

whatsappRouter.post('/whatsapp', async (c) => {
  const corpo = await c.req.text();
  const assinatura = c.req.header('X-Webhook-Signature') ?? null;
  const secret = c.env.WA_AKG_WEBHOOK_SECRET;

  if (!(await assinaturaValida(secret, corpo, assinatura))) {
    return c.json({ erro: 'assinatura_invalida' }, 401);
  }

  let payload: any;
  try {
    payload = JSON.parse(corpo);
  } catch {
    return c.json({ erro: 'json_invalido' }, 400);
  }
  if (payload?.data && typeof payload.data === 'object') {
    payload = { ...payload.data, ...payload };
  }


  const userId = `${payload?.sessionId ?? 'feirinha'}`;
  const event = payload?.event;
  const tipo = payload?.chatType || 'PERSONAL';
  const fromMe = !!payload?.key?.fromMe;
  const jid = payload?.from ?? (event === 'message.received' ? payload?.remoteJid : '');
  const remoteJid = payload?.remoteJid ?? '';
  const keyId = payload?.key?.id ?? '';

  if (event !== 'message.received' && event !== 'message.sent') {
    return c.json({ ok: true, ignorado: 'evento_desconhecido' });
  }

  if (tipo !== 'PERSONAL') {
    return c.json({ ok: true, ignorado: tipo });
  }

  if (event === 'message.received') {
    if (fromMe) return c.json({ ok: true, ignorado: 'from_me' });
    const numero = jid.replace(/@s\.whatsapp\.net$/, '');
    const texto = extrairTexto(payload);
    const nome = payload?.pushName ?? '';

    const chaveDedupe = `rec:${userId}:${keyId}`;
    const dedupe = await c.env.DB.prepare('SELECT 1 FROM msg_ids WHERE id = ?').bind(chaveDedupe).first();
    if (dedupe) return c.json({ ok: true, deduplicado: true });

    await c.env.DB.prepare('INSERT OR IGNORE INTO msg_ids (id) VALUES (?)').bind(chaveDedupe).run();

const spam = await registrarContagemSpam(c.env.DB, numero);
  if (spam.bloqueado) return c.json({ ok: true, ignorado: 'spam' });

      const cardapio = await c.env.DB.prepare('SELECT id, nome, preco FROM cardapio WHERE ativo = 1 ORDER BY ordem, id').all() as any;
    const configRows = await c.env.DB.prepare('SELECT chave, valor FROM atendimento_config').all() as any;
    const config: Record<string, string> = {};
    for (const r of configRows.results ?? []) config[r.chave] = r.valor;

    const bot = criarBot({
      db: c.env.DB,
      config,
      cardapio: cardapio.results ?? [],
      enviar: async (destino: string, msg: string) => {
        const jidDestino = destino.includes('@') ? destino : `${destino}@s.whatsapp.net`;
        const url = `${c.env.WA_AKG_BASE_URL}/api/messages/${c.env.WA_AKG_SESSION}/${jidDestino}/send`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-API-Key': c.env.WA_AKG_API_KEY },
          body: JSON.stringify({ message: { text: msg } }),
        });
        if (!res.ok) {
          const err = await res.text().catch(() => '');
          console.error(`[Bot] Falha ao enviar: ${res.status} ${err}`);
          return { ok: false };
        }
        try {
          const data = (await res.json()) as any;
          return { ok: true, keyId: data?.key?.id || data?.id || undefined };
        } catch {
          return { ok: false };
        }
      },
      registrarKeyId: async (keyIdBot: string) => {
        await c.env.DB.prepare('INSERT OR IGNORE INTO bot_msg_ids (key_id) VALUES (?)').bind(keyIdBot).run();
      },
    });

    c.executionCtx.waitUntil(
      bot.onReceived(numero, texto, nome).catch((e) => console.error('[Bot] onReceived falhou:', e)),
    );
    return c.json({ ok: true });
  }

  // message.sent
  const numeroDestinatario = (remoteJid || jid).replace(/@s\.whatsapp\.net$/, '');
  const botSent = await c.env.DB.prepare('SELECT 1 FROM bot_msg_ids WHERE key_id = ?').bind(keyId).first();
  if (botSent) {
    await c.env.DB.prepare('DELETE FROM bot_msg_ids WHERE key_id = ?').bind(keyId).run();
    return c.json({ ok: true, ignorado: 'self_bot' });
  }

  c.executionCtx.waitUntil(
    (async () => {
      await c.env.DB.prepare(`UPDATE conversas SET paused_until = datetime('now', '+10 minutes'), atualizado_em = CURRENT_TIMESTAMP WHERE numero = ?`)
        .bind(numeroDestinatario)
        .run();
    })().catch((e) => console.error('[Bot] onSent pausa falhou:', e)),
  );

  return c.json({ ok: true });
});

export default whatsappRouter;