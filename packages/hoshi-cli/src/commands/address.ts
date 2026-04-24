import { Command } from 'commander'
import { printJson, isJsonMode, printKeyValue, printBlank } from '../output.js'
import { JsonFileStorage } from '../store.js'

export const registerAddress = (program: Command): void => {
  program
    .command('address')
    .description('Show current wallet address')
    .argument('[walletId]', 'wallet ID (optional, uses first wallet if not provided)')
    .action(async (walletId?: string) => {
      const storage = new JsonFileStorage()
      const wallets = await storage.getWallets()

      if (!wallets.ok) {
        throw new Error('Failed to get wallets')
      }

      if (wallets.value.length === 0) {
        throw new Error('No wallets found. Create one with: hoshi create')
      }

      let targetWallet = wallets.value[0]
      if (walletId) {
        const found = wallets.value.find(w => w.id === walletId)
        if (found) {
          targetWallet = found
        } else {
          throw new Error(`Wallet not found: ${walletId}`)
        }
      }

      if (isJsonMode()) {
        printJson({
          walletId: targetWallet.id,
          address: targetWallet.publicKey,
          label: targetWallet.label,
          cluster: targetWallet.defaultCluster,
        })
        return
      }

      printBlank()
      printKeyValue('Address', targetWallet.publicKey)
      if (targetWallet.label) {
        printKeyValue('Label', targetWallet.label)
      }
      printKeyValue('Cluster', targetWallet.defaultCluster ?? 'devnet')
      printBlank()
    })
}