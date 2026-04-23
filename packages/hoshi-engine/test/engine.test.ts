import { describe, it, expect, beforeEach } from 'vitest'
import {
  PolicyEngine,
  ExecutionService,
  InMemoryPolicyStore,
  InMemoryApprovalStore,
  Result
} from '../src/index.js'
import type { PolicyRule } from '../src/index.js'

describe('PolicyEngine', () => {
  let policyStore: InMemoryPolicyStore
  let engine: PolicyEngine

  beforeEach(() => {
    policyStore = new InMemoryPolicyStore()
    engine = new PolicyEngine(policyStore)
  })

  it('should allow reads without rules', async () => {
    const result = await engine.evaluate({
      walletId: 'w1',
      actionType: 'balance.read',
      timestamp: new Date().toISOString(),
      dailySpend: {}
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.action).toBe('read')
      expect(result.value.allowed).toBe(true)
    }
  })

  it('should allow safe writes without rules', async () => {
    const result = await engine.evaluate({
      walletId: 'w1',
      actionType: 'transfer.send',
      amount: { amount: '10', asset: 'USDC' },
      timestamp: new Date().toISOString(),
      dailySpend: {}
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.action).toBe('write_safe')
      expect(result.value.allowed).toBe(true)
    }
  })

  it('should escalate large transfers', async () => {
    const rule: PolicyRule = {
      id: 'r1',
      name: 'Large transfer check',
      enabled: true,
      priority: 1,
      condition: {
        type: 'max_amount',
        params: { max: 100 }
      },
      action: 'escalate'
    }
    await policyStore.saveRules('w1', [rule])

    const result = await engine.evaluate({
      walletId: 'w1',
      actionType: 'transfer.send',
      amount: { amount: '150', asset: 'USDC' },
      timestamp: new Date().toISOString(),
      dailySpend: {}
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.action).toBe('write_escalated')
      expect(result.value.requiresApproval).toBe(true)
      expect(result.value.rulesTriggered).toContain('r1')
    }
  })

  it('should block unauthorized recipients', async () => {
    const rule: PolicyRule = {
      id: 'r1',
      name: 'Recipient allowlist',
      enabled: true,
      priority: 1,
      condition: {
        type: 'recipient_allowlist',
        params: { allowed: ['0xABC'] }
      },
      action: 'block'
    }
    await policyStore.saveRules('w1', [rule])

    const result = await engine.evaluate({
      walletId: 'w1',
      actionType: 'transfer.send',
      amount: { amount: '10', asset: 'USDC' },
      recipient: '0xBAD',
      timestamp: new Date().toISOString(),
      dailySpend: {}
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.allowed).toBe(false)
      expect(result.value.rulesTriggered).toContain('r1')
    }
  })

  it('should enforce daily limits', async () => {
    const rule: PolicyRule = {
      id: 'r1',
      name: 'Daily limit',
      enabled: true,
      priority: 1,
      condition: {
        type: 'daily_limit',
        params: { limit: 500 }
      },
      action: 'escalate'
    }
    await policyStore.saveRules('w1', [rule])

    const result = await engine.evaluate({
      walletId: 'w1',
      actionType: 'transfer.send',
      amount: { amount: '100', asset: 'USDC' },
      timestamp: new Date().toISOString(),
      dailySpend: { USDC: 450 }
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.requiresApproval).toBe(true)
    }
  })
})

describe('ExecutionService', () => {
  let policyStore: InMemoryPolicyStore
  let approvalStore: InMemoryApprovalStore
  let policyEngine: PolicyEngine
  let executor: ExecutionService

  beforeEach(() => {
    policyStore = new InMemoryPolicyStore()
    approvalStore = new InMemoryApprovalStore()
    policyEngine = new PolicyEngine(policyStore)
    executor = new ExecutionService(policyEngine, approvalStore)
  })

  it('should preview actions', async () => {
    const result = await executor.preview({
      walletId: 'w1',
      actionType: 'balance.read',
      params: {}
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.allowed).toBe(true)
    }
  })

  it('should execute safe actions', async () => {
    const result = await executor.execute(
      {
        walletId: 'w1',
        actionType: 'balance.read',
        params: {}
      },
      async () => Result.ok('success')
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.success).toBe(true)
    }
  })

  it('should require approval for escalated actions', async () => {
    const rule: PolicyRule = {
      id: 'r1',
      name: 'Large transfer',
      enabled: true,
      priority: 1,
      condition: { type: 'max_amount', params: { max: 50 } },
      action: 'escalate'
    }
    await policyStore.saveRules('w1', [rule])

    const result = await executor.execute(
      {
        walletId: 'w1',
        actionType: 'transfer.send',
        params: { amount: { amount: '100', asset: 'USDC' } }
      },
      async () => Result.ok('done')
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.success).toBe(false)
      expect(result.value.error?.code).toBe('APPROVAL_REQUIRED')
      expect(result.value.approvalId).toBeDefined()
    }
  })

  it('should approve pending actions', async () => {
    const rule: PolicyRule = {
      id: 'r1',
      name: 'Large transfer',
      enabled: true,
      priority: 1,
      condition: { type: 'max_amount', params: { max: 50 } },
      action: 'escalate'
    }
    await policyStore.saveRules('w1', [rule])

    const execResult = await executor.execute(
      {
        walletId: 'w1',
        actionType: 'transfer.send',
        params: { amount: { amount: '100', asset: 'USDC' } }
      },
      async () => Result.ok('done')
    )
    expect(execResult.ok).toBe(true)
    if (!execResult.ok) return

    const approvalId = execResult.value.approvalId
    expect(approvalId).toBeDefined()

    const approveResult = await executor.approve(approvalId!, 'admin')
    expect(approveResult.ok).toBe(true)
    if (approveResult.ok) {
      expect(approveResult.value.success).toBe(true)
    }

    // Verify approval status
    const approval = await approvalStore.get(approvalId!)
    expect(approval.ok).toBe(true)
    if (approval.ok) {
      expect(approval.value?.status).toBe('approved')
      expect(approval.value?.resolvedBy).toBe('admin')
    }
  })

  it('should reject pending actions', async () => {
    const rule: PolicyRule = {
      id: 'r1',
      name: 'Large transfer',
      enabled: true,
      priority: 1,
      condition: { type: 'max_amount', params: { max: 50 } },
      action: 'escalate'
    }
    await policyStore.saveRules('w1', [rule])

    const execResult = await executor.execute(
      {
        walletId: 'w1',
        actionType: 'transfer.send',
        params: { amount: { amount: '100', asset: 'USDC' } }
      },
      async () => Result.ok('done')
    )
    expect(execResult.ok).toBe(true)
    if (!execResult.ok) return

    const approvalId = execResult.value.approvalId!
    const rejectResult = await executor.reject(approvalId, 'admin')
    expect(rejectResult.ok).toBe(true)

    const approval = await approvalStore.get(approvalId)
    expect(approval.ok).toBe(true)
    if (approval.ok) {
      expect(approval.value?.status).toBe('rejected')
    }
  })
})
