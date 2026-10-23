import { useEffect, useState } from "react"

import { Badge } from "@/components/ui/badge"
import type { Mode } from "@/lib/copy"
import type { PreparedLine } from "@/lib/secrets"

const SPRING = "ease-[cubic-bezier(0.34,1.56,0.64,1)]"

interface RotatedViewProps {
  lines: PreparedLine[]
  hidden: number
  mode: Mode
  rotation: number
  reducedMotion: boolean
}

/** The keys, physically rotated. Mounts at 0° and then turns to `rotation`. */
export function RotatedView({ lines, hidden, mode, rotation, reducedMotion }: RotatedViewProps) {
  const [applied, setApplied] = useState(0)

  useEffect(() => {
    // Wait for the 0° state to paint so the transition has somewhere to start.
    let inner = 0
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setApplied(rotation))
    })
    return () => {
      cancelAnimationFrame(outer)
      cancelAnimationFrame(inner)
    }
  }, [rotation])

  // In "everything" mode the whole page turns instead.
  const angle = mode === "page" ? 0 : applied
  const delay = (ms: number) => (reducedMotion ? undefined : `${ms}ms`)

  return (
    <div
      data-testid="rotated-view"
      className="min-h-44 overflow-hidden rounded-lg border border-input bg-muted/40 px-3 py-2.5 font-mono text-[0.9rem] leading-relaxed dark:bg-input/20"
    >
      <ol className="space-y-1">
        {lines.map((line, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="w-5 shrink-0 pt-px text-right text-xs leading-6 text-muted-foreground tabular-nums" aria-hidden>
              {i + 1}
            </span>
            <span className="sr-only">{line.text}</span>
            {mode === "letters" ? (
              <span aria-hidden className="min-w-0 break-all">
                {Array.from(line.text).map((ch, j, chars) => (
                  <span
                    key={j}
                    className={`inline-block transition-transform duration-500 motion-reduce:transition-none ${SPRING}`}
                    style={{
                      transform: `rotate(${angle}deg)`,
                      transitionDelay: delay(Math.min(i, 10) * 60 + j * Math.min(18, 600 / chars.length)),
                    }}
                  >
                    {ch === " " ? " " : ch}
                  </span>
                ))}
              </span>
            ) : (
              <span
                aria-hidden
                className={`inline-block min-w-0 break-all transition-transform duration-900 motion-reduce:transition-none ${SPRING}`}
                style={{ transform: `rotate(${angle}deg)`, transitionDelay: delay(Math.min(i, 12) * 110) }}
              >
                {line.text}
              </span>
            )}
            {line.redacted && (
              <Badge variant="destructive" className="mt-0.5 ml-auto shrink-0">
                redacted
              </Badge>
            )}
          </li>
        ))}
      </ol>
      {hidden > 0 && (
        <p className="mt-2 pl-8 text-xs text-muted-foreground">
          …and {hidden} more {hidden === 1 ? "key" : "keys"}, rotated off-screen.
        </p>
      )}
    </div>
  )
}
