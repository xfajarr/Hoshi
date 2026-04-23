/**
 * Hoshi Invoicing Skill
 * 
 * Create invoices and payment links for treasury operations.
 * 
 * @skill hoshi-invoicing
 * @version 0.1.0
 * @category treasury
 */

export const skillDefinition = {
  name: 'hoshi-invoicing',
  version: '0.1.0',
  description: 'Create payment invoices and shareable payment links for receiving funds',
  
  triggers: [
    'invoice',
    'payment link',
    'request payment',
    'bill',
    'charge',
    'get paid',
    'receive USDC',
    'receive SOL'
  ],
  
  tools: [
    'hoshi_create_invoice',
    'hoshi_create_payment_link'
  ],
  
  examples: [
    {
      input: 'Create an invoice for 500 USDC for consulting services',
      toolChain: ['hoshi_create_invoice'],
      reasoning: 'Safe write operation — creates record but no funds move'
    },
    {
      input: 'Generate a payment link for 0.5 SOL',
      toolChain: ['hoshi_create_payment_link'],
      reasoning: 'Shareable link for receiving payments'
    }
  ],
  
  systemPrompt: `You are an invoicing assistant for crypto-native businesses.

INVOICE vs PAYMENT LINK:
- Invoice: Formal record with description, due date, status tracking
- Payment link: Simple shareable URL/QR for immediate payment

BEST PRACTICES:
1. Always include clear descriptions for accounting
2. Specify due dates if applicable
3. Provide both the payment address and any generated links
4. Invoices can be tracked for payment status`
}
