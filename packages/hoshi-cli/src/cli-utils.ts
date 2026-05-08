import { KeypairSigner, type Wallet } from '@hoshi/sdk'
import { JsonFileStorage } from './store.js'
import { getKeystoreVault } from './keystore.js'
import { promptSecret } from './prompt.js'
import { program } from 'commander'

export const resolveSigner = async (storage: JsonFileStorage, walletId: string): Promise<KeypairSigner | null> => {
  const opts = program.opts()
  if (opts.keypair) {
    try {
      return KeypairSigner.fromFile(opts.keypair)
    } catch (error) {
      console.error('Failed to load keypair:', error instanceof Error ? error.message : String(error))
      return null
    }
  }

  const walletResult = await storage.getWallet(walletId)
  if (!walletResult.ok || !walletResult.value) return null

  const wallet = walletResult.value
  if (!wallet.managed || !wallet.keystoreId) return null

  try {
    const password = process.env.HOSHI_WALLET_PASSWORD || await promptSecret('Wallet password: ')
    const vault = getKeystoreVault()
    const signerResult = vault.unlock(wallet.keystoreId, password)
    if (!signerResult.ok) {
      console.error('Failed to unlock managed wallet:', signerResult.error.message)
      return null
    }
    return signerResult.value
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    return null
  }
}

export const ensureSignerMatchesWallet = async (
  storage: JsonFileStorage,
  walletId: string,
  signer: KeypairSigner,
): Promise<Wallet | null> => {
  const walletResult = await storage.getWallet(walletId)
  if (!walletResult.ok || !walletResult.value) {
    console.error(`Wallet not found: ${walletId}`)
    return null
  }

  if (walletResult.value.publicKey !== signer.publicKey) {
    console.error('Signer public key does not match the selected wallet record')
    return null
  }

  return walletResult.value
}