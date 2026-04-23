import { z } from 'zod'

export const PolicyRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  enabled: z.boolean().default(true),
  priority: z.number().default(0),
  condition: z.object({
    type: z.enum([
      'max_amount',
      'daily_limit', 
      'recipient_allowlist',
      'action_type',
      'asset_type',
      'time_window'
    ]),
    params: z.record(z.string(), z.unknown())
  }),
  action: z.enum(['allow', 'block', 'escalate'])
})
export type PolicyRule = z.infer<typeof PolicyRuleSchema>

export const PolicyContextSchema = z.object({
  walletId: z.string(),
  actionType: z.string(),
  amount: z.object({
    amount: z.string(),
    asset: z.string()
  }).optional(),
  recipient: z.string().optional(),
  timestamp: z.string(),
  dailySpend: z.record(z.string(), z.number()).default({}),
  metadata: z.record(z.string(), z.unknown()).optional()
})
export type PolicyContext = z.infer<typeof PolicyContextSchema>

export const PolicyResultSchema = z.object({
  action: z.enum(['read', 'write_safe', 'write_escalated']),
  allowed: z.boolean(),
  rulesTriggered: z.array(z.string()),
  reason: z.string().optional(),
  requiresApproval: z.boolean().optional(),
  policyVersion: z.string().optional()
})
export type PolicyResult = z.infer<typeof PolicyResultSchema>

export const ApprovalRequestSchema = z.object({
  id: z.string().uuid(),
  walletId: z.string(),
  actionType: z.string(),
  params: z.record(z.string(), z.unknown()),
  policyResult: PolicyResultSchema,
  status: z.enum(['pending', 'approved', 'rejected', 'expired']),
  requestedBy: z.string().optional(),
  resolvedBy: z.string().optional(),
  createdAt: z.string(),
  resolvedAt: z.string().optional(),
  expiresAt: z.string().optional()
})
export type ApprovalRequest = z.infer<typeof ApprovalRequestSchema>

export const ExecutionResultSchema = z.object({
  success: z.boolean(),
  receiptId: z.string().optional(),
  policyResult: PolicyResultSchema,
  approvalId: z.string().optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    recoverable: z.boolean()
  }).optional()
})
export type ExecutionResult = z.infer<typeof ExecutionResultSchema>
