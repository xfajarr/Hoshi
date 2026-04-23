#!/usr/bin/env node
import type { JSONRPCRequest, JSONRPCResponse } from './core/protocol.js'
import { JSONRPCRequestSchema } from './core/protocol.js'
import { getTool, listTools } from './core/tools.js'
import { registerFinancialTools } from './handlers/financial.js'
import {
  SolanaChainAdapter,
  InMemoryStorageAdapter,
  JupiterSwapAdapter,
  KaminoYieldAdapter,
  WalletService,
  TransferService,
  InvoiceService,
  SwapService,
  YieldService
} from '@hoshi/sdk'

// Initialize services
const storage = new InMemoryStorageAdapter()
const chain = new SolanaChainAdapter('https://api.devnet.solana.com')
const jupiter = new JupiterSwapAdapter()
const kamino = new KaminoYieldAdapter()

const walletService = new WalletService(storage, chain)
const transferService = new TransferService(storage, chain)
const invoiceService = new InvoiceService(storage)
const swapService = new SwapService(storage, jupiter)
const yieldService = new YieldService(storage, kamino)

// Register tools
registerFinancialTools({
  walletService,
  transferService,
  invoiceService,
  swapService,
  yieldService
})

async function handleRequest(req: JSONRPCRequest): Promise<JSONRPCResponse> {
  const base = { jsonrpc: '2.0' as const, id: req.id }

  try {
    switch (req.method) {
      case 'initialize': {
        return {
          ...base,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            serverInfo: { name: 'hoshi-mcp', version: '0.1.0' }
          }
        }
      }

      case 'tools/list': {
        return {
          ...base,
          result: { tools: listTools() }
        }
      }

      case 'tools/call': {
        const params = req.params as { name: string; arguments?: Record<string, unknown> }
        const tool = getTool(params.name)

        if (!tool) {
          return {
            ...base,
            error: { code: -32601, message: `Tool ${params.name} not found` }
          }
        }

        try {
          const result = await tool.handler(params.arguments || {})
          return {
            ...base,
            result: {
              content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
            }
          }
        } catch (err) {
          return {
            ...base,
            error: {
              code: -32000,
              message: err instanceof Error ? err.message : String(err)
            }
          }
        }
      }

      default:
        return {
          ...base,
          error: { code: -32601, message: `Method ${req.method} not found` }
        }
    }
  } catch (err) {
    return {
      ...base,
      error: {
        code: -32603,
        message: err instanceof Error ? err.message : String(err)
      }
    }
  }
}

function startServer() {
  const stdin = process.stdin
  const stdout = process.stdout
  let buffer = ''

  stdin.setEncoding('utf8')
  stdin.on('data', async (chunk: string) => {
    buffer += chunk

    while (true) {
      const newlineIndex = buffer.indexOf('\n')
      if (newlineIndex === -1) break

      const line = buffer.slice(0, newlineIndex).trim()
      buffer = buffer.slice(newlineIndex + 1)

      if (!line) continue

      try {
        const parsed = JSON.parse(line)
        const req = JSONRPCRequestSchema.parse(parsed)
        const res = await handleRequest(req)
        stdout.write(JSON.stringify(res) + '\n')
      } catch {
        stdout.write(JSON.stringify({
          jsonrpc: '2.0',
          id: null,
          error: { code: -32700, message: 'Parse error' }
        }) + '\n')
      }
    }
  })
}

startServer()
