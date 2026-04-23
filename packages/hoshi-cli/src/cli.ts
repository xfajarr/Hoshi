import { Command } from 'commander'
import { 
  WalletService, 
  TransferService,
  SolanaChainAdapter,
  JupiterSwapAdapter,
  KeypairSigner
} from '@hoshi/sdk'
import { PolicyEngine } from '@hoshi/engine'
import type { PolicyRule } from '@hoshi/engine'
import { JsonFileStorage } from './store.js'
import { JsonFilePolicyStore } from './policy-store.js'

const program = new Command()

program
  .name('hoshi')
  .description('Hoshi developer CLI — Financial OS for AI agents on Solana')
  .version('0.1.0')
  .option('-r, --rpc <url>', 'Solana RPC endpoint', 'https://api.devnet.solana.com')
  .option('--mainnet', 'Use mainnet RPC (https://api.mainnet-beta.solana.com)')
  .option('-k, --keypair <path>', 'Path to Solana keypair file (for signing transactions)')

function getRpcUrl(cmd: Command): string {
  const opts = cmd.opts()
  return opts.mainnet ? 'https://api.mainnet-beta.solana.com' : opts.rpc
}

function getSigner(cmd: Command): KeypairSigner | null {
  const opts = cmd.opts()
  if (!opts.keypair) return null
  try {
    return KeypairSigner.fromFile(opts.keypair)
  } catch (err) {
    console.error('Failed to load keypair:', err instanceof Error ? err.message : String(err))
    return null
  }
}

program
  .command('wallet:create')
  .description('Create a new treasury wallet')
  .requiredOption('--pubkey <publicKey>', 'Solana public key')
  .option('-l, --label <label>', 'wallet label', 'Treasury')
  .action(async (options) => {
    const storage = new JsonFileStorage()
    const chain = new SolanaChainAdapter(getRpcUrl(program))
    await chain.connect()
    
    const walletService = new WalletService(storage, chain)
    const result = await walletService.create({ publicKey: options.pubkey, label: options.label })
    
    if (result.ok) {
      console.log('✓ Created wallet')
      console.log('  ID:     ', result.value.id)
      console.log('  Address:', result.value.publicKey)
      console.log('  Label:  ', result.value.label)
    } else {
      console.error('✗ Failed:', result.error.message)
      process.exit(1)
    }
  })

program
  .command('wallet:list')
  .description('List all wallets')
  .action(async () => {
    const storage = new JsonFileStorage()
    const result = await storage.getWallets()
    
    if (!result.ok) {
      console.error('✗ Failed:', String(result.error))
      process.exit(1)
    }
    
    const wallets = result.value
    if (wallets.length === 0) {
      console.log('No wallets found. Create one with: hoshi wallet:create --pubkey <pubkey>')
      return
    }
    
    console.log(`Found ${wallets.length} wallet(s):\n`)
    for (const w of wallets) {
      console.log(`  ${w.id}  ${w.publicKey}  ${w.label || ''}`)
    }
  })

program
  .command('balance')
  .description('Check wallet balance')
  .argument('<walletId>', 'wallet ID')
  .option('-a, --asset <asset>', 'asset (USDC or SOL)', 'SOL')
  .action(async (walletId, options) => {
    const storage = new JsonFileStorage()
    const chain = new SolanaChainAdapter(getRpcUrl(program))
    await chain.connect()
    
    const walletService = new WalletService(storage, chain)
    const result = await walletService.getOnChainBalance(walletId, options.asset as 'USDC' | 'SOL')
    
    if (result.ok) {
      console.log(`${options.asset}: ${result.value}`)
    } else {
      console.error('✗ Error:', result.error.message)
      process.exit(1)
    }
  })

program
  .command('transfer:build')
  .description('Build an unsigned transfer transaction')
  .argument('<walletId>', 'wallet ID')
  .requiredOption('-t, --to <address>', 'recipient address')
  .requiredOption('-a, --amount <amount>', 'amount to send')
  .requiredOption('--asset <asset>', 'asset (USDC or SOL)')
  .action(async (walletId, options) => {
    const storage = new JsonFileStorage()
    const chain = new SolanaChainAdapter(getRpcUrl(program))
    await chain.connect()
    
    const transferService = new TransferService(storage, chain)
    const result = await transferService.buildTransferTransaction({
      walletId,
      to: options.to,
      amount: { amount: options.amount, asset: options.asset }
    })
    
    if (result.ok) {
      console.log('✓ Transfer prepared')
      console.log('  Receipt ID:', result.value.receipt.id)
      
      // Set blockhash and fee payer for serialization
      const blockhashResult = await chain.getLatestBlockhash()
      if (blockhashResult.ok) {
        result.value.transaction.recentBlockhash = blockhashResult.value
      }
      const walletResult = await storage.getWallet(walletId)
      if (walletResult.ok && walletResult.value) {
        const { PublicKey } = await import('@solana/web3.js')
        result.value.transaction.feePayer = new PublicKey(walletResult.value.publicKey)
      }
      
      const serialized = result.value.transaction.serialize({ requireAllSignatures: false }).toString('base64')
      console.log('  Unsigned tx:', serialized.slice(0, 80) + '...')
      console.log('\nSign and submit this transaction with your wallet.')
    } else {
      console.error('✗ Failed:', result.error.message)
      process.exit(1)
    }
  })

