import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowDown, RefreshCw, TrendingUp, Zap, ChevronDown } from 'lucide-react'
import { SectionHeader } from '../components/SectionHeader'
import { TerminalPanel } from '../components/TerminalPanel'

interface Quote {
  route: string
  output: string
  price: string
  impact: string
  fee: string
}

const mockQuotes: Quote[] = [
  { route: 'Jupiter Aggregator', output: '987.45', price: '1.002', impact: '0.12%', fee: '0.04%' },
  { route: 'Orca Whirlpool', output: '986.12', price: '1.003', impact: '0.18%', fee: '0.03%' },
  { route: 'Raydium CLMM', output: '985.78', price: '1.004', impact: '0.22%', fee: '0.05%' },
]

const tokens = [
  { symbol: 'USDC', name: 'USD Coin', balance: '45,200.00', color: 'bg-sky-500' },
  { symbol: 'SOL', name: 'Solana', balance: '1,240.50', color: 'bg-fuchsia-500' },
  { symbol: 'BONK', name: 'Bonk', balance: '5,000,000', color: 'bg-amber-500' },
  { symbol: 'JUP', name: 'Jupiter', balance: '2,340.00', color: 'bg-indigo-500' },
]

export default function SwapDemo() {
  const [fromToken, setFromToken] = useState(tokens[0])
  const [toToken, setToToken] = useState(tokens[1])
  const [amount, setAmount] = useState('1000')
  const [loading, setLoading] = useState(false)
  const [quotes, setQuotes] = useState<Quote[]>(mockQuotes)
  const [selectedQuote, setSelectedQuote] = useState(0)
  const [showFromSelect, setShowFromSelect] = useState(false)
  const [showToSelect, setShowToSelect] = useState(false)

  useEffect(() => {
    if (!amount || Number(amount) <= 0) {
      setQuotes([])
      return
    }
    setLoading(true)
    const timeout = setTimeout(() => {
      const factor = Number(amount) / 1000
      setQuotes(mockQuotes.map((q) => ({ ...q, output: (Number(q.output) * factor).toFixed(2) })))
      setLoading(false)
    }, 500)
    return () => clearTimeout(timeout)
  }, [amount, fromToken, toToken])

  const swapTokens = () => {
    const temp = fromToken
    setFromToken(toToken)
    setToToken(temp)
  }

  return (
    <section id="swap" className="py-24 md:py-32 relative">
      <div className="max-w-6xl mx-auto px-6">
        <SectionHeader
          kicker="Swaps"
          title={
            <>
              Best prices across <span className="text-cta">all Solana DEXs</span>
            </>
          }
          description="Jupiter routes through the deepest pools. Compare impact and fees, then execute in one place — all policy-validated before sign."
        />

        <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5 }}
          >
            <TerminalPanel title="hoshi-swap — preview" tag="DEX" bodyClassName="p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-medium text-white">Swap</span>
                <button
                  type="button"
                  onClick={() => {
                    setAmount('1000')
                    setQuotes(mockQuotes)
                  }}
                  className="rounded-md p-2 text-text-muted transition-colors hover:bg-white/[0.05] hover:text-white"
                  aria-label="Reset"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="space-y-2 rounded-md border border-white/[0.06] bg-white/[0.02] p-3">
                <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-text-muted">
                  <span>From</span>
                  <span>Bal {fromToken.balance}</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-2xl font-semibold text-white focus:outline-none"
                    placeholder="0.00"
                  />
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setShowFromSelect(!showFromSelect)
                        setShowToSelect(false)
                      }}
                      className="flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 text-sm transition hover:bg-white/[0.08]"
                    >
                      <div className={`h-4 w-4 rounded-full ${fromToken.color}`} />
                      <span className="font-medium">{fromToken.symbol}</span>
                      <ChevronDown className="h-3.5 w-3.5 text-text-muted" />
                    </button>
                    <AnimatePresence>
                      {showFromSelect && (
                        <motion.div
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 4 }}
                          className="absolute right-0 top-full z-20 mt-1.5 w-44 overflow-hidden rounded-md border border-white/[0.1] bg-black/95 shadow-xl"
                        >
                          {tokens.map((t) => (
                            <button
                              type="button"
                              key={t.symbol}
                              onClick={() => {
                                setFromToken(t)
                                setShowFromSelect(false)
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-white/[0.06]"
                            >
                              <div className={`h-4 w-4 rounded-full ${t.color}`} />
                              {t.symbol}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              <div className="-my-1.5 flex justify-center">
                <button
                  type="button"
                  onClick={swapTokens}
                  className="z-10 flex h-8 w-8 items-center justify-center rounded-md border border-white/[0.1] bg-black/80 text-text-secondary shadow-md transition hover:scale-105 hover:border-cta/40 hover:text-cta"
                  aria-label="Swap direction"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="space-y-2 rounded-md border border-white/[0.06] bg-white/[0.02] p-3">
                <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-text-muted">
                  <span>To (est.)</span>
                  <span>Bal {toToken.balance}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1 text-2xl font-semibold text-text-secondary">
                    {loading ? (
                      <span className="inline-flex items-center gap-2 text-sm text-text-muted">
                        <RefreshCw className="h-4 w-4 animate-spin" /> Fetching…
                      </span>
                    ) : quotes.length > 0 ? (
                      quotes[selectedQuote].output
                    ) : (
                      '0.00'
                    )}
                  </div>
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setShowToSelect(!showToSelect)
                        setShowFromSelect(false)
                      }}
                      className="flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 text-sm transition hover:bg-white/[0.08]"
                    >
                      <div className={`h-4 w-4 rounded-full ${toToken.color}`} />
                      <span className="font-medium">{toToken.symbol}</span>
                      <ChevronDown className="h-3.5 w-3.5 text-text-muted" />
                    </button>
                    <AnimatePresence>
                      {showToSelect && (
                        <motion.div
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 4 }}
                          className="absolute right-0 top-full z-20 mt-1.5 w-44 overflow-hidden rounded-md border border-white/[0.1] bg-black/95 shadow-xl"
                        >
                          {tokens.map((t) => (
                            <button
                              type="button"
                              key={t.symbol}
                              onClick={() => {
                                setToToken(t)
                                setShowToSelect(false)
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-white/[0.06]"
                            >
                              <div className={`h-4 w-4 rounded-full ${t.color}`} />
                              {t.symbol}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {quotes.length > 0 && !loading && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-3 space-y-1.5 border-t border-white/[0.08] pt-3"
                  >
                    {(
                      [
                        { label: 'Rate', value: `1 ${fromToken.symbol} ≈ ${quotes[selectedQuote].price} ${toToken.symbol}` },
                        { label: 'Price impact', value: quotes[selectedQuote].impact, className: 'text-cta' },
                        { label: 'Network fee', value: quotes[selectedQuote].fee },
                      ] as { label: string; value: string; className?: string }[]
                    ).map((row) => (
                      <div key={row.label} className="flex items-center justify-between text-[11px]">
                        <span className="text-text-muted">{row.label}</span>
                        <span className={row.className ?? 'text-text-secondary'}>{row.value}</span>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="button"
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-cta py-2.5 text-sm font-semibold text-black transition hover:bg-cta-bright"
              >
                <Zap className="h-4 w-4" /> Execute swap
              </button>
            </TerminalPanel>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="space-y-3"
          >
            <div className="mb-1 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-cta" />
              <h3 className="text-sm font-semibold text-white">Route comparison</h3>
            </div>

            {quotes.length === 0 ? (
              <div className="rounded-lg border border-dashed border-white/[0.1] bg-black/30 p-8 text-center text-sm text-text-muted">
                Enter an amount to load quotes
              </div>
            ) : (
              quotes.map((quote, i) => (
                <motion.button
                  type="button"
                  key={quote.route}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => setSelectedQuote(i)}
                  className={`w-full rounded-lg border p-3.5 text-left transition-all ${
                    selectedQuote === i
                      ? 'border-cta/40 bg-cta/5'
                      : 'border-white/[0.08] bg-black/30 hover:border-white/[0.14]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-white">{quote.route}</div>
                      <div className="mt-0.5 text-[10px] text-text-muted">
                        Impact {quote.impact} · Fee {quote.fee}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-semibold text-white">
                        {quote.output}{' '}
                        <span className="text-xs font-normal text-text-muted">{toToken.symbol}</span>
                      </div>
                      {i === 0 && <span className="text-[9px] font-medium text-cta">Best price</span>}
                    </div>
                  </div>
                </motion.button>
              ))
            )}

            <div className="rounded-lg border border-white/[0.08] bg-black/40 p-4 text-xs leading-relaxed text-text-secondary">
              <span className="font-medium text-cta">Jupiter</span> aggregates Orca, Raydium, Phoenix, and more.
              Hoshi enforces your policies before a route can execute.
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
