import { skillDefinition as walletManagement } from './wallet-management.js'
import { skillDefinition as transfer } from './transfer.js'
import { skillDefinition as swap } from './swap.js'
import { skillDefinition as yieldSkill } from './yield.js'
import { skillDefinition as invoicing } from './invoicing.js'
import { skillDefinition as policyManagement } from './policy-management.js'

export { walletManagement, transfer, swap, invoicing, policyManagement }

/** Yield / Kamino skill. Named `yieldSkill` because `yield` is reserved in strict mode. */
export { yieldSkill }

export const allSkills = [
  'wallet-management',
  'transfer',
  'swap',
  'yield',
  'invoicing',
  'policy-management'
] as const

export function getSkill(name: string) {
  switch (name) {
    case 'wallet-management':
      return walletManagement
    case 'transfer':
      return transfer
    case 'swap':
      return swap
    case 'yield':
      return yieldSkill
    case 'invoicing':
      return invoicing
    case 'policy-management':
      return policyManagement
    default:
      return null
  }
}
