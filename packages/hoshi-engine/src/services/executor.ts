import type { 
  PolicyContext, 
  PolicyResult, 
  ApprovalRequest, 
  ExecutionResult 
} from '../core/types.js'
import type { PolicyEngine } from './policy.js'
import type { ApprovalStorePort } from '../ports/approval-store.js'
import type { Result } from '@hoshi/sdk'
import { Result as R } from '@hoshi/sdk'

export interface ExecuteOptions {
  walletId: string
  actionType: string
  params: Record<string, unknown>
  timestamp?: string
  requester?: string
}

export class ExecutionService {
  constructor(
    private readonly policyEngine: PolicyEngine,
    private readonly approvalStore: ApprovalStorePort
  ) {}

  async preview(options: ExecuteOptions): Promise<Result<PolicyResult, Error>> {
    const context = this.buildContext(options)
    return this.policyEngine.evaluate(context)
  }

  async execute<T>(
    options: ExecuteOptions,
    executor: () => Promise<Result<T, Error>>
  ): Promise<Result<ExecutionResult & { value?: T }, Error>> {
    const context = this.buildContext(options)
    const policyResultResult = await this.policyEngine.evaluate(context)
    
    if (!policyResultResult.ok) return policyResultResult
    const policyResult = policyResultResult.value

    if (!policyResult.allowed) {
      return R.ok({
        success: false,
        policyResult,
        error: {
          code: 'POLICY_BLOCKED',
          message: policyResult.reason || 'Action blocked by policy',
          recoverable: true
        }
      })
    }

    if (policyResult.requiresApproval) {
      const approvalId = crypto.randomUUID()
      const approval: ApprovalRequest = {
        id: approvalId,
        walletId: options.walletId,
        actionType: options.actionType,
        params: options.params,
        policyResult,
        status: 'pending',
        requestedBy: options.requester,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString()
      }

      await this.approvalStore.create(approval)

      return R.ok({
        success: false,
        policyResult,
        approvalId,
        error: {
          code: 'APPROVAL_REQUIRED',
          message: `Action requires approval. Approval ID: ${approvalId}`,
          recoverable: true
        }
      })
    }

    try {
      const result = await executor()
      if (!result.ok) {
        return R.ok({
          success: false,
          policyResult,
          error: {
            code: 'EXECUTION_FAILED',
            message: result.error instanceof Error ? result.error.message : String(result.error),
            recoverable: true
          }
        })
      }

      return R.ok({
        success: true,
        policyResult,
        value: result.value
      })
    } catch (err) {
      return R.ok({
        success: false,
        policyResult,
        error: {
          code: 'EXECUTION_ERROR',
          message: err instanceof Error ? err.message : String(err),
          recoverable: false
        }
      })
    }
  }

  async approve(approvalId: string, resolverId?: string, expectedWalletId?: string): Promise<Result<ExecutionResult, Error>> {
    const approvalResult = await this.approvalStore.get(approvalId)
    if (!approvalResult.ok) return approvalResult
    if (!approvalResult.value) {
      return R.ok({
        success: false,
        policyResult: {
          action: 'write_escalated',
          allowed: false,
          rulesTriggered: [],
          reason: 'Approval request not found'
        },
        error: {
          code: 'APPROVAL_NOT_FOUND',
          message: `Approval ${approvalId} not found`,
          recoverable: false
        }
      })
    }

    const approval = approvalResult.value
    if (expectedWalletId && approval.walletId !== expectedWalletId) {
      return R.err(new Error(`Approval ${approvalId} does not belong to wallet ${expectedWalletId}`))
    }
    if (approval.status !== 'pending') {
      return R.err(new Error(`Approval ${approvalId} is already ${approval.status}`))
    }
    if (approval.expiresAt && new Date(approval.expiresAt) < new Date()) {
      approval.status = 'expired'
      approval.resolvedAt = new Date().toISOString()
      await this.approvalStore.update(approval)
      return R.err(new Error(`Approval ${approvalId} has expired`))
    }

    approval.status = 'approved'
    approval.resolvedBy = resolverId
    approval.resolvedAt = new Date().toISOString()
    await this.approvalStore.update(approval)

    return R.ok({
      success: true,
      policyResult: approval.policyResult
    })
  }

  async reject(approvalId: string, resolverId?: string, expectedWalletId?: string): Promise<Result<void, Error>> {
    const approvalResult = await this.approvalStore.get(approvalId)
    if (!approvalResult.ok) return approvalResult
    if (!approvalResult.value) {
      return R.err(new Error(`Approval ${approvalId} not found`))
    }

    const approval = approvalResult.value
    if (expectedWalletId && approval.walletId !== expectedWalletId) {
      return R.err(new Error(`Approval ${approvalId} does not belong to wallet ${expectedWalletId}`))
    }
    if (approval.status !== 'pending') {
      return R.err(new Error(`Approval ${approvalId} is already ${approval.status}`))
    }
    if (approval.expiresAt && new Date(approval.expiresAt) < new Date()) {
      approval.status = 'expired'
      approval.resolvedAt = new Date().toISOString()
      await this.approvalStore.update(approval)
      return R.err(new Error(`Approval ${approvalId} has expired`))
    }

    approval.status = 'rejected'
    approval.resolvedBy = resolverId
    approval.resolvedAt = new Date().toISOString()
    return this.approvalStore.update(approval)
  }

  private buildContext(options: ExecuteOptions): PolicyContext {
    return {
      walletId: options.walletId,
      actionType: options.actionType,
      amount: options.params.amount as { amount: string; asset: string } | undefined,
      recipient: options.params.to as string | undefined,
      timestamp: options.timestamp || new Date().toISOString(),
      dailySpend: {},
      metadata: options.params
    }
  }
}
