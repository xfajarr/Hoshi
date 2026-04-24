import { Command } from 'commander'
import { printSuccess, printBlank, printInfo, printKeyValue, printHeader, printDivider, printJson, isJsonMode } from '../output.js'
import { JsonFileStorage } from '../store.js'

export const registerDeposit = (program: Command): void => {
  program
    .command('deposit')
    .description('Show deposit instructions')
    .argument('[walletId]', 'wallet ID (optional)')
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

      const address = targetWallet.publicKey
      const cluster = targetWallet.defaultCluster ?? 'devnet'

      if (isJsonMode()) {
        printJson({
          walletId: targetWallet.id,
          address,
          cluster,
          instructions: {
            SOL: `Send SOL to ${address}`,
            USDC: `Send USDC (SPL) to ${address} - note: Use Solana USDC, not Ethereum`,
          },
        })
        return
      }

      printHeader('Deposit Instructions')
      printDivider()
      printKeyValue('Wallet', targetWallet.label ?? targetWallet.id)
      printKeyValue('Address', address)
      printKeyValue('Network', cluster)
      printBlank()

      console.log('  Supported assets:')
      console.log('    • SOL - Native Solana')
      console.log('    • USDC - SPL token (not ERC-20)')
      console.log('')

      console.log('  To add USDC:')
      console.log('    1. Buy USDC on an exchange (Coinbase, Binance, etc.)')
      console.log('    2. Withdraw to your Hoshi address')
      console.log('    3. Network: Solana (not Ethereum!)')
      console.log('')

      console.log('  Note: Do NOT send ETH or ERC-20 tokens. They are not supported.')
      printBlank()
    })
}