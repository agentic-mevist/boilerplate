/* Lyria 3 (Gemini API) music generation client.
 *
 * Requires GEMINI_API_KEY (from https://aistudio.google.com/apikey).
 * Models:
 *   - lyria-3-clip-preview : ~30s clip  (cheap, good for iterating)
 *   - lyria-3-pro-preview  : ~2 min full song
 *
 * The response returns audio as an inline base64 part (no lyric timestamps),
 * plus a text part echoing the lyrics/structure. We extract the audio.
 */

import fs from "fs/promises";
import path from "path";

const ENDPOINT = (model) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

export function hasMusicKey() {
  return !!process.env.GEMINI_API_KEY;
}

export async function generateSong(prompt, outPath, opts = {}) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not set — cannot call Lyria 3.");
  const model = opts.model || "lyria-3-clip-preview";

  const res = await fetch(ENDPOINT(model), {
    method: "POST",
    headers: {
      "x-goog-api-key": key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Lyria request failed ${res.status}: ${body.slice(0, 500)}`);
  }

  const json = await res.json();
  const parts = json?.candidates?.[0]?.content?.parts || [];

  let audioPart = null;
  let lyricsText = "";
  for (const p of parts) {
    if (p.inlineData && /audio/i.test(p.inlineData.mimeType || "")) {
      audioPart = p.inlineData;
    } else if (p.text) {
      lyricsText += p.text;
    }
  }
  if (!audioPart) {
    throw new Error("Lyria response contained no audio part. Raw keys: " +
      JSON.stringify(parts.map((p) => Object.keys(p))));
  }

  const ext = /wav/i.test(audioPart.mimeType) ? ".wav" : ".mp3";
  const finalPath = outPath.replace(/\.(mp3|wav)$/i, "") + ext;
  await fs.mkdir(path.dirname(finalPath), { recursive: true });
  await fs.writeFile(finalPath, Buffer.from(audioPart.data, "base64"));

  return { audioPath: finalPath, lyricsText, mimeType: audioPart.mimeType };
}
