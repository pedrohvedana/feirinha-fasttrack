import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest'
import { criarCobrancaPix, consultarPagamento } from './pix'

function makeEnv(over?: Record<string, string>) {
  return {
    PIX_ACCESS_TOKEN: 'TOKEN-1',
    PIX_WEBHOOK_SECRET: 'sec',
    PIX_PAGADOR_EMAIL: 'comprador@feirinha.local',
    PIX_EXPIRACAO_MINUTOS: '30',
    ...over,
  }
}

function mockFetchOnce(status: number, body: any = {}) {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })))
}

const pedido = { id: 'P1', valor_total: 25.5, whatsapp: '5511999887766' }

beforeEach(() => { vi.unstubAllGlobals() })
afterAll(() => { vi.unstubAllGlobals() })

describe('criarCobrancaPix', () => {
  it('retorna null sem token', async () => {
    const res = await criarCobrancaPix(makeEnv({ PIX_ACCESS_TOKEN: '' }), pedido)
    expect(res).toBeNull()
  })

  it('envia payload correto ao Mercado Pago e retorna cobranca', async () => {
    mockFetchOnce(200, {
      id: 123456,
      status: 'pending',
      point_of_interaction: {
        transaction_data: { qr_code: '000201...', qr_code_base64: 'QUJD' },
      },
    })
    const res = await criarCobrancaPix(makeEnv(), pedido)
    expect(res).not.toBeNull()
    expect(res?.payment_id).toBe(123456)
    expect(res?.qr_code).toBe('000201...')
    expect(res?.qr_base64).toBe('QUJD')
    expect(res?.status).toBe('pending')
    expect(res?.expira_em).toContain('-03:00')

    const [url, init] = vi.mocked(fetch).mock.calls[0] as any
    expect(url).toBe('https://api.mercadopago.com/v1/payments')
    const body = JSON.parse(init.body)
    expect(body.payment_method_id).toBe('pix')
    expect(body.external_reference).toBe('P1')
    expect(init.headers.Authorization).toBe('Bearer TOKEN-1')
    expect(init.headers['X-Idempotency-Key']).toBe('P1')
  })

  it('retorna null quando MP responde erro', async () => {
    mockFetchOnce(400, { message: 'bad' })
    const res = await criarCobrancaPix(makeEnv(), pedido)
    expect(res).toBeNull()
  })

  it('retorna null quando resposta sem qr_code', async () => {
    mockFetchOnce(200, { id: 1, status: 'pending' })
    const res = await criarCobrancaPix(makeEnv(), pedido)
    expect(res).toBeNull()
  })
})

describe('consultarPagamento', () => {
  it('retorna null sem token', async () => {
    const res = await consultarPagamento(makeEnv({ PIX_ACCESS_TOKEN: '' }), 1)
    expect(res).toBeNull()
  })

  it('retorna null sem paymentId', async () => {
    const res = await consultarPagamento(makeEnv(), 0)
    expect(res).toBeNull()
  })

  it('busca status no endereco certo', async () => {
    mockFetchOnce(200, { id: 999, status: 'approved' })
    const res = await consultarPagamento(makeEnv(), 999)
    expect(res).toEqual({ payment_id: 999, status: 'approved' })
    const url = (vi.mocked(fetch).mock.calls[0] as any)[0]
    expect(url).toContain('/v1/payments/999')
  })

  it('retorna null quando MP responde erro', async () => {
    mockFetchOnce(404)
    const res = await consultarPagamento(makeEnv(), 999)
    expect(res).toBeNull()
  })
})