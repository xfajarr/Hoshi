import type { Result } from '@hoshi/sdk'
import { Result as R } from '@hoshi/sdk'
import type { ExecutionService } from '../services/executor.js'
import type { PolicyEngine } from '../services/policy.js'
import type {
  RuntimeActionOptions,
  RuntimeJobCreatedEvent,
  RuntimeEvent,
  RuntimeExecutionState,
  RuntimePendingActionEvent,
  RuntimePolicyEvaluatedEvent,
  RuntimeJob,
  RuntimeJobStatus,
  RuntimeRunResult,
  RuntimeToolResultEvent,
  RuntimeToolStartEvent,
  RuntimeTurnCompleteEvent,
  RuntimeStorePort,
  RuntimeErrorShape,
} from './types.js'

export interface RuntimeLoopOptions extends RuntimeActionOptions {
  onEvent?: (event: RuntimeEvent) => void | Promise<void>
}

export interface RuntimeLoopExecutor<T = unknown> {
  (): Promise<Result<T, Error>>
}

export class RuntimeLoop {
  constructor(
    private readonly policyEngine: PolicyEngine,
    private readonly executionService: ExecutionService,
    private readonly store?: RuntimeStorePort,
  ) {}

  preview(options: RuntimeActionOptions) {
    return this.policyEngine.evaluate(this.buildPolicyContext(options, options.timestamp || new Date().toISOString()))
  }

