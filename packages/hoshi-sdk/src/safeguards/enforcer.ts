import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import type { SafeguardConfig, TxMetadata } from './types.js'
import { DEFAULT_SAFEGUARD_CONFIG, OUTBOUND_OPS } from './types.js'
import { SafeguardError } from './errors.js'

export class SafeguardEnforcer {
  private config: SafeguardConfig
  private readonly configPath: string | null

  constructor(configDir?: string) {
    this.config = { ...DEFAULT_SAFEGUARD_CONFIG }
    this.configPath = configDir ? join(configDir, 'config.json') : null
    if (!configDir) {
      this.configPath = join(homedir(), '.hoshi', 'config.json')
    }
  }

  load(): void {
    if (!this.configPath) return
    try {
      const raw = JSON.parse(readFileSync(this.configPath, 'utf-8'))
      this.config = {
        ...DEFAULT_SAFEGUARD_CONFIG,
        locked: raw.locked ?? false,
        maxPerTx: raw.maxPerTx ?? 0,
        maxDailySend: raw.maxDailySend ?? 0,
        dailyUsed: raw.dailyUsed ?? 0,
        dailyResetDate: raw.dailyResetDate ?? '',
        maxLeverage: raw.maxLeverage ?? DEFAULT_SAFEGUARD_CONFIG.maxLeverage,
        maxPositionSize: raw.maxPositionSize ?? DEFAULT_SAFEGUARD_CONFIG.maxPositionSize,
      }
    } catch {
      this.config = { ...DEFAULT_SAFEGUARD_CONFIG }
    }
  }

  assertNotLocked(): void {
    this.load()
    if (this.config.locked) {
      throw new SafeguardError('locked', {})
    }
  }

  check(metadata: TxMetadata): void {
    this.load()

    if (this.config.locked) {
      throw new SafeguardError('locked', {})
    }

    if (!OUTBOUND_OPS.has(metadata.operation)) return

    const amount = metadata.amount ?? 0

    if (this.config.maxPerTx > 0 && amount > this.config.maxPerTx) {
      throw new SafeguardError('maxPerTx', {
        attempted: amount,
        limit: this.config.maxPerTx,
      })
    }

    this.resetDailyIfNewDay()

    if (this.config.maxDailySend > 0 && this.config.dailyUsed + amount > this.config.maxDailySend) {
      throw new SafeguardError('maxDailySend', {
        attempted: amount,
        limit: this.config.maxDailySend,
        current: this.config.dailyUsed,
      })
    }
  }

  recordUsage(amount: number): void {
    this.resetDailyIfNewDay()
    this.config.dailyUsed += amount
    this.save()
  }

  lock(): void {
    this.config.locked = true
    this.save()
  }

  unlock(): void {
    this.config.locked = false
    this.save()
  }

  set(key: keyof SafeguardConfig, value: unknown): void {
    if (key === 'locked' && typeof value === 'boolean') {
      this.config.locked = value
    } else if (key === 'maxPerTx' && typeof value === 'number') {
      this.config.maxPerTx = value
    } else if (key === 'maxDailySend' && typeof value === 'number') {
      this.config.maxDailySend = value
    } else if (key === 'maxLeverage' && typeof value === 'number') {
      this.config.maxLeverage = value
    } else if (key === 'maxPositionSize' && typeof value === 'number') {
      this.config.maxPositionSize = value
    }
    this.save()
  }

  get(key: keyof SafeguardConfig): unknown {
    this.load()
    return this.config[key]
  }

  getConfig(): SafeguardConfig {
    this.load()
    this.resetDailyIfNewDay()
    return { ...this.config }
  }

  isConfigured(): boolean {
    return this.config.maxPerTx > 0 || this.config.maxDailySend > 0
  }

  private resetDailyIfNewDay(): void {
    const today = new Date().toISOString().slice(0, 10)
    if (this.config.dailyResetDate !== today) {
      this.config.dailyUsed = 0
      this.config.dailyResetDate = today
      this.save()
    }
  }

  private save(): void {
    if (!this.configPath) return
    try {
      let existing: Record<string, unknown> = {}
      try {
        existing = JSON.parse(readFileSync(this.configPath, 'utf-8'))
      } catch {
        // no existing config
      }

      const merged = {
        ...existing,
        locked: this.config.locked,
        maxPerTx: this.config.maxPerTx,
        maxDailySend: this.config.maxDailySend,
        dailyUsed: this.config.dailyUsed,
        dailyResetDate: this.config.dailyResetDate,
        maxLeverage: this.config.maxLeverage,
        maxPositionSize: this.config.maxPositionSize,
      }

      const dir = join(homedir(), '.hoshi')
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }
      writeFileSync(this.configPath, JSON.stringify(merged, null, 2) + '\n')
    } catch {
      // Best-effort persistence
    }
  }
}