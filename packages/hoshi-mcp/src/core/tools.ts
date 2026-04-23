import { z } from 'zod'
import type { MCPTool } from './protocol.js'

export const toolRegistry: MCPTool[] = []

export function registerTool(tool: MCPTool): void {
  toolRegistry.push(tool)
}

export function getTool(name: string): MCPTool | undefined {
  return toolRegistry.find(t => t.name === name)
}

export function listTools(): Array<{ name: string; description: string; inputSchema: unknown }> {
  return toolRegistry.map(t => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema instanceof z.ZodType ? zodToJsonSchema(t.inputSchema) : t.inputSchema
  }))
}

function zodToJsonSchema(_schema: z.ZodType<unknown>): unknown {
  // Simple conversion - in production, use zod-to-json-schema
  return { type: 'object', properties: {} }
}
