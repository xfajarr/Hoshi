import type { ApprovalRequest, PolicyRule } from '@hoshi/engine'
import type { MCPTool } from './protocol.js'
import type { ServerContext } from './server.js'

const POLICY_BYPASS_TOOLS = new Set([
  'hoshi_wallet_create',
  'hoshi_policy_add',
  'hoshi_policy_list',
  'hoshi_approval_list',
  'hoshi_approve',
  'hoshi_reject',
])

const approvalExecutionLocks = new Set<string>()

const TOOL_ACTION_MAP: Record<string, string> = {
  hoshi_balance: 'balance.read',
  hoshi_balances: 'balance.read',
  hoshi_wallet_info: 'balance.read',
  hoshi_history: 'history.read',
  hoshi_swap_quote: 'swap.quote',
  hoshi_send: 'transfer.send',
  hoshi_create_invoice: 'invoice.create',
  hoshi_create_payment_link: 'payment_link.create',
  hoshi_deposit_yield: 'yield.deposit',
  hoshi_withdraw_yield: 'yield.withdraw',
}

const getCanonicalActionType = (toolName: string): string => TOOL_ACTION_MAP[toolName] ?? toolName

const getDailySpend = async (context: ServerContext, walletId: string): Promise<Record<string, number>> => {
  const receiptsResult = await context.storage.getReceipts(walletId)
  if (!receiptsResult.ok) return {}

  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  return receiptsResult.value.reduce<Record<string, number>>((acc, receipt) => {
    if (receipt.status !== 'success' || !receipt.amount) return acc
    if (new Date(receipt.timestamp) < startOfDay) return acc

    const amount = Number.parseFloat(receipt.amount.amount)
    if (!Number.isFinite(amount)) return acc

    acc[receipt.amount.asset] = (acc[receipt.amount.asset] || 0) + amount
    return acc
  }, {})
}

const isExpired = (approval: ApprovalRequest): boolean => {
  if (!approval.expiresAt) return false
  return new Date(approval.expiresAt) < new Date()
}

const sameParams = (left: Record<string, unknown>, right: Record<string, unknown>): boolean => {
  return JSON.stringify(left) === JSON.stringify(right)
}

const findMatchingApproval = (
  approvals: ApprovalRequest[],
  actionType: string,
  params: Record<string, unknown>,
  status: ApprovalRequest['status'],
): ApprovalRequest | null => {
  return approvals.find((approval) => {
    if (approval.status !== status) return false
    if (approval.actionType !== actionType) return false
    if (isExpired(approval)) return false
    return sameParams(approval.params, params)
  }) ?? null
}

export interface ToolPolicyCheck {
  allowed: boolean
  requiresApproval: boolean
  reason?: string
  actionClass: 'read' | 'write_safe' | 'write_escalated'
}

export function withPolicy(
  tool: MCPTool,
  context: ServerContext,
): MCPTool {
  if (!context.config.policyEnabled || POLICY_BYPASS_TOOLS.has(tool.name)) {
    return tool
  }

  return {
    ...tool,
    handler: async (args: unknown) => {
      const params = args as Record<string, unknown>
      const walletId = params.walletId as string | undefined

      if (!walletId) {
        if (tool.category === 'read') {
          return tool.handler(args)
        }
        throw new Error('Wallet ID required for write operations')
      }

      const actionType = getCanonicalActionType(tool.name)
      const approvalsResult = await context.approvalStore.list(walletId)
      if (!approvalsResult.ok) {
        throw new Error(`Approval lookup failed: ${approvalsResult.error}`)
      }

      const approvedApproval = findMatchingApproval(approvalsResult.value, actionType, params, 'approved')
      if (approvedApproval) {
        if (approvalExecutionLocks.has(approvedApproval.id)) {
          throw new Error(`Approval ${approvedApproval.id} is already being executed`)
        }

        approvalExecutionLocks.add(approvedApproval.id)
        try {
          const output = await tool.handler(args)
          approvedApproval.status = 'expired'
          approvedApproval.resolvedAt = new Date().toISOString()
          await context.approvalStore.update(approvedApproval)
          return output
        } finally {
          approvalExecutionLocks.delete(approvedApproval.id)
        }
      }

      const dailySpend = await getDailySpend(context, walletId)
      const policyContext: Record<string, unknown> = {
        walletId,
        actionType,
        timestamp: new Date().toISOString(),
        dailySpend,
      }

      if (params.amount && typeof params.amount === 'string' && typeof params.asset === 'string') {
        policyContext.amount = {
          amount: params.amount,
          asset: params.asset,
        }
      }

      if (typeof params.to === 'string') {
        policyContext.recipient = params.to
      }

      const policyResult = await context.policyEngine.evaluate(policyContext as never)
      if (!policyResult.ok) {
        throw new Error(`Policy check failed: ${policyResult.error}`)
      }

      const result = policyResult.value
      if (!result.allowed) {
        throw new Error(`Action blocked by policy: ${result.reason || 'No reason given'}`)
      }

      if (result.requiresApproval) {
        const pendingApproval = findMatchingApproval(approvalsResult.value, actionType, params, 'pending')
        if (pendingApproval) {
          return {
            status: 'approval_required',
            approvalId: pendingApproval.id,
            message: `Action already awaiting approval. Use approval ID: ${pendingApproval.id}`,
            policyResult: {
              rulesTriggered: result.rulesTriggered,
              reason: result.reason,
            },
          }
        }

        const approvalId = crypto.randomUUID()
        const approval: ApprovalRequest = {
          id: approvalId,
          walletId,
          actionType,
          params,
          policyResult: result,
          status: 'pending',
          requestedBy: 'mcp-agent',
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
        }

        await context.approvalStore.create(approval)

        return {
          status: 'approval_required',
          approvalId,
          message: `Action requires approval. Use approval ID: ${approvalId}`,
          policyResult: {
            rulesTriggered: result.rulesTriggered,
            reason: result.reason,
          },
        }
      }

      return tool.handler(args)
    },
  }
}

