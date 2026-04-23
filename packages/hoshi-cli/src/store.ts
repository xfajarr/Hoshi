import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import type { StoragePort } from '@hoshi/sdk'
import type { Result } from '@hoshi/sdk'
import { Result as R } from '@hoshi/sdk'
import type { Wallet, Receipt, Invoice, PaymentLink, YieldPosition } from '@hoshi/sdk'

const DEFAULT_PATH = join(homedir(), '.hoshi', 'store.json')

interface StoreData {
  wallets: Wallet[]
  receipts: Receipt[]
  invoices: Invoice[]
  paymentLinks: PaymentLink[]
  yieldPositions: YieldPosition[]
}

export class JsonFileStorage implements StoragePort {
  private data: StoreData

  constructor(private readonly path: string = DEFAULT_PATH) {
    // Ensure directory exists
    const dir = join(this.path, '..')
    if (!existsSync(dir)) {
      // use mkdirSync directly
      mkdirSync(dir, { recursive: true })
    }
    
    if (existsSync(this.path)) {
      this.data = JSON.parse(readFileSync(this.path, 'utf-8'))
    } else {
      this.data = { wallets: [], receipts: [], invoices: [], paymentLinks: [], yieldPositions: [] }
      this.save()
    }
  }

  private save(): void {
    writeFileSync(this.path, JSON.stringify(this.data, null, 2))
  }

  // Wallet operations
  async saveWallet(wallet: Wallet): Promise<Result<void, never>> {
    const idx = this.data.wallets.findIndex(w => w.id === wallet.id)
    if (idx >= 0) this.data.wallets[idx] = wallet
    else this.data.wallets.push(wallet)
    this.save()
    return R.ok(undefined)
  }

  async getWallet(id: string): Promise<Result<Wallet | null, never>> {
    return R.ok(this.data.wallets.find(w => w.id === id) || null)
  }

  async getWallets(): Promise<Result<Wallet[], never>> {
    return R.ok(this.data.wallets)
  }

  async updateWallet(wallet: Wallet): Promise<Result<void, never>> {
    return this.saveWallet(wallet)
  }

  // Receipt operations
  async saveReceipt(receipt: Receipt): Promise<Result<void, never>> {
    const idx = this.data.receipts.findIndex(r => r.id === receipt.id)
    if (idx >= 0) this.data.receipts[idx] = receipt
    else this.data.receipts.push(receipt)
    this.save()
    return R.ok(undefined)
  }

  async getReceipts(walletId: string): Promise<Result<Receipt[], never>> {
    return R.ok(this.data.receipts.filter(r => r.walletId === walletId).sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    ))
  }

  async getReceipt(id: string): Promise<Result<Receipt | null, never>> {
    return R.ok(this.data.receipts.find(r => r.id === id) || null)
  }

  // Invoice operations
  async saveInvoice(invoice: Invoice): Promise<Result<void, never>> {
    const idx = this.data.invoices.findIndex(i => i.id === invoice.id)
    if (idx >= 0) this.data.invoices[idx] = invoice
    else this.data.invoices.push(invoice)
    this.save()
    return R.ok(undefined)
  }

  async getInvoice(id: string): Promise<Result<Invoice | null, never>> {
    return R.ok(this.data.invoices.find(i => i.id === id) || null)
  }

  async getInvoices(walletId: string): Promise<Result<Invoice[], never>> {
    return R.ok(this.data.invoices.filter(i => i.walletId === walletId).sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ))
  }

  async updateInvoice(invoice: Invoice): Promise<Result<void, never>> {
    return this.saveInvoice(invoice)
  }

  // Payment link operations
  async savePaymentLink(link: PaymentLink): Promise<Result<void, never>> {
    const idx = this.data.paymentLinks.findIndex(p => p.id === link.id)
    if (idx >= 0) this.data.paymentLinks[idx] = link
    else this.data.paymentLinks.push(link)
    this.save()
    return R.ok(undefined)
  }

  async getPaymentLink(id: string): Promise<Result<PaymentLink | null, never>> {
    return R.ok(this.data.paymentLinks.find(p => p.id === id) || null)
  }

  async getPaymentLinks(walletId: string): Promise<Result<PaymentLink[], never>> {
    return R.ok(this.data.paymentLinks.filter(p => p.walletId === walletId).sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ))
  }

  async updatePaymentLink(link: PaymentLink): Promise<Result<void, never>> {
    return this.savePaymentLink(link)
  }

  // Yield position operations
  async saveYieldPosition(position: YieldPosition): Promise<Result<void, never>> {
    const idx = this.data.yieldPositions.findIndex(y => y.id === position.id)
    if (idx >= 0) this.data.yieldPositions[idx] = position
    else this.data.yieldPositions.push(position)
    this.save()
    return R.ok(undefined)
  }

  async getYieldPosition(id: string): Promise<Result<YieldPosition | null, never>> {
    return R.ok(this.data.yieldPositions.find(y => y.id === id) || null)
  }

  async getYieldPositions(walletId: string): Promise<Result<YieldPosition[], never>> {
    return R.ok(this.data.yieldPositions.filter(y => y.walletId === walletId).sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ))
  }

  async updateYieldPosition(position: YieldPosition): Promise<Result<void, never>> {
    return this.saveYieldPosition(position)
  }
}
