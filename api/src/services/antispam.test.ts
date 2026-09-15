import { describe, it, expect } from 'vitest';
import {
  SPAM_LIMIT,
  SPAM_WINDOW_MS,
  dentroDaJanela,
  calcularSpam,
} from './antispam';

const AGORA = new Date('2026-01-01T00:10:00.000Z');

describe('dentroDaJanela', () => {
  it('retorna false sem janela_inicio', () => {
    expect(dentroDaJanela(null, AGORA)).toBe(false);
  });

  it('retorna true quando agora está dentro da janela', () => {
    const inicio = new Date(AGORA.getTime() - SPAM_WINDOW_MS / 2).toISOString();
    expect(dentroDaJanela(inicio, AGORA)).toBe(true);
  });

  it('retorna false quando janela expirou', () => {
    const inicio = new Date(AGORA.getTime() - SPAM_WINDOW_MS - 1).toISOString();
    expect(dentroDaJanela(inicio, AGORA)).toBe(false);
  });

  it('retorna false para data inválida', () => {
    expect(dentroDaJanela('data-invalida', AGORA)).toBe(false);
  });
});

describe('calcularSpam', () => {
  it('primeira mensagem: liberada com contagem 1', () => {
    const r = calcularSpam(null, AGORA);
    expect(r.bloqueado).toBe(false);
    expect(r.contagem).toBe(1);
    expect(r.janelaInicio).toBe(AGORA.toISOString());
  });

  it('incrementa contagem dentro da janela sem bloquear abaixo do limite', () => {
    const inicio = new Date(AGORA.getTime() - 1000).toISOString();
    const r = calcularSpam(
      { contagem: SPAM_LIMIT - 1, janela_inicio: inicio },
      AGORA,
    );
    expect(r.bloqueado).toBe(false);
    expect(r.contagem).toBe(SPAM_LIMIT);
  });

  it('bloqueia na mensagem seguinte ao limite dentro da janela', () => {
    const inicio = new Date(AGORA.getTime() - 1000).toISOString();
    const r = calcularSpam(
      { contagem: SPAM_LIMIT, janela_inicio: inicio },
      AGORA,
    );
    expect(r.bloqueado).toBe(true);
    expect(r.contagem).toBe(SPAM_LIMIT + 1);
  });

  it('reseta contagem quando janela expirou', () => {
    const inicio = new Date(AGORA.getTime() - SPAM_WINDOW_MS - 1).toISOString();
    const r = calcularSpam(
      { contagem: SPAM_LIMIT, janela_inicio: inicio },
      AGORA,
    );
    expect(r.bloqueado).toBe(false);
    expect(r.contagem).toBe(1);
    expect(r.janelaInicio).toBe(AGORA.toISOString());
  });
});