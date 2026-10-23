import { ArrowRight, Code, MonitorSmartphone, Sparkles, WifiOff } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"

const PROMISES: Array<{ icon: LucideIcon; label: string }> = [
  { icon: MonitorSmartphone, label: "Runs 100% in your browser" },
  { icon: WifiOff, label: "Can't phone home" },
  { icon: Code, label: "Open source" },
]

export function Hero() {
  return (
    <section className="mx-auto max-w-3xl px-4 pt-10 pb-10 text-center sm:px-6 sm:pt-16">
      <Badge variant="outline" className="h-7 gap-1.5 rounded-full bg-background/60 px-3 text-xs backdrop-blur">
        <Sparkles className="text-brand-2" aria-hidden />
        New: Agentic Rotation™
      </Badge>
      <h1 className="mt-6 text-[2.6rem] leading-[1.05] font-semibold tracking-tight text-balance sm:text-6xl">
        AI-powered key{" "}
        <span className="flip-in inline-block pb-1 text-gradient" title="It's rotated.">
          rotation
        </span>
      </h1>
      <p className="mx-auto mt-6 max-w-xl text-lg text-pretty text-muted-foreground">
        Paste all your API keys below. Our Large Rotation Model™ rotates every single one of them by
        exactly 180°. Zero config. Zero downtime. Zero reasons to paste real keys.
      </p>
      <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
        {PROMISES.map(({ icon: Icon, label }) => (
          <li key={label} className="flex items-center gap-1.5">
            <Icon className="size-4 text-success" aria-hidden />
            {label}
          </li>
        ))}
        <li>
          <a
            href="#honeypot"
            className="group inline-flex items-center gap-1 font-medium text-foreground underline-offset-4 hover:underline"
          >
            Is this a honeypot?
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </a>
        </li>
      </ul>
    </section>
  )
}
