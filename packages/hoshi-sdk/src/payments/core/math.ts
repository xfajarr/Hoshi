import type { PaymentAmount } from './types.js'

function scaleAmount(value: string): { scaled: bigint; scale: number } {
  const [whole, fraction = ''] = value.split('.')
  const cleanWhole = whole === '' ? '0' : whole
  const cleanFraction = fraction.replace(/[^0-9]/g, '')
  const scale = cleanFraction.length
  const scaled = BigInt(cleanWhole + cleanFraction.padEnd(scale, '0'))
  return { scaled, scale }
}

export function addPaymentAmounts(a: PaymentAmount, b: PaymentAmount): PaymentAmount {
  if (a.asset !== b.asset) {
    throw new Error('PAYMENT_ASSET_MISMATCH')
  }

  const left = scaleAmount(a.amount)
  const right = scaleAmount(b.amount)
  const scale = Math.max(left.scale, right.scale)
  const leftScaled = left.scaled * 10n ** BigInt(scale - left.scale)
  const rightScaled = right.scaled * 10n ** BigInt(scale - right.scale)
  const total = leftScaled + rightScaled
  const raw = total.toString().padStart(scale + 1, '0')

  if (scale === 0) {
    return { amount: raw, asset: a.asset }
  }

  const whole = raw.slice(0, -scale) || '0'
  const fraction = raw.slice(-scale).replace(/0+$/, '')
  return { amount: fraction ? `${whole}.${fraction}` : whole, asset: a.asset }
}

export function isAmountZero(amount: PaymentAmount): boolean {
  return /^0+(\.0+)?$/.test(amount.amount)
}
