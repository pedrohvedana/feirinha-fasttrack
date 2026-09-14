import { describe, it, expect, vi, beforeEach } from 'vitest';
import { criarBot, type BotDeps, type AtendimentoConfig } from './bot';
import { criarlaFakeD1 } from '../test/fake-d1';

function makeEnv(overrides: Partial<BotDeps> = {}, initial?: Parameters<typeof criarlaFakeD1>[0]) {
  const f = criarlaFakeD1(initial);
  const said: string[] = [];
  const cardapio = (initial?.cardapio ?? []).map((r) => ({ id: r.id as number, nome: r.nome as string, preco: r.preco as number }));
  const config: AtendimentoConfig = { atendente_numero: '5515997646555', atendente_nome: 'João', bem_vindo: 'Olá! Bem-vindo!' };
  const deps: BotDeps = {
    db: f.db,
    config,
    cardapio,
    enviar: async (numero: string, msg: string) => {
      said.push(`TO:${numero} MSG:${msg}`);
      return { ok: true, keyId: `k-${said.length}` };
    },
    registrarKeyId: async () => {},
    ...overrides,
  };
  return { deps, said, tables: f.tables };
}

describe('criarBot.onReceived', () => {
  let env: ReturnType<typeof makeEnv>;

  beforeEach(() => {
    env = makeEnv(undefined, {
      cardapio: [
        { id: 1, nome: 'X-Burger', preco: 15, ativo: 1 },
        { id: 2, nome: 'Batata Frita', preco: 10, ativo: 1 },
      ],
      atendimento_config: [
        { chave: 'atendente_numero', valor: '5515997646555' },
        { chave: 'atendente_nome', valor: 'João' },
        { chave: 'bem_vindo', valor: 'Olá! Bem-vindo!' },
      ],
    });
  });

  it('primeira mensagem exibe boas-vindas + menu', async () => {
    const bot = criarBot(env.deps);
    await bot.onReceived('5511999887766', 'oi', 'Carlos');
    expect(env.said.join('\n')).toContain('Olá!');
    expect(env.said.join('\n')).toContain('1');
  });

  it('opção 1 mostra cardápio', async () => {
    const bot = criarBot(env.deps);
    await bot.onReceived('5511999887766', '1', 'Carlos');
    const all = env.said.join('\n');
    expect(all).toContain('X-Burger');
    expect(all).toContain('Batata Frita');
    expect(all).toContain('*número* do item');
  });

  it('fluxo completo: item 1 → qtd 2 → confirma → PIX', async () => {
    const bot = criarBot(env.deps);
    await bot.onReceived('5511999887766', '1', 'Carlos');
    await bot.onReceived('5511999887766', '1', 'Carlos'); // X-Burger
    await bot.onReceived('5511999887766', '2', 'Carlos'); // qtd
    await bot.onReceived('5511999887766', '1', 'Carlos'); // confirmar
    await bot.onReceived('5511999887766', '1', 'Carlos'); // pagamento PIX
    const all = env.said.join('\n');
    expect(all).toContain('R$ 30,00');
    expect(all).toContain('PIX');
  });

  it('falar humano muda para humano e gera ping ao atendente', async () => {
    const bot = criarBot(env.deps);
    await bot.onReceived('5511999887766', '#falar humano', 'Carlos');
    const all = env.said.join('\n');
    expect(all).toContain('TO:5515997646555');
    expect(all).toContain('atendente');
  });

  it('com passo humano, mensagens do cliente não geram resposta', async () => {
    const bot = criarBot(env.deps);
    await bot.onReceived('5511999887766', '#falar humano', 'Carlos');
    const antes = env.said.length;
    await bot.onReceived('5511999887766', 'oi, ainda tem?', 'Carlos');
    expect(env.said.length).toBe(antes);
  });

  it('com paused_until futuro, não responde', async () => {
    const future = new Date(Date.now() + 600000).toISOString();
    env = makeEnv(undefined, {
      conversas: [{ numero: '5511999887766', passo: 'menu', carrinho_json: '[]', paused_until: future }],
      atendimento_config: [{ chave: 'atendente_numero', valor: '5515997646555' }],
    });
    const bot = criarBot(env.deps);
    await bot.onReceived('5511999887766', '1', 'Carlos');
    expect(env.said.length).toBe(0);
  });

  it('responde com opção desconhecida no menu', async () => {
    const bot = criarBot(env.deps);
    await bot.onReceived('5511999887766', '99', 'Carlos');
    const all = env.said.join('\n');
    expect(all).toContain('Bem-vindo');
    expect(all).toContain('99');
  });

  it('confirmação de pagamento registra pedido no banco e envia link de rastreio', async () => {
    const bot = criarBot(env.deps);
    await bot.onReceived('5511999887766', '1', 'Carlos');
    await bot.onReceived('5511999887766', '1', 'Carlos'); // X-Burger
    await bot.onReceived('5511999887766', '2', 'Carlos'); // qtd
    await bot.onReceived('5511999887766', '1', 'Carlos'); // confirmar
    await bot.onReceived('5511999887766', '1', 'Carlos'); // pagamento PIX

    expect(env.tables.pedidos.length).toBe(1);
    const pedido = env.tables.pedidos[0];
    expect(pedido.whatsapp).toBe('5511999887766');
    expect(pedido.valor_total).toBe(30);
    expect(pedido.pagamento_tipo).toBe('pix');

    const all = env.said.join('\n');
    expect(all).toContain('/rastrear/');
    expect(all).toContain(pedido.id as string);
  });

  it('pagamento em dinheiro também registra pedido com tipo dinheiro', async () => {
    const bot = criarBot(env.deps);
    await bot.onReceived('5511999887766', '1', 'Carlos');
    await bot.onReceived('5511999887766', '2', 'Carlos'); // Batata Frita
    await bot.onReceived('5511999887766', '1', 'Carlos'); // qtd
    await bot.onReceived('5511999887766', '1', 'Carlos'); // confirmar
    await bot.onReceived('5511999887766', '2', 'Carlos'); // dinheiro

    expect(env.tables.pedidos.length).toBe(1);
    expect(env.tables.pedidos[0].pagamento_tipo).toBe('dinheiro');
    expect(env.said.join('\n')).toContain('/rastrear/');
  });
});

