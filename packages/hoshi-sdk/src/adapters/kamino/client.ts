import type { YieldProviderPort } from '../../ports/yield-provider.js'
import type { Result } from '../../core/result.js'
import { Result as R } from '../../core/result.js'
import { ProviderError } from '../../core/errors.js'
import type { YieldPosition, Money } from '../../core/types.js'
import type { PublicKey, Transaction } from '@solana/web3.js'

export class KaminoYieldAdapter implements YieldProviderPort {
  readonly name = 'Kamino'
  readonly protocol = 'kamino'

  constructor(public readonly apiUrl: string = 'https://api.kamino.finance') {}

  async getStrategies(): Promise<Result<Array<{
    id: string
    name: string
    asset: string
    apy: string
    tvl: string
    risk: 'low' | 'medium' | 'high'
  }>, ProviderError>> {
    try {
      return R.ok([
        {
          id: 'kamino-usdc-main',
          name: 'Kamino USDC Main',
          asset: 'USDC',
          apy: '5.2',
          tvl: '10000000',
          risk: 'low'
        },
        {
          id: 'kamino-sol-main',
          name: 'Kamino SOL Main',
          asset: 'SOL',
          apy: '6.8',
          tvl: '5000000',
          risk: 'medium'
        }
      ])
    } catch (err) {
      return R.err(new ProviderError('Kamino', `Failed to get strategies: ${String(err)}`))
    }
  }

  async buildDepositTransaction(_params: {
    strategyId: string
    wallet: PublicKey
    amount: Money
  }): Promise<Result<Transaction, ProviderError>> {
    return R.err(new ProviderError('Kamino', 'Deposit transactions require on-chain interaction. Use Kamino SDK directly.'))
  }

  async buildWithdrawTransaction(_params: {
    positionId: string
    wallet: PublicKey
    amount?: Money
  }): Promise<Result<Transaction, ProviderError>> {
    return R.err(new ProviderError('Kamino', 'Withdraw transactions require on-chain interaction. Use Kamino SDK directly.'))
  }

  async getPositions(_wallet: PublicKey): Promise<Result<YieldPosition[], ProviderError>> {
    return R.ok([])
  }
}
