import type { ReactNode } from 'react'

type TerminalPanelProps = {
  title: string
  children: ReactNode
  /** tiny label top-right, terminal-style */
  tag?: string
  className?: string
  bodyClassName?: string
}

export function TerminalPanel({ title, children, tag, className = '', bodyClassName = '' }: TerminalPanelProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-lg border border-white/[0.1] bg-black/55 backdrop-blur-md ${className}`}
    >
      {tag && (
        <span className="absolute top-2.5 right-3 text-[9px] font-mono text-text-muted/80 tracking-widest z-10">
          {tag}
        </span>
      )}
      <div className="flex items-center gap-2.5 border-b border-white/[0.08] px-4 py-2.5">
        <div className="h-1.5 w-1.5 rounded-full bg-red-500/90" />
        <div className="h-1.5 w-1.5 rounded-full bg-amber-400/90" />
        <div className="h-1.5 w-1.5 rounded-full bg-cta/90" />
        <span className="ml-1 text-[10px] text-text-muted font-mono tracking-wider">{title}</span>
      </div>
      <div className={bodyClassName}>{children}</div>
    </div>
  )
}
