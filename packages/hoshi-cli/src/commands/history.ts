import { Command } from 'commander'
import { printJson, isJsonMode, printKeyValue, printBlank, printHeader, printDivider } from '../output.js'
import { JsonFileStorage } from '../store.js'

export const registerHistory = (program: Command): void => {
  program
    .command('history')
    .description('Show transaction history for a wallet')
    .argument('<walletId>', 'wallet ID')
    .option('-l, --limit <n>', 'Number of transactions to show', '10')
    .action(async (walletId, options) => {
      const storage = new JsonFileStorage()
      const receipts = await storage.getReceipts(walletId)

      if (!receipts.ok) {
        throw new Error('Failed to get receipts')
      }

      const limit = parseInt(options.limit, 10) || 10
      const recent = receipts.value.slice(0, limit)

      if (recent.length === 0) {
        if (isJsonMode()) {
          printJson({ receipts: [] })
          return
        }
        printBlank()
        console.log('  No transactions found.')
        printBlank()
        return
      }

      if (isJsonMode()) {
        printJson({ receipts: recent })
        return
      }

      printHeader('Transaction History')
      printDivider()

      for (const receipt of recent) {
        const status = receipt.status === 'success' ? '✓' : '✗'
        const time = new Date(receipt.timestamp).toLocaleString()
        console.log(`  ${status} ${receipt.type} — ${receipt.amount?.asset ?? ''} ${receipt.amount?.amount ?? ''}`)
        console.log(`    To: ${receipt.recipient ?? 'N/A'}`)
        console.log(`    Time: ${time}`)
        if (receipt.metadata?.signature) {
          console.log(`    Sig: ${receipt.metadata.signature.slice(0, 20)}...`)
        }
        console.log('')
      }
    })
}