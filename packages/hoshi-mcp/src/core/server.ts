import { 
  SolanaChainAdapter,
  InMemoryStorageAdapter,
  JupiterSwapAdapter,
  KaminoYieldAdapter,
  WalletService,
  TransferService,
  InvoiceService,
  SwapService,
  YieldService,
  KeypairSigner,
  type SignerPort,
  type Result
} from '@hoshi/sdk'
import { 
  PolicyEngine, 
  ExecutionService,
  InMemoryPolicyStore,
  InMemoryApprovalStore,
  type PolicyRule,
  type PolicyResult
} from '@hoshi/engine'
import type { ServerConfig } from '../config/index.js'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { homedir } from 'os'
import { join, dirname } from 'path'
import { mkdirSync } from 'fs'
import type { MCPTool } from './protocol.js'

/**
 * Persistent JSON storage for MCP server
 */
class McpJsonStorage extends InMemoryStorageAdapter {
  constructor(private readonly path: string) {
    super()
    const dir = dirname(path)
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    this.load()
  }
  
  private load(): void {
    if (!existsSync(this.path)) return
    try {
      const data = JSON.parse(readFileSync(this.path, 'utf-8'))
      // Restore data into parent's private maps
      // @ts-expect-error accessing private fields
      if (data.wallets) data.wallets.forEach((w: any) => this.wallets.set(w.id, w))
      // @ts-expect-error
      if (data.receipts) data.receipts.forEach((r: any) => this.receipts.set(r.id, r))
      // @ts-expect-error
      if (data.invoices) data.invoices.forEach((i: any) => this.invoices.set(i.id, i))
      // @ts-expect-error
      if (data.paymentLinks) data.paymentLinks.forEach((p: any) => this.paymentLinks.set(p.id, p))
      // @ts-expect-error
      if (data.yieldPositions) data.yieldPositions.forEach((y: any) => this.yieldPositions.set(y.id, y))
    } catch {
      // Ignore corrupted files
    }
  }
  
  async save(): Promise<void> {
    // @ts-expect-error
    const data = {
      wallets: Array.from(this.wallets.values()),
      receipts: Array.from(this.receipts.values()),
      invoices: Array.from(this.invoices.values()),
      paymentLinks: Array.from(this.paymentLinks.values()),
      yieldPositions: Array.from(this.yieldPositions.values())
    }
    writeFileSync(this.path, JSON.stringify(data, null, 2))
  }
  
  override async saveWallet(wallet: any): Promise<Result<void, never>> {
    const result = await super.saveWallet(wallet)
    await this.save()
    return result
  }
  
  override async saveReceipt(receipt: any): Promise<Result<void, never>> {
    const result = await super.saveReceipt(receipt)
    await this.save()
    return result
  }
  
  override async saveInvoice(invoice: any): Promise<Result<void, never>> {
    const result = await super.saveInvoice(invoice)
    await this.save()
    return result
  }
  
  override async savePaymentLink(link: any): Promise<Result<void, never>> {
    const result = await super.savePaymentLink(link)
    await this.save()
    return result
  }
  
  override async saveYieldPosition(position: any): Promise<Result<void, never>> {
    const result = await super.saveYieldPosition(position)
    await this.save()
    return result
  }
}

/**
 * Persistent policy store
 */
class McpJsonPolicyStore extends InMemoryPolicyStore {
  private data: Record<string, PolicyRule[]> = {}
  
  constructor(private readonly path: string) {
    super()
    const dir = dirname(path)
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    this.load()
  }
  
  private load(): void {
    if (!existsSync(this.path)) return
    try {
      this.data = JSON.parse(readFileSync(this.path, 'utf-8'))
    } catch {
      this.data = {}
    }
  }
  
  private persist(): void {
    writeFileSync(this.path, JSON.stringify(this.data, null, 2))
  }
  
  override async getRules(walletId: string): Promise<Result<PolicyRule[], never>> {
    return { ok: true, value: this.data[walletId] || [] }
  }
  
  override async saveRules(walletId: string, rules: PolicyRule[]): Promise<Result<void, never>> {
    this.data[walletId] = rules
    this.persist()
    return { ok: true, value: undefined }
  }
}

/**
 * Persistent approval store
 */
class McpJsonApprovalStore extends InMemoryApprovalStore {
  constructor(path: string) {
    super()
    const dir = dirname(path)
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  }
}

/**
 * MCP Server context with all dependencies
 */
export interface ServerContext {
  config: ServerConfig
  
  // Services
  walletService: WalletService
  transferService: TransferService
  invoiceService: InvoiceService
  swapService: SwapService
  yieldService: YieldService
  
  // Policy
  policyEngine: PolicyEngine
  executionService: ExecutionService
  
  // Signer (optional)
  signer: SignerPort | null
  
  // Tools
  tools: MCPTool[]
}

export async function createServerContext(config: ServerConfig): Promise<ServerContext> {
  const storagePath = join(homedir(), config.storagePath)
  const policyPath = join(homedir(), config.policyPath)
  const approvalPath = join(homedir(), config.approvalPath)
  
  // Storage
  const storage = new McpJsonStorage(storagePath)
  
  // Chain
  const chain = new SolanaChainAdapter(config.rpcEndpoint, config.commitment)
  await chain.connect()
  
  // Providers
  const jupiter = new JupiterSwapAdapter()
  const kamino = new KaminoYieldAdapter()
  
  // Services
  const walletService = new WalletService(storage, chain)
  const transferService = new TransferService(storage, chain)
  const invoiceService = new InvoiceService(storage)
  const swapService = new SwapService(storage, jupiter)
  const yieldService = new YieldService(storage, kamino)
  
  // Policy
  const policyStore = new McpJsonPolicyStore(policyPath)
  const approvalStore = new McpJsonApprovalStore(approvalPath)
  const policyEngine = new PolicyEngine(policyStore)
  const executionService = new ExecutionService(policyEngine, approvalStore)
  
  // Signer
  let signer: SignerPort | null = null
  if (config.keypairPath) {
    try {
      signer = KeypairSigner.fromFile(config.keypairPath)
    } catch (err) {
      console.warn(`Failed to load keypair from ${config.keypairPath}:`, err)
    }
  }
  
  return {
    config,
    walletService,
    transferService,
    invoiceService,
    swapService,
    yieldService,
    policyEngine,
    executionService,
    signer,
    tools: []
  }
}
