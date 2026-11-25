// Password gate for the whole site (Cloudflare Pages Functions).
// The password lives in the SITE_PASSWORD secret; a successful login sets a
// cookie with a hash of it, so changing the secret logs everyone out.

const COOKIE = 'groove_auth';
const NOINDEX = 'noindex, nofollow, noarchive, nosnippet';

async function tokenFor(password) {
  const data = new TextEncoder().encode('groove-v1|' + password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function loginPage(error) {
  const html = `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="${NOINDEX}">
<title>Вход</title>
<style>
  body{margin:0;min-height:100vh;display:grid;place-items:center;background:radial-gradient(900px 500px at 70% -10%,#2a1d55 0,transparent 60%),#120d22;color:#ece7ff;font:16px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
  form{background:#221a40;border:1px solid #3a2e66;border-radius:18px;padding:28px 24px;width:min(340px,88vw);box-shadow:0 20px 60px rgba(0,0,0,.4);text-align:center}
  .orb{font-size:44px;filter:drop-shadow(0 0 14px #9b7bff)}
  h1{font-size:19px;margin:8px 0 16px}
  input{width:100%;box-sizing:border-box;padding:12px 14px;border-radius:12px;border:1px solid #3a2e66;background:#1b1433;color:#ece7ff;font-size:16px}
  button{margin-top:12px;width:100%;padding:12px;border:0;border-radius:12px;background:linear-gradient(135deg,#7c5cff,#b06cff);color:#fff;font-weight:600;font-size:16px;cursor:pointer}
  .err{color:#ff6b8b;font-size:14px;margin-top:10px}
</style></head><body>
<form method="POST" action="/__login">
  <div class="orb">🔮</div>
  <h1>Введите пароль</h1>
  <input type="password" name="password" autocomplete="current-password" autofocus required>
  <button type="submit">Войти</button>
  ${error ? '<div class="err">Неверный пароль</div>' : ''}
</form></body></html>`;
  return new Response(html, {
    status: 401,
    headers: { 'content-type': 'text/html; charset=utf-8', 'x-robots-tag': NOINDEX, 'cache-control': 'no-store' },
  });
}

export async function onRequest({ request, env, next }) {
  const url = new URL(request.url);
  const password = env.SITE_PASSWORD;
  if (!password) return new Response('Site password is not configured', { status: 503 });

  if (url.pathname === '/robots.txt') {
    return new Response('User-agent: *\nDisallow: /\n', { headers: { 'content-type': 'text/plain', 'x-robots-tag': NOINDEX } });
  }

  const token = await tokenFor(password);

  if (url.pathname === '/__login' && request.method === 'POST') {
    const form = await request.formData();
    if ((form.get('password') || '').toString().trim() === password) {
      return new Response(null, {
        status: 303,
        headers: {
          location: '/',
          'set-cookie': `${COOKIE}=${token}; Path=/; Max-Age=2592000; HttpOnly; Secure; SameSite=Lax`,
          'x-robots-tag': NOINDEX,
        },
      });
    }
    return loginPage(true);
  }

  const cookies = request.headers.get('cookie') || '';
  const ok = cookies.split(/;\s*/).some(c => c === `${COOKIE}=${token}`);
  if (!ok) return loginPage(false);

  const resp = await next();
  const out = new Response(resp.body, resp);
  out.headers.set('x-robots-tag', NOINDEX);
  return out;
}
