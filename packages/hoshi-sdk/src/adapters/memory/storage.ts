import type { StoragePort } from '../../ports/storage.js'
import type { Wallet, Receipt, Invoice, PaymentLink, YieldPosition } from '../../core/types.js'
import type { Result } from '../../core/result.js'
import { Result as R } from '../../core/result.js'
// NotFoundError not needed in this adapter from '../../core/errors.js'

export class InMemoryStorageAdapter implements StoragePort {
  private wallets = new Map<string, Wallet>()
  private receipts = new Map<string, Receipt>()
  private invoices = new Map<string, Invoice>()
  private paymentLinks = new Map<string, PaymentLink>()
  private yieldPositions = new Map<string, YieldPosition>()

  // Wallet operations
  async saveWallet(wallet: Wallet): Promise<Result<void, never>> {
    this.wallets.set(wallet.id, wallet)
    return R.ok(undefined)
  }

  async getWallet(id: string): Promise<Result<Wallet | null, never>> {
    return R.ok(this.wallets.get(id) || null)
  }

  async getWallets(): Promise<Result<Wallet[], never>> {
    return R.ok(Array.from(this.wallets.values()))
  }

  async updateWallet(wallet: Wallet): Promise<Result<void, never>> {
    this.wallets.set(wallet.id, wallet)
    return R.ok(undefined)
  }

  // Receipt operations
  async saveReceipt(receipt: Receipt): Promise<Result<void, never>> {
    this.receipts.set(receipt.id, receipt)
    return R.ok(undefined)
  }

  async getReceipts(walletId: string): Promise<Result<Receipt[], never>> {
    const items = Array.from(this.receipts.values())
      .filter(r => r.walletId === walletId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    return R.ok(items)
  }

  async getReceipt(id: string): Promise<Result<Receipt | null, never>> {
    return R.ok(this.receipts.get(id) || null)
  }

  // Invoice operations
  async saveInvoice(invoice: Invoice): Promise<Result<void, never>> {
    this.invoices.set(invoice.id, invoice)
    return R.ok(undefined)
  }

  async getInvoice(id: string): Promise<Result<Invoice | null, never>> {
    return R.ok(this.invoices.get(id) || null)
  }

  async getInvoices(walletId: string): Promise<Result<Invoice[], never>> {
    const items = Array.from(this.invoices.values())
      .filter(i => i.walletId === walletId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    return R.ok(items)
  }

  async updateInvoice(invoice: Invoice): Promise<Result<void, never>> {
    this.invoices.set(invoice.id, invoice)
    return R.ok(undefined)
  }

  // Payment link operations
  async savePaymentLink(link: PaymentLink): Promise<Result<void, never>> {
    this.paymentLinks.set(link.id, link)
    return R.ok(undefined)
  }

  async getPaymentLink(id: string): Promise<Result<PaymentLink | null, never>> {
    return R.ok(this.paymentLinks.get(id) || null)
  }

  async getPaymentLinks(walletId: string): Promise<Result<PaymentLink[], never>> {
    const items = Array.from(this.paymentLinks.values())
      .filter(p => p.walletId === walletId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    return R.ok(items)
  }

  async updatePaymentLink(link: PaymentLink): Promise<Result<void, never>> {
    this.paymentLinks.set(link.id, link)
    return R.ok(undefined)
  }

  // Yield position operations
  async saveYieldPosition(position: YieldPosition): Promise<Result<void, never>> {
    this.yieldPositions.set(position.id, position)
    return R.ok(undefined)
  }

  async getYieldPosition(id: string): Promise<Result<YieldPosition | null, never>> {
    return R.ok(this.yieldPositions.get(id) || null)
  }

  async getYieldPositions(walletId: string): Promise<Result<YieldPosition[], never>> {
    const items = Array.from(this.yieldPositions.values())
      .filter(y => y.walletId === walletId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    return R.ok(items)
  }

  async updateYieldPosition(position: YieldPosition): Promise<Result<void, never>> {
    this.yieldPositions.set(position.id, position)
    return R.ok(undefined)
  }
}
