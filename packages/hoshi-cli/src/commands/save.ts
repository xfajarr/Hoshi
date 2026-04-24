import { Command } from 'commander'
import { printSuccess, printBlank, printInfo, printKeyValue, printHeader, printDivider, printJson, isJsonMode, handleError } from '../output.js'
import { JsonFileStorage } from '../store.js'
import { resolveSigner, ensureSignerMatchesWallet } from '../cli-utils.js'

export const registerSave = (program: Command): void => {
  program
    .command('save')
    .description('Deposit funds to earn yield')
    .argument('<walletId>', 'wallet ID')
    .requiredOption('-a, --amount <amount>', 'Amount to deposit')
    .requiredOption('--asset <asset>', 'Asset (USDC, SOL)')
    .option('--protocol <name>', 'Yield protocol (kamino, jito)', 'kamino')
    .action(async (walletId, options) => {
      try {
        const storage = new JsonFileStorage()
        const signer = await resolveSigner(storage, walletId)
        if (!signer) {
          throw new Error('Signing requires --keypair or managed wallet')
        }

        const wallet = await ensureSignerMatchesWallet(storage, walletId, signer)
        if (!wallet) process.exit(1)

        printInfo(`Depositing ${options.amount} ${options.asset} to ${options.protocol}...`)
        printInfo('Note: Yield on Solana - this would integrate with Kamino/Jito protocols')

        // In reality: call deposit on yield protocol
        // For now: show the structure
        if (isJsonMode()) {
          printJson({
            action: 'save',
            walletId,
            amount: options.amount,
            asset: options.asset,
            protocol: options.protocol,
            status: 'not_implemented',
          })
          return
        }

        printSuccess('Yield deposit queued')
        printBlank()
        printInfo('Use: hoshi earnings to track yield')
      } catch (error) {
        handleError(error)
      }
    })

  program
    .command('withdraw')
    .description('Withdraw funds from yield')
    .argument('<walletId>', 'wallet ID')
    .requiredOption('-a, --amount <amount>', 'Amount to withdraw')
    .requiredOption('--asset <asset>', 'Asset (USDC, SOL)')
    .option('--protocol <name>', 'Yield protocol')
    .action(async (walletId, options) => {
      try {
        const storage = new JsonFileStorage()
        const signer = await resolveSigner(storage, walletId)
        if (!signer) {
          throw new Error('Signing requires --keypair or managed wallet')
        }

        printInfo(`Withdrawing ${options.amount} ${options.asset}...`)

        if (isJsonMode()) {
          printJson({
            action: 'withdraw',
            walletId,
            amount: options.amount,
            asset: options.asset,
            status: 'not_implemented',
          })
          return
        }

        printSuccess('Yield withdrawal queued')
      } catch (error) {
        handleError(error)
      }
    })

  program
    .command('borrow')
    .description('Borrow against collateral')
    .argument('<walletId>', 'wallet ID')
    .requiredOption('-a, --amount <amount>', 'Amount to borrow')
    .requiredOption('--asset <asset>', 'Asset to borrow (USDC, SOL)')
    .action(async (walletId, options) => {
      try {
        const storage = new JsonFileStorage()
        const signer = await resolveSigner(storage, walletId)
        if (!signer) {
          throw new Error('Signing requires --keypair or managed wallet')
        }

        printInfo(`Borrowing ${options.amount} ${options.asset}...`)
        printInfo('Note: Borrowing integrates with Solana lending protocols')

        if (isJsonMode()) {
          printJson({
            action: 'borrow',
            walletId,
            amount: options.amount,
            asset: options.asset,
            status: 'not_implemented',
          })
          return
        }

        printSuccess('Borrow transaction prepared')
        printInfo('Use: hoshi health to check borrow limit')
      } catch (error) {
        handleError(error)
      }
    })

  program
    .command('repay')
    .description('Repay borrowed funds')
    .argument('<walletId>', 'wallet ID')
    .requiredOption('-a, --amount <amount>', 'Amount to repay')
    .requiredOption('--asset <asset>', 'Asset (USDC, SOL)')
    .action(async (walletId, options) => {
      try {
        const storage = new JsonFileStorage()
        const signer = await resolveSigner(storage, walletId)
        if (!signer) {
          throw new Error('Signing requires --keypair or managed wallet')
        }

        printInfo(`Repaying ${options.amount} ${options.asset}...`)

        if (isJsonMode()) {
          printJson({
            action: 'repay',
            walletId,
            amount: options.amount,
            asset: options.asset,
            status: 'not_implemented',
          })
          return
        }

        printSuccess('Repay transaction prepared')
      } catch (error) {
        handleError(error)
      }
    })
}