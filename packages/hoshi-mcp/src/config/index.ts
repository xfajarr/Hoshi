import { z } from 'zod'

export const ServerConfigSchema = z.object({
  // RPC
  rpcEndpoint: z.string().url().default('https://api.devnet.solana.com'),
  commitment: z.enum(['processed', 'confirmed', 'finalized']).default('confirmed'),
  
  // Signer (optional - if not provided, write operations require manual approval)
  keypairPath: z.string().optional(),
  walletId: z.string().optional(),
  walletPassword: z.string().optional(),
  
  // Policy
  policyEnabled: z.boolean().default(true),
  defaultAction: z.enum(['allow', 'block']).default('allow'),
  
  // Storage
  storagePath: z.string().default('.hoshi/store.json'),
  policyPath: z.string().default('.hoshi/policies.json'),
  approvalPath: z.string().default('.hoshi/approvals.json'),
  
  // Server
  transport: z.enum(['stdio', 'http', 'sse']).default('stdio'),
  port: z.number().default(3001),
  host: z.string().default('0.0.0.0'),
  
  // Logging
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info')
})

export type ServerConfig = z.infer<typeof ServerConfigSchema>

export function loadConfig(env: Record<string, string | undefined> = process.env): ServerConfig {
  return ServerConfigSchema.parse({
    rpcEndpoint: env.HOSHI_RPC_ENDPOINT,
    commitment: env.HOSHI_COMMITMENT,
    keypairPath: env.HOSHI_KEYPAIR_PATH,
    walletId: env.HOSHI_WALLET_ID,
    walletPassword: env.HOSHI_WALLET_PASSWORD,
    policyEnabled: env.HOSHI_POLICY_ENABLED === 'true' ? true : 
                   env.HOSHI_POLICY_ENABLED === 'false' ? false : undefined,
    defaultAction: env.HOSHI_DEFAULT_ACTION,
    storagePath: env.HOSHI_STORAGE_PATH,
    policyPath: env.HOSHI_POLICY_PATH,
    approvalPath: env.HOSHI_APPROVAL_PATH,
    transport: env.HOSHI_TRANSPORT,
    port: env.HOSHI_PORT ? parseInt(env.HOSHI_PORT) : undefined,
    host: env.HOSHI_HOST,
    logLevel: env.HOSHI_LOG_LEVEL
  })
}
