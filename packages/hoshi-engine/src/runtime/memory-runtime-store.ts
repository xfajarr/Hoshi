import type { Result } from '@hoshi/sdk'
import { Result as R } from '@hoshi/sdk'
import type { RuntimeExecutionState, RuntimeJob, RuntimeStorePort } from './types.js'

export class InMemoryRuntimeStore implements RuntimeStorePort {
  private jobs = new Map<string, RuntimeJob>()
  private states = new Map<string, RuntimeExecutionState>()

  async create(job: RuntimeJob): Promise<Result<void, never>> {
    this.jobs.set(job.id, { ...job })
    return R.ok(undefined)
  }

  async get(jobId: string): Promise<Result<RuntimeJob | null, never>> {
    const job = this.jobs.get(jobId)
    return R.ok(job ? { ...job } : null)
  }

  async update(job: RuntimeJob): Promise<Result<void, never>> {
    this.jobs.set(job.id, { ...job })
    return R.ok(undefined)
  }

  async list(walletId: string): Promise<Result<RuntimeJob[], never>> {
    const jobs = Array.from(this.jobs.values())
      .filter(job => job.walletId === walletId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .map(job => ({ ...job }))
    return R.ok(jobs)
  }

  async saveState(state: RuntimeExecutionState): Promise<Result<void, never>> {
    this.states.set(state.jobId, { ...state })
    return R.ok(undefined)
  }

  async getState(jobId: string): Promise<Result<RuntimeExecutionState | null, never>> {
    const state = this.states.get(jobId)
    return R.ok(state ? { ...state } : null)
  }
}
