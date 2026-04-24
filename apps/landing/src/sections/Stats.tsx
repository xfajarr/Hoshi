import { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import { SectionHeader } from '../components/SectionHeader'

const stats = [
  { label: 'MCP tools', value: 14, suffix: '+' },
  { label: 'Policy types', value: 4, suffix: '' },
  { label: 'Test suites', value: 71, suffix: '' },
]

function AnimatedCounter({ value, suffix }: { value: number; suffix: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true })

  useEffect(() => {
    if (!isInView) return
    const startTime = performance.now()
    const duration = 1500
    const update = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(eased * value))
      if (progress < 1) requestAnimationFrame(update)
    }
    requestAnimationFrame(update)
  }, [isInView, value])

  return (
    <span ref={ref} className="tabular-nums">
      {count}
      {suffix}
    </span>
  )
}

export default function Stats() {
  return (
    <section className="py-20 md:py-28 relative" aria-label="Hoshi in numbers">
      <div className="max-w-5xl mx-auto px-6">
        <SectionHeader
          align="center"
          kicker="Built for the arena"
          title="Hoshi in numbers"
          description="Compact stack, high coverage. Built so agents and teams can ship with confidence on Solana."
        />
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-3 sm:gap-4 sm:divide-x sm:divide-white/[0.08]">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: i * 0.08 }}
              className="text-center"
            >
              <div className="text-3xl sm:text-4xl md:text-5xl font-semibold text-white font-mono tracking-tight">
                <AnimatedCounter value={stat.value} suffix={stat.suffix} />
              </div>
              <div className="text-[11px] text-text-muted mt-2 md:mt-3 uppercase tracking-[0.15em]">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
