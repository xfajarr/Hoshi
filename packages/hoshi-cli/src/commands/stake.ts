import { Command } from 'commander'
import { printSuccess, printBlank, printInfo, printKeyValue, printHeader, printDivider, printJson, isJsonMode, handleError } from '../output.js'
import { JsonFileStorage } from '../store.js'
import { resolveSigner } from '../cli-utils.js'

export const registerStake = (program: Command): void => {
  program
    .command('stake')
    .description('Stake SOL for yield')
    .argument('<walletId>', 'wallet ID')
    .requiredOption('-a, --amount <amount>', 'Amount to stake')
    .option('--validator <pubkey>', 'Validator public key (optional)')
    .action(async (walletId, options) => {
      try {
        const storage = new JsonFileStorage()
        const signer = await resolveSigner(storage, walletId)
        if (!signer) {
          throw new Error('Signing requires --keypair or managed wallet')
        }

        printInfo(`Staking ${options.amount} SOL...`)
        printInfo('Note: Staking on Solana via Jito or SolBlaze')

        if (isJsonMode()) {
          printJson({
            action: 'stake',
            walletId,
            amount: options.amount,
            asset: 'SOL',
            status: 'not_implemented',
          })
          return
        }

        printSuccess('Stake transaction prepared')
        printInfo('Use: hoshi unstake to withdraw staked SOL')
      } catch (error) {
        handleError(error)
      }
    })

  program
    .command('unstake')
    .description('Unstake SOL')
    .argument('<walletId>', 'wallet ID')
    .requiredOption('-a, --amount <amount>', 'Amount to unstake')
    .action(async (walletId, options) => {
      try {
        const storage = new JsonFileStorage()
        const signer = await resolveSigner(storage, walletId)
        if (!signer) {
          throw new Error('Signing requires --keypair or managed wallet')
        }

        printInfo(`Unstaking ${options.amount} SOL...`)

        if (isJsonMode()) {
          printJson({
            action: 'unstake',
            walletId,
            amount: options.amount,
            asset: 'SOL',
            status: 'not_implemented',
          })
          return
        }

        printSuccess('Unstake transaction prepared')
      } catch (error) {
        handleError(error)
      }
    })
}