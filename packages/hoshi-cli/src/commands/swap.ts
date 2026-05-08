import { Command } from 'commander'
import { printSuccess, printBlank, printInfo, printKeyValue, printHeader, printDivider, printJson, isJsonMode, handleError, explorerUrl } from '../output.js'
import { JsonFileStorage } from '../store.js'
import { resolveSigner, ensureSignerMatchesWallet } from '../cli-utils.js'
import { JupiterSwapAdapter } from '@hoshi/sdk'
import { PublicKey } from '@solana/web3.js'
import { resolveTokenMint } from '@hoshi/sdk'

export const registerSwap = (program: Command): void => {
  program
    .command('swap')
    .description('Swap tokens via Jupiter')
    .argument('<walletId>', 'wallet ID')
    .requiredOption('-i, --input <asset>', 'Input asset (e.g., SOL, USDC)')
    .requiredOption('-o, --output <asset>', 'Output asset (e.g., USDC, SOL)')
    .requiredOption('-a, --amount <amount>', 'Input amount (in base units)')
    .option('--slippage <bps>', 'Slippage in basis points', '50')
    .option('--no-wrap', 'Do not wrap/unwrap SOL')
    .action(async (walletId, options) => {
      try {
        const storage = new JsonFileStorage()
        const signer = await resolveSigner(storage, walletId)
        if (!signer) {
          throw new Error('Signing requires --keypair or managed wallet')
        }

        const wallet = await ensureSignerMatchesWallet(storage, walletId, signer)
        if (!wallet) process.exit(1)

        const inputMint = resolveTokenMint(options.input)
        const outputMint = resolveTokenMint(options.output)

        if (!inputMint) throw new Error(`Unknown input asset: ${options.input}`)
        if (!outputMint) throw new Error(`Unknown output asset: ${options.output}`)

        const jupiter = new JupiterSwapAdapter()
        const amountSmallestUnits = BigInt(Math.floor(parseFloat(options.amount) * 1e9)).toString()

        const quoteResult = await jupiter.getQuote({
          inputMint,
          outputMint,
          amount: amountSmallestUnits,
          slippageBps: parseInt(options.slippage, 10),
        })

        if (!quoteResult.ok) {
          throw new Error(`Quote failed: ${quoteResult.error.message}`)
        }

        const quote = quoteResult.value

        if (isJsonMode()) {
          printJson({
            action: 'swap',
            walletId,
            inputMint,
            outputMint,
            inAmount: quote.inAmount,
            outAmount: quote.outAmount,
            slippageBps: quote.slippageBps,
            priceImpactPct: quote.priceImpactPct,
            routePlan: quote.routePlan,
            expiry: quote.expiry,
            status: 'quote_ready',
          })
          return
        }

        printHeader('Swap Quote')
        printDivider()
        printKeyValue('Input', `${options.input} → ${quote.inAmount}`)
        printKeyValue('Output', `${options.output} → ${quote.outAmount}`)
        printKeyValue('Slippage', `${quote.slippageBps} bps`)
        printKeyValue('Price Impact', `${quote.priceImpactPct}%`)
        if (quote.routePlan.length > 0) {
          const routes = quote.routePlan.map(r => r.swapInfo.label).join(', ')
          printKeyValue('Route', routes)
        }
        printBlank()

        const buildResult = await jupiter.buildSwapTransaction({
          quote,
          userPublicKey: new PublicKey(wallet.publicKey),
          wrapUnwrapSOL: true,
        })

        if (!buildResult.ok) {
          throw new Error(`Build failed: ${buildResult.error.message}`)
        }

        const { Connection } = await import('@solana/web3.js')
        const connection = new Connection(
          wallet.defaultCluster === 'mainnet'
            ? 'https://api.mainnet-beta.solana.com'
            : 'https://api.devnet.solana.com',
          'confirmed'
        )

        const { blockhash } = await connection.getLatestBlockhash()
        buildResult.value.recentBlockhash = blockhash
        buildResult.value.feePayer = new PublicKey(wallet.publicKey)

        const signResult = await signer.signTransaction(buildResult.value)
        if (!signResult.ok) {
          throw new Error(`Sign failed: ${signResult.error.message}`)
        }

        const signature = await connection.sendRawTransaction(signResult.value.serialize())

        printSuccess('Swap executed')
        printKeyValue('Signature', signature)
        printKeyValue('Explorer', explorerUrl(signature, wallet.defaultCluster ?? 'devnet'))
      } catch (error) {
        handleError(error)
      }
    })

  program
    .command('swap:quote')
    .description('Get Jupiter swap quote without executing')
    .requiredOption('-i, --input <asset>', 'Input asset')
    .requiredOption('-o, --output <asset>', 'Output asset')
    .requiredOption('-a, --amount <amount>', 'Input amount')
    .option('--slippage <bps>', 'Slippage in basis points', '50')
    .action(async (options) => {
      try {
        const inputMint = resolveTokenMint(options.input)
        const outputMint = resolveTokenMint(options.output)

        if (!inputMint) throw new Error(`Unknown input asset: ${options.input}`)
        if (!outputMint) throw new Error(`Unknown output asset: ${options.output}`)

        const jupiter = new JupiterSwapAdapter()
        const amountSmallestUnits = BigInt(Math.floor(parseFloat(options.amount) * 1e9)).toString()

        const result = await jupiter.getQuote({
          inputMint,
          outputMint,
          amount: amountSmallestUnits,
          slippageBps: parseInt(options.slippage, 10),
        })

        if (!result.ok) {
          throw new Error(`Quote failed: ${result.error.message}`)
        }

        const quote = result.value

        if (isJsonMode()) {
          printJson({
            inputMint,
            outputMint,
            inAmount: quote.inAmount,
            outAmount: quote.outAmount,
            otherAmountThreshold: quote.otherAmountThreshold,
            slippageBps: quote.slippageBps,
            priceImpactPct: quote.priceImpactPct,
            routePlan: quote.routePlan,
            expiry: quote.expiry,
          })
          return
        }

        printHeader('Jupiter Quote')
        printDivider()
        printKeyValue('Input Mint', inputMint)
        printKeyValue('Output Mint', outputMint)
        printKeyValue('In Amount', quote.inAmount)
        printKeyValue('Out Amount', quote.outAmount)
        printKeyValue('Min Out', quote.otherAmountThreshold)
        printKeyValue('Slippage', `${quote.slippageBps} bps`)
        printKeyValue('Price Impact', `${quote.priceImpactPct}%`)
        printBlank()
        printInfo(`Quote expires: ${quote.expiry}`)
      } catch (error) {
        handleError(error)
      }
    })
}
