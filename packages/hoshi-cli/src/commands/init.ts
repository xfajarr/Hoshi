import { Command } from 'commander'
import { printSuccess, printBlank, printInfo, printLine, handleError } from '../output.js'
import { resolvePassword, saveSession } from '../prompts.js'
import { getKeystoreVault } from '../keystore.js'
import { JsonFileStorage } from '../store.js'
import { setSafeguard } from '../config.js'
import { getMcpPlatforms, installMcpForPlatforms } from '../mcp-utils.js'

interface InitOptions {
  key?: string
  sponsor?: boolean
  noAirdrop?: boolean
  'no-mcp'?: boolean
  'no-safeguards'?: boolean
}

export const registerInit = (program: Command): void => {
  program
    .command('init')
    .description('Create a new agent wallet — guided setup with MCP + safeguards')
    .option('--key <path>', 'Key file path for existing wallet')
    .option('--no-airdrop', 'Skip devnet SOL airdrop')
    .option('--no-mcp', 'Skip MCP configuration')
    .option('--no-safeguards', 'Skip safeguards configuration')
    .action(async (options: InitOptions) => {
      try {
        const { input, checkbox } = await import('@inquirer/prompts')
        const { SolanaChainAdapter, WalletService } = await import('@hoshi/sdk')

        console.log('')
        console.log('  ┌─────────────────────────────────────────┐')
        console.log('  │  Welcome to Hoshi                      │')
        console.log('  │  Financial OS for AI agents on Solana     │')
        console.log('  └─────────────────────────────────────────┘')
        console.log('')

        // Check for existing wallet
        const storage = new JsonFileStorage()
        const existingWallets = await storage.getWallets()
        const hasWallet = existingWallets.ok && existingWallets.value.length > 0

        if (hasWallet) {
          console.log('  Existing wallet detected')
          const password = await resolvePassword()
          const vault = getKeystoreVault()

          const keystores = existingWallets.value.filter(w => w.managed && w.keystoreId)
          if (keystores.length > 0) {
            const wallet = keystores[0]
            const unlockResult = vault.unlock(wallet.keystoreId!, password)
            if (unlockResult.ok) {
              const address = unlockResult.value.publicKey
              console.log(`  Wallet unlocked (${address.slice(0, 6)}...${address.slice(-4)})`)
            }
          }
        }

        // Step 1: Create wallet
        console.log('')
        console.log('  Step 1 of 3 — Create wallet')
        printBlank()

        const password = await resolvePassword({ confirm: true })
        const walletId = crypto.randomUUID()
        const vault = getKeystoreVault()

        const keystoreResult = vault.create({
          walletId,
          password,
          label: 'Agent Treasury',
          defaultCluster: 'devnet',
        })

        if (!keystoreResult.ok) {
          handleError(new Error(`Failed to create wallet keystore: ${keystoreResult.error.message}`))
          process.exit(1)
        }

        const solanaChain = new SolanaChainAdapter('https://api.devnet.solana.com')
        await solanaChain.connect()

        const walletService = new WalletService(storage, solanaChain)
        const walletResult = await walletService.create({
          id: walletId,
          publicKey: keystoreResult.value.publicKey,
          label: 'Agent Treasury',
          managed: true,
          keystoreId: walletId,
          defaultCluster: 'devnet',
        })

        if (!walletResult.ok) {
          handleError(new Error(`Failed to register wallet: ${walletResult.error.message}`))
          process.exit(1)
        }

        const address = walletResult.value.publicKey

        // Request airdrop on devnet (optional)
        if (!options.noAirdrop) {
          try {
            printInfo('Requesting devnet SOL airdrop...')
            const { Connection, PublicKey, LAMPORTS_PER_SOL } = await import('@solana/web3.js')
            const connection = new Connection('https://api.devnet.solana.com', 'confirmed')
            const airdropSig = await connection.requestAirdrop(
              new PublicKey(address),
              LAMPORTS_PER_SOL,
            )
            const blockhash = await connection.getLatestBlockhash()
            await connection.confirmTransaction({ signature: airdropSig, ...blockhash }, 'confirmed')
            printSuccess('Devnet SOL airdrop received')
          } catch (error) {
            printInfo('Devnet airdrop skipped (not available)')
          }
        }

        console.log('')
        printSuccess('Keypair generated')
        printInfo(`Network: Solana devnet`)
        printInfo(`Address: ${address}`)

        printBlank()
        printLine('  Check accounts and balances...')

        // Save session password
        await saveSession(password)

        printBlank()
        printLine('  Agent wallet created')
        printLine(`  Address: ${address}`)
        printBlank()

        // Step 2: MCP configuration
        console.log('  Step 2 of 3 — Connect AI platforms')
        printBlank()

        if (options['no-mcp']) {
          printInfo('Skipped — use: hoshi mcp install')
        } else {
          const platforms = getMcpPlatforms()

          const selectedNames = await checkbox({
            message: 'Which AI platforms do you use? (space to select)',
            choices: platforms.map(p => ({
              name: p.name,
              value: p.name,
              checked: p.name === 'Claude Desktop',
            })),
          })

          const selectedPlatforms = platforms.filter(p => selectedNames.includes(p.name))

          if (selectedPlatforms.length > 0) {
            printBlank()
            printInfo('Adding Hoshi to your AI platforms...')
            printBlank()
            await installMcpForPlatforms(selectedPlatforms)
          } else {
            printInfo('Skipped — you can add MCP later with: hoshi mcp install')
          }
        }

        printBlank()

        // Step 3: Safeguards
        console.log('  Step 3 of 3 — Set safeguards')
        printBlank()

        if (options['no-safeguards']) {
          printInfo('Skipped — use: hoshi config set maxPerTx 500')
        } else {
          const maxPerTxVal = await input({
            message: 'Max per transaction ($):',
            default: '500',
          })
          const maxDaily = await input({
            message: 'Max daily sends ($):',
            default: '1000',
          })

          setSafeguard('maxPerTx', Number(maxPerTxVal) || 500)
          setSafeguard('maxDailySend', Number(maxDaily) || 1000)

          printSuccess('Safeguards configured')
        }

        printBlank()

        // Done!
        console.log('  ┌─────────────────────────────────────────┐')
        console.log('  │  ✓ You\'re all set                        │')
        console.log('  │                                         │')
        console.log('  │  Next steps:                             │')
        console.log('  │    1. Restart your AI platform           │')
        console.log('  │    2. Ask: "What\'s my hoshi balance?"│')
        console.log('  │                                         │')
        console.log('  │  Your address:                          │')
        console.log(`  │    ${address.padEnd(35)}│`)
        console.log('  └─────────────────────────────────────────┘')
        console.log('')
      } catch (error) {
        handleError(error)
      }
    })
}