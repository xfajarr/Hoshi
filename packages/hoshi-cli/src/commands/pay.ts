import { Command } from 'commander'
import { printSuccess, printBlank, printInfo, printKeyValue, printHeader, printDivider, printJson, isJsonMode, handleError } from '../output.js'
import { resolveSigner } from '../cli-utils.js'

export const registerPay = (program: Command): void => {
  program
    .command('pay')
    .description('Pay for x402 API resource (Machine Payable Protocol)')
    .argument('<url>', 'x402 payment URL')
    .option('--body <json>', 'Request body as JSON')
    .option('--header <key=value>', 'Additional headers')
    .action(async (url, options) => {
      try {
        let body: Record<string, unknown> | undefined
        if (options.body) {
          try {
            body = JSON.parse(options.body)
          } catch {
            throw new Error('Invalid JSON in --body')
          }
        }

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Accept': 'application/x-402-response',
        }

        if (isJsonMode()) {
          printJson({
            action: 'pay',
            url,
            status: 'not_implemented',
            note: 'x402 payment requires integration',
          })
          return
        }

        printInfo(`Payment request: ${url}`)
        printInfo('Note: x402 MPP integration not yet implemented')
        printInfo('This feature enables AI agents to pay for APIs')
      } catch (error) {
        handleError(error)
      }
    })
}

export const registerEarn = (program: Command): void => {
  program
    .command('earn')
    .description('Show earning opportunities')
    .action(() => {
      if (isJsonMode()) {
        printJson({
          opportunities: [
            { protocol: 'Kamino', asset: 'USDC', apy: '5.0%', risk: 'low' },
            { protocol: 'Jito', asset: 'SOL', apy: '4.2%', risk: 'medium' },
            { protocol: 'SolBlaze', asset: 'SOL', apy: '4.0%', risk: 'medium' },
          ],
        })
        return
      }

      printHeader('Earning Opportunities')
      printDivider()
      console.log('  Protocol    Asset    APY      Risk')
      console.log('  ─────────────────────────────────')
      console.log('  Kamino     USDC    5.0%     Low')
      console.log('  Jito       SOL    4.2%    Medium')
      console.log('  SolBlaze   SOL    4.0%    Medium')
      console.log('')
      console.log('  Use: hoshi save <amount> --asset <asset>')
      printBlank()
    })
}