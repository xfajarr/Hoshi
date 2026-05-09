import type { KyaClaimInput, KyaProfile, KyaRegistryPort } from './local-registry.js'

export class KyaClient {
  constructor(
    private readonly registry: KyaRegistryPort,
    private readonly getOwner: () => string | null,
  ) {}

  async claimHandle(input: Omit<KyaClaimInput, 'owner'> & { owner?: string }): Promise<KyaProfile> {
    const owner = input.owner ?? this.getOwner()

    if (!owner) {
      throw new Error('WALLET_REQUIRED')
    }

    return this.registry.claim({ ...input, owner })
  }

  resolveHandle(handle: string): Promise<KyaProfile | null> {
    return this.registry.resolve(handle)
  }

  getProfile(handle: string): Promise<KyaProfile | null> {
    return this.registry.resolve(handle)
  }

  issueAttestation(input: { handle: string; type: string; payload: Record<string, unknown> }) {
    return this.registry.issueAttestation(input)
  }

  updateReputation(handle: string, delta: number) {
    return this.registry.updateReputation(handle, delta)
  }
}
