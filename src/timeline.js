/* Reading-time timeline engine.
 *
 * Converts an ordered list of messages into per-message timings:
 *   - typingFrom: when the typing indicator starts (incoming only)
 *   - appearAt:   when the bubble pops in
 *   - durationMs: total reel length
 *
 * The pacing is based on estimated reading time so each message stays on
 * screen long enough to be read/sung, with a typing beat before incoming
 * replies for authenticity.
 */

const DEFAULTS = {
  wpm: 165,            // dramatic/sung reading pace (slower than silent reading)
  perMsgBufferMs: 650, // dwell padding after the estimated read time
  minDwellMs: 1300,    // floor so very short messages still breathe
  leadInMs: 700,       // beat before the first message
  outroMs: 1600,       // tail after the last message
  outgoingDelayMs: 280,// tiny beat before an outgoing bubble
  typingBaseMs: 450,
  typingPerWordMs: 170,
  typingMinMs: 850,
  typingMaxMs: 2300,
};

const wordCount = (text) =>
  (text || "").trim().split(/\s+/).filter(Boolean).length || 1;

export function buildTimeline(messages, opts = {}) {
  const cfg = { ...DEFAULTS, ...opts };
  let cursor = cfg.leadInMs;
  const out = [];

  for (const m of messages) {
    const words = wordCount(m.text);
    const readMs = (words / cfg.wpm) * 60000;
    const dwell = Math.max(cfg.minDwellMs, readMs + cfg.perMsgBufferMs);

    let typingFrom = null;
    let appearAt;

    if (m.side === "in") {
      const typingMs = Math.min(
        cfg.typingMaxMs,
        Math.max(cfg.typingMinMs, cfg.typingBaseMs + words * cfg.typingPerWordMs)
      );
      typingFrom = cursor;
      appearAt = cursor + typingMs;
    } else {
      appearAt = cursor + cfg.outgoingDelayMs;
    }

    out.push({
      side: m.side,
      text: m.text,
      typingFrom,
      appearAt: Math.round(appearAt),
      readMs: Math.round(readMs),
    });

    cursor = appearAt + dwell;
  }

  const durationMs = Math.round(cursor + cfg.outroMs);
  return { messages: out, durationMs };
}

/* Rescale an existing timeline to match a known audio duration (used once a
 * real song is generated). Keeps the relative pacing, stretches/compresses to
 * fit, and preserves the lead-in/outro proportionally. */
export function fitToAudio(timeline, audioMs) {
  const src = timeline.durationMs;
  if (!src || !audioMs) return timeline;
  const k = audioMs / src;
  return {
    durationMs: audioMs,
    messages: timeline.messages.map((m) => ({
      ...m,
      typingFrom: m.typingFrom == null ? null : Math.round(m.typingFrom * k),
      appearAt: Math.round(m.appearAt * k),
    })),
  };
}
