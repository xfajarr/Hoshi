import { PublicKey, Transaction } from '@solana/web3.js'
import type { SignerPort } from '../ports/signer.js'
import type { StoragePort } from '../ports/storage.js'
import type { ChainPort } from '../ports/chain.js'
import type { Result } from '../core/result.js'
import { Result as R } from '../core/result.js'
import type { Receipt, Money } from '../core/types.js'
import { ValidationError, InsufficientBalanceError, ChainError, NotFoundError } from '../core/errors.js'

export interface SendTransferInput {
  walletId: string
  to: string
  amount: Money
}

export class TransferService {
  constructor(
    private readonly storage: StoragePort,
    private readonly chain: ChainPort
  ) {}

  async send(input: SendTransferInput): Promise<Result<Receipt, ValidationError | InsufficientBalanceError | ChainError | NotFoundError>> {
    // Validate recipient
    let recipientPubkey: PublicKey
    try {
      recipientPubkey = new PublicKey(input.to)
    } catch {
      return R.err(new ValidationError('Invalid recipient address', { to: input.to }))
    }

    // Get wallet
    const walletResult = await this.storage.getWallet(input.walletId)
    if (!walletResult.ok) return walletResult
    if (!walletResult.value) {
      return R.err(new NotFoundError('Wallet', input.walletId))
    }
    const wallet = walletResult.value

    const ownerPubkey = new PublicKey(wallet.publicKey)

    // Check balance for USDC transfers
    if (input.amount.asset === 'USDC') {
      const usdcMint = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')
      const balanceResult = await this.chain.getTokenBalance(ownerPubkey, usdcMint)
      if (!balanceResult.ok) return balanceResult

      const required = BigInt(Math.round(parseFloat(input.amount.amount) * 1e6))
      if (balanceResult.value < required) {
        return R.err(new InsufficientBalanceError(
          'USDC',
          input.amount.amount,
          (Number(balanceResult.value) / 1e6).toString()
        ))
      }

      // Build transfer transaction
      const txResult = await this.chain.createTransferInstruction({
        from: ownerPubkey,
        to: recipientPubkey,
        mint: usdcMint,
        amount: required,
        decimals: 6,
        owner: ownerPubkey
      })
      if (!txResult.ok) return txResult

      const receipt: Receipt = {
        id: crypto.randomUUID(),
        actionType: 'transfer.send',
        walletId: wallet.id,
        status: 'success',
        amount: input.amount,
        description: `Transfer ${input.amount.amount} ${input.amount.asset} to ${input.to}`,
        timestamp: new Date().toISOString(),
        metadata: {
          to: input.to,
          serializedTransaction: txResult.value.serialize({ requireAllSignatures: false }).toString('base64')
        }
      }

      await this.storage.saveReceipt(receipt)
      return R.ok(receipt)
    }

    // SOL transfer
    const balanceResult = await this.chain.getBalance(ownerPubkey)
    if (!balanceResult.ok) return balanceResult

    const required = BigInt(Math.round(parseFloat(input.amount.amount) * 1e9))
    if (balanceResult.value < required) {
      return R.err(new InsufficientBalanceError(
        'SOL',
        input.amount.amount,
        (Number(balanceResult.value) / 1e9).toString()
      ))
    }

    const receipt: Receipt = {
      id: crypto.randomUUID(),
      actionType: 'transfer.send',
      walletId: wallet.id,
      status: 'success',
      amount: input.amount,
      description: `Transfer ${input.amount.amount} ${input.amount.asset} to ${input.to}`,
      timestamp: new Date().toISOString(),
      metadata: { to: input.to }
    }

    await this.storage.saveReceipt(receipt)
    return R.ok(receipt)
  }

