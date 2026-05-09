import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import {
  Hoshi,
  HoshiSDKError,
  InMemoryStorageAdapter,
  Result,
} from '@hoshi/sdk'

const walletPassword = 'smoke-test-password'
const recipientAddress = '11111111111111111111111111111111'
const senderAddress = 'So11111111111111111111111111111111111111112'

function createMockChain() {
  let connected = false
  let rawTransactionCount = 0

  return {
    rpcEndpoint: 'http://localhost:8899?cluster=devnet',
    commitment: 'confirmed',
    sentRawTransactions: [],
    async connect() {
      connected = true
      return Result.ok(undefined)
    },
    async disconnect() {
      connected = false
      return Result.ok(undefined)
    },
    isConnected() {
      return connected
    },
    async getBalance() {
      if (!connected) return Result.err(new HoshiSDKError('CHAIN_ERROR', 'chain not connected'))
      return Result.ok(BigInt(2_500_000_000))
    },
    async getTokenBalance() {
      if (!connected) return Result.err(new HoshiSDKError('CHAIN_ERROR', 'chain not connected'))
      return Result.ok(BigInt(42_000_000))
    },
    async getBalances() {
      return Result.ok([])
    },
    async getAccountInfo() {
      return Result.ok(null)
    },
    async getLatestBlockhash() {
      return Result.ok('mock-blockhash')
    },
    async sendTransaction() {
      return Result.err(new HoshiSDKError('CHAIN_ERROR', 'not used in this smoke test'))
    },
    async sendRawTransaction(rawTransaction) {
      rawTransactionCount += 1
      this.sentRawTransactions.push({
        index: rawTransactionCount,
        rawTransaction: Array.from(rawTransaction),
      })
      return Result.ok(`mock-chain-signature-${rawTransactionCount}`)
    },
    async simulateTransaction() {
      return Result.ok(null)
    },
    async confirmTransaction() {
      return Result.ok(undefined)
    },
    async createTransferInstruction() {
      return Result.err(new HoshiSDKError('CHAIN_ERROR', 'not used in this smoke test'))
    },
    async getAssociatedTokenAddress() {
      return Result.err(new HoshiSDKError('CHAIN_ERROR', 'not used in this smoke test'))
    },
    async createAssociatedTokenAccount() {
      return Result.err(new HoshiSDKError('CHAIN_ERROR', 'not used in this smoke test'))
    },
  }
}

function createMockSigner() {
  let sendCount = 0
  const signedTransactions = []

  return {
    publicKey: senderAddress,
    signedTransactions,
    async signTransaction(transaction) {
      signedTransactions.push({ type: 'signTransaction' })
      return Result.ok(transaction)
    },
    async signAndSendTransaction(transaction, sendRawTransaction) {
      sendCount += 1
      const payload = new Uint8Array([sendCount, 7, 7, 7])
      const chainSignature = await sendRawTransaction(payload)
      signedTransactions.push({
        type: 'signAndSendTransaction',
        chainSignature,
        payload: Array.from(payload),
        transactionType: transaction.constructor.name,
      })
      return Result.ok(`mock-signature-${sendCount}`)
    },
  }
}

function pass(step, detail = '') {
  console.log(`PASS ${step}${detail ? `: ${detail}` : ''}`)
}

function fail(step, error) {
  console.error(`FAIL ${step}`)
  if (error instanceof Error) {
    console.error(error.stack ?? error.message)
  } else {
    console.error(String(error))
  }
}

function expect(condition, message) {
  assert.ok(condition, message)
}

