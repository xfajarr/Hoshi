import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, User, ArrowRight } from 'lucide-react'
import { useCountdown } from '../hooks/useCountdown'

const links = [
  { label: 'Product', href: '#features' },
  { label: 'CLI & MCP', href: '#cli' },
  { label: 'Policy', href: '#policy' },
  { label: 'Swap', href: '#swap' },
  { label: 'How it works', href: '#how' },
]

/** Demo milestone: adjust as needed. */
const COUNTDOWN_TO = new Date('2026-05-15T00:00:00Z').getTime()

function pad2(n: number) {
  return n.toString().padStart(2, '0')
}

export default function Navigation({ scrolled }: { scrolled: boolean }) {
  const [open, setOpen] = useState(false)
  const { d, h, m, s } = useCountdown(COUNTDOWN_TO)

  return (
    <motion.header
      initial={{ y: -32, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed top-0 left-0 right-0 z-50 ${
        scrolled
          ? 'bg-black/75 backdrop-blur-md border-b border-white/[0.07]'
          : 'bg-black/40 backdrop-blur-[2px] border-b border-white/[0.04]'
      }`}
    >
      <div
        className="hidden sm:flex max-w-7xl mx-auto px-4 md:px-6 h-9 items-center justify-between text-[10px] md:text-[11px] font-mono tracking-wide text-text-muted border-b border-white/[0.05]"
        aria-hidden
      >
        <div className="flex items-center gap-2">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cta opacity-30" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cta" />
          </span>
          <span className="text-cta/90">DEVNET</span>
          <span className="text-text-muted/80">·</span>
          <span>INTEGRATION WINDOW OPEN</span>
        </div>
        <div className="flex items-center gap-1 text-text-secondary">
          <span className="text-text-muted">RELEASE</span>
          <span className="tabular-nums text-text-primary/90">
            {d}d : {pad2(h)}h : {pad2(m)}m : {pad2(s)}s
          </span>
        </div>
        <div className="text-text-secondary">
          <span className="text-text-muted">MCP</span>{' '}
          <span className="text-text-primary/80">14+</span> <span className="text-text-muted">tools</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 h-14 md:h-16 flex items-center justify-between">
        <a href="#" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded border border-white/[0.12] bg-white/[0.04] flex items-center justify-center">
            <span className="text-white font-bold text-sm font-mono">H</span>
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-white">HOSHI</span>
        </a>

        <nav className="hidden lg:flex items-center gap-0.5">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="px-3 py-2 text-[13px] text-text-secondary hover:text-white transition-colors duration-200 rounded-md hover:bg-white/[0.04]"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <a
            href="https://github.com/hoshi-fi"
            target="_blank"
            rel="noopener"
            className="px-3 py-1.5 text-[13px] text-text-secondary hover:text-white transition-colors"
          >
            GitHub
          </a>
          <a
            href="https://github.com/hoshi-fi"
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] text-text-secondary border border-white/[0.12] rounded-md hover:border-white/25 hover:text-white transition-all"
          >
            <User className="w-3.5 h-3.5" />
            Sign in
          </a>
          <a
            href="#cli"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium bg-cta text-black rounded-md hover:bg-cta-bright transition-colors btn-lift"
          >
            Get started
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>

        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="md:hidden p-2 text-text-secondary hover:text-white transition-colors"
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-white/[0.06] overflow-hidden bg-black/90"
          >
            <div className="px-4 py-4 space-y-1">
              {links.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block px-3 py-2.5 text-sm text-text-secondary hover:text-white rounded-lg hover:bg-white/[0.04]"
                >
                  {link.label}
                </a>
              ))}
              <a
                href="#cli"
                onClick={() => setOpen(false)}
                className="block mt-2 px-4 py-3 text-sm font-medium text-center bg-cta text-black rounded-lg"
              >
                Get started
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
