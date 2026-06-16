// Cloudflare Pages (advanced mode): short share links backed by KV,
// everything else falls through to the static assets.

const ID_ALPHABET = "23456789abcdefghijkmnpqrstuvwxyz"; // no 0/1/o/l ambiguity
const ID_LEN = 10;

function makeId() {
  const bytes = crypto.getRandomValues(new Uint8Array(ID_LEN));
  let s = "";
  for (let i = 0; i < ID_LEN; i++) s += ID_ALPHABET[bytes[i] % ID_ALPHABET.length];
  return s;
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

// a spread is an array of [cardIndex, x, y, tilt]; keep it small and sane
function validSpread(data) {
  return (
    Array.isArray(data) &&
    data.length > 0 &&
    data.length <= 60 &&
    data.every(
      (r) =>
        Array.isArray(r) &&
        r.length === 4 &&
        r.every((n) => typeof n === "number" && Number.isFinite(n))
    )
  );
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/share" && request.method === "POST") {
      let data;
      try { data = await request.json(); } catch (_) { return json({ error: "bad json" }, 400); }
      if (!validSpread(data)) return json({ error: "bad spread" }, 400);
      const id = makeId();
      await env.SHARE.put(id, JSON.stringify(data)); // permanent
      return json({ id });
    }

    const match = url.pathname.match(/^\/api\/s\/([a-z2-9]{6,16})$/);
    if (match && request.method === "GET") {
      const value = await env.SHARE.get(match[1]);
      if (!value) return json({ error: "not found" }, 404);
      return new Response(value, {
        headers: { "content-type": "application/json", "cache-control": "public, max-age=31536000" },
      });
    }

    return env.ASSETS.fetch(request);
  },
};
