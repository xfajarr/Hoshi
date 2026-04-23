import { 
  Connection, 
  PublicKey, 
  Transaction, 
  Commitment,
  
  
  LAMPORTS_PER_SOL
} from '@solana/web3.js'
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferCheckedInstruction,
  getAccount,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID
} from '@solana/spl-token'
import type { ChainPort } from '../../ports/chain.js'
import type { Result } from '../../core/result.js'
import { Result as R } from '../../core/result.js'
import { ChainError } from '../../core/errors.js'
import type { Balance } from '../../core/types.js'

export class SolanaChainAdapter implements ChainPort {
  private connection: Connection | null = null

  constructor(
    public readonly rpcEndpoint: string,
    public readonly commitment: Commitment = 'confirmed'
  ) {}

  async connect(): Promise<Result<void, ChainError>> {
    try {
      this.connection = new Connection(this.rpcEndpoint, this.commitment)
      // Verify connection by getting version
      await this.connection.getVersion()
      return R.ok(undefined)
    } catch (err) {
      return R.err(new ChainError(
        `Failed to connect to Solana RPC: ${this.rpcEndpoint}`,
        { error: String(err) }
      ))
    }
  }

  async disconnect(): Promise<Result<void, ChainError>> {
    this.connection = null
    return R.ok(undefined)
  }

  isConnected(): boolean {
    return this.connection !== null
  }

  private getConn(): Connection {
    if (!this.connection) {
      throw new ChainError('Not connected to Solana RPC. Call connect() first.')
    }
    return this.connection
  }

  async getBalance(pubkey: PublicKey): Promise<Result<bigint, ChainError>> {
    try {
      const balance = await this.getConn().getBalance(pubkey, this.commitment)
      return R.ok(BigInt(balance))
    } catch (err) {
      return R.err(new ChainError(
        `Failed to get SOL balance for ${pubkey.toBase58()}`,
        { error: String(err) }
      ))
    }
  }

  async getTokenBalance(owner: PublicKey, mint: PublicKey): Promise<Result<bigint, ChainError>> {
    try {
      const ata = await getAssociatedTokenAddress(mint, owner, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID)
      const account = await getAccount(this.getConn(), ata, this.commitment, TOKEN_PROGRAM_ID)
      return R.ok(account.amount)
    } catch (err) {
      // Token account might not exist - that's OK, balance is 0
      if (String(err).includes('TokenAccountNotFoundError')) {
        return R.ok(BigInt(0))
      }
      return R.err(new ChainError(
        `Failed to get token balance for ${owner.toBase58()} mint ${mint.toBase58()}`,
        { error: String(err) }
      ))
    }
  }

  async getBalances(owner: PublicKey): Promise<Result<Balance[], ChainError>> {
    try {
      const balances: Balance[] = []
      
      // SOL balance
      const solBalance = await this.getConn().getBalance(owner, this.commitment)
      balances.push({
        asset: 'SOL',
        amount: (solBalance / LAMPORTS_PER_SOL).toString(),
        decimals: 9
      })

      // Token balances - get all token accounts
      const tokenAccounts = await this.getConn().getParsedTokenAccountsByOwner(
        owner,
        { programId: TOKEN_PROGRAM_ID },
        this.commitment
      )

      for (const { account } of tokenAccounts.value) {
        const parsed = account.data.parsed
        if (!parsed) continue
        
        const info = parsed.info
        const amount = info.tokenAmount?.uiAmountString || '0'
        const decimals = info.tokenAmount?.decimals || 0
        const mint = info.mint as string

        // Identify known assets
        let asset: 'USDC' | 'SOL' = 'SOL'
        if (mint === 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v') {
          asset = 'USDC'
        }

        balances.push({ asset, amount, decimals })
      }

      return R.ok(balances)
    } catch (err) {
      return R.err(new ChainError(
        `Failed to get balances for ${owner.toBase58()}`,
        { error: String(err) }
      ))
    }
  }

  async getAccountInfo(pubkey: PublicKey): Promise<Result<unknown, ChainError>> {
    try {
      const info = await this.getConn().getAccountInfo(pubkey, this.commitment)
      return R.ok(info)
    } catch (err) {
      return R.err(new ChainError(
        `Failed to get account info for ${pubkey.toBase58()}`,
        { error: String(err) }
      ))
    }
  }

