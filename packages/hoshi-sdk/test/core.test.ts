import { describe, it, expect } from 'vitest'
import { Result, ValidationError, InsufficientBalanceError } from '../src/index.js'

describe('Result pattern', () => {
  it('should create ok result', () => {
    const result = Result.ok(42)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toBe(42)
  })

  it('should create err result', () => {
    const error = new ValidationError('test error')
    const result = Result.err(error)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.message).toBe('test error')
  })

  it('should map ok values', () => {
    const result = Result.ok(5)
    const mapped = Result.map(result, x => x * 2)
    expect(mapped.ok).toBe(true)
    if (mapped.ok) expect(mapped.value).toBe(10)
  })

  it('should not map err values', () => {
    const error = new ValidationError('fail')
    const result = Result.err(error)
    const mapped = Result.map(result, () => 'never')
    expect(mapped.ok).toBe(false)
  })

  it('should unwrap with default', () => {
    const okResult = Result.ok(42)
    expect(Result.unwrapOr(okResult, 0)).toBe(42)

    const errResult = Result.err(new ValidationError('fail'))
    expect(Result.unwrapOr(errResult, 99)).toBe(99)
  })
})

describe('Error hierarchy', () => {
  it('should create validation error', () => {
    const err = new ValidationError('Invalid input')
    expect(err.code).toBe('VALIDATION_ERROR')
    expect(err.recoverable).toBe(true)
    expect(err.message).toBe('Invalid input')
  })

  it('should create insufficient balance error', () => {
    const err = new InsufficientBalanceError('USDC', '100', '50')
    expect(err.code).toBe('INSUFFICIENT_BALANCE')
    expect(err.asset).toBe('USDC')
    expect(err.required).toBe('100')
    expect(err.available).toBe('50')
    expect(err.context).toEqual({ asset: 'USDC', required: '100', available: '50' })
  })

  it('should serialize to JSON', () => {
    const err = new ValidationError('test', { field: 'amount' })
    const json = err.toJSON()
    expect(json.code).toBe('VALIDATION_ERROR')
    expect(json.context).toEqual({ field: 'amount' })
  })
})
