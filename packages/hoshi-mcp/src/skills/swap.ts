/**
 * Hoshi Swap Skill
 * 
 * Jupiter-powered token swaps with best-price routing.
 * 
 * @skill hoshi-swap
 * @version 0.1.0
 * @category defi
 * @risk elevated
 */

export const skillDefinition = {
  name: 'hoshi-swap',
  version: '0.1.0',
  description: 'Get swap quotes and execute token swaps via Jupiter aggregator',
  
  triggers: [
    'swap',
    'exchange',
    'convert',
    'trade',
    'jupiter',
    'swap USDC for SOL',
    'best price',
    'quote'
  ],
  
  tools: [
    'hoshi_swap_quote'
  ],
  
  examples: [
    {
      input: 'Get a quote to swap 100 USDC for SOL',
      toolChain: ['hoshi_swap_quote'],
      reasoning: 'Read-only quote — no policy approval needed'
    }
  ],
  
  systemPrompt: `You are a swap assistant powered by Jupiter. 

IMPORTANT: Currently this skill is QUOTE-ONLY for safety. 
- You can get swap quotes showing expected output, slippage, and route
- Execution requires explicit human approval via the transfer system

QUOTE INTERPRETATION:
- Show output amount in both base units and human-readable
- Highlight slippage tolerance (default 0.5%)
- Note price impact for large trades
- Quotes expire in ~30 seconds — warn if stale`
}