async function main() {
  const tempDir = await mkdtemp(join(tmpdir(), 'hoshi-core-smoke-'))
  const storage = new InMemoryStorageAdapter()
  const chain = createMockChain()
  const hoshi = new Hoshi({
    storage,
    chain,
    configDir: tempDir,
    keyPath: tempDir,
  })
  const mockSigner = createMockSigner()

  try {
    const created = await hoshi.createWallet({
      password: walletPassword,
      label: 'Core Banking Smoke Wallet',
      cluster: 'devnet',
    })
    expect(created.walletId.length > 0, 'walletId should be set')
    expect(created.publicKey.length > 0, 'publicKey should be set')
    pass('create wallet', `${created.walletId} ${created.publicKey}`)

    const loaded = await hoshi.loadWallet(created.walletId, walletPassword)
    expect(loaded?.id === created.walletId, 'wallet should load by id')
    expect(hoshi.wallet?.id === created.walletId, 'hoshi.wallet should be populated')
    pass('load wallet', loaded?.id ?? 'missing')

    await hoshi.connect()
    const summary = await hoshi.getAccountSummary()
    expect(summary.connected === true, 'summary should report connected')
    expect(summary.walletId === created.walletId, 'summary should include wallet id')
    expect(summary.balances.SOL === '2.5', 'summary should surface SOL balance')
    expect(summary.balances.USDC === '42', 'summary should surface USDC balance')
    expect(summary.activity.receiptCount === 0, 'summary should start with no receipts')
    pass('get account summary', `SOL ${summary.balances.SOL} USDC ${summary.balances.USDC}`)

    const contact = hoshi.addContact('treasury', recipientAddress, 'Treasury')
    expect(contact.action === 'added', 'contact should be added')
    const resolved = hoshi.resolveContact('treasury')
    expect(resolved.address === recipientAddress, 'contact should resolve')
    pass('add contact', `${resolved.contactName ?? 'unknown'} -> ${resolved.address}`)

    hoshi.setSigner(mockSigner)
    const sendReceipt = await hoshi.send({
      to: recipientAddress,
      amount: '0.1',
      asset: 'SOL',
    })
    const payReceipt = await hoshi.pay({
      to: recipientAddress,
      amount: '0.2',
      asset: 'SOL',
    })
    expect(sendReceipt.signature === 'mock-signature-1', 'send should use mock signer')
    expect(payReceipt.signature === 'mock-signature-2', 'pay should reuse transfer path')
    expect(chain.sentRawTransactions.length === 2, 'mock chain should see two raw transactions')
    expect(mockSigner.signedTransactions.length === 2, 'mock signer should be invoked twice')
    pass('send/pay flow', `${sendReceipt.signature}, ${payReceipt.signature}`)

    const invoice = await hoshi.receive({
      walletId: created.walletId,
      amount: '7.25',
      asset: 'USDC',
      description: 'Smoke invoice',
      expiresInHours: 1,
    })
    expect(invoice.kind === 'x402', 'receive should produce an invoice wrapper')
    expect(invoice.walletId === created.walletId, 'invoice should target the wallet')
    expect(invoice.record.description === 'Smoke invoice', 'invoice should preserve description')

    const paymentLink = await hoshi.createPaymentLink({
      walletId: created.walletId,
      amount: '2.5',
      asset: 'SOL',
      description: 'Smoke payment link',
      expiresInHours: 1,
    })
    expect(paymentLink.kind === 'mpp', 'createPaymentLink should produce a payment link wrapper')
    expect(paymentLink.walletId === created.walletId, 'payment link should target the wallet')
    expect(paymentLink.record.description === 'Smoke payment link', 'payment link should preserve description')

    const storedInvoice = await hoshi.invoiceService.getInvoice(invoice.id)
    const storedPaymentLink = await hoshi.storage.getPaymentLink(paymentLink.id)
    expect(storedInvoice.ok && storedInvoice.value?.id === invoice.id, 'invoice should persist in storage')
    expect(storedPaymentLink.ok && storedPaymentLink.value?.id === paymentLink.id, 'payment link should persist in storage')
    pass('receive/invoice/payment-link flow', `${invoice.id} ${paymentLink.id}`)

    const history = await hoshi.getHistory(created.walletId)
    const receipts = await hoshi.getReceipts(created.walletId)
    expect(history.length === 2, 'history should include two transfer receipts')
    expect(receipts.length === 2, 'receipts should include two transfer receipts')
    expect(history.every(entry => entry.actionType === 'transfer.send'), 'history should contain transfer receipts')
    pass('fetch history/receipts', `${history.length} receipts`)

    hoshi.safeguards.lock()
    const lockedOutcome = hoshi.checkSafeguard({
      operation: 'transfer',
      amount: 0.1,
      asset: 'SOL',
    })
    expect(lockedOutcome.status === 'pending_approval', 'locked safeguard should require approval')
    await expectReject(
      () => hoshi.transfer({ to: recipientAddress, amount: '0.1', asset: 'SOL' }),
      'SAFEGUARD_BLOCKED',
    )

    hoshi.safeguards.unlock()
    hoshi.safeguards.set('maxPerTx', 0.05)
    const blockedOutcome = hoshi.checkSafeguard({
      operation: 'transfer',
      amount: 0.1,
      asset: 'SOL',
    })
    expect(blockedOutcome.status === 'blocked', 'maxPerTx should block oversized transfers')
    expect(blockedOutcome.safeguard === 'maxPerTx', 'blocked safeguard should be maxPerTx')
    pass('verify safeguard lock/block behavior', `${lockedOutcome.status} / ${blockedOutcome.status}`)

    console.log('PASS core banking smoke test complete')
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
}

async function expectReject(fn, code) {
  try {
    await fn()
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error) {
      expect(String(error.code) === code, `expected ${code}, got ${String(error.code)}`)
      return
    }
    throw error
  }

  throw new Error(`expected rejection with ${code}`)
}

main().catch(error => {
  fail('core banking smoke test', error)
  process.exitCode = 1
})
