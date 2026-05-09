export type HoshiNamespace = '.hoshi'

export interface HoshiHandleParts {
  label: string
  namespace: HoshiNamespace
}

export interface HoshiIdentity {
  handle: string
  owner: string
  displayName: string
  metadataUri?: string
  createdAt: string
  updatedAt: string
}

export interface HoshiReputation {
  score: number
  attestationCount: number
  lastUpdatedAt: string
}

export interface HoshiAttestation {
  id: string
  subjectHandle: string
  issuer: 'hoshi'
  type: string
  payload: Record<string, unknown>
  createdAt: string
}
