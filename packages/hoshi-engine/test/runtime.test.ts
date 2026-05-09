import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PolicyRule, RuntimeEvent } from '../src/index.js'
import {
  ExecutionService,
  InMemoryApprovalStore,
  InMemoryPolicyStore,
  InMemoryRuntimeStore,
  PolicyEngine,
  Result,
  RuntimeOrchestrator,
} from '../src/index.js'

describe('RuntimeOrchestrator', () => {
  let policyStore: InMemoryPolicyStore
  let approvalStore: InMemoryApprovalStore
  let runtimeStore: InMemoryRuntimeStore
  let orchestrator: RuntimeOrchestrator

  class TrackingRuntimeStore extends InMemoryRuntimeStore {
    lastJobId: string | null = null

    override async create(job: Parameters<InMemoryRuntimeStore['create']>[0]) {
      this.lastJobId = job.id
      return super.create(job)
    }
  }

  class FailingPolicyStore extends InMemoryPolicyStore {
    override async getRules() {
      return Result.err(new Error('policy store unavailable'))
    }
  }

  beforeEach(() => {
    policyStore = new InMemoryPolicyStore()
    approvalStore = new InMemoryApprovalStore()
    runtimeStore = new InMemoryRuntimeStore()
    const policyEngine = new PolicyEngine(policyStore)
    const executionService = new ExecutionService(policyEngine, approvalStore)
    orchestrator = new RuntimeOrchestrator(policyEngine, executionService, runtimeStore)
  })

  it('runs allowed actions with ordered runtime events', async () => {
    const events: RuntimeEvent[] = []

    const result = await orchestrator.run(
      {
        walletId: 'w1',
        actionType: 'balance.read',
        params: {},
        onEvent: event => {
          events.push(event)
        },
      },
      async () => Result.ok('success'),
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.value.value).toBe('success')
    expect(result.value.state.status).toBe('completed')
    expect(result.value.events.map(event => event.type)).toEqual([
      'job_created',
      'policy_evaluated',
      'tool_start',
      'tool_result',
      'turn_complete',
    ])
    expect(events.map(event => event.type)).toEqual(result.value.events.map(event => event.type))

    const storedState = await runtimeStore.getState(result.value.job.id)
    expect(storedState.ok).toBe(true)
    if (storedState.ok) {
      expect(storedState.value?.status).toBe('completed')
      expect(storedState.value?.eventCount).toBe(5)
    }
  })

  it('emits pending_action and preserves the approval path', async () => {
    const rule: PolicyRule = {
      id: 'rule-1',
      name: 'Escalate large transfers',
      enabled: true,
      priority: 1,
      condition: {
        type: 'max_amount',
        params: { max: 50 },
      },
      action: 'escalate',
    }
    await policyStore.saveRules('w1', [rule])

    const executor = vi.fn(async () => Result.ok('should-not-run'))
    const events: RuntimeEvent[] = []

    const result = await orchestrator.run(
      {
        walletId: 'w1',
        actionType: 'transfer.send',
        params: { amount: { amount: '100', asset: 'USDC' } },
        onEvent: event => {
          events.push(event)
        },
      },
      executor,
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(executor).not.toHaveBeenCalled()
    expect(result.value.state.status).toBe('pending_action')
    expect(result.value.approvalId).toBeDefined()
    expect(result.value.error?.code).toBe('APPROVAL_REQUIRED')
    expect(result.value.events.map(event => event.type)).toEqual([
      'job_created',
      'policy_evaluated',
      'pending_action',
      'turn_complete',
    ])
    expect(events.some(event => event.type === 'tool_start')).toBe(false)

    const approval = await approvalStore.listPending('w1')
    expect(approval.ok).toBe(true)
    if (approval.ok) {
      expect(approval.value).toHaveLength(1)
    }
  })

  it('supports preview through the orchestrator', async () => {
    const rule: PolicyRule = {
      id: 'rule-1',
      name: 'Block bad recipient',
      enabled: true,
      priority: 1,
      condition: {
        type: 'recipient_allowlist',
        params: { allowed: ['0xABC'] },
      },
      action: 'block',
    }
    await policyStore.saveRules('w1', [rule])

    const result = await orchestrator.preview({
      walletId: 'w1',
      actionType: 'transfer.send',
      params: {
        amount: { amount: '10', asset: 'USDC' },
        to: '0xBAD',
      },
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.allowed).toBe(false)
      expect(result.value.rulesTriggered).toContain('rule-1')
    }
  })

  it('finalizes failed runs when policy infrastructure fails', async () => {
    const events: RuntimeEvent[] = []
    const trackingRuntimeStore = new TrackingRuntimeStore()
    const failingPolicyStore = new FailingPolicyStore()
    const policyEngine = new PolicyEngine(failingPolicyStore)
    const executionService = new ExecutionService(policyEngine, approvalStore)
    orchestrator = new RuntimeOrchestrator(policyEngine, executionService, trackingRuntimeStore)

    const result = await orchestrator.run(
      {
        walletId: 'w1',
        actionType: 'transfer.send',
        params: { amount: { amount: '10', asset: 'USDC' } },
        onEvent: event => {
          events.push(event)
        },
      },
      async () => Result.ok('unused'),
    )

    expect(result.ok).toBe(false)
    expect(events.map(event => event.type)).toEqual(['job_created', 'turn_complete'])
    expect(trackingRuntimeStore.lastJobId).toBeTruthy()
    if (!trackingRuntimeStore.lastJobId) return

    const jobResult = await trackingRuntimeStore.get(trackingRuntimeStore.lastJobId)
    expect(jobResult.ok).toBe(true)
    if (jobResult.ok && jobResult.value) {
      expect(jobResult.value.status).toBe('failed')
    }

    const stateResult = await trackingRuntimeStore.getState(trackingRuntimeStore.lastJobId)
    expect(stateResult.ok).toBe(true)
    if (stateResult.ok && stateResult.value) {
      expect(stateResult.value.status).toBe('failed')
    }
  })
})
