import { createHash } from 'node:crypto'
import { AnchorProvider, BN, Program, type Idl } from '@coral-xyz/anchor'
import { Connection, PublicKey, SystemProgram, type Commitment, type Transaction } from '@solana/web3.js'
import { normalizeHoshiHandle } from './namespace.js'
import type { HoshiAttestation } from './types.js'
import type { KyaClaimInput, KyaProfile, KyaRegistryPort } from './local-registry.js'
import type { SignerPort } from '../ports/signer.js'

type NullableString = string | null

interface KyaIdentityAccount {
  handle: string
  owner: PublicKey
  displayName: string
  metadataUri: NullableString
  reputationScore: BN | number
  attestationCount: BN | number
  createdAt: BN | number
  updatedAt: BN | number
}

interface KyaProgramLike {
  methods: {
    initializeRegistry: (hoshiIssuer: PublicKey) => {
      accounts: (accounts: {
        authority: PublicKey
        registryConfig: PublicKey
        systemProgram: PublicKey
      }) => { rpc: () => Promise<string> }
    }
    claimHandle: (handle: string, displayName: string, metadataUri: NullableString) => {
      accounts: (accounts: {
        owner: PublicKey
        identity: PublicKey
        walletIndex: PublicKey
        systemProgram: PublicKey
      }) => { rpc: () => Promise<string> }
    }
    updateReputation: (handle: string, delta: BN, reason: string, reference: NullableString) => {
      accounts: (accounts: {
        registryConfig: PublicKey
        hoshiSigner: PublicKey
        identity: PublicKey
      }) => { rpc: () => Promise<string> }
    }
    resolveHandle: () => {
      accounts: (accounts: { identity: PublicKey }) => { rpc: () => Promise<string> }
    }
  }
  account: {
    identityAccount: { fetch: (address: PublicKey) => Promise<KyaIdentityAccount> }
  }
  provider: AnchorProvider
}

export interface KyaAnchorRegistryOptions {
  rpcEndpoint: string
  commitment?: Commitment
  programId: PublicKey
  walletOwner: () => string | null
  getSigner: () => SignerPort | null
  programFactory?: (provider: AnchorProvider, idl: Idl) => KyaProgramLike
}

const KYA_IDL = (address: string): Idl => ({
  address,
  metadata: {
    name: 'hoshi_kya',
    version: '0.1.0',
    spec: '0.1.0',
    description: 'Hoshi KYA onchain registry',
  },
  instructions: [
    {
      name: 'initialize_registry',
      discriminator: anchorDiscriminator('global', 'initialize_registry'),
      accounts: [
        { name: 'authority', writable: true, signer: true },
        { name: 'registryConfig', writable: true, signer: false },
        { name: 'systemProgram', writable: false, signer: false },
      ],
      args: [{ name: 'hoshiIssuer', type: 'pubkey' }],
    },
    {
      name: 'claim_handle',
      discriminator: anchorDiscriminator('global', 'claim_handle'),
      accounts: [
        { name: 'owner', writable: true, signer: true },
        { name: 'identity', writable: true, signer: false },
        { name: 'walletIndex', writable: true, signer: false },
        { name: 'systemProgram', writable: false, signer: false },
      ],
      args: [
        { name: 'handle', type: 'string' },
        { name: 'displayName', type: 'string' },
        { name: 'metadataUri', type: { option: 'string' } },
      ],
    },
    {
      name: 'update_reputation',
      discriminator: anchorDiscriminator('global', 'update_reputation'),
      accounts: [
        { name: 'registryConfig', writable: false, signer: false },
        { name: 'hoshiSigner', writable: false, signer: true },
        { name: 'identity', writable: true, signer: false },
      ],
      args: [
        { name: 'handle', type: 'string' },
        { name: 'delta', type: 'i64' },
        { name: 'reason', type: 'string' },
        { name: 'reference', type: { option: 'string' } },
      ],
    },
    {
      name: 'resolve_handle',
      discriminator: anchorDiscriminator('global', 'resolve_handle'),
      accounts: [{ name: 'identity', writable: false, signer: false }],
      args: [],
    },
  ],
  accounts: [
    { name: 'RegistryConfig', discriminator: anchorDiscriminator('account', 'RegistryConfig') },
    { name: 'IdentityAccount', discriminator: anchorDiscriminator('account', 'IdentityAccount') },
    { name: 'WalletIndex', discriminator: anchorDiscriminator('account', 'WalletIndex') },
  ],
  types: [
    {
      name: 'registryConfig',
      type: {
        kind: 'struct',
        fields: [
           { name: 'authority', type: 'pubkey' },
           { name: 'hoshiIssuer', type: 'pubkey' },
          { name: 'bump', type: 'u8' },
        ],
      },
    },
    {
      name: 'identityAccount',
      type: {
        kind: 'struct',
        fields: [
          { name: 'handle', type: 'string' },
           { name: 'owner', type: 'pubkey' },
          { name: 'displayName', type: 'string' },
          { name: 'metadataUri', type: { option: 'string' } },
          { name: 'reputationScore', type: 'i64' },
          { name: 'attestationCount', type: 'u64' },
          { name: 'createdAt', type: 'i64' },
          { name: 'updatedAt', type: 'i64' },
          { name: 'bump', type: 'u8' },
        ],
      },
    },
    {
      name: 'walletIndex',
      type: {
        kind: 'struct',
        fields: [
           { name: 'owner', type: 'pubkey' },
          { name: 'handle', type: 'string' },
          { name: 'createdAt', type: 'i64' },
          { name: 'updatedAt', type: 'i64' },
          { name: 'bump', type: 'u8' },
        ],
      },
    },
  ],
}) as unknown as Idl

