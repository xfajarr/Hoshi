import { describe, expect, it, vi } from 'vitest'
import { createHoshiMcpServer, startHoshiMcpServer } from '../src/app.js'

function makeFakeContext() {
  return {
    config: {
      policyEnabled: false,
      transport: 'stdio',
      port: 3001,
      host: '0.0.0.0'
    },
    chain: {
      getLatestBlockhash: vi.fn(async () => ({ ok: true, value: 'blockhash' }))
    },
    storage: {
      getReceipts: vi.fn(async () => ({ ok: true, value: [] }))
    },
    policyStore: {},
    approvalStore: {},
    walletService: {
      getById: vi.fn(),
      getBalances: vi.fn(),
      getOnChainBalance: vi.fn(),
      create: vi.fn()
    },
    transferService: {
      sendSigned: vi.fn(),
      buildTransferTransaction: vi.fn()
    },
    invoiceService: {
      createInvoice: vi.fn(),
      createPaymentLink: vi.fn()
    },
    swapService: {
      getQuote: vi.fn()
    },
    yieldService: {
      getStrategies: vi.fn(),
      getPositions: vi.fn(),
      deposit: vi.fn(),
      withdraw: vi.fn()
    },
    policyEngine: {},
    executionService: {},
    signer: null,
    tools: []
  } as any
}

describe('Hoshi MCP startup', () => {
  it('builds a deterministic tool catalog and keeps skills loaded', async () => {
    const fakeSkills = new Map([
      ['skill-a', { id: 'skill-a', name: 'Skill A', category: 'test', risk: 'low', description: 'A', tools: [], version: '1.0.0', whenToUse: [], systemPrompt: '', examples: [], guardrails: [], raw: '' }]
    ])

    const app = await createHoshiMcpServer({
      env: { HOSHI_TRANSPORT: 'stdio', HOSHI_POLICY_ENABLED: 'false' },
      createContext: async () => makeFakeContext(),
      loadSkills: () => fakeSkills,
      skillsDir: '/tmp/ignored'
    })

    expect(app.skills.size).toBe(1)

    const names = app.listTools().map((tool) => tool.name)
    expect(names.slice(0, 3)).toEqual(['hoshi_balance', 'hoshi_balances', 'hoshi_wallet_info'])
    expect(new Set(names).size).toBe(names.length)

    const response = await app.handleRequest({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list'
    })

    expect(response.result).toBeDefined()
    expect((response.result as any).tools.map((tool: any) => tool.name)).toEqual(names)
    expect((response.result as any).tools[0].description).toContain('[read]')
  })

  it('wraps non-bypass tools with policy checks when enabled', async () => {
    const policyEngine = {
      evaluate: vi.fn(async () => ({
        ok: true,
        value: {
          action: 'write_safe',
          allowed: true,
          rulesTriggered: [],
        }
      }))
    }

    const approvalStore = {
      list: vi.fn(async () => ({ ok: true, value: [] }))
    }

    const app = await createHoshiMcpServer({
      env: { HOSHI_TRANSPORT: 'stdio', HOSHI_POLICY_ENABLED: 'true' },
      createContext: async () => ({
        ...makeFakeContext(),
        config: {
          policyEnabled: true,
          transport: 'stdio',
          port: 3001,
          host: '0.0.0.0'
        },
        policyEngine,
        approvalStore,
        invoiceService: {
          createInvoice: vi.fn(async () => ({ ok: true, value: { invoiceId: 'inv_1' } })),
          createPaymentLink: vi.fn()
        },
      }),
      loadSkills: () => new Map(),
      skillsDir: '/tmp/ignored'
    })

    const tool = app.getTool('hoshi_create_invoice')
    expect(tool).toBeDefined()
    if (!tool) return

    await tool.handler({
      walletId: 'w1',
      amount: '10',
      asset: 'SOL',
      description: 'invoice'
    })

    expect(policyEngine.evaluate).toHaveBeenCalledTimes(1)
    expect(approvalStore.list).toHaveBeenCalledWith('w1')
  })

  it('routes stdio startup through the shared app layer', async () => {
    const startStdioTransport = vi.fn(async () => undefined)
    const startHttpTransport = vi.fn(async () => undefined)

    await startHoshiMcpServer({
      env: { HOSHI_TRANSPORT: 'stdio', HOSHI_POLICY_ENABLED: 'false' },
      createContext: async () => makeFakeContext(),
      loadSkills: () => new Map(),
      transportHooks: {
        startStdioTransport,
        startHttpTransport
      }
    })

    expect(startStdioTransport).toHaveBeenCalledTimes(1)
    expect(startHttpTransport).not.toHaveBeenCalled()
  })

  it('routes http startup through the shared app layer', async () => {
    const startStdioTransport = vi.fn(async () => undefined)
    const startHttpTransport = vi.fn(async (_app, port, host) => {
      expect(port).toBe(3030)
      expect(host).toBe('127.0.0.1')
    })

    await startHoshiMcpServer({
      env: {
        HOSHI_TRANSPORT: 'http',
        HOSHI_POLICY_ENABLED: 'false',
        HOSHI_PORT: '3030',
        HOSHI_HOST: '127.0.0.1'
      },
      createContext: async () => makeFakeContext(),
      loadSkills: () => new Map(),
      transportHooks: {
        startStdioTransport,
        startHttpTransport
      }
    })

    expect(startHttpTransport).toHaveBeenCalledTimes(1)
    expect(startStdioTransport).not.toHaveBeenCalled()
  })
})