  async run<T>(
    options: RuntimeLoopOptions,
    executor: RuntimeLoopExecutor<T>,
  ): Promise<Result<RuntimeRunResult<T>, Error>> {
    const timestamp = options.timestamp || new Date().toISOString()
    const jobId = crypto.randomUUID()

    const job: RuntimeJob = {
      id: jobId,
      walletId: options.walletId,
      actionType: options.actionType,
      params: options.params,
      status: 'running',
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    const state: RuntimeExecutionState = {
      jobId,
      walletId: options.walletId,
      actionType: options.actionType,
      status: 'running',
      createdAt: timestamp,
      updatedAt: timestamp,
      eventCount: 0,
    }

    const events: RuntimeEvent[] = []
    let sequence = 0

    const persist = async () => {
      if (!this.store) return
      const jobResult = await this.store.update(job)
      if (!jobResult.ok) return jobResult
      const stateResult = await this.store.saveState(state)
      if (!stateResult.ok) return stateResult
      return R.ok(undefined)
    }

    const emit = async (event: RuntimeEvent) => {
      events.push(event)
      state.eventCount = events.length
      state.updatedAt = event.timestamp
      job.updatedAt = event.timestamp
      await options.onEvent?.(event)
      const persistResult = await persist()
      if (persistResult && !persistResult.ok) {
        throw persistResult.error
      }
    }

    const createJobCreatedEvent = (timestamp: string): RuntimeJobCreatedEvent => ({
      id: crypto.randomUUID(),
      jobId,
      walletId: options.walletId,
      actionType: options.actionType,
      sequence: ++sequence,
      timestamp,
      type: 'job_created',
      state: { ...state },
    })

    const createPolicyEvaluatedEvent = (timestamp: string, policyResult: RuntimePolicyEvaluatedEvent['policyResult']): RuntimePolicyEvaluatedEvent => ({
      id: crypto.randomUUID(),
      jobId,
      walletId: options.walletId,
      actionType: options.actionType,
      sequence: ++sequence,
      timestamp,
      type: 'policy_evaluated',
      policyResult,
    })

    const createPendingActionEvent = (timestamp: string, policyResult: RuntimePendingActionEvent['policyResult'], approvalId?: string): RuntimePendingActionEvent => ({
      id: crypto.randomUUID(),
      jobId,
      walletId: options.walletId,
      actionType: options.actionType,
      sequence: ++sequence,
      timestamp,
      type: 'pending_action',
      approvalId,
      policyResult,
    })

    const createToolStartEvent = (timestamp: string): RuntimeToolStartEvent => ({
      id: crypto.randomUUID(),
      jobId,
      walletId: options.walletId,
      actionType: options.actionType,
      sequence: ++sequence,
      timestamp,
      type: 'tool_start',
      params: options.params,
    })

    const createToolResultEvent = (timestamp: string, event: Pick<RuntimeToolResultEvent, 'success' | 'value' | 'error'>): RuntimeToolResultEvent => ({
      id: crypto.randomUUID(),
      jobId,
      walletId: options.walletId,
      actionType: options.actionType,
      sequence: ++sequence,
      timestamp,
      type: 'tool_result',
      success: event.success,
      value: event.value,
      error: event.error,
    })

    const createTurnCompleteEvent = (timestamp: string): RuntimeTurnCompleteEvent => ({
      id: crypto.randomUUID(),
      jobId,
      walletId: options.walletId,
      actionType: options.actionType,
      sequence: ++sequence,
      timestamp,
      type: 'turn_complete',
      state: { ...state },
    })

    const finalizeFailure = async (error: Error, policyResultOverride?: RuntimeRunResult<T>['policyResult']) => {
      const terminalTimestamp = new Date().toISOString()
      job.status = 'failed'
      state.status = 'failed'
      state.updatedAt = terminalTimestamp
      state.completedAt = terminalTimestamp
      job.updatedAt = terminalTimestamp
      job.error = toRuntimeError(error, 'EXECUTION_ERROR')

      if (policyResultOverride) {
        job.policyResult = policyResultOverride
        state.policyResult = policyResultOverride
      }

      await emit(createTurnCompleteEvent(terminalTimestamp))
    }

    await this.store?.create(job)
    await emit(createJobCreatedEvent(timestamp))

    const policyResultResult = await this.policyEngine.evaluate(this.buildPolicyContext(options, timestamp))

    if (!policyResultResult.ok) {
      await finalizeFailure(policyResultResult.error)
      return policyResultResult
    }
    const policyResult = policyResultResult.value

    job.policyResult = policyResult
    state.policyResult = policyResult
    await emit(createPolicyEvaluatedEvent(new Date().toISOString(), policyResult))

    const finalize = async (
      status: RuntimeJobStatus,
      error?: RuntimeErrorShape,
      approvalId?: string,
      value?: T,
      executionResult?: RuntimeRunResult<T>['executionResult'],
    ) => {
      job.status = status
      state.status = status
      state.updatedAt = new Date().toISOString()
      state.completedAt = status === 'completed' || status === 'failed' || status === 'pending_action'
        ? state.updatedAt
        : state.completedAt
      job.approvalId = approvalId ?? job.approvalId
      state.approvalId = approvalId ?? state.approvalId
      job.error = error
      job.executionResult = executionResult
      await emit(createTurnCompleteEvent(state.updatedAt))

      return R.ok({
        job: { ...job },
        state: { ...state },
        policyResult,
        events: [...events],
        approvalId,
        value,
        error,
        executionResult,
      })
    }

    if (!policyResult.allowed) {
      if (policyResult.requiresApproval) {
        const approvalProbe = await this.executionService.execute(options, async () => R.ok(undefined))
        if (!approvalProbe.ok) {
          await finalizeFailure(approvalProbe.error, policyResult)
          return approvalProbe
        }

        const executionResult = approvalProbe.value
        const approvalId = executionResult.approvalId
        job.approvalId = approvalId
        state.approvalId = approvalId
        state.status = 'pending_action'
        job.status = 'pending_action'
        const error = executionResult.error
        await emit(createPendingActionEvent(new Date().toISOString(), policyResult, approvalId))
        return finalize('pending_action', error, approvalId, undefined, executionResult)
      }

      const blockedResult = await this.executionService.execute(options, async () => R.ok(undefined))
      if (!blockedResult.ok) {
        await finalizeFailure(blockedResult.error, policyResult)
        return blockedResult
      }

      const executionResult = blockedResult.value
      const error = executionResult.error
      return finalize('failed', error, executionResult.approvalId, undefined, executionResult)
    }

    const wrappedExecutor = async (): Promise<Result<T, Error>> => {
      await emit(createToolStartEvent(new Date().toISOString()))

      try {
        const result = await executor()
        if (result.ok) {
          await emit(createToolResultEvent(new Date().toISOString(), { success: true, value: result.value }))
        } else {
          await emit(createToolResultEvent(new Date().toISOString(), {
            success: false,
            error: toRuntimeError(result.error, 'EXECUTION_FAILED'),
          }))
        }
        return result
      } catch (err) {
        const runtimeError = toRuntimeError(err, 'EXECUTION_ERROR')
        await emit(createToolResultEvent(new Date().toISOString(), { success: false, error: runtimeError }))
        throw err
      }
    }

    const executionResultResult = await this.executionService.execute(options, wrappedExecutor)
    if (!executionResultResult.ok) {
      await finalizeFailure(executionResultResult.error, policyResult)
      return executionResultResult
    }

    const executionResult = executionResultResult.value
    if (executionResult.error?.code === 'APPROVAL_REQUIRED') {
      const approvalId = executionResult.approvalId
      job.approvalId = approvalId
      state.approvalId = approvalId
      state.status = 'pending_action'
      job.status = 'pending_action'
      await emit(createPendingActionEvent(new Date().toISOString(), policyResult, approvalId))
      return finalize('pending_action', executionResult.error, approvalId, undefined, executionResult)
    }

    const status: RuntimeJobStatus = executionResult.success ? 'completed' : 'failed'
    const value = executionResult.success ? executionResult.value : undefined
    return finalize(status, executionResult.error, executionResult.approvalId, value, executionResult)
  }

  private buildPolicyContext(options: RuntimeActionOptions, timestamp: string) {
    return {
      walletId: options.walletId,
      actionType: options.actionType,
      amount: options.params.amount as { amount: string; asset: string } | undefined,
      recipient: options.params.to as string | undefined,
      timestamp,
      dailySpend: {},
      metadata: options.params,
    }
  }
}

function toRuntimeError(error: unknown, code: string): RuntimeErrorShape {
  if (error instanceof Error) {
    return {
      code,
      message: error.message,
      recoverable: code !== 'EXECUTION_ERROR',
    }
  }

  return {
    code,
    message: String(error),
    recoverable: code !== 'EXECUTION_ERROR',
  }
}
