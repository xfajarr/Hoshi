import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, ChevronRight } from 'lucide-react'
import { TerminalPanel } from '../components/TerminalPanel'

const typingCommands = [
  { cmd: 'hoshi wallet:create --pubkey 7nx... -l "Main Treasury"', delay: 800, output: '✓ Created wallet\n  ID: abc-123\n  Address: 7nx...' },
  { cmd: 'hoshi balance abc-123 -a USDC', delay: 3200, output: 'USDC: 45,200.00' },
  { cmd: 'hoshi policy:add abc-123 --type daily_limit --limit 500', delay: 5600, output: '✓ Added policy rule\n  ID: rule-789\n  Type: daily_limit' },
  { cmd: 'hoshi transfer:send abc-123 -t 1111... -a 100 --asset USDC', delay: 8200, output: '✓ Transfer sent\n  Signature: 5KtP...\n  Explorer: solana.fm/tx/5KtP...' },
]

function MiniTerminal() {
  const [lines, setLines] = useState<{ text: string; output?: string }[]>([])
  const [currentLine, setCurrentLine] = useState('')
  const [cursorVisible, setCursorVisible] = useState(true)

  useEffect(() => {
    const timeouts: ReturnType<typeof setTimeout>[] = []
    typingCommands.forEach(({ cmd, delay }) => {
      timeouts.push(
        setTimeout(() => {
          let charIndex = 0
          const typeInterval = setInterval(() => {
            if (charIndex <= cmd.length) {
              setCurrentLine(cmd.slice(0, charIndex))
              charIndex++
            } else {
              clearInterval(typeInterval)
              const cmdData = typingCommands.find((c) => c.cmd === cmd)
              setLines((prev) => [...prev, { text: cmd, output: cmdData?.output }])
              setCurrentLine('')
            }
          }, 25)
        }, delay)
      )
    })
    const cursorInterval = setInterval(() => setCursorVisible((v) => !v), 530)
    return () => {
      timeouts.forEach(clearTimeout)
      clearInterval(cursorInterval)
    }
  }, [])

  return (
    <div className="w-full max-w-2xl mx-auto mt-12 lg:mt-16">
      <TerminalPanel title="hoshi — zsh" tag="DEMO" bodyClassName="p-4 font-mono text-[12px] space-y-3 min-h-[220px] text-left">
          {lines.map((line, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25 }}
            >
              <div className="flex items-start gap-2">
                <span className="text-cta shrink-0 select-none">$</span>
                <span className="text-text-primary">{line.text}</span>
              </div>
              {line.output && (
                <motion.pre
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.15 }}
                  className="mt-2 text-text-secondary text-[10px] whitespace-pre-wrap pl-4 leading-relaxed"
                >
                  {line.output}
                </motion.pre>
              )}
            </motion.div>
          ))}
          <div className="flex items-start gap-2">
            <span className="text-cta shrink-0 select-none">$</span>
            <span className="text-text-primary">{currentLine}</span>
            <span className={`w-1.5 h-3.5 bg-cta ${cursorVisible ? 'opacity-100' : 'opacity-0'} transition-opacity`} />
          </div>
      </TerminalPanel>
    </div>
  )
}

export default function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center pt-32 pb-20 px-6 text-center">
      <div className="absolute top-0 left-0 right-0 h-1/2 pointer-events-none bg-gradient-to-b from-white/[0.04] to-transparent opacity-40" />

      <div className="relative z-10 max-w-3xl">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-[11px] md:text-xs font-medium tracking-[0.25em] text-cta/90 uppercase mb-4"
        >
          Solana · agents · treasury
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
          className="text-4xl sm:text-5xl md:text-6xl font-semibold text-white leading-[1.05] tracking-tight hero-dropshadow"
        >
          Your next financial stack.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          className="mt-5 text-base md:text-lg text-text-secondary leading-relaxed max-w-xl mx-auto"
        >
          Policy-gated wallets and swaps for the most demanding{' '}
          <span className="text-white font-medium">AI agents and teams</span> on Solana. Non-custodial.
          <span className="text-text-muted"> Programmable. Built for production.</span>
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
        >
          <a
            href="#cli"
            className="group inline-flex items-center gap-2 px-6 py-3 bg-cta text-black text-sm font-semibold rounded-md hover:bg-cta-bright transition-colors btn-lift"
          >
            Get started
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </a>
          <a
            href="https://github.com/hoshi-fi"
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-2 px-6 py-3 text-sm text-text-primary border border-white/[0.2] rounded-md hover:border-white/40 hover:bg-white/[0.04] transition-all"
          >
            <ChevronRight className="w-4 h-4" />
            View on GitHub
          </a>
        </motion.div>
      </div>

      <MiniTerminal />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="mt-12 flex flex-col items-center gap-2 text-text-muted"
      >
        <span className="text-[9px] uppercase tracking-[0.3em]">Scroll</span>
        <motion.div
          animate={{ y: [0, 5, 0] }}
          transition={{ duration: 1.4, repeat: Infinity }}
          className="w-px h-7 bg-gradient-to-b from-cta/50 to-transparent"
        />
      </motion.div>
    </section>
  )
}
