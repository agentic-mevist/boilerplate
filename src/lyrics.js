/* Turn a conversation into a Lyria 3 prompt.
 *
 * Lyria sings whatever lyrics you give it. We map each message to a lyric line,
 * label speakers, and add musical direction + (best-effort) timing hints. Note:
 * Lyria does NOT return precise timestamps, so on-screen sync is driven by the
 * reading-time timeline (and optionally local forced alignment later).
 */

export function buildLyrics(messages, opts = {}) {
  const style = opts.style ||
    "catchy lo-fi pop, playful and a little dramatic, light beat, clear vocals, mid tempo ~95 BPM";
  const peerName = opts.peerName || "the customer";

  // Each message becomes a sung line; alternate verse/response framing.
  const lines = messages.map((m) => {
    const who = m.side === "in" ? peerName : "I";
    return `${who}: ${m.text}`;
  });

  const lyricBlock = [
    "[Verse]",
    ...lines,
    "[Outro]",
    "(and that's the whole conversation)",
  ].join("\n");

  const prompt = [
    `Create a ${style} song that narrates a text-message conversation.`,
    "Sing the lines in order, exactly as written, as a back-and-forth between two voices.",
    "Keep it tight and rhythmic so each line lands clearly.",
    "",
    "Lyrics:",
    lyricBlock,
  ].join("\n");

  return { prompt, lyricBlock, lines };
}
