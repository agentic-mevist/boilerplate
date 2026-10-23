import { Eraser, ExternalLink, ShieldAlert } from "lucide-react"

import { Button } from "@/components/ui/button"
import { GENERIC_KIND, summarize, type Detection } from "@/lib/secrets"

interface SecretWarningProps {
  detections: Detection[]
  /** Shown after rotating, when the secrets have already been redacted. */
  redacted?: boolean
  onClear?: () => void
}

export function SecretWarning({ detections, redacted = false, onClear }: SecretWarningProps) {
  const kinds = summarize(detections)
  const onlyHunches = kinds.every(({ kind }) => kind.id === GENERIC_KIND.id)
  const title = onlyHunches
    ? "Hmm. That looks suspiciously like a real secret."
    : detections.length === 1
      ? `Whoa. That looks like a real ${kinds[0].kind.noun ?? kinds[0].kind.label}.`
      : `Whoa. ${detections.length} of those look like real secrets.`

  return (
    <div
      role="alert"
      className="rounded-xl border border-destructive/35 bg-destructive/[0.06] p-4 text-sm dark:bg-destructive/10"
    >
      <div className="flex gap-3">
        <ShieldAlert className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden />
        <div className="min-w-0 space-y-3">
          <p className="font-semibold text-destructive">{title}</p>
          <p className="text-pretty text-foreground/80">
            Nothing has left your browser: this page never sends anything anywhere. But you just pasted
            a credential into a website from a group chat, and browser extensions can read anything on
            a page. Our AI is disappointed in you.
          </p>
          <p className="text-pretty text-foreground/80">
            {redacted
              ? "We redacted it from the rotated output, so it can't end up in a screenshot."
              : "We'll redact it from the rotated output, so it can't end up in a screenshot."}{" "}
            If it's real, rotate it for real:
          </p>
          <ul className="space-y-1.5">
            {kinds.map(({ kind, count }) => (
              <li key={kind.id} className="text-pretty text-foreground/80">
                <span className="font-medium text-foreground">
                  {kind.label}
                  {count > 1 ? ` ×${count}` : ""}
                </span>
                {": "}
                {kind.rotateHint}{" "}
                {kind.rotateUrl && (
                  <a
                    href={kind.rotateUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-foreground underline underline-offset-3 hover:text-destructive"
                  >
                    {new URL(kind.rotateUrl).hostname.replace(/^www\./, "")}
                    <ExternalLink className="size-3" aria-hidden />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                )}
              </li>
            ))}
          </ul>
          {onClear && (
            <Button variant="outline" size="sm" onClick={onClear}>
              <Eraser data-icon="inline-start" />
              Clear the box
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
