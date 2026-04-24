import { motion } from 'framer-motion'
import { Wallet, ShieldCheck, ArrowRightLeft, BarChart3 } from 'lucide-react'
import { SectionHeader } from '../components/SectionHeader'

const steps = [
  { icon: Wallet, title: 'Create wallets', description: 'Non-custodial wallets with keypair or hardware support. Label treasuries for your team and agents.' },
  { icon: ShieldCheck, title: 'Set policies', description: 'Limits, velocity, whitelists, and multi-sig. Validated on every instruction.' },
  { icon: ArrowRightLeft, title: 'Execute operations', description: 'Transfers, swaps, yield, invoicing — all gated by the same policy graph.' },
  { icon: BarChart3, title: 'Monitor & audit', description: 'Live activity, full trails, exportable reports and alerts when something drifts.' },
] as const

export default function HowItWorks() {
  return (
    <section id="how" className="py-24 md:py-32 relative">
      <div className="max-w-6xl mx-auto px-6">
        <SectionHeader
          kicker="How it works"
          title={
            <>
              Four steps to <span className="text-cta">autonomous finance</span>
            </>
          }
          description="A straight path from empty wallet to production-grade agent treasuries — no custody handoff, no one-off scripts."
        />

        <div className="relative grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div
            className="pointer-events-none absolute left-0 right-0 top-[2.5rem] hidden h-px bg-gradient-to-r from-transparent via-cta/20 to-transparent lg:block"
            aria-hidden
          />
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-30px' }}
              transition={{ duration: 0.45, delay: i * 0.06 }}
              className="relative"
            >
              <div className="h-full overflow-hidden rounded-lg border border-white/[0.08] bg-black/40 p-5 backdrop-blur-sm transition-colors hover:border-cta/25">
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-mono text-[9px] tracking-widest text-cta/90">0{i + 1}</span>
                  <div className="flex h-9 w-9 items-center justify-center rounded border border-white/[0.08] bg-white/[0.02] text-cta">
                    <step.icon className="h-4 w-4" />
                  </div>
                </div>
                <h3 className="mb-2 text-base font-semibold text-white">{step.title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
