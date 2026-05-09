import { describe, expect, it } from 'vitest'
import {
  HOSHI_NAMESPACE as ROOT_HOSHI_NAMESPACE,
  getHoshiLabel,
  isHoshiHandle,
  normalizeHoshiHandle,
} from '../src/index.js'

describe('Hoshi KYA namespace', () => {
  it('accepts canonical .hoshi handles', () => {
    expect(isHoshiHandle('namaagent.hoshi')).toBe(true)
    expect(isHoshiHandle('agent-1.hoshi')).toBe(false)
  })

  it('normalizes whitespace and case', () => {
    expect(normalizeHoshiHandle('  NamaAgent.HOSHI  ')).toBe('namaagent.hoshi')
  })

  it('extracts the label from a handle', () => {
    expect(getHoshiLabel('namaagent.hoshi')).toBe('namaagent')
  })

  it('re-exports the namespace from the package barrel', () => {
    expect(ROOT_HOSHI_NAMESPACE).toBe('.hoshi')
  })
})
