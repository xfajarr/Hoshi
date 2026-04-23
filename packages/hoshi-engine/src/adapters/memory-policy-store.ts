import type { PolicyStorePort } from '../ports/policy-store.js'
import type { PolicyRule } from '../core/types.js'
import type { Result } from '@hoshi/sdk'
import { Result as R } from '@hoshi/sdk'

export class InMemoryPolicyStore implements PolicyStorePort {
  private rules = new Map<string, PolicyRule[]>()

  async getRules(walletId: string): Promise<Result<PolicyRule[], never>> {
    return R.ok(this.rules.get(walletId) || [])
  }

  async saveRules(walletId: string, rules: PolicyRule[]): Promise<Result<void, never>> {
    this.rules.set(walletId, rules)
    return R.ok(undefined)
  }

  async addRule(walletId: string, rule: PolicyRule): Promise<Result<void, never>> {
    const existing = this.rules.get(walletId) || []
    existing.push(rule)
    this.rules.set(walletId, existing)
    return R.ok(undefined)
  }

  async removeRule(walletId: string, ruleId: string): Promise<Result<void, never>> {
    const existing = this.rules.get(walletId) || []
    const filtered = existing.filter(r => r.id !== ruleId)
    this.rules.set(walletId, filtered)
    return R.ok(undefined)
  }
}