program
  .command('transfer:send')
  .description('Sign and send a transfer transaction (requires --keypair)')
  .argument('<walletId>', 'wallet ID')
  .requiredOption('-t, --to <address>', 'recipient address')
  .requiredOption('-a, --amount <amount>', 'amount to send')
  .requiredOption('--asset <asset>', 'asset (USDC or SOL)')
  .action(async (walletId, options) => {
    const signer = getSigner(program)
    if (!signer) {
      console.error('✗ Signing requires --keypair <path>')
      console.error('  Generate a keypair with: solana-keygen new -o ~/.hoshi/keypair.json')
      process.exit(1)
    }

    const storage = new JsonFileStorage()
    const chain = new SolanaChainAdapter(getRpcUrl(program))
    await chain.connect()
    
    const transferService = new TransferService(storage, chain)
    const result = await transferService.sendSigned(
      {
        walletId,
        to: options.to,
        amount: { amount: options.amount, asset: options.asset }
      },
      signer
    )
    
    if (result.ok) {
      console.log('✓ Transfer sent')
      console.log('  Receipt ID:', result.value.id)
      if (result.value.metadata?.signature) {
        console.log('  Signature:', result.value.metadata.signature)
        console.log('  Explorer:', result.value.metadata.explorerUrl)
      }
    } else {
      console.error('✗ Failed:', result.error.message)
      process.exit(1)
    }
  })

program
  .command('swap:quote')
  .description('Get a Jupiter swap quote')
  .requiredOption('-i, --input <mint>', 'input token mint')
  .requiredOption('-o, --output <mint>', 'output token mint')
  .requiredOption('-a, --amount <amount>', 'input amount (in base units)')
  .option('-s, --slippage <bps>', 'slippage in basis points', '50')
  .action(async (options) => {
    const jupiter = new JupiterSwapAdapter()
    const result = await jupiter.getQuote({
      inputMint: options.input,
      outputMint: options.output,
      amount: options.amount,
      slippageBps: parseInt(options.slippage)
    })
    
    if (result.ok) {
      const q = result.value
      console.log('✓ Jupiter Quote')
      console.log('  Input: ', q.inputMint, '→', q.inAmount)
      console.log('  Output:', q.outputMint, '→', q.outAmount)
      console.log('  Slippage:', q.slippageBps, 'bps')
      console.log('  Price impact:', q.priceImpactPct, '%')
      console.log('  Expires:', q.expiry)
    } else {
      console.error('✗ Failed:', result.error.message)
      process.exit(1)
    }
  })

