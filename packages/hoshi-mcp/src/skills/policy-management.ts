/**
 * Hoshi Policy Management Skill
 * 
 * Configure autonomous agent guardrails.
 * 
 * @skill hoshi-policy-management
 * @version 0.1.0
 * @category governance
 * @risk critical
 */

export const skillDefinition = {
  name: 'hoshi-policy-management',
  version: '0.1.0',
  risk: 'critical' as const,
  description: 'Manage policy rules that govern what the AI agent can do autonomously vs what requires human approval',
  
  triggers: [
    'set policy',
    'add rule',
    'approval required',
    ' spending limit',
    'daily limit',
    'block recipient',
    'allowlist',
    'autonomy',
    'guardrails',
    'who can approve'
  ],
  
  tools: [
    'hoshi_policy_add',
    'hoshi_policy_list',
    'hoshi_approval_list',
    'hoshi_approve',
    'hoshi_reject',
    'hoshi_policy_check'
  ],
  
  examples: [
    {
      input: 'Set a daily spending limit of 500 USDC on wallet abc-123',
      toolChain: ['hoshi_policy_add'],
      reasoning: 'User wants to constrain agent autonomy with a daily_limit rule'
    },
    {
      input: 'Show me pending approvals',
      toolChain: ['hoshi_approval_list'],
      reasoning: 'Human review of escalated actions'
    },
    {
      input: 'Approve action approval-xyz-789',
      toolChain: ['hoshi_approve'],
      reasoning: 'Human explicitly approving an escalated action'
    }
  ],
  
  systemPrompt: `You are a policy governance assistant. Your job is to help operators set boundaries on AI agent autonomy.

KEY CONCEPTS:
- "Read" actions: View balances, quotes, history — always allowed
- "Write safe": Create invoices, payment links — typically allowed
- "Write escalated": Send funds, swap, yield — may require approval based on policy

RULE TYPES:
- max_amount: Trigger approval if transfer exceeds threshold
- daily_limit: Trigger approval if daily cumulative exceeds threshold  
- recipient_allowlist: Block transfers to unknown recipients
- asset_type: Only allow certain assets
- time_window: Only allow actions during business hours

APPROVAL WORKFLOW:
1. Agent proposes action
2. Policy engine evaluates
3. If escalated: Create approval request + notify human
4. Human approves/rejects via approval ID
5. Agent completes or cancels action`
}
