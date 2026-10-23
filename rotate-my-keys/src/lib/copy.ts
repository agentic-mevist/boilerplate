import { flipText } from "@/lib/flip"

export type Mode = "letters" | "keys" | "page"

export const MODES: Record<Mode, { label: string; description: string }> = {
  letters: {
    label: "Letters",
    description: "Every character rotates on its own. Granular. Artisanal. Small-batch.",
  },
  keys: {
    label: "Keys",
    description: "Each key rotates as one atomic unit. Very enterprise.",
  },
  page: {
    label: "Everything",
    description: "Rotates the entire website. Our most powerful setting. Hold on to something.",
  },
}

export const ANGLE_LABELS: Record<number, string> = {
  0: "Compliance theater. Nothing changes, but it gets documented.",
  45: "Italic. Not more secure, but very stylish.",
  90: "Sideways. Recommended for staging.",
  135: "Mostly upside down. Commitment issues.",
  180: "Upside down. The industry standard.",
  225: "Past upside down. Bold strategy.",
  270: "Sideways, but the other way. Very secure.",
  315: "Almost a full rotation. Why stop now?",
  360: "Full rotation. Your keys will look exactly the same. Billed twice.",
}

const THINKING_POOL = [
  "Consulting the Large Rotation Model…",
  "Calculating the optimal angle (≈ π radians)…",
  "Applying 4.2 N·m of torque…",
  "Spinning up a vector database (for the spinning)…",
  "Asking each key nicely to turn around…",
  "Making it agentic…",
  "Reticulating splines…",
  "Disabling gravity (locally)…",
  "Turning it off and on again…",
  "Checking that the keys aren't load-bearing…",
  "Prompt-engineering the angle…",
  "Aligning the keys. Then misaligning them on purpose…",
]

export function thinkingSteps(opts: {
  hallucinated: boolean
  realLooking: number
  angle: number
  mode: Mode
}): string[] {
  const pool = [...THINKING_POOL].sort(() => Math.random() - 0.5).slice(0, 4)
  const steps = ["Tokenizing your tokens…"]
  if (opts.hallucinated) steps.push("No keys found. Hallucinating some…")
  if (opts.realLooking > 0) {
    steps.push(
      `Found ${opts.realLooking} real-looking secret${opts.realLooking === 1 ? "" : "s"}. Redacting. Judging you a little.`,
    )
  }
  steps.push(...pool)
  if (opts.mode === "page") steps.push("Rotating your entire website…")
  else if (opts.angle === 0) steps.push("Rotating by 0°. Generating compliance report…")
  else if (opts.angle === 360) steps.push("Rotating twice as hard…")
  else steps.push("Rotating…")
  return steps
}

/** One-liner shown after a rotation, based on where the keys ended up. */
export function outcome(rotation: number): string {
  const effective = ((rotation % 360) + 360) % 360
  if (rotation === 0) return "Nothing changed, but it's been documented. Compliance achieved."
  if (effective === 0) return "Full rotation complete. Your keys look exactly the same, but they've been through a lot."
  if (effective === 180) return "Your keys are now upside down. Attackers hate this one weird trick."
  if (effective === 90 || effective === 270) return "Your keys are now sideways. Readable only by people lying down."
  if (effective === 45 || effective === 315) return "Your keys are slightly tilted. Attackers will have to tilt their heads. A little."
  return "Your keys are now mostly upside down. Attackers mildly inconvenienced."
}

/** What "Share" puts on the clipboard. Never includes any key content. */
export function shareText(count: number, rotation: number): string {
  return `I just had AI rotate ${count} of my API key${count === 1 ? "" : "s"} by ${rotation}°. My security posture is now ${flipText("maximum")}.`
}
