import { z } from 'zod'
import type { MCPTool } from './protocol.js'

export interface ToolMetadata {
  name: string
  description: string
  inputSchema: unknown
  category: MCPTool['category']
}

export class ToolCatalog {
  private readonly tools = new Map<string, MCPTool>()
  private readonly order: string[] = []

  register(tool: MCPTool): void {
    if (!this.tools.has(tool.name)) {
      this.order.push(tool.name)
    }

    this.tools.set(tool.name, tool)
  }

  registerMany(tools: MCPTool[]): void {
    for (const tool of tools) {
      this.register(tool)
    }
  }

  get(name: string): MCPTool | undefined {
    return this.tools.get(name)
  }

  list(): ToolMetadata[] {
    return this.order
      .map((name) => this.tools.get(name))
      .filter((tool): tool is MCPTool => Boolean(tool))
      .map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema instanceof z.ZodType
          ? zodToJsonSchema(tool.inputSchema)
          : tool.inputSchema,
        category: tool.category,
      }))
  }

  entries(): MCPTool[] {
    return this.order
      .map((name) => this.tools.get(name))
      .filter((tool): tool is MCPTool => Boolean(tool))
  }
}

function zodToJsonSchema(_schema: z.ZodType<unknown>): unknown {
  return { type: 'object', properties: {} }
}