export function registerPolicyTools(context: ServerContext, register: (tool: MCPTool) => void): void {
  register({
    name: 'hoshi_policy_add',
    description: 'Add a policy rule to a wallet',
    inputSchema: {} as never,
    category: 'write_safe',
    handler: async (args) => {
      const { walletId, name, condition, action, priority = 0 } = args as {
        walletId: string
        name: string
        condition: PolicyRule['condition']
        action: 'allow' | 'block' | 'escalate'
        priority?: number
      }

      const existingRulesResult = await context.policyStore.getRules(walletId)
      if (!existingRulesResult.ok) throw new Error(existingRulesResult.error)

      const rule = {
        id: crypto.randomUUID(),
        name,
        enabled: true,
        priority,
        condition,
        action,
      }

      const saveResult = await context.policyStore.saveRules(walletId, [
        ...existingRulesResult.value,
        rule,
      ])
      if (!saveResult.ok) throw new Error(saveResult.error)

      return { ruleId: rule.id, status: 'created' }
    },
  })

  register({
    name: 'hoshi_policy_list',
    description: 'List policy rules for a wallet',
    inputSchema: {} as never,
    category: 'read',
    handler: async (args) => {
      const { walletId } = args as { walletId: string }
      const result = await context.policyStore.getRules(walletId)
      if (!result.ok) throw new Error(result.error)
      return { rules: result.value }
    },
  })

  register({
    name: 'hoshi_approval_list',
    description: 'List pending approvals for a wallet',
    inputSchema: {} as never,
    category: 'read',
    handler: async (args) => {
      const { walletId } = args as { walletId: string }
      const result = await context.approvalStore.listPending(walletId)
      if (!result.ok) throw new Error(result.error)
      return { approvals: result.value }
    },
  })

  register({
    name: 'hoshi_approve',
    description: 'Approve a pending action for a wallet',
    inputSchema: {} as never,
    category: 'write_safe',
    handler: async (args) => {
      const { walletId, approvalId, resolverId = 'human' } = args as {
        walletId: string
        approvalId: string
        resolverId?: string
      }
      const approvalResult = await context.approvalStore.get(approvalId)
      if (!approvalResult.ok) throw new Error(String(approvalResult.error))
      if (!approvalResult.value || approvalResult.value.walletId !== walletId) {
        throw new Error(`Approval ${approvalId} does not belong to wallet ${walletId}`)
      }

      const result = await context.executionService.approve(approvalId, resolverId)
      if (!result.ok) throw new Error(result.error.message)
      return { approvalId, walletId, status: 'approved' }
    },
  })

  register({
    name: 'hoshi_reject',
    description: 'Reject a pending action for a wallet',
    inputSchema: {} as never,
    category: 'write_safe',
    handler: async (args) => {
      const { walletId, approvalId, resolverId = 'human' } = args as {
        walletId: string
        approvalId: string
        resolverId?: string
      }
      const approvalResult = await context.approvalStore.get(approvalId)
      if (!approvalResult.ok) throw new Error(String(approvalResult.error))
      if (!approvalResult.value || approvalResult.value.walletId !== walletId) {
        throw new Error(`Approval ${approvalId} does not belong to wallet ${walletId}`)
      }

      const result = await context.executionService.reject(approvalId, resolverId)
      if (!result.ok) throw new Error(result.error.message)
      return { approvalId, walletId, status: 'rejected' }
    },
  })
}
