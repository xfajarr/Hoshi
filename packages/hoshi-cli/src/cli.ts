import { Command } from 'commander'
import { homedir } from 'os'
import { join } from 'path'
import { Connection, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'
import {
  EncryptedKeypairVault,
  KeypairSigner,
  SolanaChainAdapter,
  TransferService,
  WalletService,
  JupiterSwapAdapter,
  type Money,
  type Wallet,
} from '@hoshi/sdk'
import { PolicyEngine, type PolicyRule } from '@hoshi/engine'
import { JsonFileStorage } from './store.js'
import { JsonFilePolicyStore } from './policy-store.js'
import { createDefaultGuardrails } from './default-policies.js'
import { promptSecret } from './prompt.js'
import { setJsonMode, setYesMode } from './output.js'
import { registerInit } from './commands/init.js'
import { registerConfig } from './commands/config.js'
import { registerAddress } from './commands/address.js'
import { registerHistory } from './commands/history.js'
import { registerContacts } from './commands/contacts.js'
import { registerMcp } from './commands/mcp.js'
import { registerLock } from './commands/lock.js'
import { registerDeposit } from './commands/deposit.js'
import { registerSave } from './commands/save.js'
import { registerStake } from './commands/stake.js'
import { registerEarnings } from './commands/earnings.js'
import { registerServe } from './commands/serve.js'
import { registerExportKey } from './commands/exportKey.js'
import { registerGas, registerClaimRewards, registerFundStatus } from './commands/gas.js'
import { registerPay, registerEarn } from './commands/pay.js'

const DEFAULT_KEYSTORE_DIR = join(homedir(), '.hoshi', 'keys')

const program = new Command()

program
  .name('hoshi')
  .description('Hoshi developer CLI — Financial OS for AI agents on Solana')
  .version('0.1.0')
  .option('-r, --rpc <url>', 'Solana RPC endpoint', 'https://api.devnet.solana.com')
  .option('--mainnet', 'Use mainnet RPC (https://api.mainnet-beta.solana.com)')
  .option('-k, --keypair <path>', 'Path to Solana keypair file (for signing transactions)')
  .option('--json', 'Output results as JSON')
  .option('-y, --yes', 'Skip confirmation prompts')

program.on('option:json', () => {
  setJsonMode(true)
})

program.on('option:yes', () => {
  setYesMode(true)
})

const getRpcUrl = (cmd: Command): string => {
  const opts = cmd.opts()
  return opts.mainnet ? 'https://api.mainnet-beta.solana.com' : opts.rpc
}

const getKeystoreVault = (): EncryptedKeypairVault => new EncryptedKeypairVault(DEFAULT_KEYSTORE_DIR)

const parsePositiveNumber = (value: string, field: string): number => {
  const parsed = Number.parseFloat(value)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${field} must be a positive number`)
  }
  return parsed
}

const getWalletPassword = async (confirm = false): Promise<string> => {
  const envPassword = process.env.HOSHI_WALLET_PASSWORD
  if (envPassword) return envPassword

  const password = await promptSecret('Wallet password: ')
  if (!confirm) return password

  const confirmation = await promptSecret('Confirm password: ')
  if (password !== confirmation) {
    throw new Error('Passwords do not match')
  }

  return password
}

const getDailySpend = async (storage: JsonFileStorage, walletId: string): Promise<Record<string, number>> => {
  const receiptsResult = await storage.getReceipts(walletId)
  if (!receiptsResult.ok) return {}

  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  return receiptsResult.value.reduce<Record<string, number>>((acc, receipt) => {
    if (receipt.status !== 'success' || !receipt.amount) return acc
    if (new Date(receipt.timestamp) < startOfDay) return acc

    const amount = Number.parseFloat(receipt.amount.amount)
    if (!Number.isFinite(amount)) return acc

    acc[receipt.amount.asset] = (acc[receipt.amount.asset] || 0) + amount
    return acc
  }, {})
}

const evaluatePolicy = async (
  storage: JsonFileStorage,
  walletId: string,
  actionType: string,
  amount?: Money,
  recipient?: string,
) => {
  const policyStore = new JsonFilePolicyStore()
  const engine = new PolicyEngine(policyStore)
  const dailySpend = await getDailySpend(storage, walletId)

  return engine.evaluate({
    walletId,
    actionType,
    amount,
    recipient,
    timestamp: new Date().toISOString(),
    dailySpend,
  })
}

const resolveSigner = async (storage: JsonFileStorage, walletId: string): Promise<KeypairSigner | null> => {
  const opts = program.opts()

  if (opts.keypair) {
    try {
      return KeypairSigner.fromFile(opts.keypair)
    } catch (error) {
      console.error('Failed to load keypair:', error instanceof Error ? error.message : String(error))
      return null
    }
  }

  const walletResult = await storage.getWallet(walletId)
  if (!walletResult.ok || !walletResult.value) return null

  const wallet = walletResult.value
  if (!wallet.managed || !wallet.keystoreId) return null

  try {
    const password = await getWalletPassword(false)
    const signerResult = getKeystoreVault().unlock(wallet.keystoreId, password)
    if (!signerResult.ok) {
      console.error('Failed to unlock managed wallet:', signerResult.error.message)
      return null
    }
    return signerResult.value
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    return null
  }
}

const ensureSignerMatchesWallet = async (
  storage: JsonFileStorage,
  walletId: string,
  signer: KeypairSigner,
): Promise<Wallet | null> => {
  const walletResult = await storage.getWallet(walletId)
  if (!walletResult.ok || !walletResult.value) {
    console.error(`Wallet not found: ${walletId}`)
    return null
  }

  if (walletResult.value.publicKey !== signer.publicKey) {
    console.error('Signer public key does not match the selected wallet record')
    return null
  }

  return walletResult.value
}

const printPolicyResult = (rulesTriggered: string[], reason?: string): void => {
  if (reason) console.log('  Reason:', reason)
  if (rulesTriggered.length > 0) console.log('  Rules triggered:', rulesTriggered.join(', '))
}

const maybeRequestDevnetAirdrop = async (publicKey: string, amount: number): Promise<string | null> => {
  if (amount <= 0) return null

  const connection = new Connection('https://api.devnet.solana.com', 'confirmed')
  const signature = await connection.requestAirdrop(new PublicKey(publicKey), Math.round(amount * LAMPORTS_PER_SOL))
  const latestBlockhash = await connection.getLatestBlockhash('confirmed')
  await connection.confirmTransaction({ signature, ...latestBlockhash }, 'confirmed')
  return signature
}

program
  .command('create')
  .description('Create a real non-custodial agent wallet with encrypted local keystore and default guardrails')
  .option('-l, --label <label>', 'wallet label', 'Agent Treasury')
  .option('--max-tx <amount>', 'default per-transaction limit before approval', '100')
  .option('--daily-limit <amount>', 'default daily spend limit before approval', '500')
  .option('--allow-assets <assets>', 'comma-separated allowed assets', 'USDC,SOL')
  .option('--airdrop-devnet <amount>', 'optional devnet SOL airdrop after creation', '1')
  .action(async (options) => {
    try {
      const perTransactionLimit = parsePositiveNumber(options.maxTx, 'max-tx')
      const dailyLimit = parsePositiveNumber(options.dailyLimit, 'daily-limit')
      const airdropAmount = parsePositiveNumber(options.airdropDevnet, 'airdrop-devnet')
      const allowedAssets = options.allowAssets
        .split(',')
        .map((asset: string) => asset.trim().toUpperCase())
        .filter(Boolean)

      if (allowedAssets.length === 0) {
        throw new Error('allow-assets must include at least one asset')
      }

      const password = await getWalletPassword(true)
      const walletId = crypto.randomUUID()
      const vault = getKeystoreVault()
      const keystoreResult = vault.create({
        walletId,
        password,
        label: options.label,
        defaultCluster: 'devnet',
      })

      if (!keystoreResult.ok) {
        console.error('✗ Failed to create wallet keystore:', keystoreResult.error.message)
        process.exit(1)
      }

      const storage = new JsonFileStorage()
      const chain = new SolanaChainAdapter('https://api.devnet.solana.com')
      await chain.connect()
      const walletService = new WalletService(storage, chain)

      const walletResult = await walletService.create({
        id: walletId,
        publicKey: keystoreResult.value.publicKey,
        label: options.label,
        managed: true,
        keystoreId: walletId,
        defaultCluster: 'devnet',
      })

      if (!walletResult.ok) {
        console.error('✗ Failed to register wallet:', walletResult.error.message)
        process.exit(1)
      }

      const guardrails = createDefaultGuardrails({
        perTransactionLimit,
        dailyLimit,
        allowedAssets,
      })
      const policyStore = new JsonFilePolicyStore()
      const savePoliciesResult = await policyStore.saveRules(walletId, guardrails)
      if (!savePoliciesResult.ok) {
        console.error('✗ Failed to save default guardrails:', String(savePoliciesResult.error))
        process.exit(1)
      }

      let airdropSignature: string | null = null
      try {
        airdropSignature = await maybeRequestDevnetAirdrop(keystoreResult.value.publicKey, airdropAmount)
      } catch (error) {
        console.warn('! Devnet airdrop skipped:', error instanceof Error ? error.message : String(error))
      }

      console.log('✓ Created managed agent wallet')
      console.log('  Wallet ID:      ', walletResult.value.id)
      console.log('  Address:        ', walletResult.value.publicKey)
      console.log('  Label:          ', walletResult.value.label)
      console.log('  Keystore:       ', keystoreResult.value.keystorePath)
      console.log('  Cluster default:', walletResult.value.defaultCluster)
      console.log('  Devnet URL:     ', `https://explorer.solana.com/address/${walletResult.value.publicKey}?cluster=devnet`)
      console.log('  Mainnet URL:    ', `https://explorer.solana.com/address/${walletResult.value.publicKey}`)
      if (airdropSignature) {
        console.log('  Devnet airdrop: ', airdropSignature)
      }

      console.log('\nDefault guardrails installed:')
      console.log(`  • Block unsupported assets (${allowedAssets.join(', ')})`)
      console.log(`  • Escalate transfers above ${perTransactionLimit}`)
      console.log(`  • Escalate daily spend above ${dailyLimit}`)
      console.log('  • Escalate swap/yield actions for human review')

      console.log('\nAgent setup:')
      console.log(`  export HOSHI_WALLET_ID=${walletResult.value.id}`)
      console.log('  export HOSHI_WALLET_PASSWORD=<your-password>')
      console.log('  Then connect MCP or skill.md to the agent.')
    } catch (error) {
      console.error('✗ Failed:', error instanceof Error ? error.message : String(error))
      process.exit(1)
    }
  })

