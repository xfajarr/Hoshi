#!/usr/bin/env node
import { startHoshiMcpServer } from './app.js'

startHoshiMcpServer().catch((err) => {
  console.error('[hoshi-mcp] Fatal error:', err)
  process.exit(1)
})
