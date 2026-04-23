import type { StoragePort } from '../ports/storage.js'
import type { YieldProviderPort } from '../ports/yield-provider.js'
import type { Result } from '../core/result.js'
import { Result as R } from '../core/result.js'
import type { YieldPosition, Receipt, Money } from '../core/types.js'
import { NotFoundError, HoshiSDKError } from '../core/errors.js'

export interface DepositInput {
  walletId: string
  strategyId: string
  amount: Money
}

export interface WithdrawInput {
  walletId: string
  positionId: string
}

export class YieldService {
  constructor(
    private readonly storage: StoragePort,
    private readonly yieldProvider: YieldProviderPort
  ) {}

  async getStrategies() {
    return this.yieldProvider.getStrategies()
  }

  async deposit(input: DepositInput): Promise<Result<YieldPosition, NotFoundError>> {
    const walletResult = await this.storage.getWallet(input.walletId)
    if (!walletResult.ok) return walletResult
    if (!walletResult.value) {
      return R.err(new NotFoundError('Wallet', input.walletId))
    }

    const wallet = walletResult.value
    const now = new Date().toISOString()

    const position: YieldPosition = {
      id: crypto.randomUUID(),
      walletId: wallet.id,
      protocol: this.yieldProvider.protocol,
      strategy: input.strategyId,
      deposited: input.amount,
      currentValue: input.amount,
      apy: '0',
      status: 'active',
      createdAt: now,
      updatedAt: now
    }

    await this.storage.saveYieldPosition(position)

    const receipt: Receipt = {
      id: crypto.randomUUID(),
      actionType: 'yield.deposit',
      walletId: wallet.id,
      status: 'success',
      amount: input.amount,
      description: `Deposited ${input.amount.amount} ${input.amount.asset} to ${this.yieldProvider.protocol}`,
      timestamp: now,
      metadata: {
        strategyId: input.strategyId,
        positionId: position.id
      }
    }

    await this.storage.saveReceipt(receipt)
    return R.ok(position)
  }

  async withdraw(input: WithdrawInput): Promise<Result<Receipt, NotFoundError>> {
    const positionResult = await this.storage.getYieldPosition(input.positionId)
    if (!positionResult.ok) return positionResult
    if (!positionResult.value) {
      return R.err(new NotFoundError('YieldPosition', input.positionId))
    }

    const position = positionResult.value
    const now = new Date().toISOString()

    position.status = 'closed'
    position.updatedAt = now
    await this.storage.updateYieldPosition(position)

    const receipt: Receipt = {
      id: crypto.randomUUID(),
      actionType: 'yield.withdraw',
      walletId: position.walletId,
      status: 'success',
      amount: position.currentValue,
      description: `Withdrew ${position.currentValue.amount} ${position.currentValue.asset} from ${position.protocol}`,
      timestamp: now,
      metadata: { positionId: position.id }
    }

    await this.storage.saveReceipt(receipt)
    return R.ok(receipt)
  }

  async getPositions(walletId: string): Promise<Result<YieldPosition[], HoshiSDKError>> {
    return this.storage.getYieldPositions(walletId)
  }
}
