import { Keypair, PublicKey } from '@solana/web3.js'
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'
import type { Result } from '../../core/result.js'
import { Result as R } from '../../core/result.js'
import { AuthenticationError, KeystoreError, ValidationError } from '../../core/errors.js'
import { KeypairSigner } from './keypair-signer.js'

const KEY_LENGTH = 32
const NONCE_LENGTH = 12
const SALT_LENGTH = 16
const SCRYPT_COST = 16384
const SCRYPT_BLOCK_SIZE = 8
const SCRYPT_PARALLELIZATION = 1
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export interface EncryptedKeypairKeystore {
  version: 1
  type: 'solana.ed25519-aes-256-gcm'
  walletId: string
  publicKey: string
  crypto: {
    cipher: 'aes-256-gcm'
    kdf: 'scrypt'
    params: {
      salt: string
      keyLength: number
      cost: number
      blockSize: number
      parallelization: number
    }
    nonce: string
    ciphertext: string
    authTag: string
  }
  metadata: {
    label?: string
    createdAt: string
    defaultCluster: 'devnet' | 'mainnet'
  }
}

export interface CreateKeystoreInput {
  walletId: string
  password: string
  label?: string
  defaultCluster?: 'devnet' | 'mainnet'
}

export interface CreateKeystoreResult {
  walletId: string
  publicKey: string
  keystorePath: string
}

export class EncryptedKeypairVault {
  constructor(private readonly directory: string) {
    if (!existsSync(directory)) {
      mkdirSync(directory, { recursive: true })
    }
  }

  create(input: CreateKeystoreInput): Result<CreateKeystoreResult, ValidationError | KeystoreError> {
    const walletIdResult = this.validateWalletId(input.walletId)
    if (!walletIdResult.ok) return walletIdResult

    const passwordResult = this.validatePassword(input.password)
    if (!passwordResult.ok) return passwordResult

    const keypair = Keypair.generate()
    const createdAt = new Date().toISOString()
    const defaultCluster = input.defaultCluster ?? 'devnet'
    const encrypted = this.encryptSecretKey(keypair.secretKey, input.password)

    const keystore: EncryptedKeypairKeystore = {
      version: 1,
      type: 'solana.ed25519-aes-256-gcm',
      walletId: input.walletId,
      publicKey: keypair.publicKey.toBase58(),
      crypto: encrypted,
      metadata: {
        label: input.label,
        createdAt,
        defaultCluster,
      },
    }

    const keystorePath = this.getKeystorePath(input.walletId)
    writeFileSync(keystorePath, JSON.stringify(keystore, null, 2), { mode: 0o600 })

    return R.ok({
      walletId: input.walletId,
      publicKey: keystore.publicKey,
      keystorePath,
    })
  }

  read(walletId: string): Result<EncryptedKeypairKeystore | null, KeystoreError | ValidationError> {
    const walletIdResult = this.validateWalletId(walletId)
    if (!walletIdResult.ok) return walletIdResult

    const keystorePath = this.getKeystorePath(walletId)
    if (!existsSync(keystorePath)) return R.ok(null)

    return this.readFromPath(keystorePath)
  }

  unlock(walletId: string, password: string): Result<KeypairSigner, AuthenticationError | KeystoreError | ValidationError> {
    const keystoreResult = this.read(walletId)
    if (!keystoreResult.ok) return keystoreResult
    if (!keystoreResult.value) {
      return R.err(new KeystoreError(`Managed wallet keystore not found for wallet ${walletId}`))
    }

    return this.unlockKeystore(keystoreResult.value, password)
  }

  unlockFromPath(filePath: string, password: string): Result<KeypairSigner, AuthenticationError | KeystoreError | ValidationError> {
    const keystoreResult = this.readFromPath(filePath)
    if (!keystoreResult.ok) return keystoreResult
    return this.unlockKeystore(keystoreResult.value, password)
  }

  export(walletId: string, outputPath: string): Result<string, KeystoreError | ValidationError> {
    const walletIdResult = this.validateWalletId(walletId)
    if (!walletIdResult.ok) return walletIdResult

    const sourcePath = this.getKeystorePath(walletId)
    if (!existsSync(sourcePath)) {
      return R.err(new KeystoreError(`Managed wallet keystore not found for wallet ${walletId}`))
    }

    const targetDirectory = dirname(outputPath)
    if (!existsSync(targetDirectory)) {
      mkdirSync(targetDirectory, { recursive: true })
    }

    copyFileSync(sourcePath, outputPath)
    return R.ok(outputPath)
  }

  import(filePath: string): Result<EncryptedKeypairKeystore, KeystoreError> {
    const keystoreResult = this.readFromPath(filePath)
    if (!keystoreResult.ok) return keystoreResult

    const targetPath = this.getKeystorePath(keystoreResult.value.walletId)
    if (!existsSync(dirname(targetPath))) {
      mkdirSync(dirname(targetPath), { recursive: true })
    }

    copyFileSync(filePath, targetPath)
    return R.ok(keystoreResult.value)
  }

  getKeystorePath(walletId: string): string {
    return join(this.directory, `${walletId}.json`)
  }

