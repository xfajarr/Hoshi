import { Command } from 'commander'
import { printJson, isJsonMode, printKeyValue, printBlank, printHeader, printDivider, printSuccess, printInfo } from '../output.js'
import { JsonFileStorage } from '../store.js'

export const registerReceive = (program: Command): void => {
  program
    .command('receive')
    .description('Show wallet address for receiving funds')
    .argument('[walletId]', 'wallet ID')
    .action(async (walletId?: string) => {
      const storage = new JsonFileStorage()
      const wallets = await storage.getWallets()

      if (!wallets.ok) {
        throw new Error('Failed to get wallets')
      }

      let targetWallet = wallets.value[0]
      if (walletId) {
        const found = wallets.value.find(w => w.id === walletId)
        if (found) targetWallet = found
      }

      if (isJsonMode()) {
        printJson({ address: targetWallet.publicKey, cluster: targetWallet.defaultCluster })
        return
      }

      printBlank()
      console.log(`  ${targetWallet.publicKey}`)
      console.log('')
      console.log(`  Network: ${targetWallet.defaultCluster ?? 'devnet'}`)
      printBlank()
    })
}

export const registerSend = (program: Command): void => {
  program
    .command('send')
    .description('Send funds to another wallet')
    .argument('<walletId>', 'wallet ID')
    .requiredOption('-t, --to <address>', 'Recipient address')
    .requiredOption('-a, --amount <amount>', 'Amount to send')
    .requiredOption('--asset <asset>', 'Asset (USDC, SOL)')
    .action(async (walletId, options) => {
      try {
        const { resolveSigner, ensureSignerMatchesWallet } = await import('../cli-utils.js')
        const storage = new JsonFileStorage()
        const signer = await resolveSigner(storage, walletId)

        if (!signer) {
          throw new Error('Signing requires --keypair or managed wallet')
        }

        const wallet = await ensureSignerMatchesWallet(storage, walletId, signer)
        if (!wallet) process.exit(1)

        const chain = new (await import('@solana/web3.js')).Connection
        const solanaChain = new (await import('@hoshi/sdk')).SolanaChainAdapter(
          wallet.defaultCluster === 'mainnet'
            ? 'https://api.mainnet-beta.solana.com'
            : 'https://api.devnet.solana.com'
        )
        await solanaChain.connect()

        const transferService = new (await import('@hoshi/sdk')).TransferService(storage, solanaChain)
        const result = await transferService.sendSigned(
          { walletId, to: options.to, amount: { amount: options.amount, asset: options.asset } },
          signer,
        )

        if (!result.ok) {
          throw new Error(result.error.message)
        }

        printSuccess('Transfer sent')
        console.log('  To:', options.to)
        console.log('  Amount:', `${options.amount} ${options.asset}`)
        if (result.value.metadata?.signature) {
          console.log('  Signature:', result.value.metadata.signature)
        }
      } catch (error) {
        console.error('✗ Failed:', error instanceof Error ? error.message : String(error))
        process.exit(1)
      }
    })
}