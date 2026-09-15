import { describe, it, expect, beforeEach, vi } from 'vitest'
import { criarApp } from '../app'
import { criarlaFakeD1 } from '../test/fake-d1'

vi.mock('../services/whatsapp', () => ({
  enviarMensagem: vi.fn(async () => true),
  mensagemPagamentoConfirmado: vi.fn((nome: string, id: string) => `pagou ${nome} ${id}`),
  mensagemEmPreparo: vi.fn((nome: string, id: string) => `preparo ${nome} ${id}`),
  mensagemPronto: vi.fn((nome: string, id: string) => `pronto ${nome} ${id}`),
  mensagemCancelado: vi.fn((nome: string, id: string) => `cancelado ${nome} ${id}`),
}))

vi.mock('../services/pix', () => ({
  criarCobrancaPix: vi.fn(async () => null),
  consultarPagamento: vi.fn(async () => null),
}))

function makeEnv(initial?: Parameters<typeof criarlaFakeD1>[0]) {
  const f = criarlaFakeD1(initial)
  const env: any = {
    DB: f.db,
    EVOLUTION_API_URL: 'http://evo.local',
    EVOLUTION_API_KEY: 'evo-key',
    EVOLUTION_INSTANCE: 'feirinha',
    WHATSAPP_PROVIDER: 'evolution',
    WA_AKG_BASE_URL: 'https://wa-akg.local',
    WA_AKG_API_KEY: 'k',
    WA_AKG_SESSION: 'feirinha',
    PIX_ACCESS_TOKEN: 'pix-tok',
  }
  return { env, f }
}

async function req(env: any, path: string, method: string, body?: any) {
  const app = criarApp()
  const init: any = { method, headers: { 'Content-Type': 'application/json' } }
  if (body !== undefined) init.body = JSON.stringify(body)
  return app.request(path, init, env)
}

describe('POST /pedidos (origem)', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('400 quando whatsapp e cliente_nome ausentes (balcao exige nome)', async () => {
    const { env } = makeEnv()
    const res = await req(env, '/pedidos', 'POST', {
      itens_json: '[]', valor_total: 20, pagamento_tipo: 'dinheiro', origem: 'balcao',
    })
    expect(res.status).toBe(400)
  })

  it('201 cria pedido balcao com apenas nome (sem whatsapp)', async () => {
    const { env, f } = makeEnv()
    const res = await req(env, '/pedidos', 'POST', {
      cliente_nome: 'Maria', itens_json: JSON.stringify([{ id: 1, nome: 'X', preco: 10, quantidade: 2 }]),
      valor_total: 20, pagamento_tipo: 'dinheiro', origem: 'balcao',
    })
    expect(res.status).toBe(201)
    const data: any = await res.json()
    expect(data.id).toBeTruthy()
    expect(f.tables.pedidos[0].origem).toBe('balcao')
    expect(f.tables.pedidos[0].status).toBe('aguardando_pagamento')
  })

  it('201 cria pedido prepedido PIX (sem whatsapp obrigatorio, aguarda pagamento)', async () => {
    const { env, f } = makeEnv()
    const res = await req(env, '/pedidos', 'POST', {
      cliente_nome: 'Joao', whatsapp: '5511999887766',
      itens_json: JSON.stringify([{ id: 1, nome: 'X', preco: 10, quantidade: 1 }]),
      valor_total: 10, pagamento_tipo: 'pix', origem: 'prepedido',
    })
    expect(res.status).toBe(201)
    expect(f.tables.pedidos[0].origem).toBe('prepedido')
    expect(f.tables.pedidos[0].status).toBe('aguardando_pagamento')
  })

  it('201 sem origem explicita default whatsapp', async () => {
    const { env, f } = makeEnv()
    const res = await req(env, '/pedidos', 'POST', {
      whatsapp: '5511999887766', itens_json: '[]', valor_total: 5, pagamento_tipo: 'dinheiro',
    })
    expect(res.status).toBe(201)
    expect(f.tables.pedidos[0].origem).toBe('whatsapp')
  })
})

describe('PATCH /pedidos/:id/cheguei', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('404 quando pedido nao existe', async () => {
    const { env } = makeEnv({ pedidos: [] })
    const res = await req(env, '/pedidos/999/cheguei', 'PATCH')
    expect(res.status).toBe(404)
  })

  it('409 quando status != pago', async () => {
    const { env } = makeEnv({
      pedidos: [{ id: 'P1', cliente_nome: 'Ana', whatsapp: '5511', status: 'em_preparo' }],
    })
    const res = await req(env, '/pedidos/P1/cheguei', 'PATCH')
    expect(res.status).toBe(409)
  })

  it('200 muda pago -> aguardando_retirada', async () => {
    const { env, f } = makeEnv({
      pedidos: [{ id: 'P1', cliente_nome: 'Ana', whatsapp: '5511', status: 'pago' }],
    })
    const res = await req(env, '/pedidos/P1/cheguei', 'PATCH')
    expect(res.status).toBe(200)
    const pedido = f.tables.pedidos.find((p: any) => p.id === 'P1')
    expect(pedido.status).toBe('aguardando_retirada')
  })

  it('200 idempotente: se ja aguardando_retirada retorna 200', async () => {
    const { env } = makeEnv({
      pedidos: [{ id: 'P1', cliente_nome: 'Ana', whatsapp: '5511', status: 'aguardando_retirada' }],
    })
    const res = await req(env, '/pedidos/P1/cheguei', 'PATCH')
    expect(res.status).toBe(200)
  })
})

describe('GET /pedidos/fila/ativas inclui aguardando_retirada', () => {
  it('retorna pedidos aguardando_retirada e sem whatsapp', async () => {
    const { env } = makeEnv({
      pedidos: [
        { id: 'P1', cliente_nome: 'Ana', whatsapp: '5511', status: 'aguardando_retirada', itens_json: '[]', valor_total: 10, pagamento_tipo: 'pix', criado_em: '2026-01-01', atualizado_em: '2026-01-01' },
        { id: 'P2', cliente_nome: 'Bia', whatsapp: '5512', status: 'pago', itens_json: '[]', valor_total: 15, pagamento_tipo: 'pix', criado_em: '2026-01-01', atualizado_em: '2026-01-01' },
        { id: 'P3', cliente_nome: 'Ze', whatsapp: '5513', status: 'cancelado', itens_json: '[]', valor_total: 15, pagamento_tipo: 'dinheiro', criado_em: '2026-01-01', atualizado_em: '2026-01-01' },
      ],
    })
    const res = await req(env, '/pedidos/fila/ativas', 'GET')
    const data: any = await res.json()
    const ids = (data.results || []).map((p: any) => p.id)
    expect(ids).toContain('P1')
    expect(ids).toContain('P2')
    expect(ids).not.toContain('P3')
  })
})