import { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import {
  AppWindow,
  CaseSensitive,
  Check,
  CircleCheck,
  Copy,
  Eraser,
  KeyRound,
  Pencil,
  RotateCcw,
  RotateCw,
  Share2,
  Sparkles,
} from "lucide-react"

import { RotatedView } from "@/components/rotated-view"
import { SecretWarning } from "@/components/secret-warning"
import { ThinkingOverlay } from "@/components/thinking-overlay"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Kbd, KbdGroup } from "@/components/ui/kbd"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { ANGLE_LABELS, MODES, outcome, shareText, thinkingSteps, type Mode } from "@/lib/copy"
import { hallucinateKeys } from "@/lib/fake-keys"
import { flipLines } from "@/lib/flip"
import { countKeys, findSecrets, prepareKeys, type Detection, type PreparedLine } from "@/lib/secrets"
import { cn } from "@/lib/utils"

const MAX_INPUT = 20_000
const STEP_MS = 430

type Phase = "idle" | "thinking" | "done"

interface Result {
  lines: PreparedLine[]
  hidden: number
  detections: Detection[]
  seconds: number
}

const MODE_ICONS: Record<Mode, typeof KeyRound> = {
  letters: CaseSensitive,
  keys: KeyRound,
  page: AppWindow,
}

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform)

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export function KeyRotator({ onPageRotate }: { onPageRotate: (degrees: number) => void }) {
  const reducedMotion = useReducedMotion()
  const [input, setInput] = useState("")
  const [mode, setMode] = useState<Mode>("letters")
  const [angle, setAngle] = useState(180)
  const [phase, setPhase] = useState<Phase>("idle")
  const [rotation, setRotation] = useState(0)
  const [result, setResult] = useState<Result | null>(null)
  const [steps, setSteps] = useState<string[]>([])
  const [step, setStep] = useState(0)
  const [copied, setCopied] = useState<"keys" | "share" | null>(null)
  const [announcement, setAnnouncement] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const timers = useRef<number[]>([])

  const detections = useMemo(() => findSecrets(input), [input])
  const keyCount = useMemo(() => countKeys(input), [input])

  const done = phase === "done" && result !== null
  const pageRotation = done && mode === "page" ? rotation : 0
  const effective = ((rotation % 360) + 360) % 360
  const totalKeys = result ? result.lines.length + result.hidden : 0

  useEffect(() => onPageRotate(pageRotation), [pageRotation, onPageRotate])

  // Esc puts the website back the right way up.
  useEffect(() => {
    if (!pageRotation) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setRotation(0)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [pageRotation])

  // Nothing persists: leaving the page (or it going into the back/forward
  // cache) wipes the box.
  useEffect(() => {
    const forget = () => {
      timers.current.forEach(clearTimeout)
      if (textareaRef.current) textareaRef.current.value = ""
      setInput("")
      setResult(null)
      setRotation(0)
      setPhase("idle")
    }
    window.addEventListener("pagehide", forget)
    return () => window.removeEventListener("pagehide", forget)
  }, [])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  useEffect(() => {
    if (!copied) return
    const id = window.setTimeout(() => setCopied(null), 2000)
    return () => clearTimeout(id)
  }, [copied])

  function rotate() {
    if (phase === "thinking") return
    const hallucinated = !input.trim()
    const text = hallucinated ? hallucinateKeys() : input
    const prepared = prepareKeys(text)
    const plan = thinkingSteps({ hallucinated, realLooking: prepared.detections.length, angle, mode })
    const stepMs = reducedMotion ? 250 : STEP_MS
    const started = performance.now()

    timers.current.forEach(clearTimeout)
    timers.current = []
    setResult(null)
    setRotation(0)
    setSteps(plan)
    setStep(0)
    setPhase("thinking")
    setAnnouncement("Rotating your keys.")

    for (let i = 1; i < plan.length; i++) {
      timers.current.push(
        window.setTimeout(() => {
          setStep(i)
          if (hallucinated && i === 1) setInput(text)
        }, i * stepMs),
      )
    }
    timers.current.push(
      window.setTimeout(() => {
        const count = prepared.lines.length + prepared.hidden
        setResult({
          lines: prepared.lines,
          hidden: prepared.hidden,
          detections: prepared.detections,
          seconds: (performance.now() - started) / 1000,
        })
        setRotation(angle)
        setPhase("done")
        setAnnouncement(`Done. ${count} ${count === 1 ? "key" : "keys"} rotated by ${angle} degrees.`)
      }, plan.length * stepMs),
    )
  }

  function rotateAgain() {
    setRotation((r) => r + angle)
    setAnnouncement(`Rotated another ${angle} degrees.`)
  }

  function edit() {
    setPhase("idle")
    setRotation(0)
    setResult(null)
    requestAnimationFrame(() => textareaRef.current?.focus())
  }

  function clear() {
    timers.current.forEach(clearTimeout)
    setInput("")
    setResult(null)
    setRotation(0)
    setPhase("idle")
    setAnnouncement("Cleared.")
    requestAnimationFrame(() => textareaRef.current?.focus())
  }

  async function copyRotated() {
    if (!result) return
    if (await copyText(flipLines(result.lines.map((line) => line.text)))) setCopied("keys")
  }

  async function share() {
    // Only the count and the angle. Never anything from the box.
    const text = shareText(totalKeys, rotation)
    const url = window.location.origin
    if (navigator.share) {
      try {
        await navigator.share({ text, url })
        return
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return
      }
    }
    if (await copyText(`${text} ${url}`)) setCopied("share")
  }

  const totalDegrees = !result
    ? 0
    : mode === "letters"
      ? result.lines.reduce((n, line) => n + Array.from(line.text).length, 0) * rotation
      : mode === "keys"
        ? totalKeys * rotation
        : rotation

  return (
    <Card id="rotate" className="relative scroll-mt-6 shadow-xl shadow-brand-1/5 ring-foreground/10 dark:shadow-black/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <KeyRound className="size-5 text-brand-1" aria-hidden />
          Your API keys
        </CardTitle>
        <CardDescription>One per line. As many as you like. (Fake ones. Please.)</CardDescription>
        <CardAction>
          <Badge variant="secondary" className="tabular-nums">
            {done ? totalKeys : keyCount} {(done ? totalKeys : keyCount) === 1 ? "key" : "keys"}
          </Badge>
        </CardAction>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="relative">
          {done ? (
            <RotatedView
              key={mode}
              lines={result.lines}
              hidden={result.hidden}
              mode={mode}
              rotation={rotation}
              reducedMotion={reducedMotion}
            />
          ) : (
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                  event.preventDefault()
                  rotate()
                }
              }}
              disabled={phase === "thinking"}
              maxLength={MAX_INPUT}
              rows={6}
              aria-label="API keys to rotate, one per line"
              translate="no"
              placeholder={"Paste your API keys here, one per line.\n\nOr don't. Seriously. Use the fake ones."}
              // Keep spellcheckers, autocorrect, grammar and password-manager
              // extensions away from whatever ends up in here.
              spellCheck={false}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              data-gramm="false"
              data-gramm_editor="false"
              data-enable-grammarly="false"
              data-lt-active="false"
              data-1p-ignore=""
              data-lpignore="true"
              data-bwignore=""
              data-form-type="other"
              className="max-h-96 min-h-44 resize-y font-mono text-[0.9rem] leading-relaxed md:text-[0.9rem]"
            />
          )}
          {phase === "thinking" && <ThinkingOverlay steps={steps} step={step} />}
        </div>

        {done && (
          <div className="space-y-3" data-testid="result">
            <p className="flex gap-2 text-sm text-pretty">
              <CircleCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
              <span>
                <strong className="font-semibold">
                  {totalKeys} {totalKeys === 1 ? "key" : "keys"} rotated by {rotation}°
                </strong>{" "}
                in {result.seconds.toFixed(1)}s. {outcome(rotation)}
              </span>
            </p>
            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label="Total rotation" value={`${totalDegrees.toLocaleString("en-US")}°`} />
              <Stat label="Hackers confused" value={effective === 0 ? "0%" : "100%"} />
              <Stat label="Keys actually changed" value="0" note="as designed" />
              <Stat label="Bytes sent anywhere" value="0" note="by design" />
            </dl>
          </div>
        )}

        {!done && phase !== "thinking" && detections.length > 0 && (
          <SecretWarning detections={detections} onClear={clear} />
        )}
        {done && result.detections.length > 0 && <SecretWarning detections={result.detections} redacted onClear={clear} />}

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2.5">
            <Label id="mode-label">Rotation style</Label>
            <ToggleGroup
              type="single"
              variant="outline"
              spacing={0}
              value={mode}
              onValueChange={(value) => value && setMode(value as Mode)}
              disabled={phase === "thinking"}
              aria-labelledby="mode-label"
              className="w-full"
            >
              {(Object.keys(MODES) as Mode[]).map((value) => {
                const Icon = MODE_ICONS[value]
                return (
                  <ToggleGroupItem
                    key={value}
                    value={value}
                    className="h-9 flex-1 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground"
                  >
                    <Icon data-icon="inline-start" aria-hidden />
                    {MODES[value].label}
                  </ToggleGroupItem>
                )
              })}
            </ToggleGroup>
            <p className="text-xs leading-relaxed text-pretty text-muted-foreground">
              {mode === "page" && (
                <Badge variant="outline" className="mr-1.5 h-4.5 border-brand-1/40 px-1.5 text-[0.65rem] text-brand-1">
                  Enterprise
                </Badge>
              )}
              {MODES[mode].description}
            </p>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <Label id="angle-label">Rotation angle</Label>
              <span className="font-mono text-sm font-medium tabular-nums">{angle}°</span>
            </div>
            <div className="flex h-9 items-center">
              <Slider
                min={0}
                max={360}
                step={45}
                value={[angle]}
                onValueChange={([value]) => setAngle(value)}
                disabled={phase === "thinking"}
                thumbProps={{ "aria-labelledby": "angle-label", "aria-valuetext": `${angle} degrees` }}
                className="[&_[data-slot=slider-range]]:bg-brand-gradient [&_[data-slot=slider-thumb]]:size-4"
              />
            </div>
            <p className="text-xs leading-relaxed text-pretty text-muted-foreground">
              {angle === 180 && (
                <Badge variant="outline" className="mr-1.5 h-4.5 border-success/40 px-1.5 text-[0.65rem] text-success">
                  Recommended
                </Badge>
              )}
              {ANGLE_LABELS[angle]}
            </p>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex-wrap gap-2 bg-muted/40">
        {done ? (
          <>
            <Button variant="ghost" onClick={edit}>
              <Pencil data-icon="inline-start" aria-hidden />
              Edit keys
            </Button>
            <Button variant="outline" onClick={copyRotated} disabled={effective !== 180}>
              {copied === "keys" ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}
              {copied === "keys" ? "Copied" : "Copy rotated keys"}
            </Button>
            <Button variant="outline" onClick={share}>
              {copied === "share" ? <Check data-icon="inline-start" /> : <Share2 data-icon="inline-start" />}
              {copied === "share" ? "Copied" : "Share the joke"}
            </Button>
            <RotateButton className="sm:ml-auto" onClick={rotateAgain}>
              Rotate again
            </RotateButton>
          </>
        ) : (
          <>
            <Button
              variant="outline"
              onClick={() => setInput(hallucinateKeys())}
              disabled={phase === "thinking"}
            >
              <Sparkles data-icon="inline-start" aria-hidden />
              Hallucinate fake keys
            </Button>
            {input && (
              <Button variant="ghost" onClick={clear} disabled={phase === "thinking"}>
                <Eraser data-icon="inline-start" aria-hidden />
                Clear
              </Button>
            )}
            <RotateButton className="sm:ml-auto" onClick={rotate} busy={phase === "thinking"}>
              {phase === "thinking" ? "Rotating…" : "Rotate keys"}
              {phase !== "thinking" && (
                <KbdGroup className="ml-1 hidden md:inline-flex">
                  <Kbd className="bg-white/20 text-white">{isMac ? "⌘" : "Ctrl"}</Kbd>
                  <Kbd className="bg-white/20 text-white">↵</Kbd>
                </KbdGroup>
              )}
            </RotateButton>
          </>
        )}
      </CardFooter>

      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>

      {pageRotation !== 0 &&
        createPortal(
          <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
            <div className="flex items-center gap-3 rounded-full border bg-popover/95 py-1.5 pr-1.5 pl-4 text-sm text-popover-foreground shadow-lg backdrop-blur animate-in fade-in slide-in-from-bottom-4">
              <span className="text-pretty">
                {effective === 0
                  ? `Your website did a full ${rotation}°. It looks the same, but it's been through a lot.`
                  : `Your entire website has been rotated ${rotation}°.`}
              </span>
              <Button size="sm" className="rounded-full" onClick={() => setRotation(0)}>
                <RotateCcw data-icon="inline-start" aria-hidden />
                Unrotate
                <Kbd className="ml-0.5 hidden bg-primary-foreground/20 text-primary-foreground sm:inline-flex">Esc</Kbd>
              </Button>
            </div>
          </div>,
          document.body,
        )}
    </Card>
  )
}

function RotateButton({
  children,
  busy = false,
  className,
  onClick,
}: {
  children: React.ReactNode
  busy?: boolean
  className?: string
  onClick: () => void
}) {
  return (
    <Button
      size="lg"
      onClick={onClick}
      disabled={busy}
      className={cn(
        "group/rotate h-10 bg-button-gradient px-4 text-[0.95rem] font-semibold text-white shadow-md shadow-brand-2/30 hover:brightness-110 disabled:opacity-80",
        className,
      )}
    >
      <RotateCw
        data-icon="inline-start"
        aria-hidden
        className={
          busy
            ? "motion-safe:animate-spin"
            : "transition-transform duration-500 group-hover/rotate:rotate-180 motion-reduce:transition-none"
        }
      />
      {children}
    </Button>
  )
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-lg border bg-background/60 px-3 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-mono text-lg font-semibold tabular-nums">
        {value}
        {note && <span className="ml-1.5 font-sans text-xs font-normal text-muted-foreground">{note}</span>}
      </dd>
    </div>
  )
}
