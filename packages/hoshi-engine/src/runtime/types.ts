import type { ExecutionResult, PolicyResult } from '../core/types.js'

export type RuntimeJobStatus = 'queued' | 'running' | 'pending_action' | 'completed' | 'failed'

export interface RuntimeActionOptions {
  walletId: string
  actionType: string
  params: Record<string, unknown>
  timestamp?: string
  requester?: string
}

export interface RuntimeJob {
  id: string
  walletId: string
  actionType: string
  params: Record<string, unknown>
  status: RuntimeJobStatus
  createdAt: string
  updatedAt: string
  policyResult?: PolicyResult
  approvalId?: string
  executionResult?: ExecutionResult
  error?: RuntimeErrorShape
}

export interface RuntimeExecutionState {
  jobId: string
  walletId: string
  actionType: string
  status: RuntimeJobStatus
  createdAt: string
  updatedAt: string
  eventCount: number
  policyResult?: PolicyResult
  approvalId?: string
  completedAt?: string
}

export interface RuntimeErrorShape {
  code: string
  message: string
  recoverable: boolean
}

export interface RuntimeEventBase {
  id: string
  jobId: string
  walletId: string
  actionType: string
  sequence: number
  timestamp: string
}

export interface RuntimeJobCreatedEvent extends RuntimeEventBase {
  type: 'job_created'
  state: RuntimeExecutionState
}

export interface RuntimePolicyEvaluatedEvent extends RuntimeEventBase {
  type: 'policy_evaluated'
  policyResult: PolicyResult
}

export interface RuntimePendingActionEvent extends RuntimeEventBase {
  type: 'pending_action'
  approvalId?: string
  policyResult: PolicyResult
}

export interface RuntimeToolStartEvent extends RuntimeEventBase {
  type: 'tool_start'
  params: Record<string, unknown>
}

export interface RuntimeToolResultEvent extends RuntimeEventBase {
  type: 'tool_result'
  success: boolean
  value?: unknown
  error?: RuntimeErrorShape
}

export interface RuntimeTurnCompleteEvent extends RuntimeEventBase {
  type: 'turn_complete'
  state: RuntimeExecutionState
}

export type RuntimeEvent =
  | RuntimeJobCreatedEvent
  | RuntimePolicyEvaluatedEvent
  | RuntimePendingActionEvent
  | RuntimeToolStartEvent
  | RuntimeToolResultEvent
  | RuntimeTurnCompleteEvent

export interface RuntimeRunResult<T = unknown> {
  job: RuntimeJob
  state: RuntimeExecutionState
  policyResult: PolicyResult
  events: RuntimeEvent[]
  approvalId?: string
  value?: T
  error?: RuntimeErrorShape
  executionResult?: ExecutionResult
}

export interface RuntimeStorePort {
  create(job: RuntimeJob): Promise<import('@hoshi/sdk').Result<void, Error>>
  get(jobId: string): Promise<import('@hoshi/sdk').Result<RuntimeJob | null, Error>>
  update(job: RuntimeJob): Promise<import('@hoshi/sdk').Result<void, Error>>
  list(walletId: string): Promise<import('@hoshi/sdk').Result<RuntimeJob[], Error>>
  saveState(state: RuntimeExecutionState): Promise<import('@hoshi/sdk').Result<void, Error>>
  getState(jobId: string): Promise<import('@hoshi/sdk').Result<RuntimeExecutionState | null, Error>>
}
