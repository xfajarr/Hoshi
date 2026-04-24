import { useEffect, useState } from 'react'

type Remaining = { d: number; h: number; m: number; s: number }

function getRemaining(target: number): Remaining {
  const now = Date.now()
  const diff = Math.max(0, target - now)
  const s = Math.floor(diff / 1000) % 60
  const m = Math.floor(diff / 60000) % 60
  const h = Math.floor(diff / 3600000) % 24
  const d = Math.floor(diff / 86400000)
  return { d, h, m, s }
}

/**
 * @param targetMs epoch ms; updates every second
 */
export function useCountdown(targetMs: number) {
  const [r, setR] = useState<Remaining>(() => getRemaining(targetMs))

  useEffect(() => {
    const id = setInterval(() => {
      setR(getRemaining(targetMs))
    }, 1000)
    return () => clearInterval(id)
  }, [targetMs])

  return r
}
