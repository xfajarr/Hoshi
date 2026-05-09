import type { PaymentMethod, PaymentMethodId } from './types.js'
import { createSolanaPaymentMethod } from './solana-method.js'

export interface PaymentMethodRegistry {
  register(method: PaymentMethod): void
  get(methodId: PaymentMethodId): PaymentMethod | undefined
  list(): PaymentMethod[]
}

export class InMemoryPaymentMethodRegistry implements PaymentMethodRegistry {
  private readonly methods = new Map<PaymentMethodId, PaymentMethod>()

  register(method: PaymentMethod): void {
    this.methods.set(method.id, method)
  }

  get(methodId: PaymentMethodId): PaymentMethod | undefined {
    return this.methods.get(methodId)
  }

  list(): PaymentMethod[] {
    return Array.from(this.methods.values())
  }
}

export function createPaymentMethodRegistry(): PaymentMethodRegistry {
  const registry = new InMemoryPaymentMethodRegistry()
  registry.register(createSolanaPaymentMethod())
  return registry
}
