import type { PolicyRule } from '@hoshi/engine'

export interface DefaultGuardrailOptions {
  perTransactionLimit: number
  dailyLimit: number
  allowedAssets: string[]
}

export const createDefaultGuardrails = (options: DefaultGuardrailOptions): PolicyRule[] => [
  {
    id: crypto.randomUUID(),
    name: 'Default asset allowlist',
    enabled: true,
    priority: 100,
    condition: {
      type: 'asset_type',
      params: { assets: options.allowedAssets },
    },
    action: 'block',
  },
  {
    id: crypto.randomUUID(),
    name: 'Default per-transaction limit',
    enabled: true,
    priority: 90,
    condition: {
      type: 'max_amount',
      params: { max: options.perTransactionLimit },
    },
    action: 'escalate',
  },
  {
    id: crypto.randomUUID(),
    name: 'Default daily spend limit',
    enabled: true,
    priority: 80,
    condition: {
      type: 'daily_limit',
      params: { limit: options.dailyLimit },
    },
    action: 'escalate',
  },
  {
    id: crypto.randomUUID(),
    name: 'Default approval for swaps and yield',
    enabled: true,
    priority: 70,
    condition: {
      type: 'action_type',
      params: {
        actions: ['swap.execute', 'yield.deposit', 'yield.withdraw'],
      },
    },
    action: 'escalate',
  },
]
