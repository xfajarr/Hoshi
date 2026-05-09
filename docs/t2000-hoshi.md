1. Brand / product architecture t2000
t2000 dibagi jadi 3 brand/layer:
A. suimpp
Protocol payment layer
- MPP standard di Sui
- machine payments
- payment challenge/settlement
B. t2000
Infrastructure layer
- CLI
- SDK
- MCP
- Engine
- Gateway
C. Audric
Consumer app
- Passport
- Intelligence
- Finance
- Pay
- Store
---
2. Consumer-facing features (Audric layer)
Ini bukan semua ada langsung di package infra, tapi ini adalah feature set yang ditargetkan / dipower oleh t2000.
Audric Passport
- sign in with Google
- non-custodial wallet on Sui
- wallet dibuat cepat
- tap-to-confirm untuk semua write action
- Enoki-sponsored gas (web only)
- trust layer untuk semua action
Audric Intelligence
5 systems:
1. Agent Harness
   - tool runtime
   - read/write orchestration
   - dispatch tools
2. Reasoning Engine
   - guard checks
   - effort classification
   - recipe matching
3. Silent Profile
   - financial profile user
   - injected silently into prompt/context
4. Chain Memory
   - remembers onchain behavior/history patterns
5. AdviceLog
   - remembers what the agent already advised
