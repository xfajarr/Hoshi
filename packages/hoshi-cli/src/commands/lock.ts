import { Command } from 'commander'
import { printSuccess, printBlank, printInfo, printJson, isJsonMode, handleError } from '../output.js'
import { clearSession, getPasswordFromEnv } from '../prompts.js'
import { getSafeguards, lock, unlock, isLocked, getConfigDir } from '../config.js'

export const registerLock = (program: Command): void => {
  program
    .command('lock')
    .description('Lock agent — freeze all operations')
    .action(async () => {
      try {
        lock()
        await clearSession()

        if (isJsonMode()) {
          printJson({ locked: true })
          return
        }

        printBlank()
        printSuccess('Agent locked. All operations frozen.')
        printInfo('Run: hoshi unlock  (requires password)')
        printBlank()
      } catch (error) {
        handleError(error)
      }
    })

  program
    .command('unlock')
    .description('Unlock agent — resume operations')
    .action(async () => {
      try {
        const password = getPasswordFromEnv()
        if (!password) {
          throw new Error('Password required. Set HOSHI_WALLET_PASSWORD or run interactively.')
        }

        // Verify password by trying to unlock the first managed wallet
        const { JsonFileStorage } = await import('../store.js')
        const { getKeystoreVault } = await import('../keystore.js')

        const storage = new JsonFileStorage()
        const wallets = await storage.getWallets()

        if (!wallets.ok || wallets.value.length === 0) {
          throw new Error('No wallets found')
        }

        const managed = wallets.value.find(w => w.managed && w.keystoreId)
        if (!managed) {
          throw new Error('No managed wallet found')
        }

        const vault = getKeystoreVault()
        const unlockResult = vault.unlock(managed.keystoreId!, password)

        if (!unlockResult.ok) {
          throw new Error('Failed to unlock wallet. Check password.')
        }

        unlock()

        const config = getSafeguards()

        if (isJsonMode()) {
          printJson({ locked: false })
          return
        }

        printBlank()
        printSuccess('Agent unlocked. Operations resumed.')
        if (config.maxPerTx > 0 || config.maxDailySend > 0) {
          const limits: string[] = []
          if (config.maxPerTx > 0) limits.push(`maxPerTx=$${config.maxPerTx}`)
          if (config.maxDailySend > 0) limits.push(`maxDailySend=$${config.maxDailySend}`)
          printInfo(`Active safeguards: ${limits.join(', ')}`)
        }
        printBlank()
      } catch (error) {
        handleError(error)
      }
    })
}