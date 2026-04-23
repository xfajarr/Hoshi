import { describe, it, expect } from 'vitest'
import { parseSkill, matchSkills } from '../src/skills/loader.js'
import type { Skill } from '../src/skills/loader.js'

const sampleSkill = `# Skill: Wallet Management

**id:** \`hoshi-wallet-management\`  
**version:** \`0.1.0\`  
**category:** treasury  
**risk:** low  

## Description

Read wallet balances and history.

## When to Use

- Check balance
- View history
- Wallet info

## MCP Tools

| Tool | Purpose | Args | Category |
|------|---------|------|----------|
| \`hoshi_balance\` | Get balance | walletId, asset | read |

## System Prompt

You are a treasury assistant.

## Examples

### Example 1: Balance check
**User:** "How much SOL?"

**Action:** Call hoshi_balance

**Response:** "You have 1.5 SOL"

## Guardrails

- ✅ Read-only
- ❌ Never guess wallet IDs
`

describe('Skill Parser', () => {
  it('should parse skill metadata', () => {
    const skill = parseSkill(sampleSkill)
    
    expect(skill.id).toBe('hoshi-wallet-management')
    expect(skill.name).toBe('Wallet Management')
    expect(skill.version).toBe('0.1.0')
    expect(skill.category).toBe('treasury')
    expect(skill.risk).toBe('low')
  })
  
  it('should parse description', () => {
    const skill = parseSkill(sampleSkill)
    expect(skill.description).toContain('Read wallet balances')
  })
  
  it('should parse triggers', () => {
    const skill = parseSkill(sampleSkill)
    expect(skill.whenToUse).toContain('Check balance')
    expect(skill.whenToUse).toContain('View history')
    expect(skill.whenToUse).toContain('Wallet info')
  })
  
  it('should parse tools', () => {
    const skill = parseSkill(sampleSkill)
    expect(skill.tools).toHaveLength(1)
    expect(skill.tools[0].name).toBe('hoshi_balance')
    expect(skill.tools[0].purpose).toBe('Get balance')
    expect(skill.tools[0].category).toBe('read')
  })
  
  it('should parse system prompt', () => {
    const skill = parseSkill(sampleSkill)
    expect(skill.systemPrompt).toContain('treasury assistant')
  })
  
  it('should parse examples', () => {
    const skill = parseSkill(sampleSkill)
    expect(skill.examples).toHaveLength(1)
    expect(skill.examples[0].input).toBe('How much SOL?')
    expect(skill.examples[0].response).toContain('1.5 SOL')
  })
  
  it('should parse guardrails', () => {
    const skill = parseSkill(sampleSkill)
    expect(skill.guardrails).toContain('✅ Read-only')
    expect(skill.guardrails).toContain('❌ Never guess wallet IDs')
  })
  
  it('should preserve raw markdown', () => {
    const skill = parseSkill(sampleSkill)
    expect(skill.raw).toContain('# Skill: Wallet Management')
    expect(skill.raw).toContain('## System Prompt')
  })
})

describe('Skill Matcher', () => {
  const skills = new Map<string, Skill>([
    ['wallet', {
      id: 'wallet',
      name: 'Wallet',
      version: '0.1',
      category: 'treasury',
      risk: 'low',
      description: '',
      whenToUse: ['balance', 'wallet'],
      tools: [],
      systemPrompt: '',
      examples: [],
      guardrails: [],
      raw: ''
    }],
    ['transfer', {
      id: 'transfer',
      name: 'Transfer',
      version: '0.1',
      category: 'treasury',
      risk: 'elevated',
      description: '',
      whenToUse: ['send', 'transfer', 'pay'],
      tools: [],
      systemPrompt: '',
      examples: [],
      guardrails: [],
      raw: ''
    }]
  ])
  
  it('should match by trigger', () => {
    const matched = matchSkills(skills, 'send 100 USDC')
    expect(matched).toHaveLength(1)
    expect(matched[0].id).toBe('transfer')
  })
  
  it('should match multiple skills', () => {
    const matched = matchSkills(skills, 'check balance and send money')
    expect(matched.length).toBeGreaterThanOrEqual(1)
    const ids = matched.map(s => s.id)
    expect(ids).toContain('wallet')
    expect(ids).toContain('transfer')
  })
  
  it('should match by skill name', () => {
    const matched = matchSkills(skills, 'use the transfer skill')
    expect(matched).toHaveLength(1)
    expect(matched[0].id).toBe('transfer')
  })
  
  it('should return empty for no match', () => {
    const matched = matchSkills(skills, 'hello world')
    expect(matched).toHaveLength(0)
  })
})
