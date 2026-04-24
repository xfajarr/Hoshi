import { motion } from 'framer-motion'
import { Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { SectionHeader } from '../components/SectionHeader'
import { TerminalPanel } from '../components/TerminalPanel'

const commands = [
  { cmd: 'npm install -g @hoshi/cli', desc: 'Install the Hoshi CLI' },
  { cmd: 'hoshi wallet:create --label "Main Treasury"', desc: 'Create a non-custodial wallet' },
  { cmd: 'hoshi balance --wallet main-treasury', desc: 'Check real-time balances' },
  { cmd: 'hoshi policy:add --type daily_limit --limit 1000', desc: 'Add a spending policy' },
  { cmd: 'hoshi transfer:send --to 7nx... --amount 50 --asset USDC', desc: 'Send with policy validation' },
]

const bullets = [
  'Dry-run mode for safe testing',
  'Structured JSON for agent parsing',
  'Integrated policy validation',
  'Auto-completion & help generation',
]

export default function TerminalDemo() {
  const [copied, setCopied] = useState<number | null>(null)

  const copyCmd = (cmd: string, idx: number) => {
    navigator.clipboard.writeText(cmd)
    setCopied(idx)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <section id="cli" className="py-24 md:py-32 relative">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid items-start gap-14 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionHeader
              kicker="Developer experience"
              title={
                <>
                  Command-line power, <span className="text-cta">agent-friendly</span> design
                </>
              }
              description="Built for both human developers and AI agents. Every command returns structured JSON, supports dry-run mode, and integrates with the policy engine."
            />
            <ul className="mt-8 space-y-3 border-l-2 border-cta/30 pl-5">
              {bullets.map((item) => (
                <li
                  key={item}
                  className="text-sm text-text-secondary"
                >
                  <span className="text-cta/90 font-mono text-[10px] mr-2">—</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          >
            <TerminalPanel title="quick-start — zsh" tag="CLI" bodyClassName="p-3">
              <div className="space-y-2">
                {commands.map((c, i) => (
                  <motion.div
                    key={c.cmd}
                    initial={{ opacity: 0, y: 8 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <button
                      type="button"
                      onClick={() => copyCmd(c.cmd, i)}
                      className="group flex w-full items-center justify-between gap-3 rounded-md border border-transparent bg-white/[0.02] p-3 text-left transition-all hover:border-white/[0.08] hover:bg-white/[0.04]"
                    >
                      <div className="min-w-0 flex-1">
                        <code className="block truncate text-[11px] font-mono text-cta/95">{c.cmd}</code>
                        <span className="mt-1 block text-[10px] text-text-muted">{c.desc}</span>
                      </div>
                      <div className="shrink-0 rounded p-1.5 text-text-muted transition-colors group-hover:text-white">
                        {copied === i ? (
                          <Check className="h-3.5 w-3.5 text-cta" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </div>
                    </button>
                  </motion.div>
                ))}
              </div>
            </TerminalPanel>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
