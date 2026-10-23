import { KeyRound } from "lucide-react"

import { cn } from "@/lib/utils"

export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-lg bg-logo-gradient text-white shadow-sm shadow-brand-2/30",
        className,
      )}
      aria-hidden
    >
      <KeyRound className="size-4.5 rotate-180" strokeWidth={2.25} />
    </span>
  )
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-semibold tracking-tight", className)}>
      Rot<span className="text-gradient">AI</span>te
    </span>
  )
}
