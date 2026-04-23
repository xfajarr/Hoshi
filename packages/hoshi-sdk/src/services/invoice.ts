import type { StoragePort } from '../ports/storage.js'
import type { Result } from '../core/result.js'
import { Result as R } from '../core/result.js'
import type { Invoice, PaymentLink, Money } from '../core/types.js'
import { NotFoundError, ValidationError, HoshiSDKError } from '../core/errors.js'

export interface CreateInvoiceInput {
  walletId: string
  amount: Money
  description: string
  expiresInHours?: number
}

export interface CreatePaymentLinkInput {
  walletId: string
  amount: Money
  description: string
  expiresInHours?: number
}

export class InvoiceService {
  constructor(private readonly storage: StoragePort) {}

  async createInvoice(input: CreateInvoiceInput): Promise<Result<Invoice, ValidationError | NotFoundError>> {
    const walletResult = await this.storage.getWallet(input.walletId)
    if (!walletResult.ok) return walletResult
    if (!walletResult.value) {
      return R.err(new NotFoundError('Wallet', input.walletId))
    }

    const now = new Date()
    const invoice: Invoice = {
      id: crypto.randomUUID(),
      walletId: input.walletId,
      amount: input.amount,
      description: input.description,
      status: 'pending',
      paymentLink: `https://pay.hoshi.ai/i/${crypto.randomUUID()}`,
      createdAt: now.toISOString(),
      expiresAt: input.expiresInHours 
        ? new Date(now.getTime() + input.expiresInHours * 3600 * 1000).toISOString()
        : undefined
    }

    await this.storage.saveInvoice(invoice)
    return R.ok(invoice)
  }

  async getInvoice(id: string): Promise<Result<Invoice | null, HoshiSDKError>> {
    return this.storage.getInvoice(id)
  }

  async getInvoices(walletId: string): Promise<Result<Invoice[], HoshiSDKError>> {
    return this.storage.getInvoices(walletId)
  }

  async createPaymentLink(input: CreatePaymentLinkInput): Promise<Result<PaymentLink, ValidationError | NotFoundError>> {
    const walletResult = await this.storage.getWallet(input.walletId)
    if (!walletResult.ok) return walletResult
    if (!walletResult.value) {
      return R.err(new NotFoundError('Wallet', input.walletId))
    }

    const now = new Date()
    const link: PaymentLink = {
      id: crypto.randomUUID(),
      walletId: input.walletId,
      amount: input.amount,
      description: input.description,
      url: `https://pay.hoshi.ai/p/${crypto.randomUUID()}`,
      status: 'active',
      createdAt: now.toISOString(),
      expiresAt: input.expiresInHours
        ? new Date(now.getTime() + input.expiresInHours * 3600 * 1000).toISOString()
        : undefined
    }

    await this.storage.savePaymentLink(link)
    return R.ok(link)
  }

  async getPaymentLinks(walletId: string): Promise<Result<PaymentLink[], HoshiSDKError>> {
    return this.storage.getPaymentLinks(walletId)
  }
}