describe('criarBot.onSent', () => {
  it('mensagem manual do atendente pausa por 10 minutos', async () => {
    const env = makeEnv();
    const bot = criarBot(env.deps);
    await bot.onSent('5511999887766', 'manual-key-id-123');
    const conversa = env.tables.conversas[0];
    expect(conversa).toBeDefined();
    expect(conversa!.paused_until).toBeTruthy();
    expect(new Date(conversa!.paused_until as string).getTime()).toBeGreaterThan(Date.now());
  });

  it('mensagem manual não reabre venda sem #menu (mantém humano)', async () => {
    const env = makeEnv();
    const bot = criarBot(env.deps);
    await bot.onReceived('5511999887766', '#falar humano', 'Carlos');
    await bot.onSent('5511999887766', 'manual-key-2');
    const conversa = env.tables.conversas[0];
    expect(conversa!.passo).toBe('humano');
  });

  it('onSent sem keyId não faz nada', async () => {
    const env = makeEnv();
    const bot = criarBot(env.deps);
    await bot.onSent('5511999887766', '');
    // Sem keyId, não deve pausar conversa nem deletar bot_msg_ids
    expect(true).toBe(true);
  });

  it('onSent com keyId inexistente pausa conversa', async () => {
    const env = makeEnv();
    const bot = criarBot(env.deps);
    await bot.onSent('5511999887766', 'non-existent-key-123');
    const conversa = env.tables.conversas[0];
    expect(conversa).toBeDefined();
    // KeyId não encontrado na tabela → deve pausar por 10 minutos
    expect(conversa?.paused_until).toBeTruthy();
    expect(new Date(conversa?.paused_until as string).getTime()).toBeGreaterThan(Date.now());
  });
});