// Policy commands
program
  .command('policy:add')
  .description('Add a policy rule to a wallet')
  .argument('<walletId>', 'wallet ID')
  .requiredOption('-n, --name <name>', 'rule name')
  .requiredOption('--type <type>', 'condition type (max_amount, daily_limit, recipient_allowlist, action_type, asset_type, time_window)')
  .requiredOption('--action <action>', 'rule action (allow, block, escalate)')
  .option('--max <amount>', 'max amount (for max_amount)')
  .option('--limit <amount>', 'daily limit (for daily_limit)')
  .option('--allowed <addrs>', 'comma-separated allowed recipients (for recipient_allowlist)')
  .option('--assets <assets>', 'comma-separated allowed assets (for asset_type)')
  .option('--start <hour>', 'start hour (for time_window)')
  .option('--end <hour>', 'end hour (for time_window)')
  .option('--priority <n>', 'rule priority (higher = evaluated first)', '0')
  .action(async (walletId, options) => {
    const policyStore = new JsonFilePolicyStore()
    
    // Build params based on type
    const params: Record<string, unknown> = {}
    switch (options.type) {
      case 'max_amount':
        if (!options.max) { console.error('--max required for max_amount'); process.exit(1) }
        params.max = parseFloat(options.max)
        break
      case 'daily_limit':
        if (!options.limit) { console.error('--limit required for daily_limit'); process.exit(1) }
        params.limit = parseFloat(options.limit)
        break
      case 'recipient_allowlist':
        if (!options.allowed) { console.error('--allowed required for recipient_allowlist'); process.exit(1) }
        params.allowed = options.allowed.split(',')
        break
      case 'asset_type':
        if (!options.assets) { console.error('--assets required for asset_type'); process.exit(1) }
        params.assets = options.assets.split(',')
        break
      case 'time_window':
        if (options.start === undefined || options.end === undefined) {
          console.error('--start and --end required for time_window'); process.exit(1)
        }
        params.startHour = parseInt(options.start)
        params.endHour = parseInt(options.end)
        break
      case 'action_type':
        params.actions = ['transfer.send']
        break
    }

    const rule: PolicyRule = {
      id: crypto.randomUUID(),
      name: options.name,
      enabled: true,
      priority: parseInt(options.priority),
      condition: {
        type: options.type,
        params
      },
      action: options.action
    }

    const result = await policyStore.addRule(walletId, rule)
    if (result.ok) {
      console.log('✓ Added policy rule')
      console.log('  ID:', rule.id)
      console.log('  Name:', rule.name)
      console.log('  Type:', rule.condition.type)
      console.log('  Action:', rule.action)
    } else {
      console.error('✗ Failed:', String(result.error))
      process.exit(1)
    }
  })

program
  .command('policy:list')
  .description('List policy rules for a wallet')
  .argument('<walletId>', 'wallet ID')
  .action(async (walletId) => {
    const policyStore = new JsonFilePolicyStore()
    const result = await policyStore.getRules(walletId)
    
    if (!result.ok) {
      console.error('✗ Failed:', String(result.error))
      process.exit(1)
    }
    
    const rules = result.value
    if (rules.length === 0) {
      console.log('No policy rules for this wallet.')
      console.log('Add one with: hoshi policy:add <walletId> --name "Rule name" --type max_amount --action escalate --max 100')
      return
    }
    
    console.log(`Found ${rules.length} rule(s):\n`)
    for (const r of rules.sort((a, b) => (b.priority || 0) - (a.priority || 0))) {
      const status = r.enabled ? '●' : '○'
      console.log(`  ${status} [P${r.priority}] ${r.name} (${r.id})`)
      console.log(`      Type: ${r.condition.type} | Action: ${r.action}`)
      console.log(`      Params:`, JSON.stringify(r.condition.params))
    }
  })

program
  .command('policy:remove')
  .description('Remove a policy rule')
  .argument('<walletId>', 'wallet ID')
  .argument('<ruleId>', 'rule ID')
  .action(async (walletId, ruleId) => {
    const policyStore = new JsonFilePolicyStore()
    const result = await policyStore.removeRule(walletId, ruleId)
    
    if (result.ok) {
      console.log('✓ Removed policy rule')
    } else {
      console.error('✗ Failed:', String(result.error))
      process.exit(1)
    }
  })

program
  .command('policy:check')
  .description('Check if an action would pass policy rules')
  .argument('<walletId>', 'wallet ID')
  .requiredOption('-a, --action <action>', 'action type (e.g., transfer.send, balance.read)')
  .option('--amount <amount>', 'amount (for transfers)')
  .option('--asset <asset>', 'asset (for transfers)')
  .option('--to <address>', 'recipient (for transfers)')
  .action(async (walletId, options) => {
    const policyStore = new JsonFilePolicyStore()
    const engine = new PolicyEngine(policyStore)
    
    const context: Record<string, unknown> = {
      walletId,
      actionType: options.action,
      timestamp: new Date().toISOString(),
      dailySpend: {}
    }
    
    if (options.amount && options.asset) {
      context.amount = { amount: options.amount, asset: options.asset }
    }
    if (options.to) {
      context.recipient = options.to
    }
    
    const result = await engine.evaluate(context as any)
    
    if (result.ok) {
      const r = result.value
      console.log('✓ Policy Result')
      console.log('  Allowed:', r.allowed)
      console.log('  Action class:', r.action)
      if (r.requiresApproval) console.log('  Requires approval: YES')
      if (r.reason) console.log('  Reason:', r.reason)
      if (r.rulesTriggered.length > 0) console.log('  Rules triggered:', r.rulesTriggered.join(', '))
    } else {
      console.error('✗ Error:', result.error.message)
      process.exit(1)
    }
  })

program.parse()
