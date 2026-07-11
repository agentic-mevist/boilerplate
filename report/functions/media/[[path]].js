// Stream R2 objects (videos/avatars) same-origin so they sit behind the password gate.
// Supports HTTP Range requests for video seeking.
export async function onRequestGet(context) {
  const { params, env, request } = context;
  const key = Array.isArray(params.path) ? params.path.join("/") : String(params.path || "");
  if (!key) return new Response("Bad request", { status: 400 });

  const rangeHeader = request.headers.get("Range");
  let object;
  let rangeOpts;

  if (rangeHeader) {
    const m = rangeHeader.match(/bytes=(\d*)-(\d*)/);
    if (m) {
      const start = m[1] === "" ? undefined : parseInt(m[1], 10);
      const end = m[2] === "" ? undefined : parseInt(m[2], 10);
      if (start !== undefined && end !== undefined) rangeOpts = { offset: start, length: end - start + 1 };
      else if (start !== undefined) rangeOpts = { offset: start };
      else if (end !== undefined) rangeOpts = { suffix: end };
    }
  }

  object = await env.MEDIA.get(key, rangeOpts ? { range: rangeOpts } : undefined);
  if (!object) return new Response("Not found", { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("ETag", object.httpEtag);
  headers.set("Accept-Ranges", "bytes");
  headers.set("Cache-Control", "private, max-age=604800");

  if (rangeOpts && object.range) {
    const offset = object.range.offset ?? 0;
    const length = object.range.length ?? object.size - offset;
    headers.set("Content-Range", `bytes ${offset}-${offset + length - 1}/${object.size}`);
    headers.set("Content-Length", String(length));
    return new Response(object.body, { status: 206, headers });
  }

  headers.set("Content-Length", String(object.size));
  return new Response(object.body, { status: 200, headers });
}