function anchorDiscriminator(prefix: 'global' | 'account', name: string): number[] {
  return Array.from(createHash('sha256').update(`${prefix}:${name}`).digest().slice(0, 8))
}

function toNumber(value: BN | number): number {
  return value instanceof BN ? value.toNumber() : value
}

function toPublicKey(value: string | PublicKey): PublicKey {
  return value instanceof PublicKey ? value : new PublicKey(value)
}

function toIsoTimestamp(value: BN | number): string {
  const seconds = toNumber(value)
  return new Date(seconds * 1000).toISOString()
}

class LazyWallet {
  constructor(private readonly getSigner: () => SignerPort | null) {}

  get publicKey(): PublicKey {
    const signer = this.getSigner()
    if (!signer) {
      throw new Error('WALLET_REQUIRED')
    }
    return toPublicKey(signer.publicKey)
  }

  async signTransaction(transaction: Transaction): Promise<Transaction> {
    const signer = this.getSigner()
    if (!signer) {
      throw new Error('WALLET_REQUIRED')
    }

    const signed = await signer.signTransaction(transaction)
    if (!signed.ok) {
      throw signed.error
    }

    return signed.value
  }

  async signAllTransactions(transactions: Transaction[]): Promise<Transaction[]> {
    const signedTransactions: Transaction[] = []
    for (const transaction of transactions) {
      signedTransactions.push(await this.signTransaction(transaction))
    }
    return signedTransactions
  }
}

export class KyaAnchorRegistry implements KyaRegistryPort {
  private readonly connection: Connection
  private readonly programId: PublicKey
  private readonly wallet: LazyWallet
  private readonly commitment: Commitment

  constructor(private readonly options: KyaAnchorRegistryOptions) {
    this.connection = new Connection(options.rpcEndpoint, options.commitment ?? 'confirmed')
    this.programId = options.programId
    this.wallet = new LazyWallet(options.getSigner)
    this.commitment = options.commitment ?? 'confirmed'
  }

  private provider(): AnchorProvider {
    return new AnchorProvider(this.connection, this.wallet as never, { commitment: this.commitment })
  }

