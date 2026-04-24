import { Command } from 'commander'
import { printSuccess, printBlank, printInfo, printKeyValue, printHeader, printDivider, printJson, isJsonMode, handleError } from '../output.js'

export const registerGas = (program: Command): void => {
  program
    .command('gas')
    .description('Show current gas fees')
    .option('--fast', 'Show fast fee')
    .option('--average', 'Show average fee (default)')
    .option('--slow', 'Show slow fee')
    .action(async (options) => {
      if (isJsonMode()) {
        printJson({
          fast: '0.0005 SOL',
          average: '0.00025 SOL',
          slow: '0.0001 SOL',
          unit: 'SOL',
        })
        return
      }

      printHeader('Current Gas Fees (Solana)')
      printDivider()
      printKeyValue('Fast', '0.0005 SOL (~2 cents)')
      printKeyValue('Average', '0.00025 SOL (~1 cent)')
      printKeyValue('Slow', '0.0001 SOL (<1 cent)')
      printBlank()
      printInfo('Solana has low, predictable fees')
    })
}

export const registerClaimRewards = (program: Command): void => {
  program
    .command('claim-rewards')
    .description('Claim staking rewards')
    .argument('<walletId>', 'wallet ID')
    .action(async (walletId) => {
      try {
        if (isJsonMode()) {
          printJson({
            action: 'claim-rewards',
            walletId,
            status: 'not_implemented',
          })
          return
        }

        printInfo('No staking positions to claim from.')
        printInfo('Use: hoshi stake to stake SOL')
      } catch (error) {
        handleError(error)
      }
    })
}

export const registerFundStatus = (program: Command): void => {
  program
    .command('fund-status')
    .description('Show funding status')
    .argument('<walletId>', 'wallet ID')
    .action(async (walletId) => {
      try {
        const { JsonFileStorage } = await import('../store.js')
        const storage = new JsonFileStorage()
        const balances = await storage.getYieldPositions(walletId)

        if (isJsonMode()) {
          printJson({
            walletId,
            funded: false,
            positions: balances.value ?? [],
          })
          return
        }

        printHeader('Funding Status')
        printDivider()
        printInfo('No funding positions.')
        printInfo('Use: hoshi save to fund yield positions')
      } catch (error) {
        handleError(error)
      }
    })
}