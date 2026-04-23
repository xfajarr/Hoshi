import type { Result } from '../core/result.js'
import type { HoshiSDKError } from '../core/errors.js'
import type { YieldPosition, Money } from '../core/types.js'
import type { PublicKey, Transaction } from '@solana/web3.js'

export interface YieldProviderPort {
  readonly name: string
  readonly protocol: string

  getStrategies(): Promise<Result<Array<{
    id: string
    name: string
    asset: string
    apy: string
    tvl: string
    risk: 'low' | 'medium' | 'high'
  }>, HoshiSDKError>>

  buildDepositTransaction(params: {
    strategyId: string
    wallet: PublicKey
    amount: Money
  }): Promise<Result<Transaction, HoshiSDKError>>

  buildWithdrawTransaction(params: {
    positionId: string
    wallet: PublicKey
    amount?: Money
  }): Promise<Result<Transaction, HoshiSDKError>>

  getPositions(wallet: PublicKey): Promise<Result<YieldPosition[], HoshiSDKError>>
}