  /**
   * Build, sign, and send a transfer transaction.
   * Requires a signer that owns the wallet.
   */
  async sendSigned(
    input: SendTransferInput,
    signer: SignerPort
  ): Promise<Result<Receipt, ValidationError | InsufficientBalanceError | ChainError | NotFoundError>> {
    // Build the unsigned transaction first
    const buildResult = await this.buildTransferTransaction(input)
    if (!buildResult.ok) return buildResult

    const { transaction, receipt } = buildResult.value

    // Set recent blockhash
    const blockhashResult = await this.chain.getLatestBlockhash()
    if (!blockhashResult.ok) return blockhashResult
    transaction.recentBlockhash = blockhashResult.value
    transaction.feePayer = new PublicKey(signer.publicKey)

    // Sign and send
    const sendResult = await signer.signAndSendTransaction(
      transaction,
      async (rawTx) => {
        const result = await this.chain.sendRawTransaction(rawTx)
        if (!result.ok) throw result.error
        return result.value
      }
    )
    if (!sendResult.ok) {
      // Update receipt to failed status
      receipt.status = 'failed'
      receipt.metadata = { ...receipt.metadata, error: sendResult.error.message }
      await this.storage.saveReceipt(receipt)
      return R.err(sendResult.error as ChainError)
    }

    // Confirm transaction
    receipt.status = 'success'
    receipt.metadata = { 
      ...receipt.metadata, 
      signature: sendResult.value,
      explorerUrl: `https://explorer.solana.com/tx/${sendResult.value}?cluster=devnet`
    }
    await this.storage.saveReceipt(receipt)
    return R.ok(receipt)
  }

  /**
   * Build an unsigned transfer transaction without sending.
   */
  async buildTransferTransaction(
    input: SendTransferInput
  ): Promise<Result<{ transaction: Transaction; receipt: Receipt }, ValidationError | InsufficientBalanceError | ChainError | NotFoundError>> {
    // Validate recipient
    let recipientPubkey: PublicKey
    try {
      recipientPubkey = new PublicKey(input.to)
    } catch {
      return R.err(new ValidationError('Invalid recipient address', { to: input.to }))
    }

    // Get wallet
    const walletResult = await this.storage.getWallet(input.walletId)
    if (!walletResult.ok) return walletResult
    if (!walletResult.value) {
      return R.err(new NotFoundError('Wallet', input.walletId))
    }
    const wallet = walletResult.value

    const ownerPubkey = new PublicKey(wallet.publicKey)

    // Check balance and build transaction based on asset
    if (input.amount.asset === 'USDC') {
      const usdcMint = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')
      const balanceResult = await this.chain.getTokenBalance(ownerPubkey, usdcMint)
      if (!balanceResult.ok) return balanceResult

      const required = BigInt(Math.round(parseFloat(input.amount.amount) * 1e6))
      if (balanceResult.value < required) {
        return R.err(new InsufficientBalanceError(
          'USDC',
          input.amount.amount,
          (Number(balanceResult.value) / 1e6).toString()
        ))
      }

      const txResult = await this.chain.createTransferInstruction({
        from: ownerPubkey,
        to: recipientPubkey,
        mint: usdcMint,
        amount: required,
        decimals: 6,
        owner: ownerPubkey
      })
      if (!txResult.ok) return txResult

      const receipt: Receipt = {
        id: crypto.randomUUID(),
        actionType: 'transfer.send',
        walletId: wallet.id,
        status: 'pending',
        amount: input.amount,
        description: `Transfer ${input.amount.amount} ${input.amount.asset} to ${input.to}`,
        timestamp: new Date().toISOString(),
        metadata: { to: input.to }
      }

      return R.ok({ transaction: txResult.value, receipt })
    }

    // SOL transfer
    const balanceResult = await this.chain.getBalance(ownerPubkey)
    if (!balanceResult.ok) return balanceResult

    const required = BigInt(Math.round(parseFloat(input.amount.amount) * 1e9))
    if (balanceResult.value < required) {
      return R.err(new InsufficientBalanceError(
        'SOL',
        input.amount.amount,
        (Number(balanceResult.value) / 1e9).toString()
      ))
    }

    // Create SOL transfer instruction
    const { SystemProgram } = await import('@solana/web3.js')
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: ownerPubkey,
        toPubkey: recipientPubkey,
        lamports: required
      })
    )

    const receipt: Receipt = {
      id: crypto.randomUUID(),
      actionType: 'transfer.send',
      walletId: wallet.id,
      status: 'pending',
      amount: input.amount,
      description: `Transfer ${input.amount.amount} ${input.amount.asset} to ${input.to}`,
      timestamp: new Date().toISOString(),
      metadata: { to: input.to }
    }

    return R.ok({ transaction, receipt })
  }
}
