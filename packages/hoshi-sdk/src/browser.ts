import { PublicKey, Transaction } from '@solana/web3.js'

export interface BrowserWallet {
  publicKey: PublicKey
  signTransaction: (transaction: Transaction) => Promise<Transaction>
  signAllTransactions: (transactions: Transaction[]) => Promise<Transaction[]>
}

export interface PhantomProvider {
  isPhantom?: boolean
  publicKey?: PublicKey
  signTransaction?: (transaction: Transaction) => Promise<Transaction>
  signAllTransactions?: (transactions: Transaction[]) => Promise<Transaction[]>
  connect?: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: PublicKey }>
  disconnect?: () => Promise<void>
  on?: (event: string, callback: (...args: unknown[]) => void) => void
}

type GlobalWindow = typeof globalThis & {
  phantom?: { solana?: PhantomProvider }
  solana?: PhantomProvider
}

function getProvider(): PhantomProvider | null {
  const w = globalThis as GlobalWindow
  if (w.phantom?.solana?.isPhantom) return w.phantom.solana
  if (w.solana?.isPhantom) return w.solana
  return null
}

export async function detectWallet(): Promise<'phantom' | 'glow' | 'backpack' | null> {
  const provider = getProvider()
  if (provider?.isPhantom) return 'phantom'
  return null
}

export async function connectPhantom(): Promise<BrowserWallet | null> {
  const provider = getProvider()

  if (!provider?.isPhantom) {
    throw new Error('Phantom wallet not found')
  }

  try {
    const response = await provider.connect?.({ onlyIfTrusted: true })
    if (!response) throw new Error('Connection rejected')
    const publicKey = response.publicKey

    return {
      publicKey,
      signTransaction: async (transaction) => {
        if (!provider.signTransaction) {
          throw new Error('signTransaction not supported')
        }
        return provider.signTransaction(transaction)
      },
      signAllTransactions: async (transactions) => {
        if (!provider.signAllTransactions) {
          throw new Error('signAllTransactions not supported')
        }
        return provider.signAllTransactions(transactions)
      },
    }
  } catch (error) {
    const err = error as { code?: number }
    if (err.code === 4001) {
      return null
    }
    throw error
  }
}

export function onAccountChange(callback: (publicKey: PublicKey | null) => void): () => void {
  const provider = getProvider()

  if (!provider?.on) {
    return () => {}
  }

  provider.on('accountChange', (...args: unknown[]) => {
    const newPublicKey = args[0] as PublicKey
    callback(newPublicKey)
  })

  return () => {}
}

export function onDisconnect(callback: () => void): () => void {
  const provider = getProvider()

  if (!provider?.on) {
    return () => {}
  }

  provider.on('disconnect', callback)

  return () => {}
}