program
  .command('wallet:create')
  .description('Register an existing wallet by public key (watch-only record)')
  .requiredOption('--pubkey <publicKey>', 'Solana public key')
  .option('-l, --label <label>', 'wallet label', 'Treasury')
  .action(async (options) => {
    const storage = new JsonFileStorage()
    const chain = new SolanaChainAdapter(getRpcUrl(program))
    await chain.connect()

    const walletService = new WalletService(storage, chain)
    const result = await walletService.create({ publicKey: options.pubkey, label: options.label })

    if (!result.ok) {
      console.error('✗ Failed:', result.error.message)
      process.exit(1)
    }

    console.log('✓ Registered wallet record')
    console.log('  ID:     ', result.value.id)
    console.log('  Address:', result.value.publicKey)
    console.log('  Label:  ', result.value.label)
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

    if (result.value.length === 0) {
      console.log('No wallets found. Create one with: hoshi create')
      return
    }

    console.log(`Found ${result.value.length} wallet(s):\n`)
    for (const wallet of result.value) {
      const mode = wallet.managed ? 'managed' : 'watch-only'
      const cluster = wallet.defaultCluster ?? 'devnet'
      console.log(`  ${wallet.id}`)
      console.log(`    Address: ${wallet.publicKey}`)
      console.log(`    Label:   ${wallet.label || ''}`)
      console.log(`    Type:    ${mode}`)
      console.log(`    Default: ${cluster}\n`)
    }
  })

