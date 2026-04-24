import { Command } from 'commander'
import { printSuccess, printBlank, printInfo, printKeyValue, printHeader, printDivider, printJson, isJsonMode, handleError } from '../output.js'
import { JsonFileStorage } from '../store.js'
import { resolveSigner } from '../cli-utils.js'

export const registerEarnings = (program: Command): void => {
  program
    .command('earnings')
    .description('Show yield earned')
    .argument('<walletId>', 'wallet ID')
    .action(async (walletId) => {
      if (isJsonMode()) {
        printJson({
          walletId,
          totalEarned: 0,
          breakdown: [],
          note: 'Yield tracking not yet implemented',
        })
        return
      }

      printHeader('Yield Earnings')
      printDivider()
      printInfo('No yield positions found.')
      printInfo('Use: hoshi save <amount> to earn yield')
      printBlank()
    })

  program
    .command('health')
    .description('Show borrow health factor')
    .argument('<walletId>', 'wallet ID')
    .action(async (walletId) => {
      if (isJsonMode()) {
        printJson({
          walletId,
          healthFactor: 1.0,
          totalCollateral: 0,
          totalDebt: 0,
          liquidationThreshold: 1.2,
          status: 'not_implemented',
        })
        return
      }

      printHeader('Borrow Health')
      printDivider()
      printKeyValue('Health Factor', '1.0 (no borrow positions)')
      printKeyValue('Collateral', '$0.00')
      printKeyValue('Debt', '$0.00')
      printInfo('Use: hoshi borrow to borrow against collateral')
      printBlank()
    })

  program
    .command('rates')
    .description('Show current yield and borrow rates')
    .action(() => {
      if (isJsonMode()) {
        printJson({
          savings: { USDC: '5.0%', SOL: '4.2%' },
          borrow: { USDC: '8.0%', SOL: '6.5%' },
          note: 'Sample rates',
        })
        return
      }

      printHeader('Current Rates')
      printDivider()
      console.log('  Yield (earn):')
      console.log('    USDC:  5.0% APY')
      console.log('    SOL:  4.2% APY')
      console.log('')
      console.log('  Borrow:')
      console.log('    USDC:  8.0% APR')
      console.log('    SOL:  6.5% APR')
      printBlank()
    })

  program
    .command('positions')
    .description('Show DeFi positions')
    .argument('<walletId>', 'wallet ID')
    .action(async (walletId) => {
      if (isJsonMode()) {
        printJson({
          walletId,
          positions: [],
          note: 'Position tracking not yet implemented',
        })
        return
      }

      printHeader('DeFi Positions')
      printDivider()
      printInfo('No active positions.')
      printInfo('Use: hoshi save, stake, or borrow')
      printBlank()
    })
}