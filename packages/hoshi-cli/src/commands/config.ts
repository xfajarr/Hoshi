import { Command } from 'commander'
import { printSuccess, printBlank, printInfo, printKeyValue, printHeader, printDivider, printJson, isJsonMode } from '../output.js'
import { getSafeguards, setSafeguard, loadConfig, saveConfig, getConfigDir } from '../config.js'

const SAFEGUARD_KEYS = new Set(['locked', 'maxPerTx', 'maxDailySend', 'dailyUsed', 'dailyResetDate', 'alertThreshold', 'maxLeverage', 'maxPositionSize'])

export const getNestedValue = (obj: Record<string, unknown>, path: string): unknown => {
  const parts = path.split('.')
  let current: unknown = obj
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

export const setNestedValue = (obj: Record<string, unknown>, path: string, value: unknown): void => {
  const parts = path.split('.')
  if (parts.some(p => UNSAFE_KEYS.has(p))) return
  const sanitized = parts.map(p => p.replace(/[^a-zA-Z0-9_]/g, ''))
  let current = obj
  for (let i = 0; i < sanitized.length - 1; i++) {
    const part = sanitized[i]
    if (!part) return
    if (!Object.hasOwn(current, part) || typeof current[part] !== 'object' || current[part] === null) {
      current[part] = {}
    }
    current = current[part] as Record<string, unknown>
  }
  const key = sanitized[sanitized.length - 1]
  if (!key) return
  current[key] = value
}

const formatUsd = (amount: number): string => `$${amount.toFixed(2)}`

export const registerConfig = (program: Command): void => {
  const configCmd = program.command('config').description('Show or set configuration')

  configCmd
    .command('show')
    .description('Show safeguard settings')
    .action(() => {
      const config = getSafeguards()

      if (isJsonMode()) {
        printJson({
          locked: config.locked,
          maxPerTx: config.maxPerTx,
          maxDailySend: config.maxDailySend,
          dailyUsed: config.dailyUsed,
        })
        return
      }

      printHeader('Agent Safeguards')
      printDivider()
      printKeyValue('Locked', config.locked ? 'Yes' : 'No')
      printKeyValue(
        'Per-transaction',
        config.maxPerTx > 0 ? formatUsd(config.maxPerTx) : 'Unlimited',
      )
      printKeyValue(
        'Daily send limit',
        config.maxDailySend > 0
          ? `${formatUsd(config.maxDailySend)} (${formatUsd(config.dailyUsed)} used today)`
          : 'Unlimited',
      )
      printBlank()
    })

  configCmd
    .command('get')
    .argument('[key]', 'Config key to get, supports dot notation (e.g. llm.provider)')
    .action((key?: string) => {
      const config = loadConfig()

      if (key) {
        const value = key.includes('.') ? getNestedValue(config, key) : config[key]
        if (isJsonMode()) {
          printJson({ [key]: value })
          return
        }
        printBlank()
        const display = typeof value === 'object' ? JSON.stringify(value) : String(value ?? '(not set)')
        printKeyValue(key, display)
      } else {
        if (isJsonMode()) {
          printJson(config)
          return
        }
        printBlank()
        if (Object.keys(config).length === 0) {
          printInfo('No configuration set.')
        } else {
          for (const [k, v] of Object.entries(config)) {
            const display = typeof v === 'object' ? JSON.stringify(v) : String(v)
            printKeyValue(k, display)
          }
        }
      }
      printBlank()
    })

  configCmd
    .command('set')
    .argument('<key>', 'Config key, supports dot notation (e.g. llm.provider)')
    .argument('<value>', 'Config value')
    .action((key: string, value: string) => {
      const leafKey = key.includes('.') ? key.split('.').pop()! : key

      if (SAFEGUARD_KEYS.has(leafKey) && !key.includes('.')) {
        let parsed: unknown = value
        if (value === 'true') parsed = true
        else if (value === 'false') parsed = false
        else if (!isNaN(Number(value)) && value.trim() !== '') parsed = Number(value)

        setSafeguard(leafKey as keyof typeof setSafeguard, parsed as number)

        if (isJsonMode()) {
          printJson({ [key]: parsed })
          return
        }

        printBlank()
        printSuccess(`Set ${key} = ${String(parsed)}`)
        printBlank()
        return
      }

      const config = loadConfig()

      let parsed: unknown = value
      if (value === 'true') parsed = true
      else if (value === 'false') parsed = false
      else if (!isNaN(Number(value)) && value.trim() !== '') parsed = Number(value)
      if (value.startsWith('[') || value.startsWith('{')) {
        try {
          parsed = JSON.parse(value)
        } catch {
          // keep as string
        }
      }

      if (key.includes('.')) {
        setNestedValue(config, key, parsed)
      } else {
        config[key] = parsed
      }
      saveConfig(config)

      if (isJsonMode()) {
        printJson({ [key]: parsed })
        return
      }

      printBlank()
      printSuccess(`Set ${key} = ${String(parsed)}`)
      printBlank()
    })
}