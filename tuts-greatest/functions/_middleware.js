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
<title>Величайшие песни всех времён</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
<style>
  :root{--red:#ec1c24}
  *{box-sizing:border-box}
  body{margin:0;min-height:100vh;background:#fff;color:#111;font:16px/1.5 Inter,system-ui,sans-serif;display:flex;flex-direction:column}
  .bar{background:#111;color:#fff;font:800 11px/1 Inter,sans-serif;letter-spacing:.18em;text-transform:uppercase;padding:10px 16px;text-align:center}
  .bar b{color:var(--red)}
  main{flex:1;display:grid;place-items:center;padding:28px 18px}
  .wrap{width:min(440px,100%);text-align:center}
  .kicker{color:var(--red);font:800 12px/1 Inter,sans-serif;letter-spacing:.2em;text-transform:uppercase}
  h1{font:900 clamp(40px,11vw,64px)/1.04 "Playfair Display",Georgia,serif;letter-spacing:-.02em;margin:14px 0 12px}
  h1 i{font-style:italic;font-weight:700;color:var(--red)}
  .sub{color:#555;margin:0 0 26px}
  .disc{width:118px;height:118px;margin:0 auto 22px;border-radius:50%;background:radial-gradient(circle,#ec1c24 0 17%,#111 18% 20%,#222 21% 30%,#111 31% 40%,#222 41% 50%,#111 51% 60%,#222 61% 70%,#111 71%);box-shadow:0 14px 34px rgba(0,0,0,.25);animation:spin 6s linear infinite;position:relative}
  .disc:after{content:"";position:absolute;inset:47%;border-radius:50%;background:#fff}
  @keyframes spin{to{transform:rotate(360deg)}}
  form{display:flex;flex-direction:column;gap:10px}
  input{padding:14px 16px;border:2px solid #111;border-radius:0;font:600 17px Inter,sans-serif;text-align:center;outline:none}
  input:focus{border-color:var(--red)}
  button{padding:15px;border:0;background:var(--red);color:#fff;font:800 14px Inter,sans-serif;letter-spacing:.16em;text-transform:uppercase;cursor:pointer}
  button:hover{background:#111}
  .err{color:var(--red);font-weight:600;margin-top:4px}
  .foot{font:600 11px Inter,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#999;padding:16px;text-align:center}
</style></head><body>
<div class="bar">Туц Туц Квиз · <b>500</b> песен · тренажёр</div>
<main><div class="wrap">
  <div class="disc" aria-hidden="true"></div>
  <div class="kicker">По версии журнала Rolling Stone</div>
  <h1>Величайшие песни <i>всех времён</i></h1>
  <p class="sub">Закрытый тренажёр к музыкальному квизу</p>
  <form method="POST" action="/__login">
    <input type="password" name="password" placeholder="Пароль" autocomplete="current-password" autofocus required>
    <button type="submit">Войти</button>
    ${error ? '<div class="err">Неверный пароль</div>' : ''}
  </form>
</div></main>
<div class="foot">Неофициальный учебный проект</div>
</body></html>`;
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
