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
import { KyaClient } from './kya/client.js'
import { SafeguardEnforcer } from './safeguards/enforcer.js'
import { SafeguardError } from './safeguards/errors.js'
import type { AccountSummary, HoshiConfig, Wallet, Receipt, SwapQuote } from './core/types.js'
import { HoshiSDKError } from './core/errors.js'
import type { MppPaymentIntent, X402PaymentRequirement } from './payments/types.js'
import { toMppPaymentIntent } from './payments/mpp.js'
import { toX402PaymentRequirement } from './payments/x402.js'
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
import { OUTBOUND_OPS, type SafeguardOutcome, type TxMetadata } from './safeguards/types.js'
import { KyaAnchorRegistry } from './kya/anchor-registry.js'
export { HoshiError, mapSolanaError, isRetryableError }
export * from './errors.js'
export * from './constants.js'
export * from './token-registry.js'
export * from './safeguards/index.js'
export * from './contacts.js'
export * from './signer.js'
export * from './wallet/index.js'
export * from './swap-quote.js'

const RECENT_ACTIVITY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

function toTransferError(error: unknown): HoshiError {
  if (error instanceof HoshiError) {
    return error
  }

  const code = typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code?: unknown }).code)
    : null
  const context = typeof error === 'object' && error !== null && 'context' in error
    ? (error as { context?: Record<string, unknown> }).context
    : undefined
  const detail = typeof error === 'object' && error !== null && 'detail' in error
    ? (error as { detail?: Record<string, unknown> }).detail
    : undefined

  if (error instanceof SafeguardError || (typeof error === 'object' && error !== null && 'detail' in error && code && code !== 'VALIDATION_ERROR')) {
    return new HoshiError('SAFEGUARD_BLOCKED', 'Transfer blocked by safeguard', {
      safeguard: code ?? 'unknown',
      ...detail,
    })
  }

  if (code === 'VALIDATION_ERROR') {
    const message = typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message?: unknown }).message)
      : 'Validation failed'
    const normalizedCode = context?.to ? 'INVALID_ADDRESS' : 'INVALID_AMOUNT'
    return new HoshiError(normalizedCode, message, context, true)
  }

  if (code === 'INSUFFICIENT_BALANCE') {
    const message = typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message?: unknown }).message)
      : 'Insufficient balance'
    return new HoshiError('INSUFFICIENT_BALANCE', message, context, true)
  }

  if (code === 'NOT_FOUND') {
    const message = typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message?: unknown }).message)
      : 'Resource not found'
    return new HoshiError('WALLET_NOT_FOUND', message, context, true)
  }

  if (code === 'CHAIN_ERROR') {
    const message = typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message?: unknown }).message)
      : 'Transaction failed'
    return new HoshiError('TRANSACTION_FAILED', message, context, false)
  }

  if (error instanceof HoshiSDKError) {
    return new HoshiError('TRANSACTION_FAILED', error.message, error.context, error.recoverable)
  }

  const message = error instanceof Error ? error.message : String(error)
  return new HoshiError('TRANSACTION_FAILED', message, undefined, true)
}

export interface HoshiOptions {
  rpcUrl?: string
  keyPath?: string
  configDir?: string
  storage?: StoragePort
  chain?: ChainPort
  swapProvider?: SwapProviderPort
  yieldProvider?: YieldProviderPort
}

export interface CreateWalletInput {
  pin?: string
  label?: string
  cluster?: 'devnet' | 'mainnet'
}