Audric Finance
- save / lending
- borrow / credit
- swap
- yield / earnings
- health factor
- portfolio analysis
- charts / canvas visualizations
- liquid staking (vSUI / VOLO)
Audric Pay
- send USDC
- receive money
- payment links
- invoices
- QR/payment URI
- instant payments on Sui
Audric Store
- creator storefront / marketplace
- sell generated content in USDC
- marked “coming soon”
---
3. SDK features (@t2000/sdk)
Ini core feature set paling penting.
Wallet / account
- T2000.init() create new wallet
- T2000.create() load existing wallet
- T2000.fromPrivateKey()
- export private key
- address getter
- encrypted key storage
- wallet exists check
- save/load encrypted key
- keypair helpers
- browser support
- signer utilities
Payments / wallet money
- balance
- send
- receive
- history
- deposit/funding instructions
Savings / lending / credit
- save / deposit
- withdraw
- borrow
- repay
- earnings
- rates
- all protocol rates
- positions
- fund status
- max withdraw
- max borrow
- health factor
Swap / execution
- swap
- swap quote
- multi-DEX routing via Cetus aggregator
- composable transaction building
- transaction fragment composition
Staking
- stake SUI → vSUI
- unstake vSUI → SUI
- VOLO integration
Contacts
- add contact
- remove contact
- list contacts
- get contact
- resolve contact name/address
Safeguards
- get config
- set safeguards
- lock
- unlock
- check limits
- record usage
- configured check
- safeguard errors/types
Payment / API payments
- pay for MPP-protected API
- Payment Kit / payment URI generation
- receive requests with nonce
- payment requests / invoices / links
Protocol / integration utilities
- NAVI adapters
- Cetus swap protocol
- VOLO protocol
- fee helpers
- financial summary
- token registry
- formatting utils
- retry utils
- simulation utils
- Sui utils
- yield tracking
- wallet balance/history/coin selection/classification
Testing footprint visible in repo
- smoke tests
- adapter tests
- protocol tests
- wallet tests
- formatting/tests
- safeguards tests
- receive/send tests
- composeTx tests
---
4. Engine features (@t2000/engine)
Ini yang paling “moat-like”.
Core runtime
- QueryEngine
- provider abstraction
- async generator loop
- submitMessage()
- tool dispatch inside conversation loop
- pending action flow
- resume tool result flow
- streaming text/tool events
Tool orchestration
- read tools run parallel
- write tools serial
- TxMutex
- early tool dispatch
- delegated execution
- MCP integration
- tool result budgeting
- microcompact / message compaction
- session store
- context budget / token compaction
- cost tracking
Reasoning engine
- adaptive effort classification
- prompt caching
- preflight validation
- guards
- recipes
- output config
- extended thinking
- evaluation summaries
Guard system
README mentions 14 guards across 3 priority tiers, including:
- input validation
- retry protection
- address source
- asset intent
- address scope
- swap preview
- irreversibility
- balance validation
- health factor
- large transfer
- slippage
- cost warning
- artifact preview
- stale data
Skill recipes / YAML flows
Mentioned recipes:
- swap_and_save
- safe_borrow
- send_to_contact
- portfolio_rebalance
- account_report
- emergency_withdraw
Repo tree also shows another recipe:
- translate-document
- postcard
Built-in tools
Current README says 37 tools total:
- 25 read
- 12 write
Read tools shown in README
- balance_check
- savings_info
- health_check
- rates_info
- transaction_history
- explain_tx
- web_search
- swap_quote
- volo_stats
- portfolio_analysis
- protocol_deep_dive
- mpp_services
- token_prices
- create_payment_link
- list_payment_links
- cancel_payment_link
- create_invoice
- list_invoices
- cancel_invoice
- spending_analytics
- yield_summary
- activity_summary
- render_canvas
- resolve_suins
- pending_rewards
Write tools shown in README
- save_deposit
- withdraw
- send_transfer
- borrow
- repay_debt
- claim_rewards
- pay_api
- swap_execute
- volo_stake
- volo_unstake
- save_contact
- harvest_rewards
MCP client/server integration
- MCP client manager
- response cache
- adapt MCP tools into engine tools
- build MCP tools
- register engine tools
- NAVI MCP config
- tool transforms for NAVI data
Canvas / visual output
- render_canvas
- interactive HTML visualizations
- chart/canvas presentation layer
Silent intelligence systems (audric-side but part of engine story)
- Silent Profile
- Chain Memory
- AdviceLog
More engine repo features seen from file tree
- blockvision-prices
- navi-reads
- navi-transforms
- navi-config
- streaming
- context
- cost
- session
- mcp
- mcp-client
- mcp-tool-adapter
- tool-modifiable-fields
- update-todo tool
- pending rewards / reward harvesting
- protocol deep dive
- spending / activity summary
- receive / pay / transfer / history tools
---
5. MCP features (@t2000/mcp)
Core MCP product
- stdio MCP server
- installable into Claude Desktop / Cursor / Windsurf
- programmatic start API
- namespaced t2000_* tools
- safeguard enforced
- stable server config
- Dockerfile
- server metadata/config
Tool groups
README groups tools into:
Read tools
- t2000_overview
- t2000_balance
- t2000_address
- t2000_positions
- t2000_rates
- t2000_all_rates
- t2000_health
- t2000_history
- t2000_earnings
- t2000_fund_status
- t2000_pending_rewards
- t2000_deposit_info
- t2000_receive
- t2000_contacts
- t2000_services
Write tools
- t2000_pay
- t2000_send
- t2000_save
- t2000_withdraw
- t2000_borrow
- t2000_repay
- t2000_claim_rewards
- t2000_contact_add
- t2000_contact_remove
- t2000_swap
- t2000_stake
- t2000_unstake
Safety tools
- t2000_config
- t2000_lock
Additional MCP package features visible in repo
- prompt system (prompts.ts)
- prompt tests
- read/write/safety tool split
- mutex
- unlock flow
- gate logic
- error types
- integration tests
- tool tests
- prompt tests
- server binary entry (bin.ts)
---
6. CLI features (@t2000/cli)
Setup / onboarding
- t2000 init
- guided wallet setup
- AI platform integration
- safeguard setup
- MCP install flow
MCP management
- t2000 mcp install
- t2000 mcp uninstall
- t2000 mcp
Config
- config set/get/show
- dot notation config updates
Wallet ops
- create wallet
- lock
- unlock
- balance
- balance with limits
- address
- deposit instructions
- import
- export
- history
Transfers / pay / receive
- send
- receive
- payment request generation
- MPP pay
DeFi
- save
- withdraw
- borrow
- repay
- health
- rates
- positions
- claim rewards
- earnings
- fund status
Contacts
- contacts list/add/remove
HTTP API server
- t2000 serve
- bearer auth
- rate limiting
- local API for non-TS agents
UX / automation
- --json
- --yes
- env vars
- custom key path
- examples for automation
---
7. Gateway features (apps/gateway)
Core gateway
- MPP gateway
- 40 services
- 88 endpoints
- payable with Sui USDC
- no API keys / no accounts for end agent
- upstream proxying
Service/API surfaces
Pages:
- /
- /services
- /explorer
- /docs
- /spec
- /llms.txt
- /openapi.json
APIs:
- /api/services
- /api/mpp/payments
- /api/mpp/stats
Infra / implementation
- Next.js
- mppx + @suimpp/mpp
- Prisma / NeonDB
- Tailwind UI
- payment verification
- payment logging
- service catalog UI
- explorer UI
---
8. Skills / recipes repo features (t2000-skills)
Installable agent skills
- t2000-borrow
- t2000-check-balance
- t2000-contacts
- t2000-engine
- t2000-mcp
- t2000-pay
- t2000-receive
- t2000-repay
- t2000-safeguards
- t2000-save
- t2000-send
- t2000-withdraw
Recipe files
- account-report
- emergency-withdraw
- portfolio-rebalance
- postcard
- safe-borrow
- send-to-contact
- swap-and-save
- translate-document
---
9. Security / ops / infra features
Security features
- non-custodial keys
- encrypted local storage
- AES-256-GCM
- scrypt-derived key/PIN
- safeguard limits
- agent lock
- risk guards
- transaction simulation
- dry run flows
- bearer auth for HTTP API
- request rate limiting
Infra / dev features
- monorepo with pnpm/turbo
- CI/CD
- spec docs
- smoke scripts
- debug scripts
- extensive tests
- package builds
- deployment targets:
  - AWS ECS Fargate
  - Vercel
  - Upstash Redis
  - NeonDB
---
10. Kalau diringkas jadi feature buckets besar
Financial primitives
- wallet
- send
- receive
- history
- contacts
- deposit
DeFi primitives
- save
- withdraw
- borrow
- repay
- health factor
- rates
- positions
- earnings
- rewards
- staking
- unstaking
- swap
- quote
Payment primitives
- MPP pay
- payment links
- invoices
- QR/payment URI
- receive requests
- gateway services discovery
Agent runtime
- QueryEngine
- tool orchestration
- guards
- recipes
- MCP client/server
- streaming
- cost tracking
- session management
- context compaction
Intelligence layer
- Silent Profile
- Chain Memory
- AdviceLog
Developer surfaces
- SDK
- CLI
- MCP
- Gateway
- Skills
- HTTP API
---
11. Jujur paling penting dari t2000 apa?
Kalau disaring, t2000 bukan cuma “wallet + mcp”.
Yang paling penting adalah kombinasi ini:
1. SDK finance primitives
2. Engine runtime + reasoning + guardrails
3. MCP distribution surface
4. MPP payment rail + gateway
5. consumer brand layer (Audric)