import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

const QUESTIONS: Array<{ q: string; a: React.ReactNode }> = [
  {
    q: "Does this actually rotate my keys?",
    a: "Yes. By 180°, or whatever you set the slider to. If you wanted your keys replaced, that's called revoking and reissuing, and it happens in each provider's dashboard. No website should be able to do that for you, AI or not.",
  },
  {
    q: "What model powers the rotation?",
    a: (
      <>
        Our proprietary Large Rotation Model, LRM-180. It has exactly one parameter, and that parameter
        is 180. It runs on-device as <code className="font-mono text-foreground">transform: rotate(180deg)</code>,
        which technically makes us an edge AI company. We're raising.
      </>
    ),
  },
  {
    q: "Is 360° more secure than 180°?",
    a: "It's twice as much rotation, so logically, yes. Your keys will look exactly the same afterwards, but they'll have been through something.",
  },
  {
    q: "Are you SOC 2 compliant?",
    a: "We're SOC 2 Type II. Rotate that 180° and it's still Type II. That's how robust our compliance is.",
  },
  {
    q: "Can attackers read rotated keys?",
    a: "Only attackers with a phone, a mirror, or a neck.",
  },
  {
    q: "I pasted a real key. Am I hacked?",
    a: "Almost certainly not: nothing left your browser, and this page can't send it anywhere. But a browser extension could have read it, so if you're not sure, revoke it and create a new one. That's real rotation. It takes two minutes and zero AI.",
  },
  {
    q: "Why does this exist?",
    a: "Someone in a group chat asked, “Is there an AI tool that would rotate my keys for me?” There is now. You're using it. We're so sorry.",
  },
]

export function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-heading" className="mx-auto max-w-3xl scroll-mt-6 px-4 py-14 sm:px-6">
      <h2 id="faq-heading" className="text-center text-3xl font-semibold tracking-tight sm:text-4xl">
        Frequently rotated questions
      </h2>
      <Accordion type="single" collapsible className="mt-8 rounded-xl border bg-card px-4">
        {QUESTIONS.map(({ q, a }) => (
          <AccordionItem key={q} value={q}>
            <AccordionTrigger className="py-4 text-base">{q}</AccordionTrigger>
            <AccordionContent className="pb-4 text-[0.95rem] leading-relaxed text-pretty text-muted-foreground">
              {a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  )
}
