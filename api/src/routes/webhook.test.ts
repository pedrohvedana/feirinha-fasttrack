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
  consultarPagamento: vi.fn(async () => null),
}))

import { enviarMensagem } from '../services/whatsapp'
import { consultarPagamento } from '../services/pix'

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

async function postRoute(env: any, path: string, body: any) {
  const app = criarApp()
  return app.request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }, env)
}

describe('webhook routes', () => {
  beforeEach(() => { vi.clearAllMocks() })

  describe('POST /pagamento-confirmado', () => {
    it('400 quando pedido_id ausente', async () => {
      const { env } = makeEnv()
      const res = await postRoute(env, '/webhook/pagamento-confirmado', {})
      expect(res.status).toBe(400)
    })

    it('404 quando pedido nao existe', async () => {
      const { env } = makeEnv({ pedidos: [] })
      const res = await postRoute(env, '/webhook/pagamento-confirmado', { pedido_id: '999' })
      expect(res.status).toBe(404)
    })

    it('200 confere pagamento e envia mensagem', async () => {
      const { env } = makeEnv({
        pedidos: [{ id: 'P1', cliente_nome: 'Ana', whatsapp: '5511999887766', status: 'pendente' }],
      })
      const res = await postRoute(env, '/webhook/pagamento-confirmado', { pedido_id: 'P1' })
      expect(res.status).toBe(200)
      const data: any = await res.json()
      expect(data.whatsapp_enviado).toBe(true)
      expect(enviarMensagem).toHaveBeenCalledOnce()
    })
  })

  describe('POST /pix', () => {
    it('400 quando data.id ausente', async () => {
      const { env } = makeEnv()
      const res = await postRoute(env, '/webhook/pix', {})
      expect(res.status).toBe(400)
    })

    it('502 quando consultarPagamento retorna null', async () => {
      vi.mocked(consultarPagamento).mockResolvedValueOnce(null as any)
      const { env } = makeEnv()
      const res = await postRoute(env, '/webhook/pix', { action: 'payment', data: { id: 123 } })
      expect(res.status).toBe(502)
    })

    it('404 quando pedido nao encontrado para payment_id', async () => {
      vi.mocked(consultarPagamento).mockResolvedValueOnce({ status: 'approved' } as any)
      const { env } = makeEnv({ pedidos: [] })
      const res = await postRoute(env, '/webhook/pix', { action: 'payment', data: { id: 999 } })
      expect(res.status).toBe(404)
    })

    it('200 pagamento aprovado atualiza pedido e envia msg', async () => {
      vi.mocked(consultarPagamento).mockResolvedValueOnce({ status: 'approved' } as any)
      const { env } = makeEnv({
        pedidos: [{ id: 'P2', cliente_nome: 'Joao', whatsapp: '5511999887766', pix_payment_id: '123', status: 'pendente' }],
      })
      const res = await postRoute(env, '/webhook/pix', { action: 'payment', data: { id: 123 } })
      expect(res.status).toBe(200)
      const data: any = await res.json()
      expect(data.status).toBe('approved')
    })
  })

  describe('POST /status/:id', () => {
    it('404 quando pedido nao existe', async () => {
      const { env } = makeEnv()
      const res = await postRoute(env, '/webhook/status/999', { status: 'pago' })
      expect(res.status).toBe(404)
    })

    it('200 atualiza status e envia mensagem known', async () => {
      const { env } = makeEnv({
        pedidos: [{ id: 'P3', cliente_nome: 'Bia', whatsapp: '5511999887766', status: 'pendente' }],
      })
      const res = await postRoute(env, '/webhook/status/P3', { status: 'em_preparo' })
      expect(res.status).toBe(200)
      const data: any = await res.json()
      expect(data.whatsapp_enviado).toBe(true)
    })

    it('200 status sem mensagem (status inexistente no map)', async () => {
      const { env } = makeEnv({
        pedidos: [{ id: 'P4', cliente_nome: 'Ze', whatsapp: '5511999887766', status: 'pendente' }],
      })
      const res = await postRoute(env, '/webhook/status/P4', { status: 'desconhecido' })
      expect(res.status).toBe(200)
      const data: any = await res.json()
      expect(data.message).toMatch(/atualizado/)
    })

    it('200 pagamento confirmado com cliente_nome ausente', async () => {
      const { env } = makeEnv({
        pedidos: [{ id: 'P1', whatsapp: '5511999887766', status: 'pendente' }],
      })
      const res = await postRoute(env, '/webhook/pagamento-confirmado', { pedido_id: 'P1' })
      expect(res.status).toBe(200)
    })

    it('200 pix payment confirmed with cliente_nome ausente', async () => {
      vi.mocked(consultarPagamento).mockResolvedValueOnce({ status: 'approved' } as any)
      const { env } = makeEnv({
        pedidos: [{ id: 'P2', whatsapp: '5511999887766', pix_payment_id: '123', status: 'pendente' }],
      })
      const res = await postRoute(env, '/webhook/pix', { action: 'payment', data: { id: 123 } })
      expect(res.status).toBe(200)
    })

    it('200 status atualizado sem mensagem quando status nao no map', async () => {
      const { env } = makeEnv({
        pedidos: [{ id: 'P4', whatsapp: '5511999887766', status: 'pendente' }],
      })
      const res = await postRoute(env, '/webhook/status/P4', { status: 'status_qualquer_coisa' })
      expect(res.status).toBe(200)
      const data: any = await res.json()
      expect(data.message).toBe('Status atualizado (sem mensagem)')
    })

    it('200 status com cliente_nome atualiza e envia mensagem', async () => {
      const { env } = makeEnv({
        pedidos: [{ id: 'P5', cliente_nome: 'Teste', whatsapp: '5511999887766', status: 'pendente' }],
      })
      const res = await postRoute(env, '/webhook/status/P5', { status: 'pago' })
      expect(res.status).toBe(200)
      const data: any = await res.json()
      expect(data.message).toContain('Status atualizado e notificação enviada')
    })

    it('200 status sem secret da webhook continua processando', async () => {
      const { env } = makeEnv({
        // Sem WA_AKG_WEBHOOK_SECRET na config
        WA_AKG_WEBHOOK_SECRET: undefined,
        pedidos: [{ id: 'P5', cliente_nome: 'Teste', whatsapp: '5511999887766', status: 'pendente' }],
      })
      const res = await postRoute(env, '/webhook/status/P5', { status: 'pago' })
      // Rota /status/:id não valida assinatura, apenas atualiza status
      expect(res.status).toBe(200)
      const data: any = await res.json()
      expect(data.message).toContain('Status atualizado')
    })
  })
})
