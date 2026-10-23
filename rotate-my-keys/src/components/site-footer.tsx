import { Logo, Wordmark } from "@/components/logo"
import { SOURCE_URL } from "@/lib/site"

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-10 text-sm sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div className="max-w-sm space-y-3">
          <div className="flex items-center gap-2.5">
            <Logo className="size-7" />
            <Wordmark />
          </div>
          <p className="text-pretty text-muted-foreground">
            A joke, built for a group chat. No keys were harmed in the making of this website.
          </p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-muted-foreground">
          <a className="hover:text-foreground" href="#rotate">
            Rotate
          </a>
          <a className="hover:text-foreground" href="#honeypot">
            Is this safe?
          </a>
          <a className="hover:text-foreground" href="#faq">
            FAQ
          </a>
          <a className="hover:text-foreground" href={SOURCE_URL} target="_blank" rel="noopener noreferrer">
            Source
          </a>
        </nav>
      </div>
      <p className="mx-auto max-w-5xl px-4 pb-10 text-xs text-pretty text-muted-foreground sm:px-6">
        © 2026 RotAIte. Not a real company. Please rotate your keys. For real.
      </p>
    </footer>
  )
}
