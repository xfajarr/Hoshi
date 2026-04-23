import type { MCPTool } from './protocol.js'
import type { ServerContext } from './server.js'

/**
 * Policy check result for tool execution
 */
export interface ToolPolicyCheck {
  allowed: boolean
  requiresApproval: boolean
  reason?: string
  actionClass: 'read' | 'write_safe' | 'write_escalated'
}

/**
 * Wrap a tool handler with policy checking and optional auto-execution
 */
export function withPolicy(
  tool: MCPTool,
  context: ServerContext
): MCPTool {
  if (!context.config.policyEnabled) {
    // Policy disabled - allow all
    return tool
  }
  
  return {
    ...tool,
    handler: async (args: unknown) => {
      const params = args as Record<string, unknown>
      const walletId = params.walletId as string | undefined
      
      if (!walletId) {
        // Tools without walletId bypass policy (they're global queries)
        if (tool.category === 'read') {
          return tool.handler(args)
        }
        throw new Error('Wallet ID required for write operations')
      }
      
      // Build policy context
      const policyContext: any = {
        walletId,
        actionType: tool.name,
        timestamp: new Date().toISOString(),
        dailySpend: {}
      }
      
      // Extract amount if present
      if (params.amount && typeof params.amount === 'string' && params.asset) {
        policyContext.amount = { 
          amount: params.amount, 
          asset: params.asset as string 
        }
      }
      
      // Extract recipient if present
      if (params.to) {
        policyContext.recipient = params.to as string
      }
      
      // Check policy
      const policyResult = await context.policyEngine.evaluate(policyContext)
      if (!policyResult.ok) {
        throw new Error(`Policy check failed: ${policyResult.error.message}`)
      }
      
      const result = policyResult.value
      
      if (!result.allowed) {
        throw new Error(`Action blocked by policy: ${result.reason || 'No reason given'}`)
      }
      
      if (result.requiresApproval) {
        // For escalated actions, create approval request instead of executing
        const approvalId = crypto.randomUUID()
        const approval = {
          id: approvalId,
          walletId,
          actionType: tool.name,
          params,
          policyResult: result,
          status: 'pending' as const,
          requestedBy: 'mcp-agent',
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString()
        }
        
        await context.executionService['approvalStore'].create(approval)
        
        return {
          status: 'approval_required',
          approvalId,
          message: `Action requires approval. Use approval ID: ${approvalId}`,
          policyResult: {
            rulesTriggered: result.rulesTriggered,
            reason: result.reason
          }
        }
      }
      
      // Execute the tool
      return tool.handler(args)
    }
  }
}

/**
 * Register policy tools for managing the policy system itself
 */
export function registerPolicyTools(context: ServerContext, register: (tool: MCPTool) => void): void {
  register({
    name: 'hoshi_policy_add',
    description: 'Add a policy rule to a wallet',
    inputSchema: {} as any,
    category: 'write_safe',
    handler: async (args) => {
      const { walletId, name, condition, action, priority = 0 } = args as any
      
      const rule = {
        id: crypto.randomUUID(),
        name,
        enabled: true,
        priority,
        condition,
        action
      }
      
      const result = await context.policyEngine['store'].saveRules(walletId, [
        ...(await context.policyEngine['store'].getRules(walletId)).ok ? 
           (await context.policyEngine['store'].getRules(walletId)).value : [],
        rule
      ])
      
      if (!result.ok) throw new Error(result.error.message)
      return { ruleId: rule.id, status: 'created' }
    }
  })
  
  register({
    name: 'hoshi_policy_list',
    description: 'List policy rules for a wallet',
    inputSchema: {} as any,
    category: 'read',
    handler: async (args) => {
      const { walletId } = args as any
      const result = await context.policyEngine['store'].getRules(walletId)
      if (!result.ok) throw new Error(result.error.message)
      return { rules: result.value }
    }
  })
  
  register({
    name: 'hoshi_approval_list',
    description: 'List pending approvals for a wallet',
    inputSchema: {} as any,
    category: 'read',
    handler: async (args) => {
      const { walletId } = args as any
      const result = await context.executionService['approvalStore'].listPending()
      if (!result.ok) throw new Error(result.error.message)
      return { approvals: result.value.filter((a: any) => a.walletId === walletId) }
    }
  })
  
  register({
    name: 'hoshi_approve',
    description: 'Approve a pending action',
    inputSchema: {} as any,
    category: 'write_safe',
    handler: async (args) => {
      const { approvalId, resolverId = 'human' } = args as any
      const result = await context.executionService.approve(approvalId, resolverId)
      if (!result.ok) throw new Error(result.error.message)
      return { approvalId, status: 'approved' }
    }
  })
  
  register({
    name: 'hoshi_reject',
    description: 'Reject a pending action',
    inputSchema: {} as any,
    category: 'write_safe',
    handler: async (args) => {
      const { approvalId, resolverId = 'human' } = args as any
      const result = await context.executionService.reject(approvalId, resolverId)
      if (!result.ok) throw new Error(result.error.message)
      return { approvalId, status: 'rejected' }
    }
  })
}