program
  .command('wallet:export')
  .description('Export an encrypted managed wallet keystore')
  .argument('<walletId>', 'wallet ID')
  .requiredOption('-o, --out <path>', 'output path for the encrypted keystore file')
  .action(async (walletId, options) => {
    const result = getKeystoreVault().export(walletId, options.out)
    if (!result.ok) {
      console.error('✗ Failed:', result.error.message)
      process.exit(1)
    }

    console.log('✓ Exported encrypted keystore')
    console.log('  File:', result.value)
  })

program
  .command('wallet:import')
  .description('Import an encrypted managed wallet keystore file')
  .requiredOption('-f, --file <path>', 'encrypted keystore file path')
  .option('-l, --label <label>', 'optional label override')
  .action(async (options) => {
    const importResult = getKeystoreVault().import(options.file)
    if (!importResult.ok) {
      console.error('✗ Failed:', importResult.error.message)
      process.exit(1)
    }

    const storage = new JsonFileStorage()
    const existing = await storage.getWallet(importResult.value.walletId)
    if (existing.ok && existing.value) {
      console.log('✓ Imported keystore file')
      console.log('  Wallet already exists locally:', existing.value.id)
      return
    }

    const chain = new SolanaChainAdapter('https://api.devnet.solana.com')
    await chain.connect()
    const walletService = new WalletService(storage, chain)
    const walletResult = await walletService.create({
      id: importResult.value.walletId,
      publicKey: importResult.value.publicKey,
      label: options.label ?? importResult.value.metadata.label,
      managed: true,
      keystoreId: importResult.value.walletId,
      defaultCluster: importResult.value.metadata.defaultCluster,
    })

    if (!walletResult.ok) {
      console.error('✗ Failed:', walletResult.error.message)
      process.exit(1)
    }

    console.log('✓ Imported managed wallet')
    console.log('  Wallet ID:', walletResult.value.id)
    console.log('  Address:  ', walletResult.value.publicKey)
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

    if (!result.ok) {
      console.error('✗ Error:', result.error.message)
      process.exit(1)
    }

    console.log(`${options.asset}: ${result.value}`)
  })

