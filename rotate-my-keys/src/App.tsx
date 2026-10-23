import { useCallback, useEffect, useRef, useState } from "react"

import { Faq } from "@/components/faq"
import { Hero } from "@/components/hero"
import { Honeypot } from "@/components/honeypot"
import { HowItWorks } from "@/components/how-it-works"
import { KeyRotator } from "@/components/key-rotator"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { TrustedBy } from "@/components/trusted-by"
import { flipText } from "@/lib/flip"
import { SITE_TITLE } from "@/lib/site"

export default function App() {
  const [pageRotation, setPageRotation] = useState(0)
  const [origin, setOrigin] = useState("50% 50%")
  const rotationRef = useRef(0)

  // "Everything" mode turns the whole page around the middle of whatever
  // is on screen, so the part you're looking at flips in place.
  const rotatePage = useCallback((degrees: number) => {
    if (rotationRef.current === 0 && degrees !== 0) {
      setOrigin(`50% ${Math.round(window.scrollY + window.innerHeight / 2)}px`)
    }
    rotationRef.current = degrees
    setPageRotation(degrees)
  }, [])

  useEffect(() => {
    const upsideDown = ((pageRotation % 360) + 360) % 360 === 180
    document.title = upsideDown ? flipText(SITE_TITLE) : SITE_TITLE
  }, [pageRotation])

  return (
    <div className="overflow-clip">
      <div
        id="top"
        className="relative transition-transform duration-1400 ease-[cubic-bezier(0.65,-0.25,0.25,1.25)] motion-reduce:transition-none"
        style={{ transform: `rotate(${pageRotation}deg)`, transformOrigin: origin }}
      >
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[44rem] bg-glow" />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[44rem] bg-grid" />
        <div className="relative">
          <SiteHeader />
          <main>
            <Hero />
            <div className="mx-auto max-w-3xl px-4 sm:px-6">
              <KeyRotator onPageRotate={rotatePage} />
            </div>
            <TrustedBy />
            <HowItWorks />
            <Honeypot />
            <Faq />
          </main>
          <SiteFooter />
        </div>
      </div>
    </div>
  )
}
