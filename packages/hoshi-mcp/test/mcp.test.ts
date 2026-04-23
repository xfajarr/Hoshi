import { describe, it, expect, beforeEach } from 'vitest'
import { 
  toolRegistry, 
  registerTool, 
  getTool, 
  listTools 
} from '../src/core/tools.js'
import { 
  walletManagement, 
  transfer, 
  policyManagement,
  allSkills,
  getSkill
} from '../src/skills/index.js'

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

describe('Skills', () => {
  it('should export all skills', () => {
    expect(allSkills).toHaveLength(6)
    expect(allSkills).toContain('wallet-management')
    expect(allSkills).toContain('transfer')
    expect(allSkills).toContain('policy-management')
  })
  
  it('should get skill definitions', () => {
    const walletSkill = getSkill('wallet-management')
    expect(walletSkill).toBeDefined()
    expect(walletSkill?.name).toBe('hoshi-wallet-management')
    expect(walletSkill?.tools).toContain('hoshi_wallet_create')
    expect(walletSkill?.tools).toContain('hoshi_balance')
  })
  
  it('should get transfer skill', () => {
    const skill = getSkill('transfer')
    expect(skill).toBeDefined()
    expect(skill?.name).toBe('hoshi-transfer')
    expect(skill?.risk).toBe('elevated')
    expect(skill?.tools).toContain('hoshi_send')
  })
  
  it('should get policy management skill', () => {
    const skill = getSkill('policy-management')
    expect(skill).toBeDefined()
    expect(skill?.name).toBe('hoshi-policy-management')
    expect(skill?.risk).toBe('critical')
    expect(skill?.tools).toContain('hoshi_policy_add')
    expect(skill?.tools).toContain('hoshi_approve')
  })
  
  it('should return null for unknown skill', () => {
    const skill = getSkill('nonexistent')
    expect(skill).toBeNull()
  })
  
  it('should have trigger phrases for each skill', () => {
    const transferSkill = getSkill('transfer')
    expect(transferSkill?.triggers).toContain('send SOL')
    expect(transferSkill?.triggers).toContain('transfer')
    
    const policySkill = getSkill('policy-management')
    expect(policySkill?.triggers).toContain('set policy')
    expect(policySkill?.triggers).toContain('guardrails')
  })
  
  it('should have system prompts', () => {
    const walletSkill = getSkill('wallet-management')
    expect(walletSkill?.systemPrompt).toContain('treasury assistant')
    
    const transferSkill = getSkill('transfer')
    expect(transferSkill?.systemPrompt).toContain('secure transfer agent')
    expect(transferSkill?.systemPrompt).toContain('POLICY AWARENESS')
  })
})

describe('Skill Examples', () => {
  it('should have examples for transfer skill', () => {
    const skill = getSkill('transfer')
    expect(skill?.examples).toBeDefined()
    expect(skill?.examples?.length).toBeGreaterThan(0)
    
    const example = skill?.examples?.[0]
    expect(example?.input).toContain('Send')
    expect(example?.toolChain).toContain('hoshi_send')
  })
})
