import process from 'process'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

const HOSHI_DIR = join(homedir(), '.hoshi')
const SESSION_PATH = join(HOSHI_DIR, '.session')
const MIN_PASSWORD_LENGTH = 4

export const getPasswordFromEnv = (): string | undefined => {
  return process.env.HOSHI_WALLET_PASSWORD
}

export const ensureDir = (): void => {
  if (!existsSync(HOSHI_DIR)) {
    mkdirSync(HOSHI_DIR, { recursive: true })
  }
}

export const saveSession = async (password: string): Promise<void> => {
  ensureDir()
  writeFileSync(SESSION_PATH, password, { mode: 0o600 })
}

export const clearSession = async (): Promise<void> => {
  try {
    if (existsSync(SESSION_PATH)) {
      const { unlinkSync } = await import('fs')
      unlinkSync(SESSION_PATH)
    }
  } catch {
    // already gone
  }
}

async function readSession_(): Promise<string | undefined> {
  try {
    const content = readFileSync(SESSION_PATH, 'utf-8')
    return content.trim() || undefined
  } catch {
    return undefined
  }
}

export const resolvePassword = async (opts?: { confirm?: boolean; skipSession?: boolean }): Promise<string> => {
  const envPassword = getPasswordFromEnv()
  if (envPassword) return envPassword

  if (!opts?.skipSession) {
    const sessionPassword = await readSession_()
    if (sessionPassword) return sessionPassword
  }

  const { promptSecret } = await import('./prompt.js')
  const password = opts?.confirm
    ? await promptSecret('Create password (min 4 chars): ')
    : await promptSecret('Password: ')

  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
  }

  if (opts?.confirm) {
    const confirmation = await promptSecret('Confirm password: ')
    if (password !== confirmation) {
      throw new Error('Passwords do not match')
    }
  }

  if (!opts?.skipSession) {
    await saveSession(password)
  }
  return password
}

export const sessionExists = async (): Promise<boolean> => {
  try {
    return existsSync(SESSION_PATH)
  } catch {
    return false
  }
}