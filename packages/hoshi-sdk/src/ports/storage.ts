import type { Wallet, Receipt, Invoice, PaymentLink, YieldPosition } from '../core/types.js'
import type { Result } from '../core/result.js'
import type { HoshiSDKError } from '../core/errors.js'

export interface StoragePort {
  // Wallet operations
  saveWallet(wallet: Wallet): Promise<Result<void, HoshiSDKError>>
  getWallet(id: string): Promise<Result<Wallet | null, HoshiSDKError>>
  getWallets(): Promise<Result<Wallet[], HoshiSDKError>>
  updateWallet(wallet: Wallet): Promise<Result<void, HoshiSDKError>>

  // Receipt operations
  saveReceipt(receipt: Receipt): Promise<Result<void, HoshiSDKError>>
  getReceipts(walletId: string): Promise<Result<Receipt[], HoshiSDKError>>
  getReceipt(id: string): Promise<Result<Receipt | null, HoshiSDKError>>

  // Invoice operations
  saveInvoice(invoice: Invoice): Promise<Result<void, HoshiSDKError>>
  getInvoice(id: string): Promise<Result<Invoice | null, HoshiSDKError>>
  getInvoices(walletId: string): Promise<Result<Invoice[], HoshiSDKError>>
  updateInvoice(invoice: Invoice): Promise<Result<void, HoshiSDKError>>

  // Payment link operations
  savePaymentLink(link: PaymentLink): Promise<Result<void, HoshiSDKError>>
  getPaymentLink(id: string): Promise<Result<PaymentLink | null, HoshiSDKError>>
  getPaymentLinks(walletId: string): Promise<Result<PaymentLink[], HoshiSDKError>>
  updatePaymentLink(link: PaymentLink): Promise<Result<void, HoshiSDKError>>

  // Yield position operations
  saveYieldPosition(position: YieldPosition): Promise<Result<void, HoshiSDKError>>
  getYieldPosition(id: string): Promise<Result<YieldPosition | null, HoshiSDKError>>
  getYieldPositions(walletId: string): Promise<Result<YieldPosition[], HoshiSDKError>>
  updateYieldPosition(position: YieldPosition): Promise<Result<void, HoshiSDKError>>
}
