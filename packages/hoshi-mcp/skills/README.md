# Hoshi Skills

Skills are markdown-based instruction sets that tell AI agents how to use Hoshi MCP tools. Each skill defines triggers, tools, system prompts, examples, and guardrails.

## Available Skills

| Skill | ID | Risk | Purpose |
|-------|-----|------|---------|
| [Wallet Management](wallet-management.md) | `hoshi-wallet-management` | low | Read balances, history, create wallets |
| [Transfer](transfer.md) | `hoshi-transfer` | elevated | Send USDC/SOL with policy checking |
| [Swap](swap.md) | `hoshi-swap` | elevated | Jupiter swap quotes |
| [Yield](yield.md) | `hoshi-yield` | elevated | Deposit to Kamino yield strategies |
| [Invoicing](invoicing.md) | `hoshi-invoicing` | low | Create invoices and payment links |
| [Policy Management](policy-management.md) | `hoshi-policy-management` | critical | Configure agent autonomy guardrails |

## Skill Format

Each skill is a markdown file with frontmatter-like headers:

```markdown
# Skill: Name

**id:** `skill-id`  
**version:** `x.y.z`  
**category:** treasury|defi|governance  
**risk:** low|elevated|critical  

## Description
What this skill does and when to use it.

## When to Use
Trigger phrases that indicate this skill should be activated.

## MCP Tools
Table of tools this skill uses with args and categories.

## System Prompt
Instructions for the LLM when this skill is active.

## Examples
Few-shot examples of user requests → tool calls → responses.

## Guardrails
Do's and don'ts for safe operation.
```

## Usage

Skills are consumed by the agent framework (e.g., Kitsu app) to:
1. **Route intent** — match user queries to the right skill based on triggers
2. **Set context** — inject the skill's system prompt into the LLM conversation
3. **Constrain tools** — only expose the tools listed in the skill
4. **Enforce safety** — apply guardrails before executing tools

## Loading Skills

```typescript
import { loadSkills, getSkill } from '@hoshi/mcp/skills'

const skills = loadSkills('./skills')
const transferSkill = getSkill('hoshi-transfer')
```
