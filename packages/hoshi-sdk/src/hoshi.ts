import { PublicKey } from '@solana/web3.js'
import { EncryptedKeypairVault, type CreateKeystoreInput } from './adapters/solana/encrypted-keypair-vault.js'
import { SolanaChainAdapter } from './adapters/solana/connection.js'
import { KeypairSigner } from './adapters/solana/keypair-signer.js'
import { JupiterSwapAdapter } from './adapters/jupiter/client.js'
import { KaminoYieldAdapter } from './adapters/kamino/client.js'
import { InMemoryStorageAdapter } from './adapters/memory/storage.js'
import { WalletService } from './services/wallet.js'
import { TransferService } from './services/transfer.js'
import { SwapService } from './services/swap.js'
import { YieldService } from './services/yield.js'
import { InvoiceService } from './services/invoice.js'
import { ContactManager } from './contacts.js'
import { SafeguardEnforcer } from './safeguards/enforcer.js'
import type { HoshiConfig, Wallet, Receipt, SwapQuote } from './core/types.js'
import type { StoragePort } from './ports/storage.js'
import type { SignerPort } from './ports/signer.js'
import type { ChainPort } from './ports/chain.js'
import type { SwapProviderPort } from './ports/swap-provider.js'
import type { YieldProviderPort } from './ports/yield-provider.js'
import { HoshiError, mapSolanaError, isRetryableError } from './errors.js'
import {
  DEFAULT_NETWORK,
  DEFAULT_RPC_URL,
  SUPPORTED_ASSETS,
} from './constants.js'

export { HoshiError, mapSolanaError, isRetryableError }
export * from './errors.js'
export * from './constants.js'
export * from './token-registry.js'
export * from './safeguards/index.js'
export * from './contacts.js'
export * from './signer.js'
export * from './wallet/index.js'
export * from './swap-quote.js'

export interface HoshiOptions {
  rpcUrl?: string
  keyPath?: string
  configDir?: string
  storage?: StoragePort
  chain?: ChainPort
  swapProvider?: SwapProviderPort
  yieldProvider?: YieldProviderPort
}

export class Hoshi {
  private readonly config: HoshiConfig
  private readonly vault: EncryptedKeypairVault
  private _chain: ChainPort
  private _storage: StoragePort
  private _swapProvider: SwapProviderPort
  private _yieldProvider: YieldProviderPort
  private _walletService: WalletService
  private _transferService: TransferService
  private _swapService: SwapService
  private _yieldService: YieldService
  private _invoiceService: InvoiceService
  private _contacts: ContactManager
  private _safeguards: SafeguardEnforcer
  private _signer: SignerPort | null = null
  private _wallet: Wallet | null = null
  private _connected: boolean = false

  constructor(options: HoshiOptions = {}) {
    this.config = {
      rpcEndpoint: options.rpcUrl ?? DEFAULT_RPC_URL,
      commitment: 'confirmed',
      jupiterApiUrl: 'https://quote-api.jup.ag/v6',
      usdcMint: SUPPORTED_ASSETS.USDC.mint
    }

    this.vault = new EncryptedKeypairVault(options.keyPath ?? '~/.hoshi/keys')
    this._chain = options.chain ?? new SolanaChainAdapter(this.config.rpcEndpoint)
    this._storage = options.storage ?? new InMemoryStorageAdapter()
    this._swapProvider = options.swapProvider ?? new JupiterSwapAdapter()
    this._yieldProvider = options.yieldProvider ?? new KaminoYieldAdapter()

    this._walletService = new WalletService(this._storage, this._chain)
    this._transferService = new TransferService(this._storage, this._chain)
    this._swapService = new SwapService(this._storage, this._swapProvider)
    this._yieldService = new YieldService(this._storage, this._yieldProvider)
    this._invoiceService = new InvoiceService(this._storage)
    this._contacts = new ContactManager(options.configDir)
    this._safeguards = new SafeguardEnforcer(options.configDir)
  }

