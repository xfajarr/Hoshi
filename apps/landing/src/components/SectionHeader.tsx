import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

type SectionHeaderProps = {
  kicker: string
  title: ReactNode
  description?: ReactNode
  className?: string
  maxWidthClass?: string
  align?: 'left' | 'center'
}

export function SectionHeader({
  kicker,
  title,
  description,
  className = '',
  maxWidthClass = 'max-w-2xl',
  align = 'left',
}: SectionHeaderProps) {
  const alignText = align === 'center' ? 'text-center mx-auto' : ''
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`mb-14 md:mb-16 ${alignText} ${className}`}
    >
      <p className="text-[11px] font-medium tracking-[0.22em] text-cta/90 uppercase">{kicker}</p>
      <h2 className={`text-headline mt-4 mb-4 text-white hero-dropshadow ${maxWidthClass} ${align === 'center' ? 'mx-auto' : ''}`}>
        {title}
      </h2>
      {description && (
        <div className={`text-base text-text-secondary leading-relaxed ${maxWidthClass} ${align === 'center' ? 'mx-auto' : ''}`}>
          {description}
        </div>
      )}
    </motion.div>
  )
}