program
  .command('transfer:build')
  .description('Build an unsigned transfer transaction after guardrail checks')
  .argument('<walletId>', 'wallet ID')
  .requiredOption('-t, --to <address>', 'recipient address')
  .requiredOption('-a, --amount <amount>', 'amount to send')
  .requiredOption('--asset <asset>', 'asset (USDC or SOL)')
  .action(async (walletId, options) => {
    const storage = new JsonFileStorage()
    const policyResult = await evaluatePolicy(
      storage,
      walletId,
      'transfer.send',
      { amount: options.amount, asset: options.asset },
      options.to,
    )

    if (!policyResult.ok) {
      console.error('✗ Policy check failed:', policyResult.error.message)
      process.exit(1)
    }

    if (!policyResult.value.allowed) {
      console.error('✗ Transfer blocked by guardrails')
      printPolicyResult(policyResult.value.rulesTriggered, policyResult.value.reason)
      process.exit(1)
    }

    if (policyResult.value.requiresApproval) {
      console.error('✗ Transfer requires human approval before it can be built')
      printPolicyResult(policyResult.value.rulesTriggered, policyResult.value.reason)
      process.exit(1)
    }

    const chain = new SolanaChainAdapter(getRpcUrl(program))
    await chain.connect()

    const transferService = new TransferService(storage, chain)
    const result = await transferService.buildTransferTransaction({
      walletId,
      to: options.to,
      amount: { amount: options.amount, asset: options.asset },
    })

    if (!result.ok) {
      console.error('✗ Failed:', result.error.message)
      process.exit(1)
    }

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
    console.log('✓ Transfer prepared')
    console.log('  Receipt ID:', result.value.receipt.id)
    console.log('  Unsigned tx:', serialized.slice(0, 80) + '...')
  })

