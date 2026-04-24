import type { HoshiError } from './result.js'

export class HoshiSDKError extends Error implements HoshiError {
  constructor(
    public readonly code: string,
    message: string,
    public readonly recoverable: boolean = false,
    public readonly context?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'HoshiSDKError'
    Object.setPrototypeOf(this, HoshiSDKError.prototype)
  }

  toJSON(): HoshiError {
    return {
      code: this.code,
      message: this.message,
      recoverable: this.recoverable,
      context: this.context
    }
  }
}

export class ValidationError extends HoshiSDKError {
  constructor(message: string, context?: Record<string, unknown>) {
    super('VALIDATION_ERROR', message, true, context)
    this.name = 'ValidationError'
  }
}

export class ChainError extends HoshiSDKError {
  constructor(message: string, context?: Record<string, unknown>) {
    super('CHAIN_ERROR', message, false, context)
    this.name = 'ChainError'
  }
}

export class InsufficientBalanceError extends HoshiSDKError {
  constructor(
    public readonly asset: string,
    public readonly required: string,
    public readonly available: string
  ) {
    super(
      'INSUFFICIENT_BALANCE',
      `Insufficient ${asset} balance. Required: ${required}, Available: ${available}`,
      true,
      { asset, required, available }
    )
    this.name = 'InsufficientBalanceError'
  }
}


export class AuthenticationError extends HoshiSDKError {
  constructor(message: string = 'Invalid wallet password') {
    super('AUTHENTICATION_ERROR', message, true)
    this.name = 'AuthenticationError'
  }
}

export class KeystoreError extends HoshiSDKError {
  constructor(message: string, context?: Record<string, unknown>) {
    super('KEYSTORE_ERROR', message, true, context)
    this.name = 'KeystoreError'
  }
}

export class UnauthorizedError extends HoshiSDKError {
  constructor(message: string = 'Unauthorized action') {
    super('UNAUTHORIZED', message, false)
    this.name = 'UnauthorizedError'
  }
}

export class NotFoundError extends HoshiSDKError {
  constructor(resource: string, identifier: string) {
    super('NOT_FOUND', `${resource} not found: ${identifier}`, true, { resource, identifier })
    this.name = 'NotFoundError'
  }
}

export class ProviderError extends HoshiSDKError {
  constructor(
    public readonly provider: string,
    message: string,
    context?: Record<string, unknown>
  ) {
    super('PROVIDER_ERROR', `${provider}: ${message}`, true, { provider, ...context })
    this.name = 'ProviderError'
  }
}

export class PolicyError extends HoshiSDKError {
  constructor(
    public readonly policyId: string,
    message: string
  ) {
    super('POLICY_ERROR', message, true, { policyId })
    this.name = 'PolicyError'
  }
}
