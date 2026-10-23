// Upside-down Unicode, for copying "rotated" keys out of the page.
// Rotating text by 180° reverses it and turns every glyph over, so that is
// exactly what this does. Characters without a lookalike are left as is.
const PAIRS: Array<[string, string]> = [
  ["a", "ɐ"], ["b", "q"], ["c", "ɔ"], ["d", "p"], ["e", "ǝ"], ["f", "ɟ"],
  ["g", "ƃ"], ["h", "ɥ"], ["i", "ᴉ"], ["j", "ɾ"], ["k", "ʞ"], ["m", "ɯ"],
  ["n", "u"], ["r", "ɹ"], ["t", "ʇ"], ["v", "ʌ"], ["w", "ʍ"], ["y", "ʎ"],
  ["A", "∀"], ["B", "ᗺ"], ["C", "Ɔ"], ["D", "ᗡ"], ["E", "Ǝ"], ["F", "Ⅎ"],
  ["G", "⅁"], ["J", "ſ"], ["L", "˥"], ["M", "W"], ["P", "Ԁ"], ["Q", "Ό"],
  ["R", "ᴚ"], ["T", "⊥"], ["U", "∩"], ["V", "Λ"], ["Y", "⅄"],
  ["1", "Ɩ"], ["2", "ᄅ"], ["3", "Ɛ"], ["4", "ㄣ"], ["5", "ϛ"], ["6", "9"],
  ["7", "ㄥ"], [".", "˙"], [",", "'"], ['"', "„"], ["!", "¡"], ["?", "¿"],
  ["(", ")"], ["[", "]"], ["{", "}"], ["<", ">"], ["_", "‾"], ["&", "⅋"],
  [";", "؛"],
]

const FLIP = new Map<string, string>()
for (const [up, down] of PAIRS) {
  FLIP.set(up, down)
  FLIP.set(down, up)
}
// No distinct upside-down K that renders everywhere, so it borrows k's.
FLIP.set("K", "ʞ")

/** Rotates one line of text by 180°. */
export function flipText(text: string): string {
  return Array.from(text)
    .reverse()
    .map((ch) => FLIP.get(ch) ?? ch)
    .join("")
}

/** Rotates a block of lines by 180°: the last line ends up on top. */
export function flipLines(lines: string[]): string {
  return [...lines].reverse().map(flipText).join("\n")
}