program
  .command('transfer:send')
  .description('Guarded transfer using a managed wallet or external --keypair signer')
  .argument('<walletId>', 'wallet ID')
  .requiredOption('-t, --to <address>', 'recipient address')
  .requiredOption('-a, --amount <amount>', 'amount to send')
  .requiredOption('--asset <asset>', 'asset (USDC or SOL)')
  .action(async (walletId, options) => {
    const storage = new JsonFileStorage()
    const signer = await resolveSigner(storage, walletId)
    if (!signer) {
      console.error('✗ Signing requires either --keypair <path> or a managed wallet created with: hoshi create')
      process.exit(1)
    }

    const wallet = await ensureSignerMatchesWallet(storage, walletId, signer)
    if (!wallet) process.exit(1)

    const policyResult = await evaluatePolicy(
      storage,
      walletId,
      'transfer.send',
      { amount: options.amount, asset: options.asset },
      options.to,
    )

    if (!policyResult.ok) {
      console.error('✗ Policy check failed:', policyResult.error.message)
      process.exit(1)
    }

    if (!policyResult.value.allowed) {
      console.error('✗ Transfer blocked by guardrails')
      printPolicyResult(policyResult.value.rulesTriggered, policyResult.value.reason)
      process.exit(1)
    }

    if (policyResult.value.requiresApproval) {
      console.error('✗ Transfer requires human approval')
      printPolicyResult(policyResult.value.rulesTriggered, policyResult.value.reason)
      process.exit(1)
    }

    const chain = new SolanaChainAdapter(getRpcUrl(program))
    await chain.connect()

    const transferService = new TransferService(storage, chain)
    const result = await transferService.sendSigned(
      {
        walletId,
        to: options.to,
        amount: { amount: options.amount, asset: options.asset },
      },
      signer,
    )

    if (!result.ok) {
      console.error('✗ Failed:', result.error.message)
      process.exit(1)
    }

    console.log('✓ Transfer sent')
    console.log('  Wallet:   ', wallet.publicKey)
    console.log('  Receipt:  ', result.value.id)
    if (result.value.metadata?.signature) {
      console.log('  Signature:', result.value.metadata.signature)
      console.log('  Explorer: ', result.value.metadata.explorerUrl)
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
      slippageBps: Number.parseInt(options.slippage, 10),
    })

    if (!result.ok) {
      console.error('✗ Failed:', result.error.message)
      process.exit(1)
    }

    const quote = result.value
    console.log('✓ Jupiter Quote')
    console.log('  Input: ', quote.inputMint, '→', quote.inAmount)
    console.log('  Output:', quote.outputMint, '→', quote.outAmount)
    console.log('  Slippage:', quote.slippageBps, 'bps')
    console.log('  Price impact:', quote.priceImpactPct, '%')
    console.log('  Expires:', quote.expiry)
  })

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
    const params: Record<string, unknown> = {}

    switch (options.type) {
      case 'max_amount':
        if (!options.max) {
          console.error('--max required for max_amount')
          process.exit(1)
        }
        params.max = Number.parseFloat(options.max)
        break
      case 'daily_limit':
        if (!options.limit) {
          console.error('--limit required for daily_limit')
          process.exit(1)
        }
        params.limit = Number.parseFloat(options.limit)
        break
      case 'recipient_allowlist':
        if (!options.allowed) {
          console.error('--allowed required for recipient_allowlist')
          process.exit(1)
        }
        params.allowed = options.allowed.split(',').map((value: string) => value.trim())
        break
      case 'asset_type':
        if (!options.assets) {
          console.error('--assets required for asset_type')
          process.exit(1)
        }
        params.assets = options.assets.split(',').map((value: string) => value.trim())
        break
      case 'time_window':
        if (!options.start || !options.end) {
          console.error('--start and --end required for time_window')
          process.exit(1)
        }
        params.startHour = Number.parseInt(options.start, 10)
        params.endHour = Number.parseInt(options.end, 10)
        break
      case 'action_type':
        params.actions = [options.name]
        break
      default:
        console.error(`Unsupported policy type: ${options.type}`)
        process.exit(1)
    }

    const rule: PolicyRule = {
      id: crypto.randomUUID(),
      name: options.name,
      enabled: true,
      priority: Number.parseInt(options.priority, 10),
      condition: {
        type: options.type,
        params,
      },
      action: options.action,
    }

    const result = await policyStore.addRule(walletId, rule)
    if (!result.ok) {
      console.error('✗ Failed:', String(result.error))
      process.exit(1)
    }

    console.log('✓ Added policy rule')
    console.log('  Rule ID:', rule.id)
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

    if (result.value.length === 0) {
      console.log('No policy rules found for this wallet.')
      return
    }

    console.log(`Found ${result.value.length} policy rule(s):\n`)
    for (const rule of result.value) {
      const status = rule.enabled ? '●' : '○'
      console.log(`  ${status} [P${rule.priority}] ${rule.name} (${rule.id})`)
      console.log(`      Type: ${rule.condition.type} | Action: ${rule.action}`)
      console.log('      Params:', JSON.stringify(rule.condition.params))
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

    if (!result.ok) {
      console.error('✗ Failed:', String(result.error))
      process.exit(1)
    }

    console.log('✓ Removed policy rule')
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
    const storage = new JsonFileStorage()
    const amount = options.amount && options.asset ? { amount: options.amount, asset: options.asset } : undefined
    const result = await evaluatePolicy(storage, walletId, options.action, amount, options.to)

    if (!result.ok) {
      console.error('✗ Error:', result.error.message)
      process.exit(1)
    }

    console.log('✓ Policy Result')
    console.log('  Allowed:', result.value.allowed)
    console.log('  Action class:', result.value.action)
    if (result.value.requiresApproval) console.log('  Requires approval: YES')
    printPolicyResult(result.value.rulesTriggered, result.value.reason)
  })

// Register new commands
registerInit(program)
registerConfig(program)
registerAddress(program)
registerHistory(program)
registerContacts(program)
registerMcp(program)
registerLock(program)
registerDeposit(program)
registerSave(program)
registerStake(program)
registerEarnings(program)
registerEarn(program)
registerServe(program)
registerExportKey(program)
registerGas(program)
registerClaimRewards(program)
registerFundStatus(program)
registerPay(program)

program.parse()
