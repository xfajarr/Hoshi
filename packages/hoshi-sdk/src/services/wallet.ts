import { PublicKey } from '@solana/web3.js'
import type { StoragePort } from '../ports/storage.js'
import type { ChainPort } from '../ports/chain.js'
import type { Result } from '../core/result.js'
import { Result as R } from '../core/result.js'
import type { Wallet, Balance } from '../core/types.js'
import { ValidationError, ChainError, NotFoundError, HoshiSDKError } from '../core/errors.js'


const MAINNET_USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
const DEVNET_USDC_MINT = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'

const getUsdcMintForChain = (chain: ChainPort): PublicKey => {
  const rpcEndpoint = 'rpcEndpoint' in chain && typeof chain.rpcEndpoint === 'string' ? chain.rpcEndpoint : ''
  const mint = rpcEndpoint.includes('devnet') ? DEVNET_USDC_MINT : MAINNET_USDC_MINT
  return new PublicKey(mint)
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export interface CreateWalletInput {
  id?: string
  publicKey: string
  label?: string
  managed?: boolean
  keystoreId?: string
  defaultCluster?: 'devnet' | 'mainnet'
}

export class WalletService {
  constructor(
    private readonly storage: StoragePort,
    private readonly chain: ChainPort
  ) {}

  async create(input: CreateWalletInput): Promise<Result<Wallet, ValidationError>> {
    if (input.id && !UUID_REGEX.test(input.id)) {
      return R.err(new ValidationError('Wallet ID must be a valid UUID', { id: input.id }))
    }

    // Validate public key
    let pubkey: PublicKey
    try {
      pubkey = new PublicKey(input.publicKey)
    } catch {
      return R.err(new ValidationError('Invalid Solana public key', { publicKey: input.publicKey }))
    }

    const now = new Date().toISOString()
    const wallet: Wallet = {
      id: input.id ?? crypto.randomUUID(),
      publicKey: pubkey.toBase58(),
      label: input.label,
      managed: input.managed,
      keystoreId: input.keystoreId,
      defaultCluster: input.defaultCluster,
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
    const usdcMint = getUsdcMintForChain(this.chain)
    const result = await this.chain.getTokenBalance(pubkey, usdcMint)
    if (!result.ok) return result
    return R.ok((Number(result.value) / 1e6).toString())
  }
}
