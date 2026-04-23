import { describe, it, expect, beforeEach } from 'vitest'
import { 
  toolRegistry, 
  registerTool, 
  getTool, 
  listTools 
} from '../src/core/tools.js'
import { loadSkills, getSkill, matchSkills } from '../src/skills/loader.js'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const skillsDir = join(__dirname, '..', 'skills')
const skills = loadSkills(skillsDir)

describe('MCP Core', () => {
  beforeEach(() => {
    // Clear registry
    toolRegistry.length = 0
  })
  
  it('should register and retrieve tools', () => {
    registerTool({
      name: 'test_tool',
      description: 'A test tool',
      inputSchema: {} as any,
      category: 'read',
      handler: async () => ({ result: 'ok' })
    })
    
    const tool = getTool('test_tool')
    expect(tool).toBeDefined()
    expect(tool?.name).toBe('test_tool')
    expect(tool?.category).toBe('read')
  })
  
  it('should list all tools', () => {
    registerTool({
      name: 'tool_a',
      description: 'Tool A',
      inputSchema: {} as any,
      category: 'read',
      handler: async () => ({})
    })
    registerTool({
      name: 'tool_b',
      description: 'Tool B',
      inputSchema: {} as any,
      category: 'write_safe',
      handler: async () => ({})
    })
    
    const tools = listTools()
    expect(tools).toHaveLength(2)
    expect(tools.map(t => t.name)).toContain('tool_a')
    expect(tools.map(t => t.name)).toContain('tool_b')
  })
})

describe('Skills Loading', () => {
  it('should load all markdown skills', () => {
    expect(skills.size).toBeGreaterThan(0)
    expect(skills.has('hoshi-wallet-management')).toBe(true)
    expect(skills.has('hoshi-transfer')).toBe(true)
    expect(skills.has('hoshi-policy-management')).toBe(true)
  })
  
  it('should parse skill metadata', () => {
    const walletSkill = getSkill(skills, 'hoshi-wallet-management')
    expect(walletSkill).toBeDefined()
    expect(walletSkill?.name).toBe('Wallet Management')
    expect(walletSkill?.version).toBe('0.1.0')
    expect(walletSkill?.category).toBe('treasury')
    expect(walletSkill?.risk).toBe('low')
  })
  
  it('should parse transfer skill', () => {
    const skill = getSkill(skills, 'hoshi-transfer')
    expect(skill).toBeDefined()
    expect(skill?.name).toBe('Transfer')
    expect(skill?.risk).toBe('elevated')
    expect(skill?.tools).toBeDefined()
    expect(skill?.tools.length).toBeGreaterThan(0)
  })
  
  it('should parse policy management skill', () => {
    const skill = getSkill(skills, 'hoshi-policy-management')
    expect(skill).toBeDefined()
    expect(skill?.name).toBe('Policy Management')
    expect(skill?.risk).toBe('critical')
  })
  
  it('should have triggers', () => {
    const transferSkill = getSkill(skills, 'hoshi-transfer')
    expect(transferSkill?.whenToUse).toContain('send')
    expect(transferSkill?.whenToUse).toContain('transfer')
    
    const policySkill = getSkill(skills, 'hoshi-policy-management')
    expect(policySkill?.whenToUse).toContain('policy')
    expect(policySkill?.whenToUse).toContain('guardrails')
  })
  
  it('should have system prompts', () => {
    const walletSkill = getSkill(skills, 'hoshi-wallet-management')
    expect(walletSkill?.systemPrompt).toContain('treasury assistant')
    
    const transferSkill = getSkill(skills, 'hoshi-transfer')
    expect(transferSkill?.systemPrompt).toContain('secure transfer agent')
    expect(transferSkill?.systemPrompt).toContain('Policy Awareness')
  })
  
  it('should have examples', () => {
    const transferSkill = getSkill(skills, 'hoshi-transfer')
    expect(transferSkill?.examples).toBeDefined()
    expect(transferSkill?.examples?.length).toBeGreaterThan(0)
    
    const example = transferSkill?.examples?.[0]
    expect(example?.input).toContain('Send')
  })
  
  it('should have guardrails', () => {
    const skill = getSkill(skills, 'hoshi-transfer')
    expect(skill?.guardrails).toBeDefined()
    expect(skill?.guardrails.length).toBeGreaterThan(0)
  })
})

describe('Skill Matching', () => {
  it('should match skills by query', () => {
    const matched = matchSkills(skills, 'send 100 USDC to Alice')
    expect(matched.length).toBeGreaterThan(0)
    const ids = matched.map(s => s.id)
    expect(ids).toContain('hoshi-transfer')
  })
  
  it('should match multiple skills', () => {
    const matched = matchSkills(skills, 'check balance and send money')
    const ids = matched.map(s => s.id)
    expect(ids).toContain('hoshi-wallet-management')
    expect(ids).toContain('hoshi-transfer')
  })
  
  it('should return empty for irrelevant query', () => {
    const matched = matchSkills(skills, 'hello world')
    expect(matched).toHaveLength(0)
  })
})
