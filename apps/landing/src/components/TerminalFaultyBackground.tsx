import { useEffect, useRef } from 'react'

/** Dense monospace charset — terminal / matrix feel (inspired by React Bits "Faulty Terminal"). */
const CHARS =
  '·░▒▓█@#$%&*+=-_|\\/<>[]{}0x0o1?;:^~`0123456789abcdefABCDEF'
const fontSize = 10
const charW = fontSize * 0.6

/**
 * Full-viewport canvas: scrolling ASCII field + occasional RGB glitch bars.
 * Low opacity by design so foreground copy stays legible.
 */
export default function TerminalFaultyBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) return

    let raf = 0
    let t = 0
    const glitches: { y: number; h: number; life: number }[] = []

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = window.innerWidth
      const h = window.innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    resize()
    const onResize = () => resize()
    window.addEventListener('resize', onResize)

    const tick = () => {
      t += 0.016
      const w = window.innerWidth
      const h = window.innerHeight

      ctx.fillStyle = '#000000'
      ctx.fillRect(0, 0, w, h)
      ctx.font = `${fontSize}px JetBrains Mono, ui-monospace, monospace`
      ctx.textBaseline = 'top'

      const cols = Math.ceil(w / charW) + 2
      const lineHeight = fontSize * 1.15
      const rows = Math.ceil(h / lineHeight) + 2
      const scroll = (t * 12) % lineHeight
      const frame = Math.floor(t * 8)

      for (let row = 0; row < rows; row++) {
        const y = row * lineHeight - scroll
        for (let col = 0; col < cols; col++) {
          const x = col * charW
          const n =
            Math.sin(col * 0.11 + row * 0.13 + t * 1.2) * Math.cos(col * 0.08 - t * 0.9 + row * 0.05) +
            Math.sin(row * 0.2 + t * 0.4) * 0.3
          if (n < 0.15) continue
          const idx = Math.abs(
            (col * 17 + row * 23 + frame * 3 + Math.floor(t * 3)) % CHARS.length
          )
          const ch = CHARS[idx]!
          const flicker = 0.06 + 0.14 * (0.5 + 0.5 * Math.sin(t * 14 + col * 0.4 + row * 0.2))
          const m = 0.45 + 0.55 * n
          const g = 160 + 80 * m
          ctx.fillStyle = `rgba(0, ${Math.min(255, g + 20)}, ${Math.min(255, g - 20)}, ${flicker})`
          ctx.fillText(ch, x, y)
        }
      }

      // Sporadic horizontal fault lines (chromatic-style)
      if (Math.random() < 0.18) {
        const gy = Math.random() * h
        const gh = 1 + Math.random() * 5
        glitches.push({ y: gy, h: gh, life: 4 + Math.random() * 10 })
      }
      for (let i = glitches.length - 1; i >= 0; i--) {
        const gl = glitches[i]!
        ctx.save()
        ctx.globalCompositeOperation = 'screen'
        ctx.fillStyle = `rgba(0, 255, 220, ${0.04 + gl.life * 0.01})`
        ctx.fillRect(0, gl.y, w, gl.h)
        ctx.fillStyle = `rgba(255, 0, 200, ${0.02 + gl.life * 0.005})`
        ctx.fillRect((Math.random() - 0.5) * 6, gl.y, w, gl.h)
        ctx.restore()
        gl.life--
        if (gl.life <= 0) glitches.splice(i, 1)
      }

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0"
      aria-hidden
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
      />
      <div
        className="absolute inset-0 opacity-50"
        style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.18) 2px, rgba(0,0,0,0.18) 3px)',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 90% 70% at 50% 20%, transparent 0%, rgba(0,0,0,0.45) 100%)',
        }}
      />
    </div>
  )
}
