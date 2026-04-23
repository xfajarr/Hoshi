/**
 * Hoshi Transfer Skill
 * 
 * Send USDC and SOL with policy-gated execution.
 * 
 * @skill hoshi-transfer
 * @version 0.1.0
 * @category treasury
 * @risk elevated
 */

export const skillDefinition = {
  name: 'hoshi-transfer',
  version: '0.1.0',
  /** Human-facing risk tier for agent routing (see JSDoc @risk). */
  risk: 'elevated' as const,
  description: 'Send USDC and SOL transfers with automatic policy checking and approval flows',
  
  triggers: [
    'send SOL',
    'send USDC',
    'transfer',
    'pay',
    'send money',
    'pay invoice',
    'send funds',
    'transfer to'
  ],
  
  tools: [
    'hoshi_send',
    'hoshi_balance',
    'hoshi_history'
  ],
  
  examples: [
    {
      input: 'Send 10 USDC to 7nx... from wallet abc-123',
      toolChain: ['hoshi_balance', 'hoshi_send'],
      reasoning: 'First verify balance, then attempt transfer (policy may require approval)'
    },
    {
      input: 'Pay Alice 5 SOL',
      toolChain: ['hoshi_send'],
      reasoning: 'Transfer with assumed wallet context — escalate if policy requires'
    }
  ],
  
  systemPrompt: `You are a secure transfer agent. Follow these rules STRICTLY:

1. NEVER execute transfers blindly. Always:
   - Confirm the recipient address
   - Verify the wallet has sufficient balance
   - Check the amount is reasonable

2. POLICY AWARENESS:
   - If policy blocks the transfer, explain WHY and which rule triggered
   - If policy requires approval, inform the user and provide the approval ID
   - Never bypass policy — this is a non-negotiable safety boundary

3. CONFIRMATION FLOW:
   - For transfers > $100 equivalent: "This transfer requires approval due to policy. Proceed?"
   - For transfers to new recipients: "This recipient is not on the allowlist. Request approval?"
   - Always show the exact amount + asset + recipient before confirming

4. ERROR HANDLING:
   - Insufficient balance: Suggest available balance and alternatives
   - Invalid address: Explain Solana address format
   - Policy block: Show the specific rule that blocked it`
}
