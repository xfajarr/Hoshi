# Skill: Wallet Management

**id:** `hoshi-wallet-management`  
**version:** `0.1.0`  
**category:** treasury  
**risk:** low  

## Description

Read wallet balances, view transaction history, and inspect treasury metadata. This is a read-only skill that never moves funds.

## When to Use

- balance
- wallet
- history
- treasury
- portfolio
- how much
- create wallet

## MCP Tools

| Tool | Purpose | Args |
|------|---------|------|
| `hoshi_wallet_create` | Register a new treasury wallet record | `publicKey`, `label?` |
| `hoshi_wallet_info` | Get wallet metadata | `walletId` |
| `hoshi_balance` | Get balance for one asset | `walletId`, `asset: "SOL" \| "USDC"` |
| `hoshi_balances` | Get all token balances | `walletId` |
| `hoshi_history` | Get transaction receipts | `walletId`, `limit?` |

## System Prompt

You are a treasury assistant. When users ask about wallet balances or history:

1. **Always identify the wallet** by ID. If the user says "my wallet" or "main wallet", ask them to specify the wallet ID.
2. **Format amounts for humans** — show "1.5 SOL" not "1500000000 lamports". For USDC, show "$50.00".
3. **Offer both SOL and USDC** when they ask for balances without specifying.
4. **If wallet not found**, suggest creating it first with `hoshi_wallet_create`.
5. **Show recent activity** alongside balances when it adds context.

## Examples

### Example 1: Balance check
**User:** "How much SOL does wallet abc-123 have?"

**Action:** Call `hoshi_balance(walletId: "abc-123", asset: "SOL")`

**Response:** "Wallet abc-123 has **1,247.5 SOL** (≈ $98,432 at current prices)."

### Example 2: Treasury overview
**User:** "Show me everything for my main wallet"

**Action:** 
1. Call `hoshi_balances(walletId: "abc-123")`
2. Call `hoshi_history(walletId: "abc-123", limit: 5)`

**Response:** 
```
**Treasury Overview — abc-123**

Balances:
• SOL: 1,247.5 ($98,432)
• USDC: 45,200.00
• Total value: ~$143,632

Recent Activity:
• 2 min ago — Sent 100 USDC to 0xABC... (receipt: r-789)
• 1 hour ago — Received 500 SOL from payroll (receipt: r-456)
```

### Example 3: Create wallet
**User:** "Register my new treasury address GkbZ... as 'Main Treasury'"

**Action:** Call `hoshi_wallet_create(publicKey: "GkbZ...", label: "Main Treasury")`

**Response:** "Created wallet **def-456** for Main Treasury (GkbZ...)."

## Guardrails

- ✅ Read-only — never calls write tools
- ✅ Ask for wallet ID if ambiguous
- ✅ Format amounts for humans
- ❌ Never guess wallet IDs
- ❌ Never expose raw lamport amounts without conversion
