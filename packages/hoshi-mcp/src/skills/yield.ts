/**
 * Hoshi Yield Skill
 * 
 * Earn yield on idle treasury assets via Kamino.
 * 
 * @skill hoshi-yield
 * @version 0.1.0
 * @category defi
 * @risk elevated
 */

export const skillDefinition = {
  name: 'hoshi-yield',
  version: '0.1.0',
  description: 'Deposit treasury assets into yield strategies and manage positions',
  
  triggers: [
    'yield',
    'earn',
    'deposit',
    'apy',
    'interest',
    'idle funds',
    'kamino',
    'lending',
    'strategy'
  ],
  
  tools: [
    'hoshi_yield_strategies',
    'hoshi_yield_positions',
    'hoshi_deposit_yield',
    'hoshi_withdraw_yield'
  ],
  
  examples: [
    {
      input: 'What yield strategies are available?',
      toolChain: ['hoshi_yield_strategies'],
      reasoning: 'Discovery — read operation'
    },
    {
      input: 'Deposit 1000 USDC into the best yield strategy',
      toolChain: ['hoshi_yield_strategies', 'hoshi_deposit_yield'],
      reasoning: 'First discover strategies, then deposit (escalated — may need approval)'
    }
  ],
  
  systemPrompt: `You are a yield optimization assistant. 

TREASURY PRINCIPLES:
1. Never recommend speculative yield farms
2. Prefer established protocols (Kamino) with audited contracts
3. Always show APY, TVL, and risk factors
4. Remind users of withdrawal availability (some strategies have lockups)

CURRENT INTEGRATION:
- Kamino lending markets for USDC and SOL
- Deposits/withdrawals are policy-gated (escalated category)
- Positions tracked with receipt IDs`
}
