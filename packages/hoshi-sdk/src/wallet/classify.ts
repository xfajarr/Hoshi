import type { Wallet, Receipt } from '../core/types.js'
import { TOKEN_REGISTRY, resolveSymbol } from '../token-registry.js'

export interface WalletSummary {
  id: string
  publicKey: string
  label: string | undefined
  managed: boolean
  cluster: string
  hasBalance: boolean
}

export interface BalanceSummary {
  asset: string
  symbol: string
  amount: string
  decimals: number
  usdValue?: string
  mint: string
}

export interface WalletClassification {
  type: 'hot' | 'cold' | 'treasury' | 'operational' | 'unknown'
  risk: 'low' | 'medium' | 'high'
  tags: string[]
  reasoning: string
}

export function classifyWallet(wallet: Wallet): WalletClassification {
  const tags: string[] = []
  let type: WalletClassification['type'] = 'unknown'
  let risk: WalletClassification['risk'] = 'medium'
  let reasoning = ''

  const label = wallet.label?.toLowerCase() ?? ''
  const isManaged = wallet.managed

  if (label.includes('treasury') || label.includes('reserve') || label.includes('vault')) {
    type = 'treasury'
    risk = 'low'
    tags.push('custodial', 'low-velocity')
    reasoning = 'Treasury wallet with low transaction velocity'
  } else if (label.includes('hot') || label.includes('trading') || label.includes(' arbitrage')) {
    type = 'hot'
    risk = 'high'
    tags.push('high-velocity', 'trading')
    reasoning = 'Hot wallet for active trading'
  } else if (label.includes('cold') || label.includes('storage') || label.includes('savings')) {
    type = 'cold'
    risk = 'low'
    tags.push('cold-storage', 'long-term')
    reasoning = 'Cold storage for long-term holdings'
  } else if (label.includes('ops') || label.includes('operational') || label.includes('payroll')) {
    type = 'operational'
    risk = 'medium'
    tags.push('operational', 'recurring')
    reasoning = 'Operational wallet for recurring payments'
  } else if (isManaged) {
    type = 'operational'
    risk = 'medium'
    tags.push('managed', 'agent-owned')
    reasoning = 'Managed wallet owned by an agent'
  } else {
    reasoning = 'Watch-only or imported wallet'
  }

  return { type, risk, tags, reasoning }
}

export function summarizeWallet(wallet: Wallet): WalletSummary {
  return {
    id: wallet.id,
    publicKey: wallet.publicKey,
    label: wallet.label,
    managed: wallet.managed ?? false,
    cluster: wallet.defaultCluster ?? 'devnet',
    hasBalance: false
  }
}

export function parseBalance(raw: { mint: string; amount: string; decimals?: number }): BalanceSummary {
  const meta = TOKEN_REGISTRY[resolveSymbol(raw.mint)]
  const decimals = raw.decimals ?? meta?.decimals ?? 9
  const amount = formatAmount(raw.amount, decimals)

  return {
    asset: resolveSymbol(raw.mint),
    symbol: meta?.symbol ?? 'UNKNOWN',
    amount,
    decimals,
    mint: raw.mint
  }
}

export function formatAmount(lamports: string, decimals: number): string {
  const value = BigInt(lamports) / BigInt(10 ** decimals)
  const remainder = BigInt(lamports) % BigInt(10 ** decimals)
  const decimalStr = remainder.toString().padStart(decimals, '0').slice(0, 4)
  return `${value}.${decimalStr.replace(/0+$/, '')}`
}

export function classifyReceipt(receipt: Receipt): {
  category: 'transfer' | 'swap' | 'yield' | 'stake' | 'other'
  direction: 'inbound' | 'outbound' | 'internal'
  isReceiving: boolean
  isSending: boolean
} {
  const actionType = receipt.actionType

  let category: 'transfer' | 'swap' | 'yield' | 'stake' | 'other' = 'other'
  if (actionType.startsWith('transfer')) category = 'transfer'
  else if (actionType.startsWith('swap')) category = 'swap'
  else if (actionType.startsWith('yield')) category = 'yield'
  else if (actionType.startsWith('stake')) category = 'stake'

  const isReceiving = actionType.includes('receive') || (receipt.amount?.amount.startsWith('+') ?? false)
  const isSending = actionType.includes('send') && !isReceiving

  const direction = isReceiving ? 'inbound' : isSending ? 'outbound' : 'internal'

  return { category, direction, isReceiving, isSending }
}

export function groupReceiptsByDate(receipts: Receipt[]): Map<string, Receipt[]> {
  const groups = new Map<string, Receipt[]>()

  for (const receipt of receipts) {
    const date = new Date(receipt.timestamp).toISOString().slice(0, 10)
    if (!groups.has(date)) groups.set(date, [])
    groups.get(date)!.push(receipt)
  }

  return groups
}

export function calculateTotalByAsset(
  receipts: Receipt[],
  asset: string
): { sent: string; received: string; net: string } {
  let sent = BigInt(0)
  let received = BigInt(0)

  for (const receipt of receipts) {
    if (receipt.status !== 'success') continue
    if (!receipt.amount || receipt.amount.asset !== asset) continue

    const parsed = BigInt(Math.floor(parseFloat(receipt.amount.amount) * 1e9))
    if (receipt.actionType.includes('send')) sent += parsed
    else if (receipt.actionType.includes('receive')) received += parsed
  }

  const fmt = (n: bigint) => (Number(n) / 1e9).toFixed(9).replace(/0+$/, '')

  return { sent: fmt(sent), received: fmt(received), net: fmt(received - sent) }
}
