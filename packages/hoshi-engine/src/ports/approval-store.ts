import type { ApprovalRequest } from '../core/types.js'
import type { Result } from '@hoshi/sdk'

export interface ApprovalStorePort {
  create(request: ApprovalRequest): Promise<Result<void, Error>>
  get(id: string): Promise<Result<ApprovalRequest | null, Error>>
  update(request: ApprovalRequest): Promise<Result<void, Error>>
  list(walletId: string): Promise<Result<ApprovalRequest[], Error>>
  listPending(walletId: string): Promise<Result<ApprovalRequest[], Error>>
}
