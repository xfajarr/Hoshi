import type { PolicyRule } from '../core/types.js'
import type { Result } from '@hoshi/sdk'

export interface PolicyStorePort {
  getRules(walletId: string): Promise<Result<PolicyRule[], Error>>
  saveRules(walletId: string, rules: PolicyRule[]): Promise<Result<void, Error>>
  addRule(walletId: string, rule: PolicyRule): Promise<Result<void, Error>>
  removeRule(walletId: string, ruleId: string): Promise<Result<void, Error>>
}
