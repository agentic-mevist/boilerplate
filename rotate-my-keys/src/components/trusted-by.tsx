import { cn } from "@/lib/utils"

// Fictional companies only.
const LOGOS = [
  { name: "Initech", className: "font-serif text-xl italic" },
  { name: "hooli", className: "text-2xl font-semibold tracking-tighter" },
  { name: "Vandelay Industries", className: "font-mono text-xs font-semibold tracking-[0.25em] uppercase" },
  { name: "Dunder Mifflin", className: "font-serif text-lg font-bold" },
  { name: "Your group chat", className: "text-base font-medium" },
]

export function TrustedBy() {
  return (
    <section aria-labelledby="trusted-heading" className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
      <p id="trusted-heading" className="text-center text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
        Trusted by security teams at
      </p>
      <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-5 text-foreground/55">
        {LOGOS.map((logo) => (
          <li
            key={logo.name}
            className={cn(
              "rotate-180 transition-transform duration-500 select-none hover:rotate-0 motion-reduce:transition-none",
              logo.className,
            )}
          >
            {logo.name}
          </li>
        ))}
      </ul>
      <p className="mt-5 text-center text-xs text-muted-foreground">(Their logos have also been rotated.)</p>
    </section>
  )
}
