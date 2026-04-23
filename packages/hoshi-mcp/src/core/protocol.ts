import { z } from 'zod'

export const JSONRPCRequestSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.union([z.string(), z.number()]),
  method: z.string(),
  params: z.record(z.string(), z.unknown()).optional()
})
export type JSONRPCRequest = z.infer<typeof JSONRPCRequestSchema>

export const JSONRPCResponseSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.union([z.string(), z.number()]),
  result: z.unknown().optional(),
  error: z.object({
    code: z.number(),
    message: z.string(),
    data: z.unknown().optional()
  }).optional()
})
export type JSONRPCResponse = z.infer<typeof JSONRPCResponseSchema>

export const MCPInitializeRequestSchema = z.object({
  protocolVersion: z.string(),
  capabilities: z.record(z.string(), z.unknown()),
  clientInfo: z.object({
    name: z.string(),
    version: z.string()
  })
})

export interface MCPTool {
  name: string
  description: string
  inputSchema: z.ZodType<unknown>
  category: 'read' | 'write_safe' | 'write_escalated'
  handler: (args: unknown) => Promise<unknown>
}

export interface MCPServerInfo {
  name: string
  version: string
  protocolVersion: string
}
