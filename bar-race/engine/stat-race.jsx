(function () {
const MOTION = {
  enter: (t) => Easing.easeOutCubic(clamp(t, 0, 1)),
  pop: (t) => Easing.easeOutBack(clamp(t, 0, 1)),
  draw: (t) => Easing.easeInOutCubic(clamp(t, 0, 1)),
};
// Brand constants — same in every video
const FONT = "'Bricolage Grotesque', sans-serif";
const W = 1080, PAD = 64, RX = 940, SAFE_TOP = 220, SAFE_BOTTOM = 1540;
const BAR_X = 270, MAX_W = 520, ROWS_TOP = 556, ROW_H = 58, ROWS = 10;
// row slot 11 (index ROWS) is reserved for the spotlight; the note sits under it, the card under that
const NOTE_TOP = ROWS_TOP + (ROWS + 1) * ROW_H;
const CARD_TOP = 1222, CARD_H = 318, YEAR_SIZE = 190;

function valOf(kf, y) {
  const f = kf[0], l = kf[kf.length - 1];
  if (y <= f[0]) return f[1] * clamp((y - (f[0] - 8)) / 8, 0, 1);
  if (y >= l[0]) return l[1] * clamp(1 - (y - l[0]) / 10, 0, 1);
  for (let i = 0; i < kf.length - 1; i++) if (y <= kf[i + 1][0]) { const a = kf[i], b = kf[i + 1]; return a[1] + (b[1] - a[1]) * (y - a[0]) / (b[0] - a[0]); }
  return 0;
}
const DATASETS = {};
function dataset(id, topic) {
  if (DATASETS[id]) return DATASETS[id];
  const names = Object.keys(topic.raw).map((n) => ({ name: n, kf: topic.raw[n].trim().split(/\s+/).map((p) => p.split(':').map(Number)) }));
  const N = names.length, idx = {}; names.forEach((n, i) => (idx[n.name] = i));
  const [y0, y1] = topic.range, cache = new Map();
  const ranksAt = (y) => {
    y = Math.max(y0, Math.min(y1, y));
    const key = Math.round(y * 100); let c = cache.get(key); if (c) return c;
    if (cache.size > 12000) cache.clear();
    const vals = new Float64Array(N);
    for (let i = 0; i < N; i++) vals[i] = valOf(names[i].kf, key / 100);
    const order = Array.from({ length: N }, (_, i) => i).sort((a, b) => vals[b] - vals[a]);
    const rank = new Int16Array(N); order.forEach((k, j) => (rank[k] = j));
    c = { vals, order, rank }; cache.set(key, c); return c;
  };
  const changes = []; let last = -1;
  for (let y = y0; y <= y1 + 1e-6; y += 0.05) { const l = ranksAt(y).order[0]; if (l !== last) { if (last >= 0) changes.push({ y, idx: l }); last = l; } }
  return (DATASETS[id] = { names, N, idx, ranksAt, changes });
}
function smoothState(D, yearOfT, T) {
  const S = 13, span = 0.6, N = D.N, rk = new Float64Array(N), vals = new Float64Array(N); let mx = 0, ws = 0;
  for (let k = 0; k < S; k++) {
    const u = k / (S - 1), w = 0.5 - 0.5 * Math.cos(2 * Math.PI * (k + 0.5) / S);
    const r = D.ranksAt(yearOfT(T + (u - 0.5) * span));
    for (let i = 0; i < N; i++) { rk[i] += r.rank[i] * w; vals[i] += r.vals[i] * w; }
    mx += r.vals[r.order[0]] * w; ws += w;
  }
  for (let i = 0; i < N; i++) { rk[i] /= ws; vals[i] /= ws; }
  return { rk, vals, max: mx / ws, now: D.ranksAt(yearOfT(T)), ahead: D.ranksAt(yearOfT(T + span / 2)), prev: D.ranksAt(yearOfT(T - 0.9)) };
}

// Odometer: each digit cell is as wide as its actual glyph (proportional figures),
// and the cell width tweens while a digit rolls — no uneven gaps, no clipping.
const _ctx = document.createElement('canvas').getContext('2d');
const _w = {};
function glyphW(d, size) {
  const font = `800 ${size}px ${FONT}`, k = font + d;
  if (_w[k]) return _w[k];
  _ctx.font = font; const w = _ctx.measureText(String(d)).width;
  if (document.fonts && document.fonts.check(font)) _w[k] = w;
  return w;
}
function YearOdo({ year, color, size, final }) {
  const base = Math.floor(year), frac = year - base;
  const roll = year >= final ? 0 : MOTION.draw((frac - 0.55) / 0.45);
  const digits = [];
  for (let i = 0; i < 4; i++) {
    const p = 3 - i, pw = Math.pow(10, p);
    const d = Math.floor(base / pw) % 10, n = (d + 1) % 10;
    const r = (p === 0 || (base % pw) === pw - 1) ? roll : 0;
    const cw = glyphW(d, size) * (1 - r) + glyphW(n, size) * r;
    digits.push(
      <div key={i} style={{ width: cw, height: size, position: 'relative', clipPath: 'inset(0 -60px)' }}>
        <div style={{ position: 'absolute', left: '50%', top: 0, transform: `translate(-50%, ${-r * size}px)` }}>
          {[d, n].map((v, k) => <div key={k} style={{ height: size, lineHeight: `${size}px`, textAlign: 'center' }}>{v}</div>)}
        </div>
      </div>
    );
  }
  return <div style={{ display: 'flex', fontFamily: FONT, fontSize: size, fontWeight: 800, color, letterSpacing: 0 }}>{digits}</div>;
}

function Piece({ topic, id, safe }) {
  const { T, CUES } = useComposition();
  const th = topic.skin, D = dataset(id, topic), [Y0, Y1] = topic.range;
  const end = CUES.Outro;
  const A = (topic.anchors || [[0, Y0], [1, Y1]]).map(([k, y]) => [typeof k === 'string' ? CUES[k] : k * end, y]);
  const yearAt = (t) => {
    if (t <= A[0][0]) return A[0][1];
    for (let i = 0; i < A.length - 1; i++) if (t <= A[i + 1][0]) return A[i][1] + (A[i + 1][1] - A[i][1]) * (t - A[i][0]) / (A[i + 1][0] - A[i][0]);
    return Y1;
  };
  const tOf = (y) => {
    if (y <= A[0][1]) return A[0][0];
    for (let i = 0; i < A.length - 1; i++) if (y <= A[i + 1][1]) return A[i][0] + (A[i + 1][0] - A[i][0]) * (y - A[i][1]) / (A[i + 1][1] - A[i][1]);
    return A[A.length - 1][0];
  };
  const year = yearAt(T);
  const st = smoothState(D, yearAt, T);
  const scaleMax = topic.fixedMax || st.max;
  const od = T - end;
  const outroDim = MOTION.draw((od - 0.3) / 0.9);

  let ch = null; for (const c of D.changes) if (c.y <= year + 0.001) ch = c;
  const dtCh = ch ? T - tOf(ch.y) : 99;
  const cam = 1 + 0.015 * (T / (end + 5));

  let featIdx = -1, featAmt = 0, featSet = new Set();
  const cards = topic.events.map((e, k) => {
    const tIn = k === 0 ? -5 : tOf(e.from) - 0.7;
    const tOut = k === topic.events.length - 1 ? end + 0.4 : tOf(e.to);
    const p = MOTION.draw((T - tIn) / 0.7);
    const x = MOTION.draw((T - (tOut - 0.7)) / 0.7);
    const vis = p * (1 - x);
    if (vis > featAmt) {
      featAmt = vis; featIdx = D.idx[e.name] ?? -1;
      featSet = new Set((e.names && e.names.length ? e.names : [e.name]).map((n) => D.idx[n]).filter((k) => k != null));
    }
    return { e, k, p, x, vis };
  });

  // topic.highlight: how the card's name is marked on the board
  //   ring: outline the bar · dim: fade the rest of the board by this much (0..1)
  //   band: a pill behind the whole row · badge: the card photo rides on the bar tip
  const HL = Object.assign({ ring: true, dim: topic.dimOthers === false ? 0 : 0.5, band: false, badge: false },
    topic.highlight, window.RACE_HL_OVERRIDE);
  let featImg = null, featFocus = '50% 20%';
  for (const c of cards) if (c.vis === featAmt && featAmt > 0 && c.e.image && !(c.e.names && c.e.names.length > 1)) { featImg = c.e.image; featFocus = c.e.focus || featFocus; }
  const totalAt = topic.totals ? ((kf) => (y) => valOf(kf, y))(topic.totals.trim().split(/\s+/).map((p) => p.split(':').map(Number))) : null;
  const bands = [];
  const leadIdx = st.now.order[0];
  const leadName = D.names[leadIdx].name;
  const rows = [];
  // topic.spotlight: a featured name still outside the top 10 rides in an extra
  // row under the chart (with its true rank), so a card can start when the climb starts
  let spotAmt = 0;
  let spotRowAmt = 0;
  if (topic.spotlight) for (const k of featSet) if (st.rk[k] > ROWS - 0.9) spotRowAmt = featAmt;
  for (let i = 0; i < D.N; i++) {
    const isSpot = topic.spotlight && featSet.has(i) && st.rk[i] > ROWS - 0.9;
    const r = isSpot ? Math.min(st.rk[i], ROWS) : st.rk[i];
    if (isSpot) spotAmt = Math.max(spotAmt, featAmt);
    if (r > 10.1 && !isSpot) continue;
    const v = st.vals[i];
    const movingDown = st.ahead.rank[i] > r + 0.02;
    const lab = movingDown ? clamp(1 - Math.abs(r - Math.round(r)) * 5, 0, 1) : 1;
    const w = Math.max(8, Math.min(MAX_W * 1.03, MAX_W * v / scaleMax));
    // while a spotlight is shown, the row leaving the top 10 clears out of its way early
    const spotClear = topic.spotlight && !isSpot ? 1 - spotRowAmt * clamp((r - 9.1) / 0.4, 0, 1) : 1;
    // a row leaving the top 10 is gone before it reaches slot 11 (reserved for the spotlight)
    const op = isSpot ? featAmt : clamp((9.65 - r) / 0.5, 0, 1) * spotClear;
    const isLead = i === leadIdx, isFeat = featSet.has(i);
    const trueRank = isSpot && topic.trueRank && topic.trueRank[D.names[i].name]
      ? Math.round(valOf(topic.trueRank[D.names[i].name].trim().split(/\s+/).map((p) => p.split(':').map(Number)), year)) : 0;
    const up = clamp(st.prev.rank[i] - st.now.rank[i], 0, 1) * (1 - outroDim);
    const color = th.palette[i % th.palette.length];
    const dim = (1 - HL.dim * featAmt * (isFeat ? 0 : 1)) * (1 - 0.7 * outroDim * (isLead ? 0 : 1));
    const ring = isFeat && HL.ring ? `, ${th.ring.replace(/(\d+)px ([#\w(),. ]+)$/, (m, a, b) => `${(+a * featAmt).toFixed(1)}px ${b}`)}` : '';
    const y = ROWS_TOP + r * ROW_H;
    const nm = D.names[i].name;
    const BD = th.barH + 14, badge = isFeat && HL.badge && featImg;
    const labX = BAR_X + (badge ? Math.max(w, BD - 6) : w) + 16;
    const count = totalAt ? Math.round(v / 100 * totalAt(year)) : null;
    if (isFeat && HL.band) bands.push(
      <div key={nm} style={{ position: 'absolute', left: PAD - 26, width: RX - PAD + 30, top: y - 6, height: th.barH + 12, opacity: op * featAmt,
        background: 'rgba(255,255,255,0.6)', border: '3px solid #111111', borderRadius: 999, boxSizing: 'border-box' }}></div>
    );
    rows.push(
      <div key={nm} style={{ opacity: op * dim }}>
        <div style={{
          position: 'absolute', left: PAD - 20, width: BAR_X - PAD - 2, top: y, height: th.barH, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', opacity: lab,
          fontFamily: FONT, fontSize: Math.min(32, 200 / (0.56 * nm.length)), fontWeight: 800, color: th.ink, whiteSpace: 'nowrap',
        }}>{nm}</div>
        <div style={{
          position: 'absolute', left: BAR_X, top: y, height: th.barH, width: w,
          background: th.barBg(color), clipPath: th.clip || 'none', borderRadius: th.radius, border: th.border, boxSizing: 'border-box',
          boxShadow: th.shadow(color, up) + ring, transform: `scaleY(${1 + 0.1 * up})`, transformOrigin: 'left center',
          filter: up > 0.05 ? `brightness(${1 + 0.2 * up})` : 'none',
        }}></div>
        {badge ? <div style={{ position: 'absolute', left: BAR_X + Math.max(0, w - BD + 6), top: y + th.barH / 2 - BD / 2, width: BD, height: BD, borderRadius: BD,
          border: '4px solid #111111', boxSizing: 'border-box', overflow: 'hidden', background: th.monoBg, opacity: featAmt, transform: `scale(${0.6 + 0.4 * featAmt})` }}>
          <img src={featImg} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: featFocus }} />
        </div> : null}
        <div style={{
          position: 'absolute', left: labX, top: y, opacity: lab, height: th.barH, display: 'flex', alignItems: 'center', gap: 8,
          fontFamily: FONT, fontSize: 24, fontWeight: isLead || isFeat ? 800 : 500, color: th.ink, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
        }}>
          {count != null ? (
            <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.02 }}>
              <span style={{ fontSize: 23 }}>{topic.fmt(v)}</span>
              <span style={{ fontSize: 15, fontWeight: 600, color: th.muted }}>{count.toLocaleString('en-US')} {topic.countUnit || ''}</span>
            </span>
          ) : <span>{topic.fmt(v)}</span>}
          {trueRank > 10 ? <span style={{ fontSize: 18, fontWeight: 800, padding: '3px 10px', background: th.tagBg, color: th.tagInk, border: th.tagBorder || 'none', borderRadius: 999 }}>#{trueRank}</span> : null}
          <span style={{ color: th.upColor, fontSize: 20, opacity: up, transform: `translateY(${(1 - up) * 10}px)` }}>▲</span>
        </div>
      </div>
    );
  }

  const prog = (Math.min(year, Y1) - Y0) / (Y1 - Y0);
  const trackW = RX - PAD;
  const newBadge = dtCh >= 0 && dtCh < 2.6 && ch ? MOTION.enter(dtCh / 0.4) * (1 - MOTION.draw((dtCh - 2.1) / 0.5)) : 0;
  const leadPop = dtCh >= 0 ? MOTION.enter(dtCh / 0.6) : 1;
  const finP = MOTION.draw((od - 0.4) / 0.7);
  const fin2 = MOTION.enter((od - 1.2) / 0.6);
  const fin3 = MOTION.enter((od - 2.0) / 0.8);
  const pill = th.cardRadius > 8 ? 999 : 0;

  return (
    <div data-screen-label={`t=${Math.floor(T)}s`} style={{ position: 'absolute', inset: 0, background: th.bg, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: th.pattern }}></div>
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${cam})`, transformOrigin: '50% 38%' }}>

        <div style={{ position: 'absolute', left: PAD, top: SAFE_TOP + 8, right: W - RX, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 20 }}>
          <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 38, color: th.ink, letterSpacing: '-0.01em', lineHeight: 1.05 }}>{topic.title}</div>
          <div style={{ fontFamily: FONT, fontSize: 22, fontWeight: 600, color: th.muted, letterSpacing: '0.14em', textTransform: 'uppercase' }}>{topic.region}</div>
        </div>

        <div style={{ position: 'absolute', left: PAD - 6, top: 272, height: YEAR_SIZE }}>
          <YearOdo year={year} color={th.yearColor} size={YEAR_SIZE} final={Y1}></YearOdo>
        </div>

        <div style={{ position: 'absolute', right: W - RX, top: 318, width: 320, textAlign: 'right' }}>
          <div style={{ position: 'absolute', right: 0, top: -44, display: 'flex', opacity: clamp(newBadge, 0, 1), transform: `translateX(${(1 - newBadge) * 20}px)` }}>
            <div style={{ fontFamily: FONT, fontSize: 18, fontWeight: 800, letterSpacing: '0.12em', padding: '6px 14px', background: th.tagBg, color: th.tagInk, border: th.tagBorder || 'none', borderRadius: pill }}>NEW #1</div>
          </div>
          <div style={{ fontFamily: FONT, fontSize: 20, fontWeight: 600, color: th.muted, letterSpacing: '0.16em', textTransform: 'uppercase' }}>{topic.leadLabel}</div>
          <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: Math.min(42, 320 / (0.58 * leadName.length)), lineHeight: 1.1, marginTop: 8, color: th.ink, opacity: leadPop, transform: `translateY(${(1 - leadPop) * 18}px)`, whiteSpace: 'nowrap' }}>{leadName}</div>
        </div>

        <div style={{ position: 'absolute', left: PAD, top: 474, width: trackW, height: 8, background: th.track, borderRadius: 4 }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: trackW * prog, background: th.trackFill, borderRadius: 4 }}></div>
          <div style={{ position: 'absolute', left: trackW * prog - 11, top: -7, width: 22, height: 22, borderRadius: 11, background: th.palette[0], border: `3px solid ${th.bg}`, boxSizing: 'border-box' }}></div>
        </div>
        <div style={{ position: 'absolute', left: PAD, top: 494, width: trackW, height: 24 }}>
          {topic.ticks.map((yy, k) => (
            <div key={yy} style={{ position: 'absolute', left: trackW * (yy - Y0) / (Y1 - Y0), transform: `translateX(${k === 0 ? 0 : k === topic.ticks.length - 1 ? -100 : -50}%)`, fontFamily: FONT, fontSize: 20, color: year >= yy ? th.ink : th.muted, fontWeight: 500 }}>{yy}</div>
          ))}
        </div>

        {bands}
        {rows}

        <div style={{ position: 'absolute', left: BAR_X, top: NOTE_TOP, fontFamily: FONT, fontSize: 18, color: th.muted, opacity: 1 - outroDim, whiteSpace: 'nowrap' }}>
          {topic.note}{totalAt ? ` · ${Math.min(Math.floor(year), Y1)}: ${(Math.round(totalAt(Math.min(Math.floor(year), Y1)) / 1000) * 1000).toLocaleString('en-US')} ${topic.totalLabel || ''}` : ''}
        </div>

        {cards.map(({ e, k, p, x, vis }) => vis <= 0.001 ? null : (
          <div key={k} style={{ position: 'absolute', left: PAD, top: CARD_TOP, width: RX - PAD, height: CARD_H, transform: `translateX(${(1 - p) * 1100 - x * 1100}px)` }}>
            <CardBody e={e} th={th} p={p}></CardBody>
          </div>
        ))}

        <div style={{ position: 'absolute', left: PAD, top: CARD_TOP, width: RX - PAD, height: CARD_H, transform: `translateX(${(1 - finP) * 1100}px)`, visibility: finP > 0 ? 'visible' : 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: th.cardBg, border: th.cardBorder, borderTop: th.cardTop || th.cardBorder, boxShadow: th.cardShadow, borderRadius: th.cardRadius, boxSizing: 'border-box', padding: '30px 40px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontFamily: FONT, fontSize: 22, fontWeight: 700, color: th.cardInk, letterSpacing: '0.16em', textTransform: 'uppercase' }}>{topic.outro.kicker}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 24, fontFamily: FONT, fontWeight: 800, fontSize: 72, lineHeight: 1, color: th.cardInk }}>
              <span>{topic.outro.a}</span>
              <span style={{ opacity: clamp(fin2, 0, 1), transform: `translateX(${(1 - fin2) * -30}px)` }}>→</span>
              <span style={{ opacity: clamp(fin2, 0, 1), transform: `translateX(${(1 - fin2) * 30}px)`, display: 'inline-block' }}>{topic.outro.b}</span>
            </div>
            <div style={{ fontFamily: FONT, fontSize: 26, lineHeight: 1.35, color: th.cardMuted, opacity: fin3, transform: `translateY(${(1 - fin3) * 20}px)`, maxWidth: 800, textWrap: 'pretty' }}>{topic.outro.line}</div>
          </div>
        </div>

        <div style={{ position: 'absolute', left: PAD, right: W - RX, top: 1560, textAlign: 'center', fontFamily: FONT, fontSize: 18, color: th.muted }}>{topic.source}</div>
      </div>
      {safe ? <SafeZones></SafeZones> : null}
    </div>
  );
}

function SafeZones() {
  const z = { position: 'absolute', background: 'repeating-linear-gradient(45deg, rgba(255,0,60,0.22) 0 14px, rgba(255,0,60,0.1) 14px 28px)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', fontSize: 22, fontWeight: 700, color: '#7A0020', letterSpacing: '0.08em' };
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <div style={{ ...z, left: 0, right: 0, top: 0, height: SAFE_TOP }}>TOP UI · 220px</div>
      <div style={{ ...z, left: 0, right: 0, top: SAFE_BOTTOM, bottom: 0 }}>CAPTION / AUDIO · 380px</div>
      <div style={{ ...z, left: RX, right: 0, top: SAFE_TOP, height: SAFE_BOTTOM - SAFE_TOP, writingMode: 'vertical-rl' }}>ACTION BUTTONS · 140px</div>
      <div style={{ position: 'absolute', left: PAD, top: SAFE_TOP, width: RX - PAD, height: SAFE_BOTTOM - SAFE_TOP, border: '3px dashed #FF003C', boxSizing: 'border-box' }}></div>
    </div>
  );
}

function CardBody({ e, th, p }) {
  const s = (d) => MOTION.enter(p * 1.6 - d);
  const pill = th.cardRadius > 8 ? 999 : 0;
  return (
    <div style={{ position: 'absolute', inset: 0, background: th.cardBg, border: th.cardBorder, borderTop: th.cardTop || th.cardBorder, boxShadow: th.cardShadow, borderRadius: th.cardRadius, boxSizing: 'border-box', padding: 26, display: 'grid', gridTemplateColumns: '190px minmax(0,1fr)', gap: 28 }}>
      <div style={{ position: 'relative', background: th.monoBg, borderRadius: th.monoRadius, border: th.monoBorder || 'none', boxSizing: 'border-box', overflow: 'hidden' }}>
        {e.image ? (
          <React.Fragment>
            <img src={e.image} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: e.focus || '50% 25%' }} />
            {e.stat ? <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '52%', background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.72) 100%)' }}></div> : null}
          </React.Fragment>
        ) : (
          <div style={{ position: 'absolute', left: 18, top: -8, fontFamily: FONT, fontWeight: 800, fontSize: 180, lineHeight: 1, color: th.monoInk }}>{e.name[0]}</div>
        )}
        {e.stat ? <div style={{ position: 'absolute', left: 18, bottom: 14, color: e.image ? '#FFFFFF' : th.monoInk }}>
          <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 44, lineHeight: 1 }}>{e.stat}</div>
          <div style={{ fontFamily: FONT, fontSize: 17, fontWeight: 600, marginTop: 4, letterSpacing: '0.04em' }}>{e.sub}</div>
        </div> : null}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: s(0), transform: `translateX(${(1 - s(0)) * 30}px)` }}>
          <div style={{ fontFamily: FONT, fontSize: 20, fontWeight: 700, color: th.cardInk, letterSpacing: '0.16em', textTransform: 'uppercase' }}>{e.kicker}</div>
          <div style={{ fontFamily: FONT, fontSize: 16, fontWeight: 800, padding: '5px 12px', background: th.tagBg, color: th.tagInk, border: th.tagBorder || 'none', borderRadius: pill, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{e.tag}</div>
        </div>
        <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 40, lineHeight: 1.05, color: th.cardInk, opacity: s(0.15), transform: `translateX(${(1 - s(0.15)) * 30}px)`, textWrap: 'balance' }}>{e.title}</div>
        <div style={{ fontFamily: FONT, fontSize: e.body.length > 125 ? 21 : 23, lineHeight: 1.32, color: th.cardMuted, opacity: s(0.3), transform: `translateX(${(1 - s(0.3)) * 30}px)`, textWrap: 'pretty' }}>{e.body}</div>
        {e.caption || e.credit ? (
          <div style={{ marginTop: 'auto', fontFamily: FONT, fontSize: 14, lineHeight: 1.2, color: th.cardMuted, opacity: 0.75 * s(0.45), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {e.caption ? <b>{e.caption}</b> : null}{e.caption && e.credit ? ' · ' : ''}{e.credit}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function StatRaceVideo(props) {
  const T = window.RACE_TOPICS;
  const id = T[props.topic] ? props.topic : 'girls';
  const topic = T[id];
  const safe = props.safeZones === true || props.safeZones === 'true';
  return (
    <CompositionStage width={1080} height={1920} scenes={(window.RACE_SCENES && window.RACE_SCENES[id]) || window.OM_SCENES} playback={window.OM_PLAYBACK} bg={topic.skin.bg}>
      <Piece key={id} topic={topic} id={id} safe={safe}></Piece>
    </CompositionStage>
  );
}
window.StatRaceVideo = StatRaceVideo;
})();
