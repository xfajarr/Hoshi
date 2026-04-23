/**
 * Result<T, E> - Discriminated union for explicit error handling.
 * Replaces thrown exceptions with typed outcomes.
 */
export type Result<T, E = HoshiError> = 
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E }

export const Result = {
  ok<T>(value: T): Result<T, never> {
    return { ok: true, value }
  },

  err<E>(error: E): Result<never, E> {
    return { ok: false, error }
  },

  map<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
    if (!result.ok) return result
    return Result.ok(fn(result.value))
  },

  flatMap<T, U, E>(result: Result<T, E>, fn: (value: T) => Result<U, E>): Result<U, E> {
    if (!result.ok) return result
    return fn(result.value)
  },

  unwrap<T, E>(result: Result<T, E>): T {
    if (!result.ok) throw new Error(`Unwrapped error: ${JSON.stringify(result.error)}`)
    return result.value
  },

  unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
    if (!result.ok) return defaultValue
    return result.value
  }
} as const

export interface HoshiError {
  readonly code: string
  readonly message: string
  readonly recoverable: boolean
  readonly context?: Record<string, unknown>
}
