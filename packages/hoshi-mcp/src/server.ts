#!/usr/bin/env node
import type { JSONRPCRequest, JSONRPCResponse } from './core/protocol.js'
import { JSONRPCRequestSchema } from './core/protocol.js'
import { getTool, listTools, registerTool, toolRegistry } from './core/tools.js'
import { registerFinancialTools } from './handlers/financial.js'
import { withPolicy, registerPolicyTools } from './core/policy-tools.js'
import { createServerContext, type ServerContext } from './core/server.js'
import { loadConfig } from './config/index.js'
import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { cors } from 'hono/cors'

let context: ServerContext

async function initialize(): Promise<void> {
  const config = loadConfig()
  context = await createServerContext(config)
  
  // Register tools
  registerFinancialTools(context)
  registerPolicyTools(context, registerTool)
  
  // Wrap with policy if enabled
  if (config.policyEnabled) {
    for (let i = 0; i < toolRegistry.length; i++) {
      toolRegistry[i] = withPolicy(toolRegistry[i], context)
    }
  }
  
  console.error(`[hoshi-mcp] Initialized with ${listTools().length} tools`)
  console.error(`[hoshi-mcp] RPC: ${config.rpcEndpoint}`)
  console.error(`[hoshi-mcp] Policy: ${config.policyEnabled ? 'enabled' : 'disabled'}`)
  console.error(`[hoshi-mcp] Signer: ${context.signer ? context.signer.publicKey : 'not configured'}`)
}

async function handleRequest(req: JSONRPCRequest): Promise<JSONRPCResponse> {
  const base = { jsonrpc: '2.0' as const, id: req.id }

  try {
    switch (req.method) {
      case 'initialize': {
        return {
          ...base,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: { listChanged: true },
              logging: {}
            },
            serverInfo: { 
              name: 'hoshi-mcp', 
              version: '0.1.0',
              description: 'Hoshi Financial MCP Server for Solana'
            }
          }
        }
      }

      case 'tools/list': {
        return {
          ...base,
          result: { 
            tools: listTools().map(t => ({
              ...t,
              // Include category in description for agent awareness
              description: `[${(t as any).category || 'read'}] ${t.description}`
            }))
          }
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

      case 'resources/list': {
        return {
          ...base,
          result: { resources: [] }
        }
      }

      case 'prompts/list': {
        return {
          ...base,
          result: { prompts: [] }
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

// ─── STDIO TRANSPORT ───
function startStdioTransport() {
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
  
  console.error('[hoshi-mcp] STDIO transport ready')
}

// ─── HTTP/SSE TRANSPORT ───
function startHttpTransport(port: number, host: string) {
  const app = new Hono()
  
  app.use('*', cors())
  
  app.get('/health', (c) => c.json({ 
    status: 'ok', 
    version: '0.1.0',
    tools: listTools().length,
    signer: context.signer ? context.signer.publicKey : null,
    policy: context.config.policyEnabled
  }))
  
  app.get('/tools', (c) => c.json({ 
    tools: listTools().map(t => ({
      name: t.name,
      description: t.description,
      category: (t as any).category || 'read'
    }))
  }))
  
  app.post('/rpc', async (c) => {
    try {
      const body = await c.req.json()
      const req = JSONRPCRequestSchema.parse(body)
      const res = await handleRequest(req)
      return c.json(res)
    } catch (err) {
      return c.json({
        jsonrpc: '2.0',
        id: null,
        error: { 
          code: -32700, 
          message: err instanceof Error ? err.message : 'Parse error' 
        }
      }, 400)
    }
  })
  
  app.post('/tools/:name', async (c) => {
    const name = c.req.param('name')
    const tool = getTool(name)
    
    if (!tool) {
      return c.json({ error: `Tool ${name} not found` }, 404)
    }
    
    try {
      const args = await c.req.json()
      const result = await tool.handler(args)
      return c.json({ result })
    } catch (err) {
      return c.json({ 
        error: err instanceof Error ? err.message : String(err) 
      }, 400)
    }
  })

  serve({
    fetch: app.fetch,
    port,
    hostname: host
  }, () => {
    console.error(`[hoshi-mcp] HTTP transport ready on http://${host}:${port}`)
    console.error(`[hoshi-mcp] Health: http://${host}:${port}/health`)
    console.error(`[hoshi-mcp] Tools: http://${host}:${port}/tools`)
  })
}

// ─── MAIN ───
async function main() {
  await initialize()
  
  const config = context.config
  
  if (config.transport === 'stdio') {
    startStdioTransport()
  } else if (config.transport === 'http' || config.transport === 'sse') {
    startHttpTransport(config.port, config.host)
  }
}

main().catch(err => {
  console.error('[hoshi-mcp] Fatal error:', err)
  process.exit(1)
})