  private program(): KyaProgramLike {
    const idl = KYA_IDL(this.programId.toBase58())
    if (this.options.programFactory) {
      return this.options.programFactory(this.provider(), idl)
    }

    return new Program(idl, this.provider()) as unknown as KyaProgramLike
  }

  private registryConfigPda(): PublicKey {
    return PublicKey.findProgramAddressSync([Buffer.from('registry')], this.programId)[0]
  }

  private identityPda(handle: string): PublicKey {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('identity'), Buffer.from(normalizeHoshiHandle(handle))],
      this.programId,
    )[0]
  }

  private walletIndexPda(owner: PublicKey): PublicKey {
    return PublicKey.findProgramAddressSync([Buffer.from('wallet'), owner.toBuffer()], this.programId)[0]
  }

  private async ensureRegistry(): Promise<void> {
    const signer = this.options.getSigner()
    if (!signer) {
      throw new Error('WALLET_REQUIRED')
    }

    const registryConfig = this.registryConfigPda()
    const existing = await this.connection.getAccountInfo(registryConfig, this.commitment)
    if (existing) {
      return
    }

    await this.program().methods
      .initializeRegistry(toPublicKey(signer.publicKey))
      .accounts({
        authority: toPublicKey(signer.publicKey),
        registryConfig,
        systemProgram: SystemProgram.programId,
      })
      .rpc()
  }

  private async fetchProfile(handle: string): Promise<KyaProfile | null> {
    const normalized = normalizeHoshiHandle(handle)
    const identity = this.identityPda(normalized)
    const accountInfo = await this.connection.getAccountInfo(identity, this.commitment)

    if (!accountInfo) {
      return null
    }

    const account = await this.program().account.identityAccount.fetch(identity)
    return {
      handle: account.handle,
      owner: account.owner.toBase58(),
      displayName: account.displayName,
      metadataUri: account.metadataUri ?? undefined,
      createdAt: toIsoTimestamp(account.createdAt),
      updatedAt: toIsoTimestamp(account.updatedAt),
      reputation: {
        score: toNumber(account.reputationScore),
        attestationCount: toNumber(account.attestationCount),
        lastUpdatedAt: toIsoTimestamp(account.updatedAt),
      },
    }
  }

  async claim(input: KyaClaimInput): Promise<KyaProfile> {
    const owner = toPublicKey(input.owner)
    const handle = normalizeHoshiHandle(input.handle)

    await this.ensureRegistry()

    await this.program().methods
      .claimHandle(handle, input.displayName, input.metadataUri ?? null)
      .accounts({
        owner,
        identity: this.identityPda(handle),
        walletIndex: this.walletIndexPda(owner),
        systemProgram: SystemProgram.programId,
      })
      .rpc()

    const profile = await this.fetchProfile(handle)
    if (!profile) {
      throw new Error('HANDLE_NOT_FOUND')
    }

    return profile
  }

  async resolve(handle: string): Promise<KyaProfile | null> {
    return this.fetchProfile(handle)
  }

  async issueAttestation(input: { handle: string; type: string; payload: Record<string, unknown> }): Promise<HoshiAttestation> {
    const handle = normalizeHoshiHandle(input.handle)

    await this.ensureRegistry()
    await this.updateReputation(handle, 1)

    return {
      id: crypto.randomUUID(),
      subjectHandle: handle,
      issuer: 'hoshi',
      type: input.type,
      payload: input.payload,
      createdAt: new Date().toISOString(),
    }
  }

  async updateReputation(handle: string, delta: number): Promise<KyaProfile | null> {
    const normalized = normalizeHoshiHandle(handle)
    const signer = this.options.getSigner()
    if (!signer) {
      throw new Error('WALLET_REQUIRED')
    }

    await this.ensureRegistry()

    await this.program().methods
      .updateReputation(normalized, new BN(delta), 'hoshi', null)
      .accounts({
        registryConfig: this.registryConfigPda(),
        hoshiSigner: toPublicKey(signer.publicKey),
        identity: this.identityPda(normalized),
      })
      .rpc()

    return this.fetchProfile(normalized)
  }
}
