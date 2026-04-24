import { Command } from 'commander'
import { printSuccess, printBlank, printInfo, printKeyValue, printHeader, printDivider, printJson, isJsonMode, handleError } from '../output.js'
import { getKeystoreVault } from '../keystore.js'
import { JsonFileStorage } from '../store.js'

export const registerExportKey = (program: Command): void => {
  program
    .command('export-key')
    .description('Export encrypted wallet key file')
    .argument('<walletId>', 'wallet ID')
    .requiredOption('-o, --out <path>', 'Output file path')
    .option('--raw', 'Export raw private key (dangerous!)')
    .action(async (walletId, options) => {
      try {
        const vault = getKeystoreVault()
        const result = vault.export(walletId, options.out)

        if (!result.ok) {
          throw new Error(result.error.message)
        }

        if (isJsonMode()) {
          printJson({ exported: true, path: result.value })
          return
        }

        printSuccess('Key exported')
        printKeyValue('File', result.value)
        printBlank()
        printInfo('Keep this file secure! Anyone with it can access your funds.')
      } catch (error) {
        handleError(error)
      }
    })

  program
    .command('import-key')
    .description('Import an encrypted wallet key file')
    .requiredOption('-f, --file <path>', 'Key file path')
    .option('-l, --label <label>', 'Wallet label')
    .action(async (options) => {
      try {
        const vault = getKeystoreVault()
        const importResult = vault.import(options.file)

        if (!importResult.ok) {
          throw new Error(importResult.error.message)
        }

        const storage = new JsonFileStorage()
        const existing = await storage.getWallet(importResult.value.walletId)

        if (existing.ok && existing.value) {
          printSuccess('Key already imported')
          printKeyValue('Wallet ID', existing.value.id)
          return
        }

        const chain = new (await import('@solana/web3.js')).Connection
        const solanaChain = new (await import('@hoshi/sdk')).SolanaChainAdapter('https://api.devnet.solana.com')
        await solanaChain.connect()

        const walletService = new (await import('@hoshi/sdk')).WalletService(storage, solanaChain)
        const walletResult = await walletService.create({
          id: importResult.value.walletId,
          publicKey: importResult.value.publicKey,
          label: options.label ?? importResult.value.metadata.label ?? 'Imported',
          managed: true,
          keystoreId: importResult.value.walletId,
          defaultCluster: importResult.value.metadata.defaultCluster,
        })

        if (!walletResult.ok) {
          throw new Error(walletResult.error.message)
        }

        if (isJsonMode()) {
          printJson({ imported: true, walletId: walletResult.value.id })
          return
        }

        printSuccess('Key imported')
        printKeyValue('Wallet ID', walletResult.value.id)
        printKeyValue('Address', walletResult.value.publicKey)
      } catch (error) {
        handleError(error)
      }
    })
}