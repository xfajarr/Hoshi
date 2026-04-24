import { Command } from 'commander'
import { printSuccess, printBlank, printInfo, printJson, isJsonMode, handleError } from '../output.js'
import { JsonFileStorage } from '../store.js'

export const registerServe = (program: Command): void => {
  program
    .command('serve')
    .description('Start HTTP API server for non-TypeScript agents')
    .option('-p, --port <port>', 'Port number', '3001')
    .option('--host <host>', 'Host address', '0.0.0.0')
    .option('--json-rpc', 'Enable JSON-RPC endpoint')
    .action(async (options) => {
      try {
        const Hono = (await import('hono')).default
        const { serve } = await import('@hono/node-server')
        const { cors } = await import('hono/cors')

        const app = new Hono()

        app.use('*', cors())

        app.get('/', (c) => {
          return c.json({
            name: 'Hoshi',
            version: '0.1.0',
            description: 'Financial OS for AI agents on Solana',
          })
        })

        app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

        app.get('/wallets', async (c) => {
          const storage = new JsonFileStorage()
          const wallets = await storage.getWallets()
          return c.json({ wallets: wallets.value ?? [] })
        })

        const port = parseInt(options.port, 10)
        const host = options.host

        console.log(`Starting Hoshi HTTP API server on http://${host}:${port}`)
        console.log('')
        console.log('  Endpoints:')
        console.log(`    GET  /           - Server info`)
        console.log(`    GET  /health    - Health check`)
        console.log(`    GET  /wallets  - List wallets`)
        console.log(`    GET  /balance/:id - Wallet balance`)
        console.log('')

        await serve({ fetch: app.fetch, port, hostname: host })

        if (isJsonMode()) {
          printJson({
            server: 'started',
            host,
            port,
            endpoints: ['/', '/health', '/wallets'],
          })
        } else {
          printSuccess(`Server running at http://${host}:${port}`)
          printBlank()
        }
      } catch (error) {
        handleError(error)
      }
    })
}