  private unlockKeystore(
    keystore: EncryptedKeypairKeystore,
    password: string,
  ): Result<KeypairSigner, AuthenticationError | KeystoreError | ValidationError> {
    const passwordResult = this.validatePassword(password)
    if (!passwordResult.ok) return passwordResult

    try {
      const secretKey = this.decryptSecretKey(keystore, password)
      if (secretKey.byteLength !== 64) {
        throw new AuthenticationError('Failed to unlock wallet. Check your password and try again.')
      }

      const keypair = Keypair.fromSecretKey(secretKey)
      return R.ok(new KeypairSigner(keypair))
    } catch (error) {
      if (error instanceof ValidationError || error instanceof KeystoreError) {
        return R.err(error)
      }

      if (error instanceof AuthenticationError) {
        return R.err(error)
      }

      return R.err(new AuthenticationError('Failed to unlock wallet. Check your password and try again.'))
    }
  }

  private readFromPath(filePath: string): Result<EncryptedKeypairKeystore, KeystoreError> {
    if (!existsSync(filePath)) {
      return R.err(new KeystoreError(`Keystore file not found: ${filePath}`))
    }

    try {
      const raw = JSON.parse(readFileSync(filePath, 'utf-8')) as Partial<EncryptedKeypairKeystore>
      const validated = this.validateKeystore(raw)
      if (!validated.ok) return validated
      return R.ok(validated.value)
    } catch (error) {
      return R.err(new KeystoreError('Failed to read keystore file', {
        filePath,
        error: error instanceof Error ? error.message : String(error),
      }))
    }
  }

  private validateKeystore(raw: Partial<EncryptedKeypairKeystore>): Result<EncryptedKeypairKeystore, KeystoreError> {
    if (raw.version !== 1 || raw.type !== 'solana.ed25519-aes-256-gcm') {
      return R.err(new KeystoreError('Unsupported keystore format'))
    }

    if (!raw.walletId || !raw.publicKey || !raw.crypto || !raw.metadata) {
      return R.err(new KeystoreError('Malformed keystore file'))
    }

    if (!UUID_REGEX.test(raw.walletId)) {
      return R.err(new KeystoreError('Keystore contains an invalid wallet ID'))
    }

    try {
      new PublicKey(raw.publicKey)
    } catch {
      return R.err(new KeystoreError('Keystore contains an invalid public key'))
    }

    return R.ok(raw as EncryptedKeypairKeystore)
  }

  private validateWalletId(walletId: string): Result<void, ValidationError> {
    if (!UUID_REGEX.test(walletId)) {
      return R.err(new ValidationError('Wallet ID must be a valid UUID', { walletId }))
    }

    return R.ok(undefined)
  }

  private validatePassword(password: string): Result<void, ValidationError> {
    if (password.length < 8) {
      return R.err(new ValidationError('Wallet password must be at least 8 characters long'))
    }

    return R.ok(undefined)
  }

  private encryptSecretKey(secretKey: Uint8Array, password: string): EncryptedKeypairKeystore['crypto'] {
    const salt = randomBytes(SALT_LENGTH)
    const nonce = randomBytes(NONCE_LENGTH)
    const key = scryptSync(password, salt, KEY_LENGTH, {
      N: SCRYPT_COST,
      r: SCRYPT_BLOCK_SIZE,
      p: SCRYPT_PARALLELIZATION,
      maxmem: 32 * 1024 * 1024,
    })

    const cipher = createCipheriv('aes-256-gcm', key, nonce)
    const ciphertext = Buffer.concat([cipher.update(Buffer.from(secretKey)), cipher.final()])
    const authTag = cipher.getAuthTag()

    return {
      cipher: 'aes-256-gcm',
      kdf: 'scrypt',
      params: {
        salt: salt.toString('base64'),
        keyLength: KEY_LENGTH,
        cost: SCRYPT_COST,
        blockSize: SCRYPT_BLOCK_SIZE,
        parallelization: SCRYPT_PARALLELIZATION,
      },
      nonce: nonce.toString('base64'),
      ciphertext: ciphertext.toString('base64'),
      authTag: authTag.toString('base64'),
    }
  }

  private decryptSecretKey(keystore: EncryptedKeypairKeystore, password: string): Uint8Array {
    try {
      const salt = Buffer.from(keystore.crypto.params.salt, 'base64')
      const nonce = Buffer.from(keystore.crypto.nonce, 'base64')
      const ciphertext = Buffer.from(keystore.crypto.ciphertext, 'base64')
      const authTag = Buffer.from(keystore.crypto.authTag, 'base64')
      const key = scryptSync(password, salt, keystore.crypto.params.keyLength, {
        N: keystore.crypto.params.cost,
        r: keystore.crypto.params.blockSize,
        p: keystore.crypto.params.parallelization,
        maxmem: 32 * 1024 * 1024,
      })

      const decipher = createDecipheriv('aes-256-gcm', key, nonce)
      decipher.setAuthTag(authTag)
      const secretKey = Buffer.concat([decipher.update(ciphertext), decipher.final()])
      return new Uint8Array(secretKey)
    } catch {
      throw new AuthenticationError('Failed to unlock wallet. Check your password and try again.')
    }
  }
}
