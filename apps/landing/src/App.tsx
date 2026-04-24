import { useEffect, useState } from 'react'
import { motion, useScroll, useSpring } from 'framer-motion'
import Navigation from './components/Navigation'
import TerminalFaultyBackground from './components/TerminalFaultyBackground'
import Hero from './sections/Hero'
import Stats from './sections/Stats'
import Features from './sections/Features'
import TerminalDemo from './sections/TerminalDemo'
import PolicyBuilder from './sections/PolicyBuilder'
import SwapDemo from './sections/SwapDemo'
import HowItWorks from './sections/HowItWorks'
import CTA from './sections/CTA'
import Footer from './sections/Footer'

export default function App() {
  const [scrolled, setScrolled] = useState(false)
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 })

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="min-h-screen bg-black text-text relative">
      <TerminalFaultyBackground />
      <div className="noise-overlay z-[1]" />
      <motion.div className="scroll-progress" style={{ scaleX }} />

      <Navigation scrolled={scrolled} />

      <main className="relative z-10">
        <Hero />
        <div className="section-scrim">
          <Stats />
        </div>
        <div className="section-divider max-w-6xl mx-auto" />
        <div className="section-scrim">
          <Features />
        </div>
        <div className="section-divider max-w-6xl mx-auto" />
        <div className="section-scrim">
          <TerminalDemo />
        </div>
        <div className="section-divider max-w-6xl mx-auto" />
        <div className="section-scrim">
          <PolicyBuilder />
        </div>
        <div className="section-divider max-w-6xl mx-auto" />
        <div className="section-scrim">
          <SwapDemo />
        </div>
        <div className="section-divider max-w-6xl mx-auto" />
        <div className="section-scrim">
          <HowItWorks />
        </div>
        <div className="section-scrim">
          <CTA />
        </div>
      </main>

      <Footer />
    </div>
  )
}
