import { RotateCw } from "lucide-react"

import { Progress } from "@/components/ui/progress"

export function ThinkingOverlay({ steps, step }: { steps: string[]; step: number }) {
  return (
    <div className="absolute inset-0 z-10 grid place-items-center rounded-lg bg-background/75 backdrop-blur-[3px]">
      <div className="w-full max-w-sm px-6 text-center">
        <RotateCw
          className="mx-auto size-7 text-brand-1 motion-safe:animate-spin motion-safe:[animation-duration:1.4s]"
          aria-hidden
        />
        <p key={step} className="shimmer-text mt-3 min-h-10 text-sm font-medium text-balance">
          {steps[step]}
        </p>
        <Progress
          value={((step + 1) / steps.length) * 100}
          aria-label="Rotation progress"
          className="mt-3 h-1.5 [&>[data-slot=progress-indicator]]:bg-brand-gradient"
        />
        <p className="mt-2 text-xs text-muted-foreground tabular-nums">
          Step {step + 1} of {steps.length}
        </p>
      </div>
    </div>
  )
}
