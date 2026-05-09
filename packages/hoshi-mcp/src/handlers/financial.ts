import { registerTool } from '../core/tools.js'
import type { ServerContext } from '../core/server.js'
import { createPaymentTools } from './payments.js'

export function registerFinancialTools(context: ServerContext): void {
  registerToolBatch(createPaymentTools(context))
}

function registerToolBatch(tools: ReturnType<typeof createPaymentTools>): void {
  for (const tool of tools) {
    registerTool(tool)
  }
}

export { createPaymentTools }
