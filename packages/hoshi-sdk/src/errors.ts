export type HoshiErrorCode =
  | 'INSUFFICIENT_BALANCE'
  | 'INSUFFICIENT_GAS'
  | 'INVALID_ADDRESS'
  | 'INVALID_AMOUNT'
  | 'WALLET_NOT_FOUND'
  | 'WALLET_LOCKED'
  | 'WALLET_EXISTS'
  | 'SPONSOR_FAILED'
  | 'GAS_FEE_EXCEEDED'
  | 'SIMULATION_FAILED'
  | 'TRANSACTION_FAILED'
  | 'ASSET_NOT_SUPPORTED'
  | 'INVALID_ASSET'
  | 'HEALTH_FACTOR_TOO_LOW'
  | 'WITHDRAW_WOULD_LIQUIDATE'
  | 'WITHDRAW_FAILED'
  | 'NO_COLLATERAL'
  | 'PROTOCOL_PAUSED'
  | 'PROTOCOL_UNAVAILABLE'
  | 'RPC_ERROR'
  | 'RPC_UNREACHABLE'
  | 'PRICE_EXCEEDS_LIMIT'
  | 'UNSUPPORTED_NETWORK'
  | 'PAYMENT_EXPIRED'
  | 'DUPLICATE_PAYMENT'
  | 'CONTACT_NOT_FOUND'
  | 'INVALID_CONTACT_NAME'
  | 'SAFEGUARD_BLOCKED'
  | 'SWAP_NO_ROUTE'
  | 'SWAP_FAILED'
  | 'INVALID_KEYSTORE'
  | 'KEYSTORE_DECRYPT_FAILED'
  | 'INVALID_PIN'
  | 'UNKNOWN';

export interface HoshiErrorData {
  reason?: string;
  code?: number;
  txSig?: string;
  [key: string]: unknown;
}

export class HoshiError extends Error {
  readonly code: HoshiErrorCode;
  readonly data?: HoshiErrorData;
  readonly retryable: boolean;

  constructor(code: HoshiErrorCode, message: string, data?: HoshiErrorData, retryable = false) {
    super(message);
    this.name = 'HoshiError';
    this.code = code;
    this.data = data;
    this.retryable = retryable;
  }

  toJSON() {
    return {
      error: this.code,
      message: this.message,
      ...(this.data && { data: this.data }),
      retryable: this.retryable,
    };
  }
}

export function mapWalletError(error: unknown): HoshiError {
  const msg = error instanceof Error ? error.message : String(error);

  if (msg.includes('rejected') || msg.includes('cancelled') || msg.includes('User canceled')) {
    return new HoshiError('TRANSACTION_FAILED', 'Transaction cancelled');
  }
  if (msg.includes('Insufficient') || msg.includes('insufficient') || msg.includes('not enough')) {
    return new HoshiError('INSUFFICIENT_BALANCE', 'Insufficient balance');
  }
  if (msg.includes('incorrect') || msg.includes('invalid') || msg.includes('wrong')) {
    return new HoshiError('INVALID_PIN', 'Invalid PIN or keystore');
  }

  return new HoshiError('UNKNOWN', msg, undefined, true);
}

export function mapSolanaError(error: unknown): HoshiError {
  const msg = error instanceof Error ? error.message : String(error);
  const code = (error as { code?: number }).code;

  if (msg.includes('Transaction failed') || msg.includes('0x1')) {
    return new HoshiError('TRANSACTION_FAILED', 'Transaction failed', { code }, false);
  }
  if (msg.includes('Insufficient funds') || code === 0x1) {
    return new HoshiError('INSUFFICIENT_BALANCE', 'Insufficient SOL balance for fees', { code });
  }
  if (msg.includes('Account does not exist') || code === 0x3) {
    return new HoshiError('INVALID_ADDRESS', 'Account not found', { code });
  }
  if (msg.includes('Invalid') || code === 0x0) {
    return new HoshiError('INVALID_AMOUNT', 'Invalid amount or parameter', { code });
  }

  return new HoshiError('UNKNOWN', msg, { code }, true);
}

export const SOLANA_ERROR_CODES: Record<number, string> = {
  0x0: 'Invalid instruction data',
  0x1: 'Insufficient funds',
  0x2: 'Non-native account as signer',
  0x3: 'Account not found',
  0x4: 'Account not owned by program',
  0x5: 'Program not executed',
  0x6: 'Invalid account data',
  0x7: 'Custom error',
  0x8: 'Executable account',
  0x9: 'Unix timestamp not yet reached',
  0xa: 'Foreign account',
  0xb: 'Incorrect program ID',
  0xc: 'Missing required signature',
  0xd: 'Incorrect authority',
  0xe: 'Account type mismatch',
  0xf: 'Fails sanity check',
};

export function parseSolanaError(msg: string): string {
  // Match anchor error format: "Program failed to complete: Custom error 0x1"
  const anchorMatch = msg.match(/Custom error (0x[0-9a-f]+)/i);
  if (anchorMatch) {
    const code = parseInt(anchorMatch[1], 16);
    return SOLANA_ERROR_CODES[code] ?? `Solana error: ${code}`;
  }

  // Match general solana error
  const generalMatch = msg.match(/Error code: (\d+)/i);
  if (generalMatch) {
    const code = parseInt(generalMatch[1], 10);
    return SOLANA_ERROR_CODES[code] ?? `Solana error: ${code}`;
  }

  return msg;
}

export function isRetryableError(error: HoshiError): boolean {
  return (
    error.retryable ||
    error.code === 'RPC_UNREACHABLE' ||
    error.code === 'RPC_ERROR' ||
    error.code === 'SIMULATION_FAILED'
  );
}
