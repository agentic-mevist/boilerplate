/* Screenshot -> messages parser using Claude vision.
 *
 * Reads one or more conversation screenshots and returns an ordered message
 * list: [{ side: "in"|"out", text }]. "out" = messages sent by the account
 * owner (right side / coloured bubbles); "in" = the other person.
 *
 * Requires ANTHROPIC_API_KEY (and optionally ANTHROPIC_BASE_URL). When running
 * inside this agent, screenshots can also be transcribed directly without this
 * module.
 */

import fs from "fs/promises";
import path from "path";

const MODEL = process.env.PARSE_MODEL || "claude-sonnet-4-6";

const SYSTEM = `You transcribe messaging-app screenshots into structured JSON.
Return ONLY valid JSON: {"peer":{"name":"..."},"messages":[{"side":"in|out","text":"..."}]}.
- "out" = bubbles sent by the phone's owner (usually right-aligned / coloured).
- "in"  = the other participant (usually left-aligned / grey/white).
- Preserve order top-to-bottom across all images. Merge consecutive images as one continuous thread.
- Keep text verbatim. Skip timestamps, reactions, and system lines.`;

const mimeFor = (p) => {
  const e = path.extname(p).toLowerCase();
  return e === ".png" ? "image/png"
    : e === ".webp" ? "image/webp"
    : "image/jpeg";
};

export async function parseScreenshots(imagePaths) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY not set — cannot run vision parsing.");
  const base = (process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com").replace(/\/$/, "");

  const content = [];
  for (const p of imagePaths) {
    const data = await fs.readFile(p);
    content.push({
      type: "image",
      source: { type: "base64", media_type: mimeFor(p), data: data.toString("base64") },
    });
  }
  content.push({ type: "text", text: "Transcribe these screenshots into the JSON schema." });

  const res = await fetch(`${base}/v1/messages`, {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2048,
      system: SYSTEM,
      messages: [{ role: "user", content }],
    }),
  });
  if (!res.ok) throw new Error(`parse failed ${res.status}: ${(await res.text()).slice(0, 400)}`);
  const json = await res.json();
  const text = (json.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON found in parse response.");
  return JSON.parse(match[0]);
}

// CLI: node src/parse.js img1.png img2.png > data/messages.json
if (process.argv[1] && process.argv[1].endsWith("parse.js")) {
  const out = await parseScreenshots(process.argv.slice(2));
  process.stdout.write(JSON.stringify(out, null, 2) + "\n");
}