  get chain(): ChainPort {
    return this._chain
  }

  get storage(): StoragePort {
    return this._storage
  }

  get walletService(): WalletService {
    return this._walletService
  }

  get transferService(): TransferService {
    return this._transferService
  }

  get swapService(): SwapService {
    return this._swapService
  }

  get yieldService(): YieldService {
    return this._yieldService
  }

  get invoiceService(): InvoiceService {
    return this._invoiceService
  }

  get contacts(): ContactManager {
    return this._contacts
  }

  get safeguards(): SafeguardEnforcer {
    return this._safeguards
  }

  get signer(): SignerPort | null {
    return this._signer
  }

  get wallet(): Wallet | null {
    return this._wallet
  }

  get publicKey(): PublicKey | null {
    return this._wallet ? new PublicKey(this._wallet.publicKey) : null
  }

  get address(): string | null {
    return this._wallet?.publicKey ?? null
  }

  get isConnected(): boolean {
    return this._connected
  }

  async connect(rpcUrl?: string): Promise<void> {
    if (rpcUrl) {
      this._chain = new SolanaChainAdapter(rpcUrl)
    }
    await this._chain.connect()
    this._connected = true
  }

  async disconnect(): Promise<void> {
    this._connected = false
    this._signer = null
    this._wallet = null
  }

  async createWallet(input: {
    label?: string
    cluster?: 'devnet' | 'mainnet'
  }): Promise<{ walletId: string; publicKey: string }> {
    const walletId = crypto.randomUUID()

    const vaultResult = this.vault.create({
      walletId,
      password: '',
      label: input.label,
      defaultCluster: input.cluster ?? DEFAULT_NETWORK,
    })

    if (!vaultResult.ok) {
      throw new HoshiError('INVALID_KEYSTORE', vaultResult.error.message)
    }

    const walletResult = await this._walletService.create({
      id: walletId,
      publicKey: vaultResult.value.publicKey,
      label: input.label,
      managed: true,
      keystoreId: walletId,
      defaultCluster: input.cluster ?? DEFAULT_NETWORK,
    })

    if (!walletResult.ok) {
      throw new HoshiError('WALLET_NOT_FOUND', walletResult.error.message)
    }

    return {
      walletId: walletResult.value.id,
      publicKey: walletResult.value.publicKey,
    }
  }

  async loadWallet(walletId: string, password: string): Promise<Wallet | null> {
    const walletResult = await this._storage.getWallet(walletId)
    if (!walletResult.ok || !walletResult.value) return null

    const wallet = walletResult.value

    if (!wallet.managed || !wallet.keystoreId) return null

    const unlockResult = this.vault.unlock(wallet.keystoreId, password)
    if (!unlockResult.ok) return null

    this._signer = unlockResult.value
    this._wallet = wallet
    return wallet
  }

  async loadWalletByPublicKey(publicKey: string): Promise<Wallet | null> {
    const walletsResult = await this._storage.getWallets()
    if (!walletsResult.ok) return null

    const wallet = walletsResult.value.find(w => w.publicKey === publicKey)
    if (!wallet) return null

    this._wallet = wallet
    return wallet
  }

  setSigner(signer: SignerPort): void {
    this._signer = signer
  }

  async getBalance(asset: 'SOL' | 'USDC' = 'SOL'): Promise<string> {
    if (!this._wallet) throw new HoshiError('WALLET_NOT_FOUND', 'No wallet loaded')

    const result = await this._walletService.getOnChainBalance(this._wallet.id, asset)
    if (!result.ok) throw new HoshiError('TRANSACTION_FAILED', result.error.message)

    return result.value
  }

  async getBalances(): Promise<{ SOL: string; USDC: string }> {
    const [sol, usdc] = await Promise.all([
      this.getBalance('SOL'),
      this.getBalance('USDC'),
    ])
    return { SOL: sol, USDC: usdc }
  }

