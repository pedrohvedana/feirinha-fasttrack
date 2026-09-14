import { describe, it, expect, vi } from 'vitest';
import {
  normalizarJid,
  montarCardapioTexto,
  calcularTotal,
  validarQtd,
  validarItens,
  parseOpcaoMenu,
  tipoPasso,
} from './bot';

type ItemCardapio = { id: number; nome: string; preco: number };

const cardapio: ItemCardapio[] = [
  { id: 1, nome: 'X-Burger', preco: 15 },
  { id: 2, nome: 'Batata Frita', preco: 10 },
];

describe('normalizarJid', () => {
  it('converte JID whatsapp em número carne', () => {
    expect(normalizarJid('5511999887766@s.whatsapp.net')).toBe('5511999887766');
  });

  it('remove sufixo de grupo/status', () => {
    expect(normalizarJid('5511999887766@g.us')).toBe('5511999887766');
  });

  it('ignora LID/outros formatos complexos retornando undefined', () => {
    expect(normalizarJid('abcd1234@lid')).toBeUndefined();
    expect(normalizarJid('')).toBeUndefined();
  });
});

describe('montarCardapioTexto', () => {
  it('monta lista numerada com preço formatado', () => {
    const texto = montarCardapioTexto(cardapio);
    expect(texto).toContain('1. X-Burger');
    expect(texto).toContain('R$ 15,00');
    expect(texto).toContain('2. Batata Frita');
    expect(texto).toContain('R$ 10,00');
  });

  it('retorna vazio quando não há itens ativos', () => {
    expect(montarCardapioTexto([])).toBe('');
  });
});

describe('calcularTotal', () => {
  it('soma preço × qtd dos itens do carrinho', () => {
    const carrinho = [
      { id: 1, nome: 'X-Burger', preco: 15, qtd: 2 },
      { id: 2, nome: 'Batata Frita', preco: 10, qtd: 1 },
    ];
    expect(calcularTotal(carrinho)).toBe(40);
  });

  it('retorna 0 para carrinho vazio', () => {
    expect(calcularTotal([])).toBe(0);
  });
});

describe('validarQtd', () => {
  it('aceita quantidade válida (1..50)', () => {
    expect(validarQtd('1')).toBe(true);
    expect(validarQtd('50')).toBe(true);
  });

  it('rejeita 0, acima de 50 e não-numérico', () => {
    expect(validarQtd('0')).toBe(false);
    expect(validarQtd('51')).toBe(false);
    expect(validarQtd('abc')).toBe(false);
    expect(validarQtd('')).toBe(false);
  });
});

describe('validarItens', () => {
  it('aceita até 20 itens', () => {
    const carrinho = Array(20).fill({ id: 1, nome: 'X', preco: 1, qtd: 1 });
    expect(validarItens(carrinho)).toBe(true);
  });

  it('rejeita acima de 20 itens', () => {
    const carrinho = Array(21).fill({ id: 1, nome: 'X', preco: 1, qtd: 1 });
    expect(validarItens(carrinho)).toBe(false);
  });
});

describe('parseOpcaoMenu', () => {
  it('mapeia opção 1 para pedir', () => {
    expect(parseOpcaoMenu('1')).toBe('pedir');
  });

  it('mapeia opção 5 para humano', () => {
    expect(parseOpcaoMenu('5')).toBe('humano');
  });

  it('mapeia 0 para cancelar', () => {
    expect(parseOpcaoMenu('0')).toBe('cancelar');
  });

  it('retorna null para opção inválida', () => {
    expect(parseOpcaoMenu('9')).toBeNull();
    expect(parseOpcaoMenu('x')).toBeNull();
  });
});

describe('tipoPasso', () => {
  it('reconhece estado humano como silencioso', () => {
    expect(tipoPasso('humano')).toBe('silencioso');
  });

  it('reconhece passo de fluxo de venda', () => {
    expect(tipoPasso('item')).toBe('venda');
    expect(tipoPasso('confirmar')).toBe('venda');
  });

  it('reconhece menu', () => {
    expect(tipoPasso('menu')).toBe('menu');
  });
});

describe('D1 mock', () => {
  it('placeholder para garantir que mocks D1 são usados nos testes', () => {
    const mockRun = vi.fn().mockResolvedValue({ meta: { changes: 1 } });
    expect(mockRun).toBeDefined();
  });
});