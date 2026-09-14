export type ItemCardapio = { id: number; nome: string; preco: number };

const URL_RASTREIO_BASE = 'https://feirinha.ciavedana.com.br/rastrear';

function URL_Rastreio(pedidoId: string): string {
  return `${URL_RASTREIO_BASE}/${pedidoId}`;
}

function gerarIdPedido(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export type CarrinhoItem = {
  id: number;
  nome: string;
  preco: number;
  qtd: number;
};

export interface AtendimentoConfig {
  atendente_numero?: string;
  atendente_nome?: string;
  bem_vindo?: string;
  horario?: string;
  localizacao?: string;
  duvidas?: string;
}

export interface BotDeps {
  db: { prepare: (sql: string) => any };
  config: AtendimentoConfig;
  cardapio: ItemCardapio[];
  enviar: (numero: string, mensagem: string) => Promise<{ ok: boolean; keyId?: string }>;
  registrarKeyId: (keyId: string) => Promise<void>;
}

type Conversa = {
  numero: string;
  passo: string;
  carrinho_json: string | null;
  cliente_nome: string | null;
  paused_until: string | null;
};

export function normalizarJid(jid: string): string | undefined {
  if (!jid) return undefined;
  const m = jid.match(/^(\d+)@(s\.whatsapp\.net|g\.us|broadcast|newsletter|temp)$/);
  if (!m) return undefined;
  const numero = m[1];
  if (!/^\d{10,15}$/.test(numero)) return undefined;
  return numero;
}

export function montarCardapioTexto(itens: ItemCardapio[]): string {
  if (itens.length === 0) return '';
  return itens
    .map((item) => `${item.id}. ${item.nome} — R$ ${item.preco.toFixed(2).replace('.', ',')}`)
    .join('\n');
}

export function calcularTotal(carrinho: CarrinhoItem[]): number {
  return carrinho.reduce((soma, item) => soma + item.preco * item.qtd, 0);
}

export function validarQtd(raw: string): boolean {
  const qtd = Number(raw);
  return Number.isInteger(qtd) && qtd >= 1 && qtd <= 50;
}

export function validarItens(carrinho: CarrinhoItem[]): boolean {
  return carrinho.length <= 20;
}

export function parseOpcaoMenu(opcao: string): 'pedir' | 'rastrear' | 'horario' | 'duvidas' | 'humano' | 'cancelar' | null {
  switch (opcao) {
    case '1':
      return 'pedir';
    case '2':
      return 'rastrear';
    case '3':
      return 'horario';
    case '4':
      return 'duvidas';
    case '5':
      return 'humano';
    case '0':
      return 'cancelar';
    default:
      return null;
  }
}

export function tipoPasso(passo: string): 'silencioso' | 'venda' | 'menu' | 'rastreio' | 'info' {
  if (passo === 'humano') return 'silencioso';
  if (passo === 'menu' || passo === '') return 'menu';
  if (passo.startsWith('rastrear') || passo === 'rastreio') return 'rastreio';
  if (passo === 'horario' || passo === 'duvidas') return 'info';
  return 'venda';
}

const PASSO_RASTREIO = 'rastrear:';
const PASSO_ITEM = 'item';
const PASSO_QTD = 'qtd:';
const PASSO_CONFIRMAR = 'confirmar';
const PASSO_PAGAMENTO = 'pagamento';
const PASSO_HUMANO = 'humano';

const MAX_ITENS = 20;

export function criarBot(deps: BotDeps) {
  async function buscarConversa(numero: string): Promise<Conversa | null> {
    const row = await deps.db.prepare('SELECT * FROM conversas WHERE numero = ?').bind(numero).first();
    return (row as Conversa) ?? null;
  }

  async function salvarConversa(numero: string, passo: string, carrinho: CarrinhoItem[], nome?: string, paused?: string) {
    await deps.db
      .prepare(
        `INSERT INTO conversas (numero, passo, carrinho_json, cliente_nome, paused_until, atualizado_em)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(numero) DO UPDATE SET passo = excluded.passo, carrinho_json = excluded.carrinho_json,
           cliente_nome = COALESCE(excluded.cliente_nome, cliente_nome), paused_until = excluded.paused_until,
           atualizado_em = CURRENT_TIMESTAMP`,
      )
      .bind(numero, passo, JSON.stringify(carrinho), nome ?? null, paused ?? null)
      .run();
  }

  async function pausarConversa(numero: string, minutos: number) {
    const upd = await deps.db
      .prepare(`UPDATE conversas SET paused_until = datetime('now', '+' || ? || ' minutes'), atualizado_em = CURRENT_TIMESTAMP WHERE numero = ?`)
      .bind(minutos, numero)
      .run();
    if (upd.meta.changes === 0) {
      await deps.db
        .prepare(
          `INSERT INTO conversas (numero, passo, carrinho_json, paused_until, atualizado_em)
           VALUES (?, 'menu', '[]', datetime('now', '+' || ? || ' minutes'), CURRENT_TIMESTAMP)`,
        )
        .bind(numero, minutos)
        .run();
    }
  }

  function estaPausada(conversa: Conversa | null): boolean {
    if (!conversa?.paused_until) return false;
    return new Date(conversa.paused_until).getTime() > Date.now();
  }

  function montarBemVindo(): string {
    return (
      deps.config.bem_vindo ??
      `Olá! Bem-vindo(a) à Feirinha! 🍽️
Escolha uma opção:
1️⃣ Ver cardápio e pedir
2️⃣ Rastrear pedido
3️⃣ Horário e localização
4️⃣ Dúvidas frequentes
5️⃣ Falar com atendente
0️⃣ Cancelar`
    );
  }

  async function responderComPing(numeros: string[], mensagem: string): Promise<string | undefined> {
    const resultados: Array<{ ok: boolean; keyId?: string }> = [];
    const alvos = numeros.filter(Boolean);
    for (const alvo of alvos) {
      const r = await deps.enviar(alvo, mensagem);
      if (r?.keyId) await deps.registrarKeyId(r.keyId);
      resultados.push(r);
    }
    const primeiroOk = resultados[0];
    return primeiroOk?.ok ? primeiroOk.keyId : undefined;
  }

  async function responder(numero: string, mensagem: string): Promise<string | undefined> {
    const r = await deps.enviar(numero, mensagem);
    if (r?.keyId) await deps.registrarKeyId(r.keyId);
    return r?.ok ? r.keyId : undefined;
  }

  async function tratarMenu(numero: string, conversa: Conversa | null, texto: string, nome?: string): Promise<void> {
    const opcao = parseOpcaoMenu(texto);
    if (!opcao) {
      await responder(numero, montarBemVindo());
      return;
    }

    switch (opcao) {
      case 'pedir': {
        const itens = deps.cardapio;
        if (itens.length === 0) {
          await responder(numero, 'Desculpe, sem cardápio no momento. 💤');
          return;
        }
        const textoCardapio = montarCardapioTexto(itens);
        const msg = `🍔 *CARDÁPIO*\n\n${textoCardapio}\n\nDigite o *número* do item que deseja:`;
        await salvarConversa(numero, PASSO_ITEM, [], nome);
        await responder(numero, msg);
        return;
      }
      case 'rastrear': {
        await salvarConversa(numero, PASSO_RASTREIO, [], nome);
        await responder(numero, 'Digite o *número do pedido* (ex: a1b2c3d4):');
        return;
      }
      case 'horario': {
        const horario = deps.config.horario ?? 'De segunda a sexta, das 11h às 20h.';
        const local = deps.config.localizacao ?? 'Rua Exemplo, 123 — Centro';
        await responder(numero, `🕐 *Horário*\n${horario}\n\n📍 *Localização*\n${local}`);
        return;
      }
      case 'duvidas': {
        const duvidas = deps.config.duvidas ?? 'Sem perguntas frequentes cadastradas ainda.';
        await responder(numero, `❓ *Dúvidas frequentes*\n${duvidas}`);
        return;
      }
      case 'humano': {
        await salvarConversa(numero, PASSO_HUMANO, [], nome);
        const atendenteNum = deps.config.atendente_numero;
        const atendenteNome = deps.config.atendente_nome ?? 'atendente';
        await responder(numero, `Ok! ${atendenteNome} vai te atender em instantes. 😊\nQuando terminar, é só digitar *#menu* para voltar.`);
        if (atendenteNum) {
          const jid = normalizarJid(atendenteNum) ?? atendenteNum;
          await responderComPing([jid], `👤 *Cliente pediu para falar com atendente*\nNúmero: ${numero}\nNome: ${nome ?? '—'}`);
        }
        return;
      }
      case 'cancelar': {
        await salvarConversa(numero, 'menu', [], nome);
        await responder(numero, 'Operação cancelada. Até logo! 👋\nDigite *#menu* se precisar de algo.');
        return;
      }
    }
  }

  async function tratarVenda(numero: string, conversa: Conversa, texto: string, nome?: string): Promise<void> {
    const passo = conversa.passo;
    const carrinho: CarrinhoItem[] = conversa.carrinho_json ? JSON.parse(conversa.carrinho_json) : [];

    if (passo === PASSO_ITEM) {
      const idx = Number(texto);
      const item = deps.cardapio.find((i) => i.id === idx);
      if (!item) {
        await responder(numero, 'Item não encontrado. Digite um *número válido* do cardápio:');
        return;
      }
      if (carrinho.length >= MAX_ITENS) {
        await responder(numero, 'Limite de 20 itens por pedido atingido. Confirme ou finalize o pedido.');
        return;
      }
      carrinho.push({ id: item.id, nome: item.nome, preco: item.preco, qtd: 0 });
      await salvarConversa(numero, `${PASSO_QTD}${item.id}`, carrinho, nome);
      await responder(numero, `Quantas unidades de *${item.nome}*? (1 a 50)`);
      return;
    }

    if (passo.startsWith(PASSO_QTD)) {
      if (!validarQtd(texto)) {
        await responder(numero, 'Quantidade inválida. Digite um número de 1 a 50:');
        return;
      }
      const itemId = Number(passo.split(':')[1]);
      const item = carrinho.find((i) => i.id === itemId);
      if (!item) {
        await salvarConversa(numero, PASSO_ITEM, carrinho, nome);
        await responder(numero, 'Algo deu errado. Escolha o item novamente:');
        return;
      }
      item.qtd = Number(texto);
      await salvarConversa(numero, PASSO_CONFIRMAR, carrinho, nome);
      const linhas = carrinho.map((i) => `${i.nome} x${i.qtd} — R$ ${(i.preco * i.qtd).toFixed(2).replace('.', ',')}`);
      const total = calcularTotal(carrinho);
      await responder(
        numero,
        `🧾 *Seu pedido*\n\n${linhas.join('\n')}\n\n*Total: R$ ${total.toFixed(2).replace('.', ',')}*\n\n1️⃣ Confirmar\n2️⃣ Adicionar mais itens\n0️⃣ Cancelar`,
      );
      return;
    }

    if (passo === PASSO_CONFIRMAR) {
      if (texto === '2') {
        await salvarConversa(numero, PASSO_ITEM, carrinho, nome);
        const textoCardapio = montarCardapioTexto(deps.cardapio);
        await responder(numero, `🍔 *CARDÁPIO*\n\n${textoCardapio}\n\nDigite o *número* do item que deseja:`);
        return;
      }
      if (texto === '0') {
        await salvarConversa(numero, 'menu', [], nome);
        await responder(numero, 'Pedido cancelado. Até logo! 👋');
        return;
      }
      if (texto === '1') {
        await salvarConversa(numero, PASSO_PAGAMENTO, carrinho, nome);
        await responder(numero, `💳 *Forma de pagamento*\n\n1️⃣ PIX\n2️⃣ Dinheiro\n0️⃣ Cancelar`);
        return;
      }
      await responder(numero, 'Escolha: 1️⃣ Confirmar 2️⃣ Adicionar mais itens 0️⃣ Cancelar');
      return;
    }

    if (passo === PASSO_PAGAMENTO) {
      if (texto === '1') {
        await criarPedido(numero, carrinho, 'pix', nome);
        return;
      }
      if (texto === '2') {
        await criarPedido(numero, carrinho, 'dinheiro', nome);
        return;
      }
      if (texto === '0') {
        await salvarConversa(numero, 'menu', [], nome);
        await responder(numero, 'Pedido cancelado. Até logo! 👋');
        return;
      }
      await responder(numero, 'Escolha: 1️⃣ PIX 2️⃣ Dinheiro 0️⃣ Cancelar');
      return;
    }
  }

  async function criarPedido(numero: string, carrinho: CarrinhoItem[], pagamentoTipo: 'pix' | 'dinheiro', nome?: string): Promise<void> {
    const id = gerarIdPedido();
    const total = calcularTotal(carrinho);
    const itens = carrinho.map((i) => ({ id: i.id, nome: i.nome, preco: i.preco, qtd: i.qtd }));
    await deps.db
      .prepare(
        `INSERT INTO pedidos (id, cliente_nome, whatsapp, itens_json, valor_total, pagamento_tipo, status, atualizado_em)
         VALUES (?, ?, ?, ?, ?, ?, 'aguardando_pagamento', CURRENT_TIMESTAMP)`,
      )
      .bind(id, nome ?? null, numero, JSON.stringify(itens), total, pagamentoTipo)
      .run();
    await salvarConversa(numero, 'menu', [], nome);

    if (pagamentoTipo === 'pix') {
      await responder(numero, `✅ *Pedido registrado!*\n\nSeu pedido *#${id}* está aguardando o pagamento do *PIX*.\nAcompanhe: ${URL_Rastreio(id)}\n\n*PIX chegando em breve — por ora confirme com o atendente.* 💚`);
    } else {
      await responder(numero, `✅ *Pedido registrado!*\n\nSeu pedido *#${id}* será pago em *dinheiro* na entrega/retirada. 💵\nAcompanhe: ${URL_Rastreio(id)}`);
    }
  }

  async function tratarRastrear(numero: string, conversa: Conversa, texto: string, nome?: string): Promise<void> {
    const pedido = await deps.db
      .prepare('SELECT status, cliente_nome, valor_total FROM pedidos WHERE id = ?')
      .bind(texto.trim())
      .first();
    await salvarConversa(numero, 'menu', [], nome);
    if (!pedido) {
      await responder(numero, `Pedido *#${texto}* não encontrado. Confira o código e tente novamente. 🔎`);
      return;
    }
    const statusLabel: Record<string, string> = {
      aguardando_pagamento: 'Aguardando pagamento ⏳',
      pago: 'Pedido pago, em preparação 🔥',
      em_preparo: 'Em preparo 👨‍🍳',
      pronto: 'Pronto para retirada ✅',
      entregue: 'Entregue 🏠',
      cancelado: 'Cancelado ❌',
    };
    await responder(numero, `📦 *Pedido #${texto.trim()}*\n\nStatus: ${statusLabel[pedido.status as string] ?? pedido.status}`);
  }

  async function onReceived(numero: string, texto: string, nome?: string): Promise<void> {
    const conversa = await buscarConversa(numero);

    if (estaPausada(conversa)) return;

    if (texto && texto.trim().toLowerCase().startsWith('#menu')) {
      await salvarConversa(numero, 'menu', [], nome);
      await responder(numero, montarBemVindo());
      return;
    }

    if (texto && texto.trim().toLowerCase().startsWith('#falar humano')) {
      await salvarConversa(numero, PASSO_HUMANO, [], nome);
      const atendenteNum = deps.config.atendente_numero;
      const atendenteNome = deps.config.atendente_nome ?? 'atendente';
      await responder(numero, `Ok! ${atendenteNome} vai te atender em instantes. 😊\nQuando terminar, digite *#menu* para voltar.`);
      if (atendenteNum) {
        const jid = normalizarJid(atendenteNum) ?? atendenteNum;
        await responderComPing([jid], `👤 *Cliente pediu para falar com atendente*\nNúmero: ${numero}\nNome: ${nome ?? '—'}`);
      }
      return;
    }

    const tipo = tipoPasso(conversa?.passo ?? 'menu');
    if (tipo === 'silencioso') return;

    if (tipo === 'menu') {
      await tratarMenu(numero, conversa, texto, nome);
      return;
    }
    if (tipo === 'venda' && conversa) {
      await tratarVenda(numero, conversa, texto, nome);
      return;
    }
    if (tipo === 'rastreio' && conversa) {
      await tratarRastrear(numero, conversa, texto, nome);
      return;
    }
    await tratarMenu(numero, conversa, texto, nome);
  }

  async function onSent(numero: string, keyId: string): Promise<void> {
    if (!keyId) return;
    const botReg = await deps.db.prepare('SELECT 1 FROM bot_msg_ids WHERE key_id = ?').bind(keyId).first();
    if (botReg) {
      await deps.db.prepare('DELETE FROM bot_msg_ids WHERE key_id = ?').bind(keyId).run();
      return;
    }
    await pausarConversa(numero, 10);
  }

  return { onReceived, onSent };
}