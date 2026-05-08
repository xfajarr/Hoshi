// Solana-specific constants (t2000 uses Sui, Hoshi uses Solana)

export const LAMPORTS_PER_SOL = 1_000_000_000n;
export const SOL_DECIMALS = 9;
export const USDC_DECIMALS = 6;

export const BPS_DENOMINATOR = 10_000n;
export const PRECISION = 1_000_000_000_000_000_000n;

export const MIN_DEPOSIT = 1_000_000n; // 1 USDC (6 decimals)
export const GAS_RESERVE_LAMPORTS = 5_000_000n; // 0.005 SOL reserved for gas
export const AUTO_TOPUP_THRESHOLD = 50_000_000n; // 0.05 SOL minimum for self-funded TX
export const GAS_RESERVE_TARGET = 150_000_000n; // 0.15 SOL — proactive top-up target
export const AUTO_TOPUP_AMOUNT = 1_000_000n; // $1 USDC worth of SOL
export const AUTO_TOPUP_MIN_USDC = 2_000_000n; // $2 USDC minimum to trigger auto-topup
export const BOOTSTRAP_LIMIT = 10;
export const GAS_FEE_CEILING_USD = 0.05;

export const SAVE_FEE_BPS = 10n; // 0.1%
export const BORROW_FEE_BPS = 5n; // 0.05%

export type SupportedAsset = 'SOL' | 'USDC' | 'USDT' | 'ETH' | 'BTC';
export type StableAsset = 'USDC';

export const STABLE_ASSETS: readonly StableAsset[] = ['USDC'] as const;

export const SUPPORTED_ASSETS = {
  USDC: {
    mint: 'EPjFWdd5AufqSS2d4J4D6J6Tk5yT6AXR4x2Y1Q3qQrT7',
    decimals: 6,
    symbol: 'USDC',
    displayName: 'USD Coin',
    isStable: true,
  },
  USDT: {
    mint: 'Es9vMFrzaCERniiQRvDXk8E3E5xUxJgkqgFXjYqP8r5o',
    decimals: 6,
    symbol: 'USDT',
    displayName: 'Tether USD',
    isStable: true,
  },
  SOL: {
    mint: 'So11111111111111111111111111111111111111112',
    decimals: 9,
    symbol: 'SOL',
    displayName: 'Solana',
    isStable: false,
  },
  ETH: {
    mint: '7vfCXTnxWbvCN2J8HN8apL3e2wAQJ3wDNeeNxgYUH3i8',
    decimals: 8,
    symbol: 'ETH',
    displayName: 'Wrapped Ethereum',
    isStable: false,
  },
  BTC: {
    mint: '9n4aLg2hBJKHBYDd6cE3aNZ3VYJqsCMNY6iB8XRBJDKi',
    decimals: 8,
    symbol: 'BTC',
    displayName: 'Wrapped Bitcoin',
    isStable: false,
  },
} as const;

export const OPERATION_ASSETS = {
  save: ['USDC', 'SOL'],
  borrow: ['USDC'],
  withdraw: '*',
  repay: '*',
  send: '*',
  swap: '*',
} as const;

export type Operation = keyof typeof OPERATION_ASSETS;

export function isAllowedAsset(op: Operation, asset: string): boolean {
  const allowed = OPERATION_ASSETS[op];
  if (allowed === '*') return true;
  return (allowed as readonly string[]).includes(asset.toUpperCase());
}

export function assertAllowedAsset(op: Operation, asset: string | undefined): void {
  if (!asset) return;
  if (!isAllowedAsset(op, asset)) {
    const allowed = OPERATION_ASSETS[op];
    const list = Array.isArray(allowed) ? allowed.join(', ') : 'any';
    throw new Error(`${op} only supports ${list}. Cannot use ${asset}.`);
  }
}

// Solana-specific program IDs
export const JUPITER_V4Aggregator = 'JUPyiwrJ6ypXwC8TXdQUuXWEMx3GvS2EN3KqKfFXmYMSW'; // placeholder
export const KAMINO_PROGRAM = 'Kmb5WBJDPFCr4BYxWcKhXkJbqKgY3oNLWYGZM1L7bC3'; // placeholder
export const MARINADE_PROGRAM = 'MarBmsFxiUrHaE3ooGGDYT G3oenCkbYvR1NL6kkRsY'; // placeholder
export const LIDO_PROGRAM = 'Crq9wHKX2mVrmZCLT4rC6Vx3B5D2qJDVVT7wW7dDtV4'; // placeholder

export const DEFAULT_NETWORK = 'devnet' as const;
export const DEFAULT_RPC_URL = 'https://api.devnet.solana.com';
export const DEFAULT_KEY_PATH = '~/.hoshi/keys';
export const DEFAULT_CONFIG_PATH = '~/.hoshi/config.json';

// Fee recipient
export const FEE_RECIPIENT = 'HxRfYmtC6bLJk3LkZg6iKDoSnKK4L4bVx2y2C5dJpY'; // placeholder

// Minimum SOL for rent exemption
export const RENT_EXEMPTION_LAMPORTS = 890_880n; // ~0.001 SOL