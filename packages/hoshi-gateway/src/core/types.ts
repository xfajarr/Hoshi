import { z } from 'zod'

export const ServiceSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  baseUrl: z.string().url(),
  endpoints: z.array(z.object({
    path: z.string(),
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE']),
    description: z.string(),
    price: z.string(),
    priceUnit: z.string().default('USDC')
  }))
})
export type Service = z.infer<typeof ServiceSchema>

export const X402PaymentRequirementSchema = z.object({
  scheme: z.literal('x402'),
  network: z.string(),
  token: z.string(),
  amount: z.string(),
  recipient: z.string(),
  deadline: z.string().datetime().optional()
})
export type X402PaymentRequirement = z.infer<typeof X402PaymentRequirementSchema>

export const PaymentProofSchema = z.object({
  txSignature: z.string(),
  sender: z.string(),
  recipient: z.string(),
  amount: z.string(),
  token: z.string(),
  timestamp: z.string().datetime()
})
export type PaymentProof = z.infer<typeof PaymentProofSchema>

export const MeteredRequestSchema = z.object({
  id: z.string().uuid(),
  serviceId: z.string(),
  endpointPath: z.string(),
  paymentProof: PaymentProofSchema.optional(),
  timestamp: z.string().datetime(),
  clientIp: z.string().optional()
})
export type MeteredRequest = z.infer<typeof MeteredRequestSchema>
