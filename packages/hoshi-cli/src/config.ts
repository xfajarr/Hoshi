import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

const DEFAULT_CONFIG_DIR = join(homedir(), '.hoshi')
const CONFIG_PATH = join(DEFAULT_CONFIG_DIR, 'config.json')

export interface ConfigData {
  wallets: Record<string, unknown>
  contacts: Record<string, unknown>
  safeguards: SafeguardConfig
  [key: string]: unknown
}

export interface SafeguardConfig {
  locked: boolean
  maxPerTx: number
  maxDailySend: number
  dailyUsed: number
  dailyResetDate: string
  alertThreshold: number
  maxLeverage: number
  maxPositionSize: number
}

const DEFAULT_SAFEGUARDS: SafeguardConfig = {
  locked: false,
  maxPerTx: 500,
  maxDailySend: 1000,
  dailyUsed: 0,
  dailyResetDate: new Date().toISOString().split('T')[0],
  alertThreshold: 80,
  maxLeverage: 3,
  maxPositionSize: 10000,
}

export const loadConfig = (): ConfigData => {
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'))
  } catch {
    return {
      wallets: {},
      contacts: {},
      safeguards: { ...DEFAULT_SAFEGUARDS },
    }
  }
}

export const saveConfig = (config: ConfigData): void => {
  const dir = join(DEFAULT_CONFIG_DIR)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n')
}

export const getSafeguards = (): SafeguardConfig => {
  const config = loadConfig()
  return config.safeguards ?? DEFAULT_SAFEGUARDS
}

export const setSafeguard = (key: keyof SafeguardConfig, value: unknown): void => {
  const config = loadConfig()
  config.safeguards = { ...getSafeguards(), [key]: value }
  saveConfig(config)
}

export const lock = (): void => {
  setSafeguard('locked', true)
}

export const unlock = (): void => {
  setSafeguard('locked', false)
}

export const isLocked = (): boolean => {
  return getSafeguards().locked
}

export const resetDailyUsage = (): void => {
  const today = new Date().toISOString().split('T')[0]
  const safeguards = getSafeguards()
  if (safeguards.dailyResetDate !== today) {
    setSafeguard('dailyResetDate', today)
    setSafeguard('dailyUsed', 0)
  }
}

export const checkAndResetDailyUsage = (): void => {
  const today = new Date().toISOString().split('T')[0]
  const safeguards = getSafeguards()
  if (safeguards.dailyResetDate !== today) {
    resetDailyUsage()
  }
}

export const getConfigDir = (): string => DEFAULT_CONFIG_DIR
export const getConfigPath = (): string => CONFIG_PATH