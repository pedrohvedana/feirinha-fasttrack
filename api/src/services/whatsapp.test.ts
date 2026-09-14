import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest'
import {
  enviarMensagem,
  mensagemPagamentoConfirmado,
  mensagemEmPreparo,
  mensagemPronto,
  mensagemCancelado,
} from './whatsapp'
import type { Env } from './whatsapp'

function makeEnv(over?: Partial<Env>): Env {
  return {
    EVOLUTION_API_URL: 'http://evo.local',
    EVOLUTION_API_KEY: 'evo-key',
    EVOLUTION_INSTANCE: 'feirinha',
    WHATSAPP_PROVIDER: 'evolution',
    WA_AKG_BASE_URL: 'https://wa-akg.local',
    WA_AKG_API_KEY: 'wa-key',
    WA_AKG_SESSION: 'feirinha',
    ...over,
  }
}

function mockFetchOnce(status: number, body: any = {}) {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })))
}

beforeEach(() => { vi.unstubAllGlobals() })
afterAll(() => { vi.unstubAllGlobals() })

describe('mensagens de texto', () => {
  it('mensagemPagamentoConfirmado inclui link de rastreio', () => {
    const msg = mensagemPagamentoConfirmado('Ana', 'P1')
    expect(msg).toContain('Ana')
    expect(msg).toContain('#P1')
    expect(msg).toContain('pago')
    expect(msg).toContain('rastrear/P1')
  })

  it('mensagemEmPreparo inclui status', () => {
    const msg = mensagemEmPreparo('Bia', 'P2')
    expect(msg).toContain('Bia')
    expect(msg).toContain('#P2')
    expect(msg).toContain('preparado')
  })

  it('mensagemPronto inclui status', () => {
    const msg = mensagemPronto('Ze', 'P3')
    expect(msg).toContain('Ze')
    expect(msg).toContain('#P3')
    expect(msg).toContain('PRONTO')
  })

  it('mensagemCancelado inclui cancelamento', () => {
    const msg = mensagemCancelado('Lu', 'P4')
    expect(msg).toContain('Lu')
    expect(msg).toContain('#P4')
    expect(msg).toContain('cancelado')
  })
})

describe('enviarMensagem via Evolution', () => {
  it('envia payload correto e retorna true', async () => {
    mockFetchOnce(200)
    const ok = await enviarMensagem(makeEnv(), '5511999887766', 'Ola')
    expect(ok).toBe(true)
    const [url, init] = vi.mocked(fetch).mock.calls[0] as any
    expect(url).toContain('http://evo.local/message/sendText/feirinha')
    const body = JSON.parse(init.body)
    expect(body.number).toBe('5511999887766')
    expect(body.text).toBe('Ola')
    expect(init.headers.apikey).toBe('evo-key')
  })

  it('retorna false quando response nao ok', async () => {
    mockFetchOnce(500)
    const ok = await enviarMensagem(makeEnv(), '5511999887766', 'Ola')
    expect(ok).toBe(false)
  })

  it('retorna false em caso de erro de rede', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network') }))
    const ok = await enviarMensagem(makeEnv(), '5511999887766', 'Ola')
    expect(ok).toBe(false)
  })
})

describe('enviarMensagem via WA-AKG com fallback', () => {
  const waEnv = () => makeEnv({ WHATSAPP_PROVIDER: 'wa-akg' })

  it('usa WA-AKG e retorna true', async () => {
    mockFetchOnce(200)
    const ok = await enviarMensagem(waEnv(), '5511999887766', 'Ola')
    expect(ok).toBe(true)
    const mocks = vi.mocked(fetch).mock.calls as any[]
    expect(mocks[0][0]).toContain('wa-akg.local/api/messages/feirinha/')
  })

  it('fallback para Evolution quando WA-AKG falha', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 500 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const ok = await enviarMensagem(waEnv(), '5511999887766', 'Ola')
    expect(ok).toBe(true)
    const mocks = fetchMock.mock.calls as any[]
    expect(mocks[0][0]).toContain('wa-akg.local')
    expect(mocks[1][0]).toContain('evo.local')
  })

  it('sem chave WA_AKG_API_KEY usa Evolution direto', async () => {
    mockFetchOnce(200)
    const ok = await enviarMensagem(makeEnv({ WHATSAPP_PROVIDER: 'wa-akg', WA_AKG_API_KEY: '' }), '5511999887766', 'Ola')
    expect(ok).toBe(true)
    const url = (vi.mocked(fetch).mock.calls[0] as any)[0]
    expect(url).toContain('evo.local')
  })
})

describe('fallback Evolution -> WA-AKG', () => {
  it('cai para WA-AKG quando Evolution falha', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 500 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const ok = await enviarMensagem(makeEnv(), '5511999887766', 'Ola')
    expect(ok).toBe(true)
    const mocks = fetchMock.mock.calls as any[]
    expect(mocks[0][0]).toContain('evo.local')
    expect(mocks[1][0]).toContain('wa-akg.local')
  })
})