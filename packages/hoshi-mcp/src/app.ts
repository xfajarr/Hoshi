import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { cors } from 'hono/cors'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import type { ServerConfig } from './config/index.js'
import { loadConfig } from './config/index.js'
import { createServerContext, type ServerContext } from './core/server.js'
import { JSONRPCRequestSchema, type JSONRPCRequest, type JSONRPCResponse, type MCPTool } from './core/protocol.js'
import { ToolCatalog } from './core/tool-catalog.js'
import { loadSkills, matchSkills, type Skill } from './skills/loader.js'
import { createPaymentTools } from './handlers/payments.js'
import { registerPolicyTools, withPolicy } from './core/policy-tools.js'

export interface HoshiMcpServerApp {
  config: ServerConfig
  context: ServerContext
  skills: Map<string, Skill>
  toolCatalog: ToolCatalog
  handleRequest(req: JSONRPCRequest): Promise<JSONRPCResponse>
  listTools(): ReturnType<ToolCatalog['list']>
  getTool(name: string): MCPTool | undefined
}

export interface CreateHoshiMcpServerOptions {
  env?: Record<string, string | undefined>
  createContext?: (config: ServerConfig) => Promise<ServerContext>
  loadSkills?: (dir: string) => Map<string, Skill>
  skillsDir?: string
}

export interface StartHoshiMcpServerOptions extends CreateHoshiMcpServerOptions {
  transportHooks?: Partial<{
    startStdioTransport: (app: HoshiMcpServerApp) => void | Promise<void>
    startHttpTransport: (app: HoshiMcpServerApp, port: number, host: string) => void | Promise<void>
  }>
}

const serverInfo = {
  name: 'hoshi-mcp',
  version: '0.1.0',
  description: 'Hoshi Financial MCP Server for Solana'
}

export async function createHoshiMcpServer(options: CreateHoshiMcpServerOptions = {}): Promise<HoshiMcpServerApp> {
  const config = loadConfig(options.env)
  const createContext = options.createContext ?? createServerContext
  const context = await createContext(config)
  const skillsDir = options.skillsDir ?? getDefaultSkillsDir()
  const loadSkillsFn = options.loadSkills ?? loadSkills
  const skills = loadSkillsFn(skillsDir)
  const toolCatalog = new ToolCatalog()

  toolCatalog.registerMany(createPaymentTools(context).map((tool) => withPolicy(tool, context)))
  registerPolicyTools(context, (tool) => toolCatalog.register(withPolicy(tool, context)))
  context.tools = toolCatalog.entries()

  return {
    config,
    context,
    skills,
    toolCatalog,
    handleRequest: (req) => handleRequest(req, toolCatalog),
    listTools: () => toolCatalog.list(),
    getTool: (name) => toolCatalog.get(name),
  }
}

export async function startHoshiMcpServer(options: StartHoshiMcpServerOptions = {}): Promise<HoshiMcpServerApp> {
  const app = await createHoshiMcpServer(options)
  const hooks = options.transportHooks ?? {}

  if (app.config.transport === 'stdio') {
    await (hooks.startStdioTransport ?? startStdioTransport)(app)
  } else {
    await (hooks.startHttpTransport ?? startHttpTransport)(app, app.config.port, app.config.host)
  }

  return app
}

async function handleRequest(req: JSONRPCRequest, toolCatalog: ToolCatalog): Promise<JSONRPCResponse> {
  const base = { jsonrpc: '2.0' as const, id: req.id }

  try {
    switch (req.method) {
      case 'initialize':
        return {
          ...base,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: { listChanged: true },
              logging: {}
            },
            serverInfo
          }
        }

      case 'tools/list':
        return {
          ...base,
          result: {
            tools: toolCatalog.list().map((tool) => ({
              ...tool,
              description: `[${tool.category}] ${tool.description}`
            }))
          }
        }

      case 'tools/call': {
        const params = req.params as { name: string; arguments?: Record<string, unknown> }
        const tool = toolCatalog.get(params.name)

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

      case 'resources/list':
        return { ...base, result: { resources: [] } }

      case 'prompts/list':
        return { ...base, result: { prompts: [] } }

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

async function startStdioTransport(app: HoshiMcpServerApp): Promise<void> {
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
        const res = await app.handleRequest(req)
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

async function startHttpTransport(app: HoshiMcpServerApp, port: number, host: string): Promise<void> {
  const hono = new Hono()

  hono.use('*', cors())

  hono.get('/health', (c) => c.json({
    status: 'ok',
    version: serverInfo.version,
    tools: app.listTools().length,
    signer: app.context.signer ? app.context.signer.publicKey : null,
    policy: app.context.config.policyEnabled
  }))

  hono.get('/skills', (c) => c.json({
    skills: Array.from(app.skills.values()).map((skill) => ({
      id: skill.id,
      name: skill.name,
      category: skill.category,
      risk: skill.risk,
      description: skill.description,
      tools: skill.tools.map((tool) => tool.name)
    }))
  }))

  hono.get('/skills/:id', (c) => {
    const id = c.req.param('id')
    const skill = app.skills.get(id)
    if (!skill) return c.json({ error: 'Skill not found' }, 404)
    return c.json({ skill: {
      id: skill.id,
      name: skill.name,
      version: skill.version,
      category: skill.category,
      risk: skill.risk,
      description: skill.description,
      whenToUse: skill.whenToUse,
      tools: skill.tools,
      systemPrompt: skill.systemPrompt,
      examples: skill.examples,
      guardrails: skill.guardrails
    }})
  })

  hono.post('/skills/match', async (c) => {
    const { query } = await c.req.json()
    const matched = matchSkills(app.skills, query)
    return c.json({
      query,
      matched: matched.map((skill) => ({ id: skill.id, name: skill.name, risk: skill.risk }))
    })
  })

  hono.get('/tools', (c) => c.json({
    tools: app.listTools().map((tool) => ({
      name: tool.name,
      description: tool.description,
      category: tool.category
    }))
  }))

  hono.get('/tools/:name', (c) => {
    const name = c.req.param('name')
    const tool = app.getTool(name)
    if (!tool) return c.json({ error: `Tool ${name} not found` }, 404)
    return c.json({
      name: tool.name,
      description: tool.description,
      category: tool.category
    })
  })

  hono.post('/rpc', async (c) => {
    try {
      const body = await c.req.json()
      const req = JSONRPCRequestSchema.parse(body)
      const res = await app.handleRequest(req)
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

  hono.post('/tools/:name', async (c) => {
    const name = c.req.param('name')
    const tool = app.getTool(name)

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
    fetch: hono.fetch,
    port,
    hostname: host
  }, () => {
    console.error(`[hoshi-mcp] HTTP transport ready on http://${host}:${port}`)
    console.error(`[hoshi-mcp] Health: http://${host}:${port}/health`)
    console.error(`[hoshi-mcp] Skills: http://${host}:${port}/skills`)
    console.error(`[hoshi-mcp] Tools: http://${host}:${port}/tools`)
  })
}

function getDefaultSkillsDir(): string {
  return join(dirname(fileURLToPath(import.meta.url)), '..', 'skills')
}
