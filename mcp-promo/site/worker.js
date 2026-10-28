// The promo page is static (public/); the video streams from R2 so players get
// byte ranges (Safari and iOS will not play an mp4 without them).
const VIDEO = "/handlepilot-mcp-promo.mp4";

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname !== VIDEO) return env.ASSETS.fetch(req);
    if (req.method !== "GET" && req.method !== "HEAD") return new Response(null, { status: 405 });

    const key = VIDEO.slice(1);
    const obj = req.method === "HEAD"
      ? await env.MEDIA.head(key)
      : await env.MEDIA.get(key, { range: req.headers, onlyIf: req.headers });
    if (!obj) return new Response("Not found", { status: 404 });

    const h = new Headers();
    obj.writeHttpMetadata(h);
    h.set("etag", obj.httpEtag);
    h.set("accept-ranges", "bytes");
    h.set("cache-control", "public, max-age=86400");
    if (req.method === "HEAD") {
      h.set("content-length", String(obj.size));
      return new Response(null, { headers: h });
    }
    if (!("body" in obj)) return new Response(null, { status: 304, headers: h });

    const r = obj.range;
    if (r && req.headers.has("range")) {
      const start = r.suffix != null ? obj.size - r.suffix : r.offset ?? 0;
      const len = r.suffix != null ? r.suffix : r.length ?? obj.size - start;
      h.set("content-range", `bytes ${start}-${start + len - 1}/${obj.size}`);
      h.set("content-length", String(len));
      return new Response(obj.body, { status: 206, headers: h });
    }
    h.set("content-length", String(obj.size));
    return new Response(obj.body, { headers: h });
  },
};
