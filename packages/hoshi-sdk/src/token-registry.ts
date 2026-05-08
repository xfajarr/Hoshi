export interface CoinMeta {
  mint: string;
  decimals: number;
  symbol: string;
  displayName: string;
  tier?: 1 | 2;
}

export const TOKEN_REGISTRY: Record<string, CoinMeta> = {
  USDC: {
    mint: 'EPjFWdd5AufqSS2d4J4D6J6Tk5yT6AXR4x2Y1Q3qQrT7',
    decimals: 6,
    symbol: 'USDC',
    displayName: 'USD Coin',
    tier: 1,
  },
  USDT: {
    mint: 'Es9vMFrzaCERniiQRvDXk8E3E5xUxJgkqgFXjYqP8r5o',
    decimals: 6,
    symbol: 'USDT',
    displayName: 'Tether USD',
    tier: 1,
  },
  SOL: {
    mint: 'So11111111111111111111111111111111111111112',
    decimals: 9,
    symbol: 'SOL',
    displayName: 'Solana',
    tier: 2,
  },
  ETH: {
    mint: '7vfCXTnxWbvCN2J8HN8apL3e2wAQJ3wDNeeNxgYUH3i8',
    decimals: 8,
    symbol: 'ETH',
    displayName: 'Wrapped Ethereum',
    tier: 2,
  },
  BTC: {
    mint: '9n4aLg2hBJKHBYDd6cE3aNZ3VYJqsCMNY6iB8XRBJDKi',
    decimals: 8,
    symbol: 'BTC',
    displayName: 'Wrapped Bitcoin',
    tier: 2,
  },
  mSOL: {
    mint: 'mSoLzYCxHdGgGa1SNz1iA7S3RdBb4f8icuG8CJM3JxP',
    decimals: 9,
    symbol: 'mSOL',
    displayName: 'Marinade staked SOL',
    tier: 2,
  },
  stSOL: {
    mint: '5oNbP4kShyLkAWG4NZDmDYAXR3B3aGQVx2x5oVcvPQrf',
    decimals: 9,
    symbol: 'stSOL',
    displayName: 'Lido staked SOL',
    tier: 2,
  },
  jitoSOL: {
    mint: 'JUPyiwrJ6ypXwC8TXdQUuXWEMx3GvS2EN3KqKfFXmYm',
    decimals: 9,
    symbol: 'jitoSOL',
    displayName: 'Jito staked SOL',
    tier: 2,
  },
  DAI: {
    mint: 'FYpdCkA6bpaJxvDLCQkR6gzNgG2UFDQMGsBnCPM6kT5',
    decimals: 8,
    symbol: 'DAI',
    displayName: 'Dai Stablecoin',
    tier: 1,
  },
  USDC_DAITO: {
    mint: 'AqK4D6ZvgqQTZAB3m6J6a7q7r5JqJZ2ZqZ2',
    decimals: 8,
    symbol: 'DAI',
    displayName: 'Dai on Solana',
  },
};

const BY_MINT = new Map<string, CoinMeta>();
for (const meta of Object.values(TOKEN_REGISTRY)) {
  BY_MINT.set(meta.mint, meta);
}

export function isTier1(mint: string): boolean {
  const meta = BY_MINT.get(mint);
  return meta?.tier === 1;
}

export function isTier2(mint: string): boolean {
  const meta = BY_MINT.get(mint);
  return meta?.tier === 2;
}

export function isSupported(mint: string): boolean {
  const meta = BY_MINT.get(mint);
  return meta?.tier !== undefined;
}

export function getTier(mint: string): 1 | 2 | undefined {
  return BY_MINT.get(mint)?.tier;
}

export function getDecimalsForMint(mint: string): number {
  const meta = BY_MINT.get(mint);
  return meta?.decimals ?? 9;
}

export function resolveSymbol(mint: string): string {
  const meta = BY_MINT.get(mint);
  return meta?.symbol ?? mint;
}

export const TOKEN_MAP: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const [name, meta] of Object.entries(TOKEN_REGISTRY)) {
    map[name] = meta.mint;
    map[name.toUpperCase()] = meta.mint;
  }
  return map;
})();

export function resolveTokenMint(nameOrMint: string): string | null {
  if (nameOrMint.length >= 32) return nameOrMint;
  return TOKEN_MAP[nameOrMint] ?? TOKEN_MAP[nameOrMint.toUpperCase()] ?? null;
}

export const SOL_TYPE = TOKEN_REGISTRY.SOL.mint;
export const USDC_TYPE = TOKEN_REGISTRY.USDC.mint;
export const USDT_TYPE = TOKEN_REGISTRY.USDT.mint;
export const ETH_TYPE = TOKEN_REGISTRY.ETH.mint;
export const BTC_TYPE = TOKEN_REGISTRY.BTC.mint;
export const MSOL_TYPE = TOKEN_REGISTRY.mSOL.mint;
export const STSOL_TYPE = TOKEN_REGISTRY.stSOL.mint;
export const JITOSOL_TYPE = TOKEN_REGISTRY.jitoSOL.mint;
export const DAI_TYPE = TOKEN_REGISTRY.DAI.mint;