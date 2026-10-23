import { Code } from "lucide-react"

import { Logo, Wordmark } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { SOURCE_URL } from "@/lib/site"

const LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#honeypot", label: "Is this safe?" },
  { href: "#faq", label: "FAQ" },
]

export function SiteHeader() {
  return (
    <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
      <a href="#top" className="flex items-center gap-2.5 rounded-lg" aria-label="RotAIte home">
        <Logo />
        <Wordmark className="text-lg" />
      </a>
      <nav aria-label="Main" className="flex items-center gap-1">
        {LINKS.map((link) => (
          <Button key={link.href} asChild variant="ghost" size="sm" className="hidden text-muted-foreground sm:inline-flex">
            <a href={link.href}>{link.label}</a>
          </Button>
        ))}
        <Button asChild variant="outline" size="sm" className="ml-1">
          <a href={SOURCE_URL} target="_blank" rel="noopener noreferrer">
            <Code data-icon="inline-start" aria-hidden />
            Source
          </a>
        </Button>
      </nav>
    </header>
  )
}
