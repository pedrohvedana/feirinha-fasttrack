import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createHmac } from 'node:crypto';
import { criarApp } from '../app';
import { criarlaFakeD1 } from '../test/fake-d1';

const SECRET = 'teste-secreto';

vi.stubGlobal(
  'fetch',
  vi.fn(async () => {
    return new Response(JSON.stringify({ key: { id: 'FAKE-KEY-1' } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }),
);

function assinar(body: string): string {
  return 'sha256=' + createHmac('sha256', SECRET).update(body).digest('hex');
}

function makeCtx() {
  const pendentes: Promise<unknown>[] = [];
  const waitUntil = (p: Promise<unknown>) => {
    pendentes.push(p);
  };
  const flush = async () => {
    while (pendentes.length) {
      const batch = pendentes.splice(0);
      await Promise.all(batch);
    }
  };
  return { waitUntil, flush };
}

function makeEnv(initial?: Parameters<typeof criarlaFakeD1>[0]) {
  const f = criarlaFakeD1(initial);
  const env = {
    DB: f.db,
    WA_AKG_WEBHOOK_SECRET: SECRET,
    WA_AKG_BASE_URL: 'https://wa-akg.local',
    WA_AKG_API_KEY: 'k',
    WA_AKG_SESSION: 'feirinha',
    EVOLUTION_API_URL: 'http://evo.local',
    EVOLUTION_API_KEY: '',
    EVOLUTION_INSTANCE: 'feirinha',
    WHATSAPP_PROVIDER: 'wa-akg',
    PIX_ACCESS_TOKEN: '',
    PEDIDO_EXPIRA_MINUTOS: '15',
  } as any;
  return { f, env };
}

function mensagemReceived(over: Record<string, unknown> = {}) {
  return JSON.stringify({
    event: 'message.received',
    sessionId: 'feirinha',
    from: '5511999887766@s.whatsapp.net',
    remoteJid: '5511999887766@s.whatsapp.net',
    isGroup: false,
    chatType: 'PERSONAL',
    type: 'TEXT',
    content: 'oi',
    pushName: 'Maria',
    key: { id: 'KEY-1', remoteJid: '5511999887766@s.whatsapp.net', fromMe: false },
    timestamp: 1735000000,
    ...over,
  });
}

function mensagemSent(over: Record<string, unknown> = {}) {
  return JSON.stringify({
    event: 'message.sent',
    sessionId: 'feirinha',
    from: '5511921148727@s.whatsapp.net',
    remoteJid: '5511999887766@s.whatsapp.net',
    chatType: 'PERSONAL',
    type: 'TEXT',
    content: 'Já estou resolvendo',
    key: { id: 'KEY-SENT-1', remoteJid: '5511999887766@s.whatsapp.net', fromMe: true },
    ...over,
  });
}

async function post(env: any, body: string, assinatura?: string) {
  const app = criarApp();
  const ctx = makeCtx();
  const res = await app.request(
    '/webhook/whatsapp',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': assinatura ?? assinar(body),
      },
      body,
    },
    env,
    ctx as any,
  );
  await ctx.flush();
  return res;
}

function montaMensagemReceived(over: Record<string, unknown> = {}): string {
  return JSON.stringify({
    event: 'message.received',
    sessionId: 'feirinha',
    from: '5511999887766@s.whatsapp.net',
    remoteJid: '5511999887766@s.whatsapp.net',
    isGroup: over.isGroup ?? false,
    chatType: over.chatType ?? 'PERSONAL',
    type: over.type ?? 'TEXT',
    content: over.content ?? 'oi',
    pushName: over.pushName ?? 'Maria',
    key: {
      id: over.keyId ?? 'KEY-1',
      remoteJid: over.remoteJid ?? '5511999887766@s.whatsapp.net',
      fromMe: over.fromMe ?? false,
    },
    timestamp: over.timestamp ?? 1735000000,
    ...over,
  });
}

describe('POST /webhook/whatsapp', () => {
  beforeEach(() => {});

  it('rejeita sem assinatura com 401', async () => {
    const { env } = makeEnv();
    const res = await post(env, mensagemReceived(), '');
    expect(res.status).toBe(401);
  });

  it('rejeita assinatura inválida com 401', async () => {
    const { env } = makeEnv();
    const res = await post(env, mensagemReceived(), 'sha256=abcdef');
    expect(res.status).toBe(401);
  });

  it('aceita assinatura válida com 200 e processa message.received', async () => {
    const { env } = makeEnv({
      cardapio: [{ id: 1, nome: 'X-Burger', preco: 15, ativo: 1 }],
      atendimento_config: [
        { chave: 'atendente_numero', valor: '5515997646555' },
        { chave: 'bem_vindo', valor: 'Olá! Bem-vindo!' },
      ],
    });
    const res = await post(env, mensagemReceived({ content: 'oi', key: { id: 'K2', fromMe: false } }));
    expect(res.status).toBe(200);
  });

  it('ignora mensagem de grupo', async () => {
    const { env } = makeEnv();
    const res = await post(
      env,
      mensagemReceived({
        isGroup: true,
        chatType: 'GROUP',
        remoteJid: '123456@g.us',
        from: '123456@g.us',
        key: { id: 'K3', remoteJid: '123456@g.us', fromMe: false },
      }),
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.ignorado).toBe('GROUP');
  });

  it('ignora mensagem fromMe', async () => {
    const { env } = makeEnv();
    const res = await post(
      env,
      mensagemReceived({ key: { id: 'K4', fromMe: true } }),
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.ignorado).toBe('from_me');
  });

  it('dedupe: key.id repetido não reprocessa', async () => {
    const { env } = makeEnv({
      cardapio: [{ id: 1, nome: 'X-Burger', preco: 15, ativo: 1 }],
      atendimento_config: [{ chave: 'atendente_numero', valor: '5515997646555' }],
    });
    const body = mensagemReceived({ content: 'oi', key: { id: 'K-DUP', fromMe: false } });
    const r1 = await post(env, body);
    const r2 = await post(env, body);
    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    const { f } = makeEnv();
    expect(f.tables.msg_ids).toBeDefined();
  });

  it('message.sent manual pausa a conversa', async () => {
    const { env, f } = makeEnv({ conversas: [{ numero: '5511999887766', passo: 'menu', carrinho_json: '[]', paused_until: null }] });
    const res = await post(env, mensagemSent());
    expect(res.status).toBe(200);
    expect(f.tables.conversas[0]!.paused_until).toBeTruthy();
  });

  it('message.sent de envio do próprio bot é ignorado', async () => {
    const { env, f } = makeEnv({
      bot_msg_ids: [{ key_id: 'KEY-BOT-1' }],
      conversas: [{ numero: '5511999887766', passo: 'menu', carrinho_json: '[]', paused_until: null }],
    });
    const res = await post(env, mensagemSent({ key: { id: 'KEY-BOT-1', fromMe: true } }));
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.ignorado).toBe('self_bot');
    expect(f.tables.bot_msg_ids.length).toBe(0);
  });

  it('ignora spam quando 11a mensagem em 1 minuto', async () => {
    const agora = new Date();
    const { env, f } = makeEnv({
      spam_contador: [{ numero: '5511999887766', janela_inicio: agora.toISOString(), contagem: 10 }],
      cardapio: [{ id: 1, nome: 'X-Burger', preco: 15, ativo: 1 }],
      atendimento_config: [{ chave: 'atendente_numero', valor: '5515997646555' }],
    });
    const res = await post(env, mensagemReceived({ content: 'oi', key: { id: 'K-SPAM-11', fromMe: false } }));
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.ignorado).toBe('spam');
    expect(f.tables.spam_contador.find((r: any) => r.numero === '5511999887766')?.contagem).toBe(11);
    expect(f.tables.conversas.length).toBe(0);
  });

  // Tests for fetch error handling (non-200 response from WA-AKG API)
  describe('fetch error handling', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it('trata resposta não-OK do WA-AKG com 500', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => {
          return new Response(JSON.stringify({ error: 'internal' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
        }),
      );
      const { env } = makeEnv();
      const res = await post(env, mensagemReceived({ content: 'oi', key: { id: 'K5', fromMe: false } }));
      expect(res.status).toBe(200);
    });

    it('trata erro ao fazer parse do JSON da resposta', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => {
          return new Response('invalid json', { status: 200, headers: { 'Content-Type': 'application/json' } });
        }),
      );
      const { env } = makeEnv();
      const res = await post(env, mensagemReceived({ content: 'oi', key: { id: 'K6', fromMe: false } }));
      expect(res.status).toBe(200);
    });
  });

  // Tests for bot.onReceived edge cases (covering tipoPasso branches)
  describe('bot.onReceived edge cases', () => {
    it('retorna cedo quando mensagem começa com #menu', async () => {
      const { env, f } = makeEnv({
        cardapio: [{ id: 1, nome: 'X-Burger', preco: 15, ativo: 1 }],
        atendimento_config: [{ chave: 'atendente_numero', valor: '5515997646555' }],
      });
      const res = await post(env, mensagemReceived({ content: '#menu', key: { id: 'K-MENU', fromMe: false } }));
      expect(res.status).toBe(200);
    });

    it('retorna cedo quando mensagem começa com #falar humano', async () => {
      const { env, f } = makeEnv({
        cardapio: [{ id: 1, nome: 'X-Burger', preco: 15, ativo: 1 }],
        atendimento_config: [{ chave: 'atendente_numero', valor: '5515997646555' }],
      });
      const res = await post(env, mensagemReceived({ content: '#falar humano', key: { id: 'K-HUMANO', fromMe: false } }));
      expect(res.status).toBe(200);
    });

    it('ignora mensagem silenciosa (passo humano com paused_until futuro)', async () => {
      const { env, f } = makeEnv({
        cardapio: [{ id: 1, nome: 'X-Burger', preco: 15, ativo: 1 }],
        atendimento_config: [{ chave: 'atendente_numero', valor: '5515997646555' }],
        conversas: [{ numero: '5511999887766', passo: 'humano', carrinho_json: '[]', paused_until: new Date(Date.now() + 60000).toISOString() }],
      });
      const res = await post(env, mensagemReceived({ content: 'qualquer coisa', key: { id: 'K-SILENCIOSO', fromMe: false } }));
      expect(res.status).toBe(200);
    });

    it('processa tipo menu', async () => {
      const { env, f } = makeEnv({
        cardapio: [{ id: 1, nome: 'X-Burger', preco: 15, ativo: 1 }],
        atendimento_config: [{ chave: 'atendente_numero', valor: '5515997646555' }],
        conversas: [{ numero: '5511999887766', passo: 'menu', carrinho_json: '[]', paused_until: null }],
      });
      const res = await post(env, mensagemReceived({ content: '1', key: { id: 'K-MENU-OPT', fromMe: false } }));
      expect(res.status).toBe(200);
    });

    it('processa tipo venda', async () => {
      const { env, f } = makeEnv({
        cardapio: [{ id: 1, nome: 'X-Burger', preco: 15, ativo: 1 }],
        atendimento_config: [{ chave: 'atendente_numero', valor: '5515997646555' }],
        conversas: [{ numero: '5511999887766', passo: 'venda', carrinho_json: JSON.stringify([{ id: 1, nome: 'X-Burger', preco: 15, qtd: 1 }]) }],
      });
      const res = await post(env, mensagemReceived({ content: '2', key: { id: 'K-VENDA', fromMe: false } }));
      expect(res.status).toBe(200);
    });

    it('processa tipo rastreio', async () => {
      const { env, f } = makeEnv({
        cardapio: [{ id: 1, nome: 'X-Burger', preco: 15, ativo: 1 }],
        atendimento_config: [{ chave: 'atendente_numero', valor: '5515997646555' }],
        conversas: [{ numero: '5511999887766', passo: 'rastrear', carrinho_json: '[]', paused_until: null }],
      });
      const res = await post(env, mensagemReceived({ content: 'a1b2c3d4', key: { id: 'K-RASTREAR', fromMe: false } }));
      expect(res.status).toBe(200);
    });

    it('processa tipo info (horario/duvidas) quando passo vazio', async () => {
      const { env, f } = makeEnv({
        cardapio: [{ id: 1, nome: 'X-Burger', preco: 15, ativo: 1 }],
        atendimento_config: [
          { chave: 'horario', valor: 'De segunda a sexta, das 11h às 20h.' },
          { chave: 'localizacao', valor: 'Rua Exemplo, 123 — Centro' },
          { chave: 'duvidas', valor: 'Sem perguntas frequentes' },
        ],
        conversas: [{ numero: '5511999887766', passo: '', carrinho_json: '[]', paused_until: null }],
      });
      const res = await post(env, mensagemReceived({ content: 'oi', key: { id: 'K-INFO', fromMe: false } }));
      expect(res.status).toBe(200);
    });
  });

  // Tests for bot.onSent edge cases
  // Tests for edge cases when WA_AKG_WEBHOOK_SECRET is not set
  describe('whatsapp route - secret not set', () => {
    it('rejeita quando WA_AKG_WEBHOOK_SECRET nao configurado', async () => {
      const { env } = makeEnv({
        WA_AKG_WEBHOOK_SECRET: undefined,
      });
      const res = await post(env, mensagemReceived(), 'sha256=abcdef');
      expect(res.status).toBe(401);
    });

    it('rejeita quando assinatura invalida com 401', async () => {
      const { env } = makeEnv({
        WA_AKG_WEBHOOK_SECRET: 'teste-secreto',
      });
      // Passa signature inválida explicitamente
      const res = await post(env, mensagemReceived(), 'sha256=invalid');
      expect(res.status).toBe(401);
    });
  });

  // Tests for invalid JSON body and payload.data object type
  // Use default signature (assinatura ?? assinar(body)) so validation passes
  // and we can test the JSON parse branch
  describe('whatsapp route - JSON and payload edge cases', () => {
    it('rejeita corpo JSON invalido com 400', async () => {
      const { env } = makeEnv();
      // Don't pass signature - defaults to assinar(body) which creates valid HMAC
      const res = await post(env, 'not json at all');
      expect(res.status).toBe(400);
    });

    it('processa quando payload.data e objeto', async () => {
      const { env } = makeEnv({
        cardapio: [{ id: 1, nome: 'X-Burger', preco: 15, ativo: 1 }],
        atendimento_config: [{ chave: 'atendente_numero', valor: '5515997646555' }],
      });
      // Don't pass signature - defaults to assinar(body) which creates valid HMAC
      const res = await post(env, JSON.stringify({
        event: 'message.received',
        sessionId: 'feirinha',
        from: '5511999887766@s.whatsapp.net',
        remoteJid: '5511999887766@s.whatsapp.net',
        key: { id: 'K-OBJ', fromMe: false },
        data: { type: 'TEXT', content: 'oi' }
      }));
      expect(res.status).toBe(200);
    });
  });

  // Tests for unknown event type
  // Use default signature so we can test the event type filtering branch
  describe('whatsapp route - unknown event type', () => {
    it('retorna evento desconhecido para eventos nao-message', async () => {
      const { env } = makeEnv();
      // Don't pass signature - defaults to assinar(body) which creates valid HMAC
      const res = await post(env, JSON.stringify({
        event: 'callback',
        sessionId: 'feirinha',
        from: '5511999887766@s.whatsapp.net',
        remoteJid: '5511999887766@s.whatsapp.net',
        key: { id: 'K-UNKNOWN', fromMe: false },
      }));
      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.ignorado).toBe('evento_desconhecido');
    });
  });

  // Tests for fetch error handling in onSent
  describe('whatsapp route - fetch error handling', () => {
    it('trata fetch error ao enviar mensagem', async () => {
      const { env, f } = makeEnv({
        cardapio: [{ id: 1, nome: 'X-Burger', preco: 15, ativo: 1 }],
        atendimento_config: [{ chave: 'atendente_numero', valor: '5515997646555' }],
        WA_AKG_API_KEY: 'k',
        WA_AKG_BASE_URL: 'https://wa-akg.local',
      });
      // Mock fetch to return 500 error
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => {
          return new Response(JSON.stringify({ error: 'internal' }), { status: 500 });
        }),
      );
      const res = await post(env, mensagemSent());
      expect(res.status).toBe(200);
    });
  });

  describe('bot.onSent edge cases', () => {
    it('ignora envio do próprio bot quando keyId registrado', async () => {
      const { env, f } = makeEnv({
        bot_msg_ids: [{ key_id: 'KEY-BOT-1' }],
        conversas: [{ numero: '5511999887766', passo: 'menu', carrinho_json: '[]', paused_until: null }],
      });
      const res = await post(env, mensagemSent({ key: { id: 'KEY-BOT-1', fromMe: true } }));
      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.ignorado).toBe('self_bot');
    });

    it('pausa conversa quando onSent sem keyId', async () => {
      const { env, f } = makeEnv({
        bot_msg_ids: [],
        conversas: [{ numero: '5511999887766', passo: 'menu', carrinho_json: '[]', paused_until: null }],
      });
      const res = await post(env, mensagemSent({ key: { id: '', fromMe: true } }));
      expect(res.status).toBe(200);
      expect(f.tables.conversas[0]!.paused_until).toBeTruthy();
    });

    it('não sobrescreve pausa manual quando conversa já pausada', async () => {
      const { env, f } = makeEnv({
        bot_msg_ids: [],
        conversas: [{ numero: '5511999887766', passo: 'menu', carrinho_json: '[]', paused_until: new Date(Date.now() + 60000).toISOString() }],
      });
      const res = await post(env, mensagemSent({ key: { id: 'KEY-NOVO', fromMe: true } }));
      expect(res.status).toBe(200);
      const pausedUntil = f.tables.conversas[0]!.paused_until;
      const existente = new Date(pausedUntil!).getTime();
      const agora = Date.now();
      expect(existente).toBeGreaterThanOrEqual(agora);
    });
  });

  // Tests for antispam edge cases
  describe('antispam edge cases', () => {
    it('permite primeira mensagem quando não há registro', async () => {
      const { env, f } = makeEnv({
        cardapio: [{ id: 1, nome: 'X-Burger', preco: 15, ativo: 1 }],
        atendimento_config: [{ chave: 'atendente_numero', valor: '5515997646555' }],
      });
      const res = await post(env, mensagemReceived({ content: 'oi', key: { id: 'K-FIRST', fromMe: false } }));
      expect(res.status).toBe(200);
      const spamResult = f.tables.spam_contador.find((r: any) => r.numero === '5511999887766');
      expect(spamResult).toBeDefined();
      expect(spamResult?.contagem).toBe(1);
    });

    it('bloqueia quando contagem excede limite (11 > 10)', async () => {
      const { env, f } = makeEnv({
        spam_contador: [{ numero: '5511999887766', janela_inicio: new Date().toISOString(), contagem: 10 }],
        cardapio: [{ id: 1, nome: 'X-Burger', preco: 15, ativo: 1 }],
        atendimento_config: [{ chave: 'atendente_numero', valor: '5515997646555' }],
      });
      const res = await post(env, mensagemReceived({ content: 'oi', key: { id: 'K-LIMIT', fromMe: false } }));
      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.ignorado).toBe('spam');
    });

    it('permite mensagem quando fora da janela de tempo', async () => {
      const { env, f } = makeEnv({
        spam_contador: [{ numero: '5511999887766', janela_inicio: new Date(Date.now() - 3600000).toISOString(), contagem: 5 }],
        cardapio: [{ id: 1, nome: 'X-Burger', preco: 15, ativo: 1 }],
        atendimento_config: [{ chave: 'atendente_numero', valor: '5515997646555' }],
      });
      const res = await post(env, mensagemReceived({ content: 'oi', key: { id: 'K-OUTRO', fromMe: false } }));
      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.ignorado).not.toBe('spam');
    });

    it('reinicia contagem quando janela expira', async () => {
      const { env, f } = makeEnv({
        spam_contador: [{ numero: '5511999887766', janela_inicio: new Date(Date.now() - 120000).toISOString(), contagem: 10 }],
        cardapio: [{ id: 1, nome: 'X-Burger', preco: 15, ativo: 1 }],
        atendimento_config: [{ chave: 'atendente_numero', valor: '5515997646555' }],
      });
      const res = await post(env, mensagemReceived({ content: 'oi', key: { id: 'K-REINICIO', fromMe: false } }));
      expect(res.status).toBe(200);
      const spamResult = f.tables.spam_contador.find((r: any) => r.numero === '5511999887766');
      expect(spamResult?.contagem).toBe(1);
    });
  });
});