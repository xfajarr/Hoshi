import { PublicKey } from '@solana/web3.js'
import type { StoragePort } from '../ports/storage.js'
import type { ChainPort } from '../ports/chain.js'
import type { Result } from '../core/result.js'
import { Result as R } from '../core/result.js'
import type { Wallet, Balance } from '../core/types.js'
import { ValidationError, ChainError, NotFoundError, HoshiSDKError } from '../core/errors.js'

export interface CreateWalletInput {
  publicKey: string
  label?: string
}

export class WalletService {
  constructor(
    private readonly storage: StoragePort,
    private readonly chain: ChainPort
  ) {}

  async create(input: CreateWalletInput): Promise<Result<Wallet, ValidationError>> {
    // Validate public key
    let pubkey: PublicKey
    try {
      pubkey = new PublicKey(input.publicKey)
    } catch {
      return R.err(new ValidationError('Invalid Solana public key', { publicKey: input.publicKey }))
    }

    const now = new Date().toISOString()
    const wallet: Wallet = {
      id: crypto.randomUUID(),
      publicKey: pubkey.toBase58(),
      label: input.label,
      createdAt: now,
      updatedAt: now
    }

    const saveResult = await this.storage.saveWallet(wallet)
    if (!saveResult.ok) return saveResult

    return R.ok(wallet)
  }

  async getById(id: string): Promise<Result<Wallet, NotFoundError>> {
    const result = await this.storage.getWallet(id)
    if (!result.ok) return result
    if (!result.value) {
      return R.err(new NotFoundError('Wallet', id))
    }
    return R.ok(result.value)
  }

  async getAll(): Promise<Result<Wallet[], HoshiSDKError>> {
    return this.storage.getWallets()
  }

  async getBalances(walletId: string): Promise<Result<Balance[], NotFoundError | ChainError>> {
    const walletResult = await this.getById(walletId)
    if (!walletResult.ok) return walletResult

    const wallet = walletResult.value
    const pubkey = new PublicKey(wallet.publicKey)

    return this.chain.getBalances(pubkey)
  }

  async getOnChainBalance(walletId: string, asset: 'SOL' | 'USDC'): Promise<Result<string, NotFoundError | ChainError>> {
    const walletResult = await this.getById(walletId)
    if (!walletResult.ok) return walletResult

    const wallet = walletResult.value
    const pubkey = new PublicKey(wallet.publicKey)

    if (asset === 'SOL') {
      const result = await this.chain.getBalance(pubkey)
      if (!result.ok) return result
      return R.ok((Number(result.value) / 1e9).toString())
    }

    // USDC
    const usdcMint = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')
    const result = await this.chain.getTokenBalance(pubkey, usdcMint)
    if (!result.ok) return result
    return R.ok((Number(result.value) / 1e6).toString())
  }
}