export class Hoshi {
  public readonly kya: KyaClient
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
    this.kya = new KyaClient(
      new KyaAnchorRegistry({
        rpcEndpoint: this.config.rpcEndpoint,
        commitment: this.config.commitment,
        programId: new PublicKey(process.env.HOSHI_KYA_PROGRAM_ID ?? '11111111111111111111111111111111'),
        walletOwner: () => this.address,
        getSigner: () => this._signer,
      }),
      () => this.address,
    )
  }

  private resolveWalletId(walletId?: string): string | null {
    return walletId ?? this._wallet?.id ?? null
  }

  private requireWalletId(walletId?: string, message = 'No wallet loaded'): string {
    const resolvedWalletId = this.resolveWalletId(walletId)
    if (!resolvedWalletId) throw new HoshiError('WALLET_NOT_FOUND', message)
    return resolvedWalletId
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

  addContact(name: string, address: string, label?: string): { action: 'added' | 'updated' } {
    return this._contacts.add(name, address, label)
  }

  removeContact(name: string): boolean {
    return this._contacts.remove(name)
  }

  getContact(name: string): { name: string; address: string; label?: string } | null {
    return this._contacts.get(name) ?? null
  }

  listContacts(): { name: string; address: string; label?: string }[] {
    return this._contacts.list()
  }

  resolveContact(nameOrAddress: string): { address: string; contactName?: string } {
    return this._contacts.resolve(nameOrAddress)
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

  async createWallet(input: CreateWalletInput): Promise<{ walletId: string; publicKey: string }> {
    const walletId = crypto.randomUUID()
    const pin = input.pin
    if (typeof pin !== 'string' || pin.trim().length === 0) {
      throw new HoshiError('INVALID_PIN', 'Wallet PIN is required')
    }

    const vaultResult = this.vault.create({
      walletId,
      pin,
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

  async loadWallet(walletId: string, pin: string): Promise<Wallet | null> {
    const walletResult = await this._storage.getWallet(walletId)
    if (!walletResult.ok || !walletResult.value) return null

    const wallet = walletResult.value

    if (!wallet.managed || !wallet.keystoreId) return null

    const unlockResult = this.vault.unlock(wallet.keystoreId, pin)
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

  async balance(asset: 'SOL' | 'USDC' = 'SOL'): Promise<string> {
    return this.getBalance(asset)
  }

  async getBalances(): Promise<{ SOL: string; USDC: string }> {
    const [sol, usdc] = await Promise.all([
      this.getBalance('SOL'),
      this.getBalance('USDC'),
    ])
    return { SOL: sol, USDC: usdc }
  }

  async balances(): Promise<{ SOL: string; USDC: string }> {
    return this.getBalances()
  }

  async getAccountSummary(): Promise<AccountSummary> {
    const summary: AccountSummary = {
      walletId: this._wallet?.id ?? null,
      publicKey: this._wallet?.publicKey ?? null,
      connected: this.isConnected,
      balances: { SOL: null, USDC: null },
      available: { SOL: null, USDC: null },
      activity: { receiptCount: 0, recentReceiptCount: 0 },
    }

    if (!summary.walletId) {
      return summary
    }

    const [solResult, usdcResult, receiptsResult] = await Promise.all([
      this._walletService.getOnChainBalance(summary.walletId, 'SOL'),
      this._walletService.getOnChainBalance(summary.walletId, 'USDC'),
      this._storage.getReceipts(summary.walletId),
    ])

    if (solResult.ok) {
      summary.balances.SOL = solResult.value
      summary.available.SOL = solResult.value
    }

    if (usdcResult.ok) {
      summary.balances.USDC = usdcResult.value
      summary.available.USDC = usdcResult.value
    }

    if (receiptsResult.ok) {
      const now = Date.now()
      summary.activity.receiptCount = receiptsResult.value.length
      summary.activity.recentReceiptCount = receiptsResult.value.filter(receipt => {
        const timestamp = Date.parse(receipt.timestamp)
        return Number.isFinite(timestamp) && now - timestamp <= RECENT_ACTIVITY_WINDOW_MS
      }).length
    }

    return summary
  }

  async transfer(input: {
    to: string
    amount: string
    asset: 'SOL' | 'USDC'
  }): Promise<Receipt> {
    if (!this._signer) throw new HoshiError('WALLET_NOT_FOUND', 'No signer set')

    const safeguardOutcome = this.checkSafeguard({
      operation: 'transfer',
      amount: Number(input.amount),
      asset: input.asset,
    })
    if (safeguardOutcome.status !== 'allowed') {
      throw new HoshiError('SAFEGUARD_BLOCKED', safeguardOutcome.status === 'pending_approval'
        ? 'Transfer requires approval'
        : 'Transfer blocked by safeguard', {
        safeguardOutcome,
      }, safeguardOutcome.status === 'pending_approval')
    }

    const result = await this._transferService.sendSigned(
      {
        walletId: this._wallet!.id,
        to: input.to,
        amount: { amount: input.amount, asset: input.asset },
      },
      this._signer,
    )

    if (!result.ok) throw toTransferError(result.error)
    return result.value
  }

  async send(input: {
    to: string
    amount: string
    asset: 'SOL' | 'USDC'
  }): Promise<Receipt> {
    return this.transfer(input)
  }

  async pay(input: {
    to: string
    amount: string
    asset: 'SOL' | 'USDC'
  }): Promise<Receipt> {
    return this.transfer(input)
  }

  async receive(input: {
    amount: string
    asset: 'SOL' | 'USDC'
    description: string
    walletId?: string
    expiresInHours?: number
  }): Promise<X402PaymentRequirement> {
    const walletId = this.requireWalletId(input.walletId)

    const result = await this._invoiceService.createInvoice({
      walletId,
      amount: { amount: input.amount, asset: input.asset },
      description: input.description,
      expiresInHours: input.expiresInHours,
    })

    if (!result.ok) {
      const code = result.error.code === 'NOT_FOUND' ? 'WALLET_NOT_FOUND' : 'INVALID_AMOUNT'
      throw new HoshiError(code, result.error.message)
    }

    return toX402PaymentRequirement(result.value)
  }

  async createPaymentLink(input: {
    amount: string
    asset: 'SOL' | 'USDC'
    description: string
    walletId?: string
    expiresInHours?: number
  }): Promise<MppPaymentIntent> {
    const walletId = this.requireWalletId(input.walletId)

    const result = await this._invoiceService.createPaymentLink({
      walletId,
      amount: { amount: input.amount, asset: input.asset },
      description: input.description,
      expiresInHours: input.expiresInHours,
    })

    if (!result.ok) {
      const code = result.error.code === 'NOT_FOUND' ? 'WALLET_NOT_FOUND' : 'INVALID_AMOUNT'
      throw new HoshiError(code, result.error.message)
    }

    return toMppPaymentIntent(result.value)
  }

  async swap(input: {
    inputMint: string
    outputMint: string
    amount: string
    slippageBps?: number
  }): Promise<Receipt> {
    if (!this._signer) throw new HoshiError('WALLET_NOT_FOUND', 'No signer set')

    const safeguardOutcome = this.checkSafeguard({
      operation: 'swap',
      amount: Number(input.amount),
    })
    if (safeguardOutcome.status !== 'allowed') {
      throw new HoshiError('SAFEGUARD_BLOCKED', safeguardOutcome.status === 'pending_approval'
        ? 'Swap requires approval'
        : 'Swap blocked by safeguard', {
        safeguardOutcome,
      }, safeguardOutcome.status === 'pending_approval')
    }

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
    const id = this.requireWalletId(walletId, 'No wallet ID provided')

    const result = await this._storage.getReceipts(id)
    if (!result.ok) return []
    return result.value
  }

  async receipts(walletId?: string): Promise<Receipt[]> {
    return this.getReceipts(walletId)
  }

  async getHistory(walletId?: string): Promise<Receipt[]> {
    return this.getReceipts(walletId)
  }

  async history(walletId?: string): Promise<Receipt[]> {
    return this.getHistory(walletId)
  }

  async getReceipt(receiptId: string): Promise<Receipt | null> {
    const result = await this._storage.getReceipt(receiptId)
    if (!result.ok) return null
    return result.value
  }

  async getRecentHistory(walletId?: string, windowMs = RECENT_ACTIVITY_WINDOW_MS): Promise<Receipt[]> {
    const receipts = await this.getHistory(walletId)
    const now = Date.now()
    return receipts.filter(receipt => {
      const timestamp = Date.parse(receipt.timestamp)
      return Number.isFinite(timestamp) && now - timestamp <= windowMs
    })
  }

  checkSafeguard(metadata: TxMetadata): SafeguardOutcome {
    const config = this._safeguards.getConfig()

    if (config.locked) {
      return { status: 'pending_approval', safeguard: 'locked', detail: {} }
    }

    if (!OUTBOUND_OPS.has(metadata.operation)) {
      return { status: 'allowed' }
    }

    const amount = metadata.amount ?? 0

    if (config.maxPerTx > 0 && amount > config.maxPerTx) {
      return {
        status: 'blocked',
        safeguard: 'maxPerTx',
        detail: { attempted: amount, limit: config.maxPerTx },
      }
    }

    const dailyUsed = config.dailyResetDate === new Date().toISOString().slice(0, 10)
      ? config.dailyUsed
      : 0

    if (config.maxDailySend > 0 && dailyUsed + amount > config.maxDailySend) {
      return {
        status: 'blocked',
        safeguard: 'maxDailySend',
        detail: {
          attempted: amount,
          limit: config.maxDailySend,
          current: dailyUsed,
        },
      }
    }

    return { status: 'allowed' }
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
    pin: input.pin,
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

export async function unlockWallet(walletId: string, pin: string, keyPath?: string): Promise<KeypairSigner> {
  const vault = new EncryptedKeypairVault(keyPath ?? '~/.hoshi/keys')
   const result = vault.unlock(walletId, pin)

  if (!result.ok) {
    throw new HoshiError('INVALID_PIN', result.error.message)
  }

  return result.value
}

export { Hoshi as Client }
export default Hoshi
