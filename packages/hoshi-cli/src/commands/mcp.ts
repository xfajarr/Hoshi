import { Command } from 'commander'
import { printSuccess, printBlank, printInfo, printJson, isJsonMode } from '../output.js'
import { getMcpPlatforms, installMcpForPlatforms, uninstallMcpFromPlatforms, getMcpConfig } from '../mcp-utils.js'

export const registerMcp = (program: Command): void => {
  const mcpCmd = program.command('mcp').description('MCP server for AI platforms')

  mcpCmd
    .command('start', { isDefault: true })
    .description('Start MCP server (stdio transport)')
    .option('--key <path>', 'Key file path')
    .action(async (options) => {
      try {
        const { startMcpServer } = await import('@hoshi/mcp')
        await startMcpServer({ keyPath: options.key })
      } catch (error) {
        console.error(
          'MCP server not installed. Run:\n  npm install -g @hoshi/mcp',
        )
        process.exit(1)
      }
    })

  mcpCmd
    .command('install')
    .description('Auto-configure MCP in Claude Desktop, Cursor, and Windsurf')
    .action(async () => {
      const platforms = getMcpPlatforms()
      const results = await installMcpForPlatforms(platforms)

      if (isJsonMode()) {
        printJson({ installed: results })
        return
      }

      printBlank()
      for (const r of results) {
        if (r.status === 'exists') {
          printInfo(`${r.name}  already configured`)
        } else {
          printSuccess(`${r.name}  configured`)
        }
      }
      printBlank()
      printInfo('Restart your AI platform to activate.')
      printInfo('Then ask: "what\'s my hoshi balance?"')
      printBlank()
    })

  mcpCmd
    .command('uninstall')
    .description('Remove Hoshi MCP config from Claude Desktop, Cursor, and Windsurf')
    .action(async () => {
      const platforms = getMcpPlatforms()
      const results = await uninstallMcpFromPlatforms(platforms)

      if (isJsonMode()) {
        printJson({ uninstalled: results })
        return
      }

      printBlank()
      for (const r of results) {
        if (r.removed) {
          printSuccess(`${r.name}  removed`)
        } else {
          printInfo(`${r.name}  not configured (skipped)`)
        }
      }
      printBlank()
    })

  mcpCmd
    .command('server')
    .description('Start HTTP MCP server')
    .option('-p, --port <port>', 'Port number', '3456')
    .action(async (options) => {
      try {
        const { default: Hono } = await import('hono')
        const { serve } = await import('@hono/node-server')

        const app = new Hono()

        app.get('/health', (c) => c.json({ status: 'ok' }))
        app.get('/mcp', (c) => c.json({ message: 'Hoshi MCP server' }))

        console.log(`Starting MCP HTTP server on port ${options.port}...`)
        await serve({ fetch: app.fetch, port: parseInt(options.port, 10) })
        console.log(`Hoshi MCP server running at http://localhost:${options.port}`)
      } catch (error) {
        console.error('Failed to start HTTP server:', error)
        process.exit(1)
      }
    })
}