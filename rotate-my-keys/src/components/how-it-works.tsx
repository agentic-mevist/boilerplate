import { ClipboardPaste, RotateCw, ShieldCheck } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const STEPS: Array<{ icon: LucideIcon; title: string; body: string }> = [
  {
    icon: ClipboardPaste,
    title: "Paste",
    body: "Paste every secret you own into a text box on a website someone sent to your group chat. Classic.",
  },
  {
    icon: RotateCw,
    title: "Rotate",
    body: "Our Large Rotation Model applies exactly π radians to every character. On-device. Zero-shot. Zero point.",
  },
  {
    icon: ShieldCheck,
    title: "Relax",
    body: "Your keys are now upside down. Attackers hate this one weird trick. (They can still read them.)",
  },
]

export function HowItWorks() {
  return (
    <section id="how" aria-labelledby="how-heading" className="mx-auto max-w-5xl scroll-mt-6 px-4 py-14 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <h2 id="how-heading" className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Enterprise-grade rotation in three easy steps
        </h2>
        <p className="mt-3 text-pretty text-muted-foreground">
          No SDK. No integration. No idea what we're doing. Just results.
        </p>
      </div>
      <ol className="mt-10 grid gap-4 md:grid-cols-3">
        {STEPS.map(({ icon: Icon, title, body }, i) => (
          <li key={title}>
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <span className="grid size-10 place-items-center rounded-xl bg-accent text-accent-foreground">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span className="font-mono text-sm text-muted-foreground" aria-hidden>
                    0{i + 1}
                  </span>
                </div>
                <CardTitle className="mt-3 text-lg font-semibold">{title}</CardTitle>
              </CardHeader>
              <CardContent className="text-pretty text-muted-foreground">{body}</CardContent>
            </Card>
          </li>
        ))}
      </ol>
    </section>
  )
}
