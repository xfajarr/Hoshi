import { normalizeHoshiHandle } from './namespace.js'
import type { HoshiAttestation, HoshiIdentity, HoshiReputation } from './types.js'

export interface KyaClaimInput {
  handle: string
  displayName: string
  owner: string
  metadataUri?: string
}

export interface KyaProfile extends HoshiIdentity {
  reputation: HoshiReputation
}

export interface KyaRegistryPort {
  claim(input: KyaClaimInput): Promise<KyaProfile>
  resolve(handle: string): Promise<KyaProfile | null>
  issueAttestation(input: { handle: string; type: string; payload: Record<string, unknown> }): Promise<HoshiAttestation>
  updateReputation(handle: string, delta: number): Promise<KyaProfile | null>
}

export class InMemoryKyaRegistry implements KyaRegistryPort {
  private readonly records = new Map<string, KyaProfile>()
  private readonly attestations = new Map<string, HoshiAttestation[]>()

  async claim(input: KyaClaimInput): Promise<KyaProfile> {
    const handle = normalizeHoshiHandle(input.handle)

    if (this.records.has(handle)) {
      throw new Error('HANDLE_TAKEN')
    }

    const now = new Date().toISOString()
    const profile: KyaProfile = {
      handle,
      owner: input.owner,
      displayName: input.displayName,
      metadataUri: input.metadataUri,
      createdAt: now,
      updatedAt: now,
      reputation: {
        score: 0,
        attestationCount: 0,
        lastUpdatedAt: now,
      },
    }

    this.records.set(handle, profile)
    this.attestations.set(handle, [])
    return profile
  }

  async resolve(handle: string): Promise<KyaProfile | null> {
    return this.records.get(normalizeHoshiHandle(handle)) ?? null
  }

  async issueAttestation(input: { handle: string; type: string; payload: Record<string, unknown> }): Promise<HoshiAttestation> {
    const handle = normalizeHoshiHandle(input.handle)
    const profile = this.records.get(handle)

    if (!profile) {
      throw new Error('HANDLE_NOT_FOUND')
    }

    const attestation: HoshiAttestation = {
      id: crypto.randomUUID(),
      subjectHandle: handle,
      issuer: 'hoshi',
      type: input.type,
      payload: input.payload,
      createdAt: new Date().toISOString(),
    }

    const items = this.attestations.get(handle) ?? []
    items.push(attestation)
    this.attestations.set(handle, items)

    profile.reputation = {
      score: profile.reputation.score + 1,
      attestationCount: items.length,
      lastUpdatedAt: attestation.createdAt,
    }
    profile.updatedAt = attestation.createdAt
    this.records.set(handle, profile)

    return attestation
  }

  async updateReputation(handle: string, delta: number): Promise<KyaProfile | null> {
    const normalized = normalizeHoshiHandle(handle)
    const profile = this.records.get(normalized)

    if (!profile) {
      return null
    }

    const now = new Date().toISOString()
    profile.reputation = {
      ...profile.reputation,
      score: profile.reputation.score + delta,
      lastUpdatedAt: now,
    }
    profile.updatedAt = now
    this.records.set(normalized, profile)
    return profile
  }
}
