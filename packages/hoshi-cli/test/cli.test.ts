import { beforeEach, describe, expect, it } from 'vitest'
import type { PolicyRule } from '@hoshi/engine'
import { JsonFileStorage } from '../src/store.js'
import { JsonFilePolicyStore } from '../src/policy-store.js'
import { createDefaultGuardrails } from '../src/default-policies.js'

describe('CLI Storage', () => {
  it('should persist wallets', async () => {
    const store = new JsonFileStorage('/tmp/test-hoshi-store.json')
    const wallet = {
      id: 'test-wallet',
      publicKey: '11111111111111111111111111111111',
      label: 'Test',
      managed: true,
      keystoreId: 'test-wallet',
      defaultCluster: 'devnet' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const saveResult = await store.saveWallet(wallet)
    expect(saveResult.ok).toBe(true)

    const getResult = await store.getWallet('test-wallet')
    expect(getResult.ok).toBe(true)
    expect(getResult.value?.publicKey).toBe('11111111111111111111111111111111')
    expect(getResult.value?.managed).toBe(true)
  })
})

describe('CLI Policy Store', () => {
  let policyStore: JsonFilePolicyStore

  beforeEach(() => {
    policyStore = new JsonFilePolicyStore('/tmp/test-hoshi-policies.json')
  })

  it('should persist policy rules', async () => {
    const rule: PolicyRule = {
      id: 'r1',
      name: 'Test rule',
      enabled: true,
      priority: 1,
      condition: { type: 'max_amount', params: { max: 100 } },
      action: 'escalate',
    }

    const addResult = await policyStore.addRule('w1', rule)
    expect(addResult.ok).toBe(true)

    const getResult = await policyStore.getRules('w1')
    expect(getResult.ok).toBe(true)
    expect(getResult.value).toHaveLength(1)
    expect(getResult.value[0].name).toBe('Test rule')
  })

  it('should remove policy rules', async () => {
    const rule: PolicyRule = {
      id: 'r2',
      name: 'Remove me',
      enabled: true,
      priority: 0,
      condition: { type: 'action_type', params: { actions: ['transfer.send'] } },
      action: 'block',
    }

    await policyStore.addRule('w2', rule)
    const removeResult = await policyStore.removeRule('w2', 'r2')
    expect(removeResult.ok).toBe(true)

    const getResult = await policyStore.getRules('w2')
    expect(getResult.value).toHaveLength(0)
  })

  it('should list wallets with policies', async () => {
    const rule: PolicyRule = {
      id: 'r3',
      name: 'Wallet 3 rule',
      enabled: true,
      priority: 0,
      condition: { type: 'daily_limit', params: { limit: 500 } },
      action: 'escalate',
    }

    await policyStore.addRule('w3', rule)
    const wallets = policyStore.listWallets()
    expect(wallets).toContain('w3')
  })
})

describe('default guardrails', () => {
  it('creates the expected safety policy pack', () => {
    const rules = createDefaultGuardrails({
      perTransactionLimit: 100,
      dailyLimit: 500,
      allowedAssets: ['USDC', 'SOL'],
    })

    expect(rules).toHaveLength(4)
    expect(rules.some((rule) => rule.condition.type === 'asset_type' && rule.action === 'block')).toBe(true)
    expect(rules.some((rule) => rule.condition.type === 'max_amount' && rule.action === 'escalate')).toBe(true)
    expect(rules.some((rule) => rule.condition.type === 'daily_limit' && rule.action === 'escalate')).toBe(true)
    expect(rules.some((rule) => rule.condition.type === 'action_type' && rule.action === 'escalate')).toBe(true)
  })
})