  async getLatestBlockhash(): Promise<Result<string, ChainError>> {
    try {
      const { blockhash } = await this.getConn().getLatestBlockhash(this.commitment)
      return R.ok(blockhash)
    } catch (err) {
      return R.err(new ChainError('Failed to get latest blockhash', { error: String(err) }))
    }
  }

  async sendTransaction(transaction: Transaction): Promise<Result<string, ChainError>> {
    try {
      const serialized = transaction.serialize({ requireAllSignatures: false })
      return R.err(new ChainError(
        'Transaction requires external signing. Use sendRawTransaction with a signed tx.',
        { serialized: Buffer.from(serialized).toString('base64') }
      ))
    } catch (err) {
      return R.err(new ChainError('Failed to process transaction', { error: String(err) }))
    }
  }

  async sendRawTransaction(rawTransaction: Uint8Array): Promise<Result<string, ChainError>> {
    try {
      const signature = await this.getConn().sendRawTransaction(rawTransaction, {
        skipPreflight: false,
        preflightCommitment: this.commitment
      })
      return R.ok(signature)
    } catch (err) {
      return R.err(new ChainError('Failed to send raw transaction', { error: String(err) }))
    }
  }

  async simulateTransaction(transaction: Transaction): Promise<Result<unknown, ChainError>> {
    try {
      const result = await this.getConn().simulateTransaction(transaction)
      return R.ok(result)
    } catch (err) {
      return R.err(new ChainError('Failed to simulate transaction', { error: String(err) }))
    }
  }

  async confirmTransaction(signature: string): Promise<Result<void, ChainError>> {
    try {
      const latestBlockhash = await this.getConn().getLatestBlockhash()
      await this.getConn().confirmTransaction(
        { signature, ...latestBlockhash },
        this.commitment
      )
      return R.ok(undefined)
    } catch (err) {
      return R.err(new ChainError(`Failed to confirm transaction ${signature}`, { error: String(err) }))
    }
  }

  async createTransferInstruction(params: {
    from: PublicKey
    to: PublicKey
    mint: PublicKey
    amount: bigint
    decimals: number
    owner: PublicKey
  }): Promise<Result<Transaction, ChainError>> {
    try {
      const transaction = new Transaction()
      
      const fromAta = await getAssociatedTokenAddress(
        params.mint, params.from, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID
      )
      const toAta = await getAssociatedTokenAddress(
        params.mint, params.to, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID
      )

      // Check if recipient ATA exists
      try {
        await getAccount(this.getConn(), toAta, this.commitment, TOKEN_PROGRAM_ID)
      } catch {
        // Create ATA if it doesn't exist
        transaction.add(
          createAssociatedTokenAccountInstruction(
            params.owner,
            toAta,
            params.to,
            params.mint,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
          )
        )
      }

      transaction.add(
        createTransferCheckedInstruction(
          fromAta,
          params.mint,
          toAta,
          params.owner,
          params.amount,
          params.decimals,
          [],
          TOKEN_PROGRAM_ID
        )
      )

      return R.ok(transaction)
    } catch (err) {
      return R.err(new ChainError('Failed to create transfer instruction', { error: String(err) }))
    }
  }

  async getAssociatedTokenAddress(owner: PublicKey, mint: PublicKey): Promise<Result<PublicKey, ChainError>> {
    try {
      const ata = await getAssociatedTokenAddress(
        mint, owner, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID
      )
      return R.ok(ata)
    } catch (err) {
      return R.err(new ChainError('Failed to get associated token address', { error: String(err) }))
    }
  }

  async createAssociatedTokenAccount(
    owner: PublicKey, 
    mint: PublicKey, 
    payer: PublicKey
  ): Promise<Result<Transaction, ChainError>> {
    try {
      const ata = await getAssociatedTokenAddress(
        mint, owner, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID
      )
      
      const transaction = new Transaction().add(
        createAssociatedTokenAccountInstruction(
          payer,
          ata,
          owner,
          mint,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        )
      )

      return R.ok(transaction)
    } catch (err) {
      return R.err(new ChainError('Failed to create associated token account', { error: String(err) }))
    }
  }
}
