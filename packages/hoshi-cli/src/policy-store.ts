import { readFileSync, writeFileSync, existsSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import type { PolicyStorePort } from '@hoshi/engine'
import type { PolicyRule } from '@hoshi/engine'
import type { Result } from '@hoshi/engine'
import { Result as R } from '@hoshi/engine'

const DEFAULT_POLICY_PATH = join(homedir(), '.hoshi', 'policies.json')

interface PolicyData {
  rules: Record<string, PolicyRule[]> // walletId -> rules
}

export class JsonFilePolicyStore implements PolicyStorePort {
  private data: PolicyData

  constructor(private readonly path: string = DEFAULT_POLICY_PATH) {
    if (existsSync(this.path)) {
      this.data = JSON.parse(readFileSync(this.path, 'utf-8'))
    } else {
      this.data = { rules: {} }
      this.save()
    }
  }

  private save(): void {
    writeFileSync(this.path, JSON.stringify(this.data, null, 2))
  }

  async getRules(walletId: string): Promise<Result<PolicyRule[], never>> {
    const rules = this.data.rules[walletId] || []
    return R.ok(rules)
  }

  async saveRules(walletId: string, rules: PolicyRule[]): Promise<Result<void, never>> {
    this.data.rules[walletId] = rules
    this.save()
    return R.ok(undefined)
  }

  async addRule(walletId: string, rule: PolicyRule): Promise<Result<void, never>> {
    const rules = this.data.rules[walletId] || []
    const idx = rules.findIndex(r => r.id === rule.id)
    if (idx >= 0) rules[idx] = rule
    else rules.push(rule)
    this.data.rules[walletId] = rules
    this.save()
    return R.ok(undefined)
  }

  async removeRule(walletId: string, ruleId: string): Promise<Result<void, never>> {
    const rules = this.data.rules[walletId] || []
    this.data.rules[walletId] = rules.filter(r => r.id !== ruleId)
    this.save()
    return R.ok(undefined)
  }

  async clearRules(walletId: string): Promise<Result<void, never>> {
    delete this.data.rules[walletId]
    this.save()
    return R.ok(undefined)
  }

  listWallets(): string[] {
    return Object.keys(this.data.rules)
  }
}
