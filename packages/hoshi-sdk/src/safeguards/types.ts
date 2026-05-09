export interface SafeguardConfig {
  locked: boolean;
  maxPerTx: number;
  maxDailySend: number;
  dailyUsed: number;
  dailyResetDate: string;
  maxLeverage?: number;
  maxPositionSize?: number;
}

export interface TxMetadata {
  operation: 'transfer' | 'save' | 'withdraw' | 'borrow' | 'repay' | 'pay' | 'swap';
  amount?: number;
  asset?: string;
}

export interface SafeguardAllowedOutcome {
  status: 'allowed'
}

export interface SafeguardPendingApprovalOutcome {
  status: 'pending_approval'
  safeguard: 'locked'
  detail: Record<string, unknown>
}

export interface SafeguardBlockedOutcome {
  status: 'blocked'
  safeguard: string
  detail: Record<string, unknown>
}

export type SafeguardOutcome =
  | SafeguardAllowedOutcome
  | SafeguardPendingApprovalOutcome
  | SafeguardBlockedOutcome

export const OUTBOUND_OPS = new Set<TxMetadata['operation']>([
  'transfer',
  'pay',
  'swap',
]);

export const DEFAULT_SAFEGUARD_CONFIG: SafeguardConfig = {
  locked: false,
  maxPerTx: 0,
  maxDailySend: 0,
  dailyUsed: 0,
  dailyResetDate: '',
  maxLeverage: 3,
  maxPositionSize: 10000,
};

export type SafeguardKey = keyof SafeguardConfig;
