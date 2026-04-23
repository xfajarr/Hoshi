# Hoshi

**Financial operating system for AI agents and internet businesses on Solana.**

Hoshi is a modular TypeScript monorepo: a **core SDK** for treasury-style operations (wallets, transfers, invoices, swaps, yield), a **policy engine** for rule-gated actions, an **HTTP gateway** with x402-style metering for paid API proxying, an **MCP server** so agents can call financial tools over the Model Context Protocol, and a **developer CLI** for local workflows.

---

## Contents

- [Requirements](#requirements)
- [Quick start](#quick-start)
- [Repository layout](#repository-layout)
- [Running the stack](#running-the-stack)
- [MCP integration](#mcp-integration)
- [Architecture](#architecture)
- [Design principles](#design-principles)
- [Development](#development)
- [Production notes](#production-notes)
- [License](#license)

---

## Requirements

| Tool | Version |
|------|---------|
| [Node.js](https://nodejs.org/) | **20.x LTS** or newer recommended |
| [pnpm](https://pnpm.io/) | **9.x** (workspace pins `packageManager` in root `package.json`) |

---

## Quick start

```bash
git clone <repository-url>
cd Hoshi
pnpm install
pnpm build
pnpm test
```

- **`pnpm build`** — builds all packages via [Turborepo](https://turbo.build/) (`dist/` in each package).
- **`pnpm test`** — runs package test suites (Vitest).
- **`pnpm dev`** — watch mode for packages that define a `dev` script (typically `tsup --watch`).

---

## Repository layout

| Package | NPM name | Role |
|---------|----------|------|
| [SDK](./packages/hoshi-sdk) | `@hoshi/sdk` | Solana-facing primitives: chain adapter, wallets, transfers, invoices, swaps (Jupiter), yield (Kamino), receipts |
| [Engine](./packages/hoshi-engine) | `@hoshi/engine` | Policy evaluation and orchestration on top of SDK types |
| [Gateway](./packages/hoshi-gateway) | `@hoshi/gateway` | Hono HTTP app: health, service catalog, stats, x402-guarded `/proxy/...` |
| [MCP](./packages/hoshi-mcp) | `@hoshi/mcp` | Stdio MCP server exposing financial tools to AI clients |
| [CLI](./packages/hoshi-cli) | `@hoshi/cli` | `hoshi` binary: wallets, transfers, swap quotes, policy CRUD |

All packages are **workspace-linked**; the root workspace lists `@hoshi/cli` as a devDependency so `pnpm exec hoshi` works from the repo root after `pnpm install`.

---

## Running the stack

### CLI (`hoshi`)

From the repository root (after `pnpm build`):

```bash
pnpm exec hoshi --help
```

Common global options:

- **`--rpc <url>`** — Solana RPC (default: devnet).
- **`--mainnet`** — use public mainnet-beta RPC.
- **`-k, --keypair <path>`** — keypair JSON for signing (required for send flows).

Local state is written under **`~/.hoshi/`** (`store.json`, `policies.json`), not inside the repo.

### HTTP Gateway

Runs a standalone Node server (default port **3000**).

```bash
pnpm build
node packages/hoshi-gateway/dist/server.js
```

Optional: **`PORT`** — listen port (default `3000`).

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/health` | Liveness / version |
| `GET` | `/services` | List registered upstream services |
| `GET` | `/services/:id` | Service detail |
| `GET` | `/stats` | Metering stats |
| `ALL` | `/proxy/:serviceId/*` | Paid proxy (x402 middleware + metering) |

The shipped server registers **sample** upstream definitions (e.g. OpenAI, Anthropic shapes) for demonstration; replace or extend the registry for real deployments.

### MCP server (`hoshi-mcp`)

The server speaks **newline-delimited JSON-RPC** on **stdin/stdout** (standard MCP over stdio).

```bash
pnpm build
pnpm --filter @hoshi/mcp exec hoshi-mcp
```

Wire this command into your MCP client (see below). Default Solana RPC in code is **devnet**; adjust in source or future configuration as you harden for production.

---

## MCP integration

Tools registered by the server (names are stable identifiers for `tools/call`):

| Tool | Purpose |
|------|---------|
| `hoshi_balance` | Wallet / balance read |
| `hoshi_send` | Transfer execution |
| `hoshi_create_invoice` | Create invoice |
| `hoshi_create_payment_link` | Payment link |
| `hoshi_swap_quote` | Swap quote (Jupiter) |
| `hoshi_deposit_yield` | Yield deposit flow |
| `hoshi_history` | History / activity |

**Example (Cursor / Claude Desktop-style config):** add a server entry whose `command` runs Node on the built binary, from your machine’s absolute paths:

```json
{
  "mcpServers": {
    "hoshi": {
      "command": "node",
      "args": ["/absolute/path/to/Hoshi/packages/hoshi-mcp/dist/server.js"]
    }
  }
}
```

Alternatively use `pnpm --filter @hoshi/mcp exec hoshi-mcp` as `command` with `cwd` set to the repo root if your client supports it.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Host apps (e.g. Kitsu) — not in this repo                  │
├─────────────────────────────────────────────────────────────┤
│  @hoshi/gateway          │  @hoshi/mcp                      │
│  HTTP + x402 metering    │  MCP (stdio)                     │
├─────────────────────────────────────────────────────────────┤
│  @hoshi/engine — policies, approvals, execution rules       │
├─────────────────────────────────────────────────────────────┤
│  @hoshi/sdk — Solana + DeFi adapters, treasury primitives   │
└─────────────────────────────────────────────────────────────┘
```

Data flow summary:

1. **SDK** encapsulates chain and protocol adapters and returns structured **results/receipts**.
2. **Engine** evaluates **policy** before or alongside sensitive operations (used by CLI; extend as needed for gateway/MCP).
3. **Gateway** exposes **metered, paid** access to configured HTTP upstreams.
4. **MCP** exposes the same financial surface to **LLM agents** via tools.

---

## Design principles

- **Stablecoin-first** — treasury and payments semantics (e.g. USDC), not speculative trading as a product goal.
- **Policy-bound autonomy** — autonomous agents should run under explicit rules (limits, allowlists, approval patterns).
- **Receipts and auditability** — operations should yield consistent, machine-readable outcomes for logging and reconciliation.
- **Composable packages** — consume Hoshi as libraries, gateway, or MCP without coupling to a specific consumer app.

---

## Development

```bash
pnpm lint          # if configured per package
pnpm typecheck     # TypeScript noEmit across packages
pnpm clean         # turbo clean (removes build outputs per package)
```

**Single-package focus:**

```bash
pnpm --filter @hoshi/sdk test
pnpm --filter @hoshi/gateway build
```

---

## Production notes

This repository is an **MVP-grade** foundation: tests and builds are green, but you should treat deployment as requiring your own checklist:

- **RPC** — use private, rate-limited endpoints for production; defaults are public devnet/mainnet URLs where applicable.
- **Keys** — never commit keypairs; CLI uses local filesystem paths only.
- **Gateway** — replace in-memory registry/metering with persistent stores and real x402/settlement integration as needed.
- **MCP** — stdio servers must be spawned by a trusted host; scope tool access and RPC the same way you would any custodial or signing-capable integration.
- **Compliance** — treasury, invoicing, and money transmission rules depend on your jurisdiction and use case; this codebase is not legal or compliance advice.

For security-sensitive issues, follow your organization’s disclosure process; there is no separate `SECURITY.md` in-tree yet.

---

## License

MIT
