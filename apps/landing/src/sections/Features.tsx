import { motion } from 'framer-motion'
import { Shield, Wallet, Zap, Lock, ArrowRightLeft, FileText } from 'lucide-react'
import { SectionHeader } from '../components/SectionHeader'

const features = [
  {
    icon: Shield,
    title: 'Policy Engine',
    description: 'Spending rules with daily limits, velocity checks, and multi-sig approvals. Every transaction validated before execution.',
    tag: 'F01',
    span: 'lg:col-span-2',
  },
  {
    icon: Wallet,
    title: 'Non-Custodial',
    description: 'Your keys, your crypto. Direct Solana integration with keypair and hardware wallet support.',
    tag: 'F02',
    span: '',
  },
  {
    icon: Zap,
    title: 'Real-Time Swaps',
    description: 'Best rates across all Solana DEXs via Jupiter aggregator.',
    tag: 'F03',
    span: '',
  },
  {
    icon: Lock,
    title: 'Treasury Security',
    description: 'Multi-layered security with transaction simulation, policy validation, and emergency pause mechanisms.',
    tag: 'F04',
    span: 'lg:col-span-2',
  },
  {
    icon: ArrowRightLeft,
    title: 'Cross-Chain',
    description: 'Move assets between Solana, Ethereum, and Base via Wormhole and deBridge.',
    tag: 'F05',
    span: '',
  },
  {
    icon: FileText,
    title: 'Invoice & Payroll',
    description: 'On-chain invoices, recurring payments, and automatic USDC settlement.',
    tag: 'F06',
    span: '',
  },
] as const

export default function Features() {
  return (
    <section id="features" className="py-24 md:py-32 relative">
      <div className="max-w-6xl mx-auto px-6">
        <SectionHeader
          kicker="Infrastructure"
          title="Everything you need to operate on-chain"
          description={
            <>
              A complete financial stack for autonomous agents and teams. From wallet management to cross-chain
              swaps — all <span className="text-text-primary font-medium">policy-gated</span> and non-custodial.
            </>
          }
        />

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {features.map((feature, i) => (
            <motion.article
              key={feature.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.45, delay: i * 0.05 }}
              className={`group relative overflow-hidden rounded-lg border border-white/[0.08] bg-black/40 p-5 backdrop-blur-sm transition-all duration-300 hover:border-cta/35 hover:bg-black/55 ${feature.span}`}
            >
              <span className="absolute right-3 top-3 font-mono text-[9px] text-text-muted/70 tracking-widest">
                {feature.tag}
              </span>
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded border border-cta/20 bg-cta/5 text-cta transition-transform duration-300 group-hover:scale-105 group-hover:border-cta/40">
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="text-title mb-2 text-white pr-10">{feature.title}</h3>
              <p className="text-sm text-text-secondary leading-relaxed">{feature.description}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  )
}
