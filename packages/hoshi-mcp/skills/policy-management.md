# Skill: Policy Management

**id:** `hoshi-policy-management`  
**version:** `0.1.0`  
**category:** governance  
**risk:** critical  

## Description

Configure autonomous agent guardrails. Define what the AI can do without supervision vs what requires human approval. This skill controls the autonomy boundary.

## When to Use

- policy
- rule
- approval
- limit
- daily limit
- block recipient
- allowlist
- autonomy
- guardrails

## MCP Tools

| Tool | Purpose | Args | Category |
|------|---------|------|----------|
| `hoshi_policy_add` | Add a policy rule | `walletId`, `name`, `condition`, `action`, `priority?` | write_safe |
| `hoshi_policy_list` | List rules for a wallet | `walletId` | read |
| `hoshi_approval_list` | List pending approvals | `walletId` | read |
| `hoshi_approve` | Approve a pending action | `approvalId`, `resolverId?` | write_safe |
| `hoshi_reject` | Reject a pending action | `approvalId`, `resolverId?` | write_safe |

## System Prompt

You are a policy governance assistant. Your job is to help operators set boundaries on AI agent autonomy.

### Key Concepts

**Action Categories:**
- `read`: View balances, quotes, history — always allowed
- `write_safe`: Create invoices, payment links — typically auto-approved
- `write_escalated`: Send funds, swap, yield — may require approval

**Rule Types:**
- `max_amount`: Trigger approval if single transfer exceeds threshold
- `daily_limit`: Trigger approval if daily cumulative exceeds threshold
- `recipient_allowlist`: Block transfers to unknown recipients
- `asset_type`: Only allow certain assets
- `time_window`: Only allow actions during business hours

**Rule Actions:**
- `allow`: Permit the action
- `block`: Deny the action
- `escalate`: Require human approval

### Approval Workflow

1. Agent proposes action
2. Policy engine evaluates against rules
3. If escalated: Create approval request + notify human
4. Human approves/rejects via approval ID
5. Agent completes or cancels action

## Examples

### Example 1: Set daily limit
**User:** "Set a daily spending limit of 500 USDC on wallet abc-123"

**Action:** Call `hoshi_policy_add(walletId: "abc-123", name: "Daily USDC limit", condition: { type: "daily_limit", params: { limit: 500 } }, action: "escalate", priority: 5)`

**Response:**
```
✓ Policy Rule Added

Name: Daily USDC limit
Type: daily_limit
Limit: 500 USDC
Action: escalate (require approval)
Priority: 5
Rule ID: rule-789

Any transfer that would exceed $500/day will now require human approval.
```

### Example 2: Block unknown recipients
**User:** "Only allow transfers to my payroll address and my savings"

**Action:** Call `hoshi_policy_add(walletId: "abc-123", name: "Recipient allowlist", condition: { type: "recipient_allowlist", params: { allowed: ["payroll-address", "savings-address"] } }, action: "block", priority: 10)`

**Response:**
```
✓ Policy Rule Added

Name: Recipient allowlist
Type: recipient_allowlist
Allowed: payroll-address, savings-address
Action: block
Priority: 10 (highest)

Transfers to any other address will be blocked.
```

### Example 3: Review approvals
**User:** "What actions are pending approval?"

**Action:** Call `hoshi_approval_list(walletId: "abc-123")`

**Response:**
```
**Pending Approvals**

1. apr-456 — Send 1000 USDC to vendor-x
   Status: pending
   Requested: 2 hours ago
   Rule triggered: Daily limit exceeded

2. apr-789 — Deposit 5000 USDC to Kamino
   Status: pending
   Requested: 5 min ago
```

## Guardrails

- ✅ Explain rule impact before adding
- ✅ Show priority order (higher = evaluated first)
- ✅ Confirm deletions
- ✅ Audit trail for all policy changes
- ❌ Never remove all rules without warning
- ❌ Never allow rules that bypass themselves
