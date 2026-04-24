import type { PolicyRule, PolicyContext, PolicyResult } from '../core/types.js'
import type { PolicyStorePort } from '../ports/policy-store.js'
import type { Result } from '@hoshi/sdk'
import { Result as R } from '@hoshi/sdk'

export interface PolicyEngineConfig {
  defaultAction: 'allow' | 'block'
  maxDailyLimit?: number
}

export class PolicyEngine {
  constructor(
    private readonly store: PolicyStorePort,
    private readonly config: PolicyEngineConfig = { defaultAction: 'allow' },
  ) {}

  async evaluate(context: PolicyContext): Promise<Result<PolicyResult, Error>> {
    const rulesResult = await this.store.getRules(context.walletId)
    if (!rulesResult.ok) return rulesResult

    const rules = rulesResult.value
    const triggered: string[] = []
    let requiresEscalation = false
    let blocked = false
    let blockReason = ''

    // Sort by priority (higher first)
    const sortedRules = [...rules].sort((a, b) => (b.priority || 0) - (a.priority || 0))

    for (const rule of sortedRules) {
      if (!rule.enabled) continue

      const matches = this.matchCondition(rule, context)
      if (!matches) continue

      triggered.push(rule.id)

      switch (rule.action) {
        case 'block':
          blocked = true
          blockReason = `Blocked by rule "${rule.name}" (${rule.id})`
          break
        case 'escalate':
          requiresEscalation = true
          break
        case 'allow':
          break
      }
    }

    if (blocked) {
      return R.ok({
        action: 'write_escalated',
        allowed: false,
        rulesTriggered: triggered,
        reason: blockReason,
        requiresApproval: true
      })
    }

    if (requiresEscalation) {
      return R.ok({
        action: 'write_escalated',
        allowed: true,
        rulesTriggered: triggered,
        reason: 'Action requires approval due to policy escalation',
        requiresApproval: true
      })
    }

    const isRead = this.isReadAction(context.actionType)
    if (!isRead && triggered.length === 0 && this.config.defaultAction === 'block') {
      return R.ok({
        action: isRead ? 'read' : 'write_escalated',
        allowed: false,
        rulesTriggered: [],
        reason: 'Blocked by default policy posture',
        requiresApproval: false
      })
    }
    return R.ok({
      action: isRead ? 'read' : 'write_safe',
      allowed: true,
      rulesTriggered: triggered
    })
  }

  private matchCondition(rule: PolicyRule, context: PolicyContext): boolean {
    const { condition } = rule
    const { params } = condition

    switch (condition.type) {
      case 'max_amount': {
        if (!context.amount) return false
        const max = params.max as number
        const amount = parseFloat(context.amount.amount)
        return amount > max
      }
      case 'daily_limit': {
        if (!context.amount) return false
        const limit = params.limit as number
        const asset = context.amount.asset
        const spent = context.dailySpend[asset] || 0
        const amount = parseFloat(context.amount.amount)
        return (spent + amount) > limit
      }
      case 'recipient_allowlist': {
        if (!context.recipient) return false
        const allowed = params.allowed as string[]
        return !allowed.includes(context.recipient)
      }
      case 'action_type': {
        const actions = params.actions as string[]
        return actions.includes(context.actionType)
      }
      case 'asset_type': {
        if (!context.amount) return false
        const assets = params.assets as string[]
        return !assets.includes(context.amount.asset)
      }
      case 'time_window': {
        const now = new Date(context.timestamp)
        const hour = now.getHours()
        const startHour = params.startHour as number
        const endHour = params.endHour as number
        return hour < startHour || hour > endHour
      }
      default:
        return false
    }
  }

  private isReadAction(actionType: string): boolean {
    return actionType.endsWith('.read') || actionType === 'swap.quote'
  }
}
