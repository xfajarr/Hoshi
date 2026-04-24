import pc from 'picocolors'

let jsonMode = false
let yesMode = false

export const setJsonMode = (enabled: boolean) => {
  jsonMode = enabled
}

export const isJsonMode = (): boolean => {
  return jsonMode
}

export const setYesMode = (enabled: boolean) => {
  yesMode = enabled
}

export const isYesMode = (): boolean => {
  return yesMode
}

export const printJson = (data: unknown): void => {
  console.log(JSON.stringify(data, null, 2))
}

export const printSuccess = (message: string): void => {
  if (jsonMode) return
  console.log(`  ${pc.green('✓')} ${message}`)
}

export const printError = (message: string): void => {
  if (jsonMode) return
  console.error(`  ${pc.red('✗')} ${message}`)
}

export const printWarning = (message: string): void => {
  if (jsonMode) return
  console.log(`  ${pc.yellow('⚠')} ${message}`)
}

export const printInfo = (message: string): void => {
  if (jsonMode) return
  console.log(`  ${pc.dim(message)}`)
}

export const printHeader = (title: string): void => {
  if (jsonMode) return
  console.log()
  console.log(`  ${pc.bold(title)}`)
  console.log()
}

export const printKeyValue = (key: string, value: string, indent = 2): void => {
  if (jsonMode) return
  const pad = ' '.repeat(indent)
  console.log(`${pad}${pc.dim(key + ':')}  ${value}`)
}

export const printBlank = (): void => {
  if (jsonMode) return
  console.log()
}

export const printDivider = (width = 53): void => {
  if (jsonMode) return
  console.log(`  ${pc.dim('─'.repeat(width))}`)
}

export const printLine = (text: string): void => {
  if (jsonMode) return
  console.log(`  ${text}`)
}

export const printSeparator = (): void => {
  if (jsonMode) return
  console.log(`  ${pc.dim('──────────────────────────────────────')}`)
}

export const explorerUrl = (txHash: string, cluster = 'mainnet'): string => {
  const base = cluster === 'devnet'
    ? 'https://explorer.solana.com/?cluster=devnet'
    : 'https://explorer.solana.com'
  return `${base}/tx/${txHash}`
}

export const handleError = (error: unknown): never => {
  if (jsonMode) {
    const data = error instanceof Error && 'toJSON' in error
      ? (error as { toJSON(): unknown }).toJSON()
      : { error: 'UNKNOWN', message: String(error) }
    console.log(JSON.stringify(data, null, 2))
    process.exit(1)
  } else {
    const msg = error instanceof Error ? error.message : String(error)
    printError(msg)
    process.exit(1)
  }
}