// Calorie tracker — Cloudflare Worker: JSON API under /api/*, static assets otherwise.

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' };

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function bad(msg, status = 400) {
  return json({ error: msg }, status);
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function num(v, { min = 0, max = 100000 } = {}) {
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return Math.round(n * 10) / 10;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) {
      return env.ASSETS.fetch(request);
    }

    // Auth: every API call carries the PIN set as a Worker secret.
    const pin = request.headers.get('x-pin') || '';
    if (!env.APP_PIN || pin !== env.APP_PIN) {
      return bad('unauthorized', 401);
    }

    try {
      return await route(request, env, url);
    } catch (err) {
      return bad(`server error: ${err.message}`, 500);
    }
  },
};

async function route(request, env, url) {
  const { pathname } = url;
  const method = request.method;
  const db = env.DB;

  // ---- day view -------------------------------------------------------
  if (method === 'GET' && pathname === '/api/day') {
    const date = url.searchParams.get('date');
    if (!DATE_RE.test(date || '')) return bad('date required (YYYY-MM-DD)');
    const [entries, weight] = await Promise.all([
      db.prepare('SELECT * FROM entries WHERE date = ? ORDER BY id').bind(date).all(),
      db.prepare('SELECT kg FROM weights WHERE date = ?').bind(date).first(),
    ]);
    return json({ entries: entries.results, weight: weight ? weight.kg : null });
  }

  // ---- entries --------------------------------------------------------
  if (method === 'POST' && pathname === '/api/entries') {
    const b = await request.json();
    if (!DATE_RE.test(b.date || '')) return bad('invalid date');
    const name = String(b.name || '').trim().slice(0, 120);
    if (!name) return bad('name required');
    const kcal = num(b.kcal);
    const protein = num(b.protein), carbs = num(b.carbs), fat = num(b.fat);
    if (kcal === null || protein === null || carbs === null || fat === null) {
      return bad('invalid macros');
    }
    const grams = b.grams == null ? null : num(b.grams, { min: 0.1 });
    const r = await db
      .prepare('INSERT INTO entries (date, name, grams, kcal, protein, carbs, fat) VALUES (?,?,?,?,?,?,?)')
      .bind(b.date, name, grams, kcal, protein, carbs, fat)
      .run();
    return json({ id: r.meta.last_row_id }, 201);
  }

  let m = pathname.match(/^\/api\/entries\/(\d+)$/);
  if (method === 'DELETE' && m) {
    await db.prepare('DELETE FROM entries WHERE id = ?').bind(Number(m[1])).run();
    return json({ ok: true });
  }

  // ---- weight ---------------------------------------------------------
  if (method === 'PUT' && pathname === '/api/weight') {
    const b = await request.json();
    if (!DATE_RE.test(b.date || '')) return bad('invalid date');
    const kg = num(b.kg, { min: 20, max: 400 });
    if (kg === null) return bad('invalid weight');
    await db
      .prepare('INSERT INTO weights (date, kg) VALUES (?, ?) ON CONFLICT(date) DO UPDATE SET kg = excluded.kg')
      .bind(b.date, kg)
      .run();
    return json({ ok: true });
  }

  m = pathname.match(/^\/api\/weight\/(\d{4}-\d{2}-\d{2})$/);
  if (method === 'DELETE' && m) {
    await db.prepare('DELETE FROM weights WHERE date = ?').bind(m[1]).run();
    return json({ ok: true });
  }

  // ---- history (charts) -----------------------------------------------
  if (method === 'GET' && pathname === '/api/history') {
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    if (!DATE_RE.test(from || '') || !DATE_RE.test(to || '')) return bad('from/to required');
    const [days, weights] = await Promise.all([
      db.prepare(
        `SELECT date, ROUND(SUM(kcal),1) kcal, ROUND(SUM(protein),1) protein,
                ROUND(SUM(carbs),1) carbs, ROUND(SUM(fat),1) fat
         FROM entries WHERE date BETWEEN ? AND ? GROUP BY date ORDER BY date`
      ).bind(from, to).all(),
      db.prepare('SELECT date, kg FROM weights WHERE date BETWEEN ? AND ? ORDER BY date')
        .bind(from, to).all(),
    ]);
    return json({ days: days.results, weights: weights.results });
  }

  // ---- custom foods ---------------------------------------------------
  if (method === 'GET' && pathname === '/api/foods') {
    const r = await db.prepare('SELECT * FROM foods ORDER BY name').all();
    return json({ foods: r.results });
  }

  if (method === 'POST' && pathname === '/api/foods') {
    const b = await request.json();
    const name = String(b.name || '').trim().slice(0, 120);
    if (!name) return bad('name required');
    const kcal = num(b.kcal), protein = num(b.protein), carbs = num(b.carbs), fat = num(b.fat);
    if (kcal === null || protein === null || carbs === null || fat === null) {
      return bad('invalid macros');
    }
    const serving = b.serving_g == null ? null : num(b.serving_g, { min: 1 });
    const r = await db
      .prepare('INSERT INTO foods (name, kcal, protein, carbs, fat, serving_g) VALUES (?,?,?,?,?,?)')
      .bind(name, kcal, protein, carbs, fat, serving)
      .run();
    return json({ id: r.meta.last_row_id }, 201);
  }

  m = pathname.match(/^\/api\/foods\/(\d+)$/);
  if (method === 'DELETE' && m) {
    await db.prepare('DELETE FROM foods WHERE id = ?').bind(Number(m[1])).run();
    return json({ ok: true });
  }

  // ---- settings -------------------------------------------------------
  if (method === 'GET' && pathname === '/api/settings') {
    const r = await db.prepare('SELECT key, value FROM settings').all();
    const out = {};
    for (const row of r.results) out[row.key] = JSON.parse(row.value);
    return json(out);
  }

  if (method === 'PUT' && pathname === '/api/settings') {
    const b = await request.json();
    const allowed = ['kcal_target', 'protein_target', 'carbs_target', 'fat_target', 'unit'];
    const stmts = [];
    for (const key of allowed) {
      if (key in b) {
        stmts.push(
          db.prepare(
            'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
          ).bind(key, JSON.stringify(b[key]))
        );
      }
    }
    if (stmts.length) await db.batch(stmts);
    return json({ ok: true });
  }

  return bad('not found', 404);
}
