import { homedir } from 'os'
import { join } from 'path'
import { EncryptedKeypairVault } from '@hoshi/sdk'

const DEFAULT_KEYSTORE_DIR = join(homedir(), '.hoshi', 'keys')

export const getKeystoreVault = (): EncryptedKeypairVault => {
  return new EncryptedKeypairVault(DEFAULT_KEYSTORE_DIR)
}