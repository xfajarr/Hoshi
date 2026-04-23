import type { ApprovalStorePort } from '../ports/approval-store.js'
import type { ApprovalRequest } from '../core/types.js'
import type { Result } from '@hoshi/sdk'
import { Result as R } from '@hoshi/sdk'

export class InMemoryApprovalStore implements ApprovalStorePort {
  private requests = new Map<string, ApprovalRequest>()

  async create(request: ApprovalRequest): Promise<Result<void, never>> {
    this.requests.set(request.id, request)
    return R.ok(undefined)
  }

  async get(id: string): Promise<Result<ApprovalRequest | null, never>> {
    return R.ok(this.requests.get(id) || null)
  }

  async update(request: ApprovalRequest): Promise<Result<void, never>> {
    this.requests.set(request.id, request)
    return R.ok(undefined)
  }

  async list(walletId: string): Promise<Result<ApprovalRequest[], never>> {
    const items = Array.from(this.requests.values())
      .filter(r => r.walletId === walletId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    return R.ok(items)
  }

  async listPending(walletId: string): Promise<Result<ApprovalRequest[], never>> {
    const items = Array.from(this.requests.values())
      .filter(r => r.walletId === walletId && r.status === 'pending')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    return R.ok(items)
  }
}