  async transfer(input: {
    to: string
    amount: string
    asset: 'SOL' | 'USDC'
  }): Promise<Receipt> {
    if (!this._signer) throw new HoshiError('WALLET_NOT_FOUND', 'No signer set')

    this._safeguards.assertNotLocked()

    const result = await this._transferService.sendSigned(
      {
        walletId: this._wallet!.id,
        to: input.to,
        amount: { amount: input.amount, asset: input.asset },
      },
      this._signer,
    )

    if (!result.ok) throw new HoshiError('TRANSACTION_FAILED', result.error.message)
    return result.value
  }

  async swap(input: {
    inputMint: string
    outputMint: string
    amount: string
    slippageBps?: number
  }): Promise<Receipt> {
    if (!this._signer) throw new HoshiError('WALLET_NOT_FOUND', 'No signer set')

    this._safeguards.assertNotLocked()

    const quoteResult = await this._swapProvider.getQuote({
      inputMint: input.inputMint,
      outputMint: input.outputMint,
      amount: input.amount,
      slippageBps: input.slippageBps ?? 50,
    })

    if (!quoteResult.ok) throw new HoshiError('SWAP_FAILED', quoteResult.error.message)

    const execResult = await this._swapService.executeSwap({
      walletId: this._wallet!.id,
      quoteId: quoteResult.value.id,
    })

    if (!execResult.ok) throw new HoshiError('SWAP_FAILED', execResult.error.message)
    return execResult.value
  }

  async getSwapQuote(input: {
    inputMint: string
    outputMint: string
    amount: string
    slippageBps?: number
  }): Promise<SwapQuote> {
    const result = await this._swapProvider.getQuote({
      inputMint: input.inputMint,
      outputMint: input.outputMint,
      amount: input.amount,
      slippageBps: input.slippageBps ?? 50,
    })

    if (!result.ok) throw new HoshiError('SWAP_NO_ROUTE', result.error.message)
    return result.value
  }

  async getReceipts(walletId?: string): Promise<Receipt[]> {
    const id = walletId ?? this._wallet?.id
    if (!id) throw new HoshiError('WALLET_NOT_FOUND', 'No wallet ID provided')

    const result = await this._storage.getReceipts(id)
    if (!result.ok) return []
    return result.value
  }

  static validatePublicKey(publicKey: string): boolean {
    try {
      new PublicKey(publicKey)
      return true
    } catch {
      return false
    }
  }

  static formatLamports(lamports: bigint, decimals = 9): string {
    const sol = Number(lamports) / 10 ** decimals
    return sol.toFixed(decimals)
  }

  static parseAmount(amount: string, decimals: number): bigint {
    const [whole, fraction = ''] = amount.split('.')
    const padded = fraction.padEnd(decimals, '0').slice(0, decimals)
    return BigInt(whole + padded)
  }
}

export function createHoshi(options?: HoshiOptions): Hoshi {
  return new Hoshi(options)
}

export async function initWallet(input: CreateKeystoreInput, keyPath?: string): Promise<{ address: string; walletId: string }> {
  const vault = new EncryptedKeypairVault(keyPath ?? '~/.hoshi/keys')
  const result = vault.create({
    walletId: input.walletId,
    password: input.password,
    label: input.label,
    defaultCluster: input.defaultCluster,
  })

  if (!result.ok) {
    throw new HoshiError('INVALID_KEYSTORE', result.error.message)
  }

  return {
    address: result.value.publicKey,
    walletId: result.value.walletId,
  }
}

export async function unlockWallet(walletId: string, password: string, keyPath?: string): Promise<KeypairSigner> {
  const vault = new EncryptedKeypairVault(keyPath ?? '~/.hoshi/keys')
  const result = vault.unlock(walletId, password)

  if (!result.ok) {
    throw new HoshiError('INVALID_PASSWORD', result.error.message)
  }

  return result.value
}

export { Hoshi as Client }
export default Hoshi
