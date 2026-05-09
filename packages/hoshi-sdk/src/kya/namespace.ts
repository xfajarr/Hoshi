import type { HoshiNamespace } from './types.js'

export const HOSHI_NAMESPACE: HoshiNamespace = '.hoshi'

export function normalizeHoshiHandle(input: string): string {
  return input.trim().toLowerCase()
}

export function isHoshiHandle(input: string): boolean {
  const normalized = normalizeHoshiHandle(input)
  return /^[a-z0-9][a-z0-9_]{1,30}\.hoshi$/.test(normalized)
}

export function getHoshiLabel(handle: string): string {
  const normalized = normalizeHoshiHandle(handle)

  if (!isHoshiHandle(normalized)) {
    throw new Error(`Invalid Hoshi handle: ${handle}`)
  }

  return normalized.slice(0, -HOSHI_NAMESPACE.length)
}
