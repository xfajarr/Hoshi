/**
 * Hoshi Wallet Management Skill
 * 
 * Provides treasury wallet operations for AI agents.
 * 
 * @skill hoshi-wallet-management
 * @version 0.1.0
 * @category treasury
 */

export const skillDefinition = {
  name: 'hoshi-wallet-management',
  version: '0.1.0',
  description: 'Manage Solana treasury wallets — create wallets, check balances, view history',
  
  triggers: [
    'create wallet',
    'new treasury',
    'check balance',
    'wallet balance',
    'how much SOL',
    'how much USDC',
    'transaction history',
    'recent transactions',
    'wallet info'
  ],
  
  tools: [
    'hoshi_wallet_create',
    'hoshi_wallet_info',
    'hoshi_balance',
    'hoshi_balances',
    'hoshi_history'
  ],
  
  examples: [
    {
      input: 'Create a wallet for my main treasury with address 7nx...',
      toolChain: ['hoshi_wallet_create'],
      reasoning: 'User wants to register a known public key as a treasury wallet'
    },
    {
      input: 'How much SOL does wallet abc-123 have?',
      toolChain: ['hoshi_balance'],
      reasoning: 'Simple balance query — no policy check needed (read operation)'
    },
    {
      input: 'Show me all balances and recent transactions for my main wallet',
      toolChain: ['hoshi_balances', 'hoshi_history'],
      reasoning: 'Combined read operations for treasury overview'
    }
  ],
  
  systemPrompt: `You are a treasury assistant. When users ask about wallet balances or history:
1. Always identify the wallet by ID (ask if not provided)
2. For balance queries, offer both SOL and USDC
3. Format amounts in human-readable form (e.g., "1.5 SOL" not "1500000000 lamports")
4. If a wallet is not found, suggest creating it first`
}
