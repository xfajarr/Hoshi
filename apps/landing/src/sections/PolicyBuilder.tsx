import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, Plus, Trash2, Check, Activity } from 'lucide-react'
import { SectionHeader } from '../components/SectionHeader'
import { TerminalPanel } from '../components/TerminalPanel'

type PolicyType = 'daily_limit' | 'velocity' | 'whitelist' | 'multi_sig'

interface Policy {
  id: string
  type: PolicyType
  name: string
  params: Record<string, string>
  active: boolean
}

const policyTypes = [
  { value: 'daily_limit' as PolicyType, label: 'Daily Limit', desc: 'Max spend per day', params: ['limit'], placeholder: '5000' },
  { value: 'velocity' as PolicyType, label: 'Velocity', desc: 'Tx per hour limit', params: ['maxTx'], placeholder: '10' },
  { value: 'whitelist' as PolicyType, label: 'Whitelist', desc: 'Approved addresses only', params: ['addresses'], placeholder: '7nx..., 9kp...' },
  { value: 'multi_sig' as PolicyType, label: 'Multi-Sig', desc: 'Require N signatures', params: ['threshold'], placeholder: '2' },
]

export default function PolicyBuilder() {
  const [policies, setPolicies] = useState<Policy[]>([
    { id: '1', type: 'daily_limit', name: 'Daily Cap', params: { limit: '5000' }, active: true },
    { id: '2', type: 'velocity', name: 'Rate Limit', params: { maxTx: '10' }, active: true },
  ])
  const [showAdd, setShowAdd] = useState(false)
  const [newType, setNewType] = useState<PolicyType>('daily_limit')
  const [newParams, setNewParams] = useState<Record<string, string>>({ limit: '' })

  const addPolicy = () => {
    const typeDef = policyTypes.find((t) => t.value === newType)!
    const defaults: Record<string, string> = {}
    typeDef.params.forEach((p) => (defaults[p] = newParams[p] || ''))
    setPolicies([...policies, { id: Math.random().toString(36).slice(2), type: newType, name: typeDef.label, params: defaults, active: true }])
    setShowAdd(false)
    setNewParams({})
  }

  return (
    <section id="policy" className="py-24 md:py-32 relative">
      <div className="max-w-6xl mx-auto px-6">
        <SectionHeader
          kicker="Policy engine"
          title={
            <>
              Programmable guardrails for <span className="text-cta">autonomous finance</span>
            </>
          }
          description="Build sophisticated spending rules without writing custom programs. The engine validates every transaction before execution."
        />

        <div className="grid gap-6 lg:grid-cols-5">
          <div className="space-y-3 lg:col-span-3">
            <AnimatePresence mode="popLayout">
              {policies.map((policy, index) => (
                <motion.div
                  key={policy.id}
                  layout
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.25 }}
                  className={`group relative overflow-hidden rounded-lg border p-4 transition-all duration-300 ${
                    policy.active
                      ? 'border-white/[0.1] bg-black/45 backdrop-blur-sm hover:border-white/[0.14]'
                      : 'border-white/[0.05] bg-black/25 opacity-60'
                  }`}
                >
                  <span className="absolute right-3 top-3 font-mono text-[9px] text-text-muted/80">
                    RULE_0{index + 1}
                  </span>
                  <div className="flex items-start justify-between gap-4 pr-10">
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded border ${
                          policy.active ? 'border-cta/25 bg-cta/5 text-cta' : 'border-white/[0.06] text-text-muted'
                        }`}
                      >
                        <Shield className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold text-white">{policy.name}</h3>
                          {policy.active && (
                            <span className="rounded border border-cta/20 bg-cta/10 px-1.5 py-0.5 text-[8px] font-medium uppercase tracking-wider text-cta">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {Object.entries(policy.params).map(([key, value]) => (
                            <span
                              key={key}
                              className="rounded border border-white/[0.08] bg-white/[0.02] px-2 py-0.5 font-mono text-[10px] text-text-secondary"
                            >
                              {key}: <span className="text-text-primary">{value}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPolicies(policies.map((p) => (p.id === policy.id ? { ...p, active: !p.active } : p)))}
                        className={`relative h-5 w-9 rounded-full transition-colors duration-300 ${
                          policy.active ? 'bg-cta' : 'bg-white/[0.1]'
                        }`}
                      >
                        <motion.div
                          animate={{ x: policy.active ? 16 : 2 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                          className="absolute top-[2px] h-4 w-4 rounded-full bg-white shadow-sm"
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPolicies(policies.filter((p) => p.id !== policy.id))}
                        className="rounded p-2 text-text-muted opacity-0 transition-all hover:text-red-400 group-hover:opacity-100"
                        aria-label="Remove policy"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {!showAdd && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                type="button"
                onClick={() => setShowAdd(true)}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-white/[0.12] py-3.5 text-sm text-text-muted transition-all hover:border-cta/40 hover:bg-cta/5 hover:text-cta"
              >
                <Plus className="h-4 w-4" />
                Add policy rule
              </motion.button>
            )}
          </div>

          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {showAdd ? (
                <motion.div
                  key="form"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                >
                  <TerminalPanel title="new-rule — form" tag="EDIT" bodyClassName="p-5">
                    <h3 className="mb-4 text-sm font-semibold text-white">New policy rule</h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-2">
                        {policyTypes.map((type) => (
                          <button
                            type="button"
                            key={type.value}
                            onClick={() => {
                              setNewType(type.value)
                              setNewParams({})
                            }}
                            className={`rounded-md border p-2.5 text-left transition-all ${
                              newType === type.value
                                ? 'border-cta/40 bg-cta/10'
                                : 'border-white/[0.08] hover:border-white/[0.12]'
                            }`}
                          >
                            <div className="text-xs font-medium text-white">{type.label}</div>
                            <div className="mt-0.5 text-[10px] text-text-muted">{type.desc}</div>
                          </button>
                        ))}
                      </div>
                      <div className="space-y-2">
                        {policyTypes
                          .find((t) => t.value === newType)
                          ?.params.map((param) => (
                            <input
                              key={param}
                              type="text"
                              placeholder={policyTypes.find((t) => t.value === newType)?.placeholder}
                              value={newParams[param] || ''}
                              onChange={(e) => setNewParams({ ...newParams, [param]: e.target.value })}
                              className="w-full rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-text-muted focus:border-cta/40 focus:outline-none"
                            />
                          ))}
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={addPolicy}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-cta px-4 py-2.5 text-xs font-semibold text-black transition-colors hover:bg-cta-bright"
                        >
                          <Check className="h-3.5 w-3.5" /> Add rule
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowAdd(false)}
                          className="rounded-md border border-white/[0.1] px-4 py-2.5 text-xs text-text-secondary hover:bg-white/[0.04]"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </TerminalPanel>
                </motion.div>
              ) : (
                <motion.div
                  key="info"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <TerminalPanel title="validation — flow" tag="READ" bodyClassName="p-5 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded border border-cta/25 bg-cta/5">
                        <Activity className="h-4 w-4 text-cta" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-white">How validation runs</h3>
                        <p className="text-[11px] text-text-muted">Before any spend hits the chain</p>
                      </div>
                    </div>
                    <ol className="space-y-3 border-l border-cta/20 pl-3">
                      {[
                        { step: '01', text: 'Transaction created by agent or user' },
                        { step: '02', text: 'Policy engine evaluates active rules' },
                        { step: '03', text: 'All pass → sign and submit' },
                        { step: '04', text: 'Any fail → reject with reason' },
                      ].map((item) => (
                        <li key={item.step} className="ml-0.5 pl-2">
                          <span className="font-mono text-[10px] text-cta">{item.step}</span>
                          <p className="text-xs text-text-secondary leading-snug">{item.text}</p>
                        </li>
                      ))}
                    </ol>
                  </TerminalPanel>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  )
}
