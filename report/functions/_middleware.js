// Password gate for the whole site (including /media/*).
// Correct password sets a signed cookie for 30 days.
const PASSWORD = "raccoon27";
const SALT = "lotos-report-v1";

async function tokenFor(pw) {
  const data = new TextEncoder().encode(`${pw}|${SALT}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function loginPage(wrong) {
  return `<!DOCTYPE html>
<html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Отчёт закрыт паролем</title>
<style>
:root{--page:#f9f9f7;--surface:#fcfcfb;--ink:#0b0b0b;--ink2:#52514e;--muted:#898781;--blue:#2a78d6;--border:rgba(11,11,11,.10);--critical:#d03b3b}
@media (prefers-color-scheme:dark){:root{--page:#0d0d0d;--surface:#1a1a19;--ink:#fff;--ink2:#c3c2b7;--border:rgba(255,255,255,.10);--blue:#3987e5}}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--page);color:var(--ink);font-family:system-ui,-apple-system,"Segoe UI",sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
.card{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:36px 32px;max-width:400px;width:100%;text-align:center}
.lotus{font-size:40px;margin-bottom:12px}
h1{font-size:19px;margin-bottom:6px;letter-spacing:-.01em}
p{color:var(--ink2);font-size:14px;margin-bottom:22px}
input{width:100%;padding:12px 14px;border:1px solid var(--border);border-radius:10px;background:var(--page);color:var(--ink);font-size:15px;margin-bottom:12px;outline:none}
input:focus{border-color:var(--blue)}
button{width:100%;padding:12px;border:none;border-radius:10px;background:var(--blue);color:#fff;font-size:15px;font-weight:600;cursor:pointer}
button:hover{filter:brightness(1.07)}
.err{color:var(--critical);font-size:13px;margin:-4px 0 12px}
</style></head><body>
<form class="card" method="POST" action="/unlock">
<div class="lotus">🪷</div>
<h1>Аудит и стратегия @lotosinbloom</h1>
<p>Отчёт закрыт. Введите пароль доступа.</p>
${wrong ? '<div class="err">Неверный пароль, попробуйте ещё раз</div>' : ""}
<input type="password" name="password" placeholder="Пароль" autofocus autocomplete="current-password">
<button type="submit">Открыть отчёт</button>
</form></body></html>`;
}

export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);
  const expected = await tokenFor(PASSWORD);

  const cookies = request.headers.get("Cookie") || "";
  const match = cookies.match(/lotos_auth=([a-f0-9]{64})/);
  if (match && match[1] === expected) {
    if (url.pathname === "/unlock") {
      return Response.redirect(new URL("/", url).toString(), 303);
    }
    return next();
  }

  if (request.method === "POST" && url.pathname === "/unlock") {
    let pw = "";
    try {
      const form = await request.formData();
      pw = String(form.get("password") || "");
    } catch (_) {}
    if (pw === PASSWORD) {
      return new Response(null, {
        status: 303,
        headers: {
          Location: new URL("/", url).toString(),
          "Set-Cookie": `lotos_auth=${expected}; Path=/; Max-Age=2592000; HttpOnly; Secure; SameSite=Lax`,
        },
      });
    }
    return new Response(loginPage(true), { status: 401, headers: { "Content-Type": "text/html;charset=utf-8" } });
  }

  return new Response(loginPage(false), { status: 401, headers: { "Content-Type": "text/html;charset=utf-8" } });
}
