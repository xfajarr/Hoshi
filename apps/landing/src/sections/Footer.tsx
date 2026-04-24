import { Globe, MessageCircle } from 'lucide-react'

const links = {
  Product: [
    { label: 'Features', href: '#features' },
    { label: 'CLI', href: '#cli' },
    { label: 'Policy', href: '#policy' },
    { label: 'Swap', href: '#swap' },
  ],
  Build: [
    { label: 'How it works', href: '#how' },
    { label: 'Documentation', href: 'https://github.com/hoshi-fi' },
    { label: 'GitHub', href: 'https://github.com/hoshi-fi' },
  ],
  Company: [
    { label: 'Status', href: 'https://github.com/hoshi-fi' },
    { label: 'Contact', href: 'https://github.com/hoshi-fi' },
  ],
  Legal: [
    { label: 'Privacy', href: '#' },
    { label: 'Terms', href: '#' },
  ],
}

export default function Footer() {
  return (
    <footer className="border-t border-white/[0.08] py-16 bg-black relative z-10">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-5 gap-12 md:gap-8">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded border border-white/[0.12] bg-white/[0.04] flex items-center justify-center">
                <span className="text-white font-bold text-sm font-mono">H</span>
              </div>
              <span className="text-sm font-semibold tracking-tight">HOSHI</span>
            </div>
            <p className="text-sm text-text-secondary mb-5 max-w-xs leading-relaxed">
              The financial operating system for AI agents on Solana.
            </p>
            <div className="flex items-center gap-2">
              <a
                href="https://github.com/hoshi-fi"
                target="_blank"
                rel="noopener"
                className="w-9 h-9 rounded-md border border-white/[0.08] flex items-center justify-center text-text-muted hover:text-white hover:border-white/20 transition-colors"
                aria-label="GitHub"
              >
                <Globe className="w-4 h-4" />
              </a>
              <a
                href="https://twitter.com/hoshifi"
                target="_blank"
                rel="noopener"
                className="w-9 h-9 rounded-md border border-white/[0.08] flex items-center justify-center text-text-muted hover:text-white hover:border-white/20 transition-colors"
                aria-label="Community"
              >
                <MessageCircle className="w-4 h-4" />
              </a>
            </div>
          </div>

          {Object.entries(links).map(([category, items]) => (
            <div key={category}>
              <h4 className="text-[11px] font-semibold text-text-primary mb-4 uppercase tracking-[0.12em]">
                {category}
              </h4>
              <ul className="space-y-2.5">
                {items.map((item) => (
                  <li key={item.label}>
                    <a
                      href={item.href}
                      className="text-sm text-text-muted hover:text-text-primary transition-colors"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 pt-8 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-text-muted">© 2026 Hoshi. All rights reserved.</p>
          <p className="text-[11px] text-text-muted">Solana · Open source</p>
        </div>
      </div>
    </footer>
  )
}
