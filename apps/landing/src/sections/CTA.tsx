import { motion } from 'framer-motion'
import { ArrowRight, Globe, BookOpen } from 'lucide-react'
import { TerminalPanel } from '../components/TerminalPanel'

export default function CTA() {
  return (
    <section className="py-24 md:py-32 relative">
      <div className="max-w-3xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <TerminalPanel title="next-step — cta" tag="SHIP" bodyClassName="px-5 py-8 md:px-8 md:py-10 text-center">
            <p className="text-[10px] font-mono tracking-[0.2em] text-cta/90 uppercase">Ready when you are</p>
            <h2 className="text-headline mt-3 mb-4 text-balance text-white hero-dropshadow">
              Ready to automate your
              <br />
              <span className="text-cta">on-chain operations?</span>
            </h2>
            <p className="mx-auto mb-8 max-w-md text-text-secondary text-sm leading-relaxed">
              Start with the CLI, wire the SDK, or deploy the MCP server. Same policies everywhere.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <a
                href="#cli"
                className="group inline-flex items-center gap-2 rounded-md bg-cta px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-cta-bright"
              >
                Start building
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </a>
              <a
                href="https://github.com/hoshi-fi"
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-2 rounded-md border border-white/[0.15] px-5 py-2.5 text-sm text-text-secondary transition hover:border-white/30 hover:text-white"
              >
                <Globe className="h-4 w-4" /> GitHub
              </a>
              <a
                href="#docs"
                className="inline-flex items-center gap-2 rounded-md border border-white/[0.15] px-5 py-2.5 text-sm text-text-secondary transition hover:border-white/30 hover:text-white"
              >
                <BookOpen className="h-4 w-4" /> Docs
              </a>
            </div>
          </TerminalPanel>
        </motion.div>
      </div>
    </section>
  )
}
