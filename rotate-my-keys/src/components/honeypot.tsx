import { ArrowUpRight, Code, EyeOff, Eraser, ServerOff, ShieldCheck, TriangleAlert, WifiOff } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { SOURCE_URL } from "@/lib/site"

const FACTS: Array<{ icon: LucideIcon; title: string; body: React.ReactNode; warn?: boolean }> = [
  {
    icon: ServerOff,
    title: "There is no backend",
    body: "It's a handful of static files on Cloudflare Pages. There's no server code anywhere to receive anything.",
  },
  {
    icon: WifiOff,
    title: "It physically can't phone home",
    body: (
      <>
        The page ships a Content-Security-Policy with <InlineCode>connect-src 'none'</InlineCode> and{" "}
        <InlineCode>form-action 'none'</InlineCode>, so your browser blocks every fetch, beacon, socket and form
        submission it might try.
      </>
    ),
  },
  {
    icon: Eraser,
    title: "Nothing is stored",
    body: "No cookies, no localStorage, no analytics, no logs. The box even empties itself when you leave the page.",
  },
  {
    icon: EyeOff,
    title: "Extensions are asked to look away",
    body: "Spellcheck, autocorrect, Grammarly and password managers are switched off for the box. Asked, not forced: any extension with access to this page could still read it.",
  },
  {
    icon: Code,
    title: "Open source, with source maps",
    body: "Read the code on GitHub, or open DevTools → Sources to read the exact code running right now.",
  },
  {
    icon: TriangleAlert,
    title: "And still: don't paste real keys",
    body: "Not here, not anywhere. A website promising it's safe is exactly what a honeypot would say.",
    warn: true,
  },
]

function InlineCode({ children }: { children: React.ReactNode }) {
  return <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.8em] text-foreground">{children}</code>
}

export function Honeypot() {
  return (
    <section id="honeypot" aria-labelledby="honeypot-heading" className="mx-auto max-w-5xl scroll-mt-6 px-4 py-14 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <Badge variant="outline" className="h-7 gap-1.5 rounded-full px-3">
          <ShieldCheck className="text-success" aria-hidden />
          The honest part
        </Badge>
        <h2 id="honeypot-heading" className="mt-4 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          “Wait… is this a honeypot?”
        </h2>
        <p className="mt-3 text-pretty text-muted-foreground">
          Great instinct. Ask that about every website that wants your secrets. Here's what's actually
          true about this one.
        </p>
      </div>

      <div className="mt-10 grid gap-4 lg:grid-cols-5">
        <ul className="grid gap-4 sm:grid-cols-2 lg:col-span-3">
          {FACTS.map(({ icon: Icon, title, body, warn }) => (
            <li
              key={title}
              className={cn(
                "rounded-xl border bg-card p-4",
                warn && "border-destructive/35 bg-destructive/[0.06] dark:bg-destructive/10",
              )}
            >
              <Icon className={cn("size-5", warn ? "text-destructive" : "text-brand-1")} aria-hidden />
              <h3 className="mt-3 font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-pretty text-muted-foreground">{body}</p>
            </li>
          ))}
        </ul>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Verify it yourself</CardTitle>
            <CardDescription>Don't trust us. That's the whole point.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 text-sm">
            <ol className="list-inside list-decimal space-y-1.5 text-pretty marker:text-muted-foreground">
              <li>Open DevTools and switch to the Network tab.</li>
              <li>Paste something and hit Rotate.</li>
              <li>Watch absolutely nothing happen.</li>
            </ol>
            <div>
              <p className="text-muted-foreground">The policy your browser is enforcing right now:</p>
              <pre className="mt-2 overflow-x-auto rounded-lg border bg-muted/50 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap">
                {__CSP__.split("; ").join(";\n")}
              </pre>
            </div>
            <Button asChild variant="outline" className="w-full">
              <a href={SOURCE_URL} target="_blank" rel="noopener noreferrer">
                Read the source on GitHub
                <ArrowUpRight data-icon="inline-end" aria-hidden />
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
