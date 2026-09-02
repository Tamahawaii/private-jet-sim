// Generative editorial artwork for events, resorts, aircraft, yachts and
// residences. Pure SVG (crisp, tiny, offline). Each piece is deterministic
// from its id so a card always shows the same plate.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';

const W = 1200, H = 750;
const out = (dir, id, svg) => { mkdirSync(`public/art/${dir}`, { recursive: true }); writeFileSync(`public/art/${dir}/${id}.svg`, svg); };

function rng(seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => { h |= 0; h = (h + 0x6D2B79F5) | 0; let t = Math.imul(h ^ (h >>> 15), 1 | h); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ----------------------------------------------------------------- colour
function hsl(h, s, l, a = 1) { return `hsla(${((h % 360) + 360) % 360},${s}%,${l}%,${a})`; }

/** Palettes are [skyTop, skyBottom, far, mid, near, sun, accent] as hue/sat/light triplets. */
const PALETTES = {
  midnight: { sky: [[222, 60, 8], [214, 55, 16]], layers: [[212, 35, 26], [214, 40, 18], [218, 45, 10]], sun: [46, 90, 72], accent: [187, 80, 60] },
  desert: { sky: [[250, 45, 12], [22, 70, 40]], layers: [[24, 55, 38], [18, 55, 28], [14, 50, 16]], sun: [30, 100, 66], accent: [36, 90, 60] },
  dawn: { sky: [[218, 50, 12], [345, 60, 45]], layers: [[200, 30, 30], [205, 35, 20], [212, 40, 12]], sun: [28, 100, 70], accent: [350, 80, 70] },
  lagoon: { sky: [[196, 60, 14], [178, 60, 38]], layers: [[180, 40, 24], [190, 45, 16], [200, 50, 10]], sun: [48, 100, 76], accent: [170, 80, 60] },
  forest: { sky: [[160, 30, 9], [95, 30, 24]], layers: [[110, 30, 22], [120, 32, 15], [130, 35, 9]], sun: [52, 90, 72], accent: [95, 60, 55] },
  ember: { sky: [[268, 45, 10], [12, 70, 42]], layers: [[8, 45, 30], [4, 45, 20], [0, 40, 12]], sun: [18, 100, 62], accent: [30, 95, 62] },
  alpine: { sky: [[210, 55, 10], [206, 45, 30]], layers: [[208, 25, 45], [210, 30, 28], [214, 35, 14]], sun: [44, 90, 78], accent: [200, 70, 70] },
  gold: { sky: [[230, 40, 8], [40, 55, 26]], layers: [[36, 45, 30], [32, 45, 20], [28, 40, 12]], sun: [44, 100, 70], accent: [44, 90, 62] },
  rose: { sky: [[240, 40, 10], [330, 45, 36]], layers: [[320, 30, 28], [325, 35, 18], [330, 35, 10]], sun: [20, 100, 74], accent: [345, 80, 70] },
  savanna: { sky: [[258, 40, 10], [30, 75, 44]], layers: [[26, 60, 30], [22, 55, 22], [18, 45, 12]], sun: [16, 100, 60], accent: [40, 90, 60] },
  slate: { sky: [[220, 30, 8], [215, 25, 24]], layers: [[212, 20, 32], [214, 22, 22], [216, 25, 12]], sun: [200, 20, 82], accent: [187, 80, 60] },
};

function paletteFor(name, shift = 0) {
  const p = PALETTES[name] || PALETTES.midnight;
  const c = (t, a = 1) => hsl(t[0] + shift, t[1], t[2], a);
  return { skyTop: c(p.sky[0]), skyBot: c(p.sky[1]), far: c(p.layers[0]), mid: c(p.layers[1]), near: c(p.layers[2]), sun: c(p.sun), accent: c(p.accent), accentA: (a) => c(p.accent, a), sunA: (a) => c(p.sun, a) };
}

// ----------------------------------------------------------------- primitives
function defs(id, pal) {
  return `<defs>
    <linearGradient id="sky-${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${pal.skyTop}"/><stop offset="1" stop-color="${pal.skyBot}"/></linearGradient>
    <radialGradient id="glow-${id}" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${pal.sunA(0.55)}"/><stop offset="0.5" stop-color="${pal.sunA(0.12)}"/><stop offset="1" stop-color="${pal.sunA(0)}"/></radialGradient>
    <linearGradient id="vign-${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgba(0,0,0,0.25)"/><stop offset="0.35" stop-color="rgba(0,0,0,0)"/><stop offset="1" stop-color="rgba(0,0,0,0.45)"/></linearGradient>
    <clipPath id="clip-${id}"><rect width="${W}" height="${H}"/></clipPath>
  </defs>`;
}

function sun(pal, x, y, r) {
  return `<circle cx="${x}" cy="${y}" r="${r * 3.2}" fill="url(#GLOW)"/><circle cx="${x}" cy="${y}" r="${r}" fill="${pal.sun}"/>`;
}

function stars(r, n, yMax, color) {
  let s = '';
  for (let i = 0; i < n; i++) s += `<circle cx="${(r() * W).toFixed(0)}" cy="${(r() * yMax).toFixed(0)}" r="${(0.6 + r() * 1.6).toFixed(1)}" fill="${color}" opacity="${(0.25 + r() * 0.6).toFixed(2)}"/>`;
  return s;
}

/** Smooth wavy band (hills/dunes/sea) from y-baseline with amplitude. */
function wave(r, baseY, amp, freq, color, phase = 0) {
  const pts = [];
  const n = 14;
  for (let i = 0; i <= n; i++) {
    const x = (i / n) * W;
    const y = baseY + Math.sin(phase + (i / n) * Math.PI * freq) * amp + Math.sin(phase * 1.7 + (i / n) * Math.PI * freq * 2.3) * amp * 0.35;
    pts.push([x, y]);
  }
  let d = `M0 ${H} L0 ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    const cx = (x0 + x1) / 2;
    d += ` C${cx.toFixed(1)} ${y0.toFixed(1)} ${cx.toFixed(1)} ${y1.toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`;
  }
  d += ` L${W} ${H} Z`;
  return `<path d="${d}" fill="${color}"/>`;
}

/** Jagged mountain range. */
function peaks(r, baseY, height, n, color, snow) {
  let d = `M0 ${H} L0 ${baseY}`;
  const step = W / n;
  const tops = [];
  for (let i = 0; i <= n; i++) {
    const x = i * step + (r() - 0.5) * step * 0.4;
    const y = baseY - height * (0.35 + r() * 0.65);
    tops.push([x, y]);
    d += ` L${x.toFixed(1)} ${y.toFixed(1)}`;
    if (i < n) d += ` L${(x + step * 0.5).toFixed(1)} ${(baseY - height * r() * 0.25).toFixed(1)}`;
  }
  d += ` L${W} ${baseY} L${W} ${H} Z`;
  let s = `<path d="${d}" fill="${color}"/>`;
  if (snow) for (const [x, y] of tops) if (y < baseY - height * 0.6) s += `<path d="M${(x - 26).toFixed(1)} ${(y + 34).toFixed(1)} L${x.toFixed(1)} ${y.toFixed(1)} L${(x + 26).toFixed(1)} ${(y + 34).toFixed(1)} L${(x + 12).toFixed(1)} ${(y + 30).toFixed(1)} L${x.toFixed(1)} ${(y + 42).toFixed(1)} L${(x - 12).toFixed(1)} ${(y + 30).toFixed(1)} Z" fill="${snow}"/>`;
  return s;
}

function palm(x, y, h, color, lean = 0) {
  const top = y - h;
  let s = `<path d="M${x} ${y} Q${x + lean * 0.5} ${y - h * 0.5} ${x + lean} ${top}" stroke="${color}" stroke-width="${Math.max(4, h * 0.045)}" fill="none" stroke-linecap="round"/>`;
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI + (i / 6) * Math.PI;
    const len = h * (0.42 + (i % 2) * 0.12);
    const ex = x + lean + Math.cos(a) * len, ey = top + Math.sin(a) * len * 0.55 + len * 0.28;
    const cx = x + lean + Math.cos(a) * len * 0.5, cy = top - len * 0.2;
    s += `<path d="M${x + lean} ${top} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}" stroke="${color}" stroke-width="${Math.max(3, h * 0.05)}" fill="none" stroke-linecap="round"/>`;
  }
  return s;
}

function cypress(x, y, h, w, color) { return `<path d="M${x} ${y} L${x - w} ${y} Q${x - w * 0.9} ${y - h * 0.55} ${x} ${y - h} Q${x + w * 0.9} ${y - h * 0.55} ${x + w} ${y} Z" fill="${color}"/>`; }
function acacia(x, y, h, color) { return `<path d="M${x} ${y} L${x} ${y - h * 0.7}" stroke="${color}" stroke-width="${h * 0.05}"/><path d="M${x - h * 0.7} ${y - h * 0.62} Q${x} ${y - h * 1.15} ${x + h * 0.7} ${y - h * 0.62} Q${x} ${y - h * 0.5} ${x - h * 0.7} ${y - h * 0.62} Z" fill="${color}"/>`; }
function roundTree(x, y, h, color) { return `<rect x="${x - h * 0.05}" y="${y - h * 0.5}" width="${h * 0.1}" height="${h * 0.5}" fill="${color}"/><circle cx="${x}" cy="${y - h * 0.62}" r="${h * 0.38}" fill="${color}"/>`; }

function skyline(r, baseY, color, windows, n = 22) {
  let s = '';
  let x = -20;
  while (x < W + 20) {
    const w = 36 + r() * 90, h = 60 + r() * 300 * (0.4 + Math.sin((x / W) * Math.PI) * 0.6);
    s += `<rect x="${x.toFixed(0)}" y="${(baseY - h).toFixed(0)}" width="${w.toFixed(0)}" height="${h.toFixed(0)}" fill="${color}"/>`;
    if (r() > 0.6) s += `<rect x="${(x + w * 0.3).toFixed(0)}" y="${(baseY - h - 24 - r() * 40).toFixed(0)}" width="${(w * 0.4).toFixed(0)}" height="${60}" fill="${color}"/>`;
    if (windows) for (let wy = baseY - h + 12; wy < baseY - 14; wy += 16) for (let wx = x + 8; wx < x + w - 8; wx += 14) if (r() > 0.55) s += `<rect x="${wx.toFixed(0)}" y="${wy.toFixed(0)}" width="5" height="7" fill="${windows}" opacity="${(0.4 + r() * 0.6).toFixed(2)}"/>`;
    x += w + 6 + r() * 14;
  }
  return s;
}

function sea(pal, y, color, r) {
  let s = `<rect x="0" y="${y}" width="${W}" height="${H - y}" fill="${color}"/>`;
  for (let i = 0; i < 26; i++) {
    const yy = y + 8 + r() * (H - y - 30);
    const len = 40 + r() * 220, x = r() * W;
    s += `<rect x="${x.toFixed(0)}" y="${yy.toFixed(0)}" width="${len.toFixed(0)}" height="2" rx="1" fill="${pal.sunA(0.05 + r() * 0.16)}"/>`;
  }
  return s;
}

function sailboat(x, y, size, hull, sailC) {
  return `<path d="M${x - size * 0.5} ${y} L${x + size * 0.5} ${y} L${x + size * 0.36} ${y + size * 0.16} L${x - size * 0.4} ${y + size * 0.16} Z" fill="${hull}"/>
    <path d="M${x + 2} ${y - 2} L${x + 2} ${y - size * 1.1} L${x + size * 0.55} ${y - 6} Z" fill="${sailC}"/>
    <path d="M${x - 4} ${y - 4} L${x - 4} ${y - size * 0.9} L${x - size * 0.45} ${y - 10} Z" fill="${sailC}" opacity="0.85"/>`;
}

function beams(pal, n, r) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const x = 120 + (i / (n - 1)) * (W - 240);
    const tilt = (r() - 0.5) * 420;
    s += `<path d="M${x} ${H} L${(x + tilt - 90).toFixed(0)} -40 L${(x + tilt + 90).toFixed(0)} -40 Z" fill="${pal.accentA(0.10 + r() * 0.12)}"/>`;
  }
  return s;
}

function crowd(r, baseY, color) {
  let s = `<path d="M0 ${H} L0 ${baseY}`;
  for (let x = 0; x <= W; x += 18) s += ` L${x} ${(baseY - 10 - r() * 34).toFixed(0)} L${x + 9} ${(baseY - 24 - r() * 30).toFixed(0)}`;
  s += ` L${W} ${H} Z" fill="${color}"/>`;
  return s;
}

function frame(pal, id) {
  return `<rect x="0" y="0" width="${W}" height="${H}" fill="url(#vign-${id})"/><rect x="18" y="18" width="${W - 36}" height="${H - 36}" fill="none" stroke="rgba(255,255,255,0.10)" stroke-width="1.2"/>`;
}

function plate(id, pal, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${defs(id, pal)}<g clip-path="url(#clip-${id})"><rect width="${W}" height="${H}" fill="url(#sky-${id})"/>${body.replace(/url\(#GLOW\)/g, `url(#glow-${id})`)}${frame(pal, id)}</g></svg>`;
}

// ----------------------------------------------------------------- scenes
const SCENES = {
  dunes(r, pal) { const sx = 300 + r() * 600; return stars(r, 40, 260, pal.sunA(0.6)) + sun(pal, sx, 250, 70) + wave(r, 430, 40, 1.5, pal.far, 1) + wave(r, 500, 55, 2.2, pal.mid, 2.4) + wave(r, 600, 60, 1.6, pal.near, 4); },
  island(r, pal) { const sx = 250 + r() * 700; let s = stars(r, 30, 300, pal.sunA(0.5)) + sun(pal, sx, 330, 62) + sea(pal, 400, pal.mid, r); s += wave(r, 430, 14, 1.4, pal.near, 2.2); const n = 2 + Math.floor(r() * 2); for (let i = 0; i < n; i++) { const x = 160 + r() * (W - 320); s += palm(x, 640 + r() * 40, 220 + r() * 140, pal.near, (r() - 0.5) * 60); } s += wave(r, 690, 12, 1, pal.near, 1); return s; },
  coast(r, pal) { const sx = 500 + r() * 500; let s = stars(r, 26, 280, pal.sunA(0.5)) + sun(pal, sx, 300, 66) + sea(pal, 420, pal.mid, r); s += `<path d="M0 ${H} L0 260 L60 250 L110 300 L170 290 L230 360 L290 380 L330 430 L360 ${H} Z" fill="${pal.near}"/>`; s += `<path d="M${W} ${H} L${W} 380 L${W - 90} 400 L${W - 170} 470 L${W - 230} ${H} Z" fill="${pal.near}"/>`; for (let i = 0; i < 4; i++) { const x = 300 + r() * 500, y = 160 + r() * 120; s += `<path d="M${x - 12} ${y} Q${x - 4} ${y - 8} ${x} ${y - 2} Q${x + 4} ${y - 8} ${x + 12} ${y}" stroke="${pal.sunA(0.7)}" stroke-width="2" fill="none"/>`; } return s; },
  city(r, pal) { const sx = 400 + r() * 400; let s = stars(r, 60, 300, pal.sunA(0.6)) + sun(pal, sx, 300, 90) + skyline(r, 520, pal.far, null, 20) + skyline(r, 600, pal.near, pal.sunA(0.8), 26); s += `<rect x="0" y="600" width="${W}" height="${H - 600}" fill="${pal.near}"/>`; for (let i = 0; i < 40; i++) s += `<rect x="${(r() * W).toFixed(0)}" y="${(610 + r() * 120).toFixed(0)}" width="${(20 + r() * 80).toFixed(0)}" height="2" fill="${pal.sunA(0.08)}"/>`; return s; },
  garden(r, pal) { const sx = 200 + r() * 800; let s = stars(r, 20, 240, pal.sunA(0.4)) + sun(pal, sx, 280, 60) + wave(r, 470, 30, 1.2, pal.far, 0.5) + wave(r, 540, 40, 1.8, pal.mid, 1.8); for (let i = 0; i < 6; i++) s += roundTree(80 + r() * (W - 160), 600 + r() * 60, 120 + r() * 120, pal.near); s += cypress(950 + r() * 150, 690, 300, 22, pal.near) + wave(r, 690, 10, 1, pal.near, 0); return s; },
  country(r, pal) { const sx = 300 + r() * 600; let s = sun(pal, sx, 300, 58) + wave(r, 470, 35, 1.3, pal.far, 0.2) + wave(r, 550, 45, 1.9, pal.mid, 2); for (let i = 0; i < 5; i++) s += cypress(120 + i * 200 + r() * 80, 660, 200 + r() * 150, 16 + r() * 8, pal.near); for (let i = 0; i < 9; i++) s += `<path d="M${(i * 150 - 100).toFixed(0)} ${H} L${(i * 150 + 260).toFixed(0)} 620" stroke="${pal.sunA(0.10)}" stroke-width="3"/>`; s += wave(r, 680, 14, 1.1, pal.near, 1); return s; },
  mountain(r, pal) { const sx = 400 + r() * 400; let s = stars(r, 40, 320, pal.sunA(0.6)) + sun(pal, sx, 320, 70) + peaks(r, 520, 300, 6, pal.far, pal.sunA(0.35)) + peaks(r, 580, 220, 8, pal.mid, pal.sunA(0.25)) + `<rect x="0" y="580" width="${W}" height="${H - 580}" fill="${pal.near}"/>`; for (let i = 0; i < 14; i++) s += `<rect x="${(r() * W).toFixed(0)}" y="${(600 + r() * 120).toFixed(0)}" width="${(60 + r() * 200).toFixed(0)}" height="2" fill="${pal.sunA(0.12)}"/>`; return s; },
  safari(r, pal) { const sx = 300 + r() * 600; let s = sun(pal, sx, 330, 110) + wave(r, 520, 14, 1.2, pal.far, 0) + `<rect x="0" y="560" width="${W}" height="${H - 560}" fill="${pal.mid}"/>`; s += acacia(240 + r() * 200, 660, 260, pal.near) + acacia(800 + r() * 250, 690, 200, pal.near); for (let i = 0; i < 30; i++) s += `<path d="M${(r() * W).toFixed(0)} 700 l4 -22 l4 22" stroke="${pal.near}" stroke-width="2" fill="none"/>`; s += wave(r, 700, 8, 1, pal.near, 2); return s; },
  lake(r, pal) { const sx = 500 + r() * 300; let s = stars(r, 30, 300, pal.sunA(0.5)) + sun(pal, sx, 300, 62) + peaks(r, 470, 260, 7, pal.far, pal.sunA(0.3)) + peaks(r, 500, 150, 9, pal.mid, null) + sea(pal, 500, pal.near, r); s += `<circle cx="${sx}" cy="${560}" r="70" fill="url(#GLOW)"/>` + sailboat(300 + r() * 600, 610, 60, pal.mid, pal.sunA(0.9)); return s; },
  riad(r, pal) { let s = stars(r, 30, 200, pal.sunA(0.5)) + sun(pal, 600, 250, 50); const arch = (x, w, h, c) => `<path d="M${x - w / 2} ${H} L${x - w / 2} ${H - h + w / 2} A${w / 2} ${w / 2} 0 0 1 ${x + w / 2} ${H - h + w / 2} L${x + w / 2} ${H} Z" fill="${c}"/>`; s += `<rect x="0" y="420" width="${W}" height="${H - 420}" fill="${pal.mid}"/>`; for (let i = 0; i < 5; i++) s += arch(120 + i * 240, 170, 330, pal.near); s += `<rect x="0" y="520" width="${W}" height="${H - 520}" fill="${pal.near}"/>`; for (let i = 0; i < 5; i++) s += `<circle cx="${120 + i * 240}" cy="470" r="34" fill="url(#GLOW)"/><circle cx="${120 + i * 240}" cy="470" r="7" fill="${pal.sun}"/>`; return s; },
  festival(r, pal) { let s = stars(r, 50, 400, pal.sunA(0.5)) + beams(pal, 5, r); s += `<rect x="150" y="360" width="${W - 300}" height="16" fill="${pal.near}"/><rect x="170" y="200" width="6" height="170" fill="${pal.near}"/><rect x="${W - 176}" y="200" width="6" height="170" fill="${pal.near}"/>`; for (let i = 0; i < 40; i++) s += `<circle cx="${(r() * W).toFixed(0)}" cy="${(r() * 420).toFixed(0)}" r="${(2 + r() * 4).toFixed(1)}" fill="${pal.accentA(0.7)}"/>`; s += crowd(r, 560, pal.near); return s; },
  art(r, pal) { let s = `<rect x="0" y="0" width="${W}" height="${H}" fill="${pal.mid}"/><rect x="0" y="560" width="${W}" height="${H - 560}" fill="${pal.near}"/>`; const n = 3; for (let i = 0; i < n; i++) { const x = 130 + i * 340, y = 150 + (r() - 0.5) * 30, w = 260, h = 300; s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${pal.skyBot}" stroke="${pal.sunA(0.6)}" stroke-width="4"/>`; const k = Math.floor(r() * 3); if (k === 0) s += `<circle cx="${x + w / 2}" cy="${y + h / 2}" r="70" fill="${pal.accent}"/>`; else if (k === 1) s += `<path d="M${x + 40} ${y + h - 40} L${x + w / 2} ${y + 50} L${x + w - 40} ${y + h - 40} Z" fill="${pal.sun}"/>`; else s += `<rect x="${x + 50}" y="${y + 60}" width="${w - 100}" height="${h - 120}" fill="${pal.accentA(0.85)}" transform="rotate(${(r() * 10 - 5).toFixed(1)} ${x + w / 2} ${y + h / 2})"/>`; s += `<ellipse cx="${x + w / 2}" cy="${y - 40}" rx="120" ry="30" fill="url(#GLOW)"/>`; } return s; },
  motorsport(r, pal) { let s = stars(r, 24, 260, pal.sunA(0.4)) + sun(pal, 900, 240, 56) + wave(r, 430, 30, 1.2, pal.far, 1) + `<rect x="0" y="470" width="${W}" height="${H - 470}" fill="${pal.mid}"/>`; s += `<path d="M-100 700 C200 700 250 520 500 540 S800 700 1100 600 S1300 500 1350 520" stroke="${pal.near}" stroke-width="110" fill="none" stroke-linecap="round"/><path d="M-100 700 C200 700 250 520 500 540 S800 700 1100 600 S1300 500 1350 520" stroke="${pal.sunA(0.8)}" stroke-width="4" stroke-dasharray="30 26" fill="none"/>`; for (let i = 0; i < 12; i++) s += `<rect x="${60 + i * 28}" y="${i % 2 ? 470 : 484}" width="28" height="14" fill="${i % 2 ? pal.sunA(0.9) : pal.near}"/><rect x="${60 + i * 28}" y="${i % 2 ? 484 : 470}" width="28" height="14" fill="${i % 2 ? pal.near : pal.sunA(0.9)}"/>`; return s; },
  fashion(r, pal) { let s = stars(r, 20, 300, pal.sunA(0.4)) + beams(pal, 3, r); s += `<path d="M${W / 2 - 60} 320 L${W / 2 + 60} 320 L${W / 2 + 320} ${H} L${W / 2 - 320} ${H} Z" fill="${pal.sunA(0.85)}"/>`; s += `<path d="M${W / 2 - 60} 320 L${W / 2 + 60} 320 L${W / 2 + 320} ${H} L${W / 2 - 320} ${H} Z" fill="url(#GLOW)"/>`; s += crowd(r, 700, pal.near); s += `<path d="M0 ${H} L0 560 L${W / 2 - 300} 560 L${W / 2 - 330} ${H} Z" fill="${pal.near}"/><path d="M${W} ${H} L${W} 560 L${W / 2 + 300} 560 L${W / 2 + 330} ${H} Z" fill="${pal.near}"/>`; return s; },
  film(r, pal) { let s = stars(r, 40, 300, pal.sunA(0.5)); s += `<path d="M120 ${H} L500 -60 L620 -60 L260 ${H} Z" fill="${pal.accentA(0.16)}"/><path d="M${W - 120} ${H} L${W - 500} -60 L${W - 620} -60 L${W - 260} ${H} Z" fill="${pal.accentA(0.16)}"/>`; s += `<path d="M${W / 2 - 90} 380 L${W / 2 + 90} 380 L${W / 2 + 420} ${H} L${W / 2 - 420} ${H} Z" fill="${pal.accent}"/>`; s += crowd(r, 700, pal.near); s += `<circle cx="${W / 2}" cy="330" r="120" fill="url(#GLOW)"/>`; return s; },
  gala(r, pal) { let s = `<rect width="${W}" height="${H}" fill="${pal.near}"/>`; for (let row = 0; row < 3; row++) for (let i = 0; i < 9; i++) { const x = 160 + i * 110 + (row % 2) * 55, y = 120 + row * 70; s += `<line x1="${x}" y1="0" x2="${x}" y2="${y - 10}" stroke="${pal.sunA(0.35)}" stroke-width="1"/><circle cx="${x}" cy="${y}" r="26" fill="url(#GLOW)"/><circle cx="${x}" cy="${y}" r="5" fill="${pal.sun}"/>`; } s += `<path d="M0 0 L0 ${H} L140 ${H} Q120 400 180 0 Z" fill="${pal.mid}"/><path d="M${W} 0 L${W} ${H} L${W - 140} ${H} Q${W - 120} 400 ${W - 180} 0 Z" fill="${pal.mid}"/>`; s += crowd(r, 640, pal.skyTop); return s; },
  summit(r, pal) { return SCENES.mountain(r, pal); },
  regatta(r, pal) { const sx = 300 + r() * 600; let s = stars(r, 20, 260, pal.sunA(0.4)) + sun(pal, sx, 300, 64) + sea(pal, 420, pal.mid, r); const n = 3 + Math.floor(r() * 3); for (let i = 0; i < n; i++) s += sailboat(120 + r() * (W - 240), 470 + r() * 140, 60 + r() * 90, pal.near, pal.sunA(0.9)); s += wave(r, 690, 10, 1, pal.near, 0); return s; },
  polo(r, pal) { let s = sun(pal, 700, 280, 60) + wave(r, 440, 26, 1.2, pal.far, 0.3) + `<rect x="0" y="480" width="${W}" height="${H - 480}" fill="${pal.mid}"/>`; for (let i = 0; i < 6; i++) s += `<rect x="0" y="${520 + i * 38}" width="${W}" height="2" fill="${pal.sunA(0.08)}"/>`; s += `<rect x="260" y="380" width="8" height="150" fill="${pal.near}"/><rect x="420" y="380" width="8" height="150" fill="${pal.near}"/><rect x="780" y="380" width="8" height="150" fill="${pal.near}"/><rect x="940" y="380" width="8" height="150" fill="${pal.near}"/>`; s += crowd(r, 720, pal.near); return s; },
  tennis(r, pal) { let s = `<rect width="${W}" height="${H}" fill="${pal.mid}"/><rect x="200" y="90" width="800" height="570" fill="${pal.near}" stroke="${pal.sunA(0.9)}" stroke-width="5"/><rect x="290" y="90" width="620" height="570" fill="none" stroke="${pal.sunA(0.9)}" stroke-width="4"/><line x1="200" y1="375" x2="1000" y2="375" stroke="${pal.sun}" stroke-width="7"/><line x1="290" y1="235" x2="910" y2="235" stroke="${pal.sunA(0.9)}" stroke-width="4"/><line x1="290" y1="515" x2="910" y2="515" stroke="${pal.sunA(0.9)}" stroke-width="4"/><line x1="600" y1="235" x2="600" y2="515" stroke="${pal.sunA(0.9)}" stroke-width="4"/>`; s += `<circle cx="${400 + r() * 400}" cy="${200 + r() * 300}" r="80" fill="url(#GLOW)"/>`; return s; },
  golf(r, pal) { let s = sun(pal, 300 + r() * 600, 280, 60) + wave(r, 450, 30, 1.3, pal.far, 0.6) + wave(r, 530, 40, 1.7, pal.mid, 1.9) + wave(r, 640, 30, 1.2, pal.near, 3); s += `<ellipse cx="820" cy="640" rx="130" ry="26" fill="${pal.sunA(0.25)}"/><rect x="818" y="480" width="4" height="160" fill="${pal.skyTop}"/><path d="M822 482 L880 500 L822 518 Z" fill="${pal.accent}"/><circle cx="820" cy="640" r="6" fill="${pal.skyTop}"/>`; s += roundTree(160, 640, 200, pal.near) + roundTree(1080, 660, 160, pal.near); return s; },
  horse(r, pal) { return SCENES.polo(r, pal); },
};

const SCENE_OF_RESORT = { desert: 'dunes', 'private-island': 'island', 'urban-historic': 'city', 'urban-modern': 'city', 'urban-design': 'city', 'urban-iconic': 'city', 'urban-resort': 'city', 'garden-retreat': 'garden', 'coastal-historic': 'coast', 'coastal-classic': 'coast', 'coastal-cliff': 'coast', 'coastal-mediterranean': 'coast', 'coastal-tropical': 'island', 'coastal-design': 'coast', 'coastal-urban': 'city', 'coastal-remote': 'coast', countryside: 'country', 'countryside-historic': 'country', 'countryside-american': 'country', 'wellness-mountain': 'mountain', 'wellness-island': 'island', safari: 'safari', 'remote-wilderness': 'mountain', 'lake-historic': 'lake', 'riad-historic': 'riad', 'coastal-regional': 'coast', 'mountain-classic': 'mountain' };
const PALETTE_OF_SCENE = { dunes: 'desert', island: 'lagoon', coast: 'dawn', city: 'midnight', garden: 'forest', country: 'gold', mountain: 'alpine', safari: 'savanna', lake: 'alpine', riad: 'ember', festival: 'rose', art: 'slate', motorsport: 'ember', fashion: 'rose', film: 'midnight', gala: 'gold', summit: 'alpine', regatta: 'lagoon', polo: 'forest', tennis: 'forest', golf: 'forest', horse: 'gold' };

function eventScene(e) {
  const n = (e.name + ' ' + (e.description || '')).toLowerCase();
  if (/grand prix|\bgp\b|24 hours|le mans|formula|goodwood/.test(n)) return 'motorsport';
  if (/open\b|wimbledon|roland|tennis/.test(n)) return 'tennis';
  if (/masters|golf|ryder|pebble/.test(n)) return 'golf';
  if (/polo/.test(n)) return 'polo';
  if (/derby|ascot|royal|kentucky|dubai world cup|horse/.test(n)) return 'horse';
  if (/regatta|yacht|america's cup|sail/.test(n)) return 'regatta';
  if (/film|cannes|venice|festival de|tribeca|sundance/.test(n)) return 'film';
  if (/fashion|couture|runway/.test(n)) return 'fashion';
  if (/basel|frieze|biennale|art |gallery|auction|christie|sotheby/.test(n)) return 'art';
  if (/coachella|festival|burning|glastonbury|concert/.test(n)) return 'festival';
  if (/gala|met |ball|oscars|awards|amfar|cannes gala|dinner|new year/.test(n)) return 'gala';
  if (/davos|forum|summit|conference|sun valley|milken|ted\b|allen/.test(n)) return 'summit';
  const byCat = { sport: 'polo', art: 'art', gala: 'gala', season: 'coast', summit: 'summit', music: 'festival', fashion: 'fashion' };
  return byCat[e.category] || 'gala';
}

// ----------------------------------------------------------------- aircraft plates (top-down blueprint)
function jetPlate(a) {
  const id = a.id; const r = rng(id);
  const cat = a.category; // light | midsize | heavy | airliner | helicopter
  const cx = W / 2, cy = H / 2 + 20;
  let grid = '';
  for (let x = 0; x <= W; x += 50) grid += `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="rgba(34,211,238,0.07)" stroke-width="1"/>`;
  for (let y = 0; y <= H; y += 50) grid += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="rgba(34,211,238,0.07)" stroke-width="1"/>`;
  let body = '';
  const white = '#f3f6fa', line = 'rgba(34,211,238,0.9)';
  if (cat === 'helicopter') {
    body += `<ellipse cx="${cx - 40}" cy="${cy}" rx="150" ry="52" fill="${white}"/><rect x="${cx + 80}" y="${cy - 12}" width="300" height="24" rx="10" fill="${white}"/><rect x="${cx + 330}" y="${cy - 60}" width="16" height="120" rx="8" fill="${white}"/>`;
    for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.3; body += `<line x1="${cx - 40}" y1="${cy}" x2="${(cx - 40 + Math.cos(a) * 330).toFixed(0)}" y2="${(cy + Math.sin(a) * 330).toFixed(0)}" stroke="${white}" stroke-width="14" stroke-linecap="round" opacity="0.9"/>`; }
    body += `<circle cx="${cx - 40}" cy="${cy}" r="330" fill="none" stroke="${line}" stroke-width="1.5" stroke-dasharray="6 10"/><circle cx="${cx - 40}" cy="${cy}" r="22" fill="#070b12" stroke="${white}" stroke-width="6"/>`;
  } else {
    const P = { light: { L: 560, Wd: 54, span: 560, sweep: 0.36, tail: 'T', eng: 'rear', wingletsR: 0 }, midsize: { L: 640, Wd: 62, span: 640, sweep: 0.44, tail: 'T', eng: 'rear', wingletsR: 0 }, heavy: { L: 760, Wd: 74, span: 780, sweep: 0.5, tail: 'T', eng: 'rear', wingletsR: 1 }, airliner: { L: 900, Wd: 100, span: 900, sweep: 0.48, tail: 'conv', eng: 'wing', wingletsR: 1 } }[cat] || { L: 640, Wd: 62, span: 640, sweep: 0.44, tail: 'T', eng: 'rear', wingletsR: 0 };
    const L = P.L, Wd = P.Wd, nose = cx - L / 2, tailX = cx + L / 2;
    const wingRoot = cx - L * 0.06, wingTip = wingRoot + P.span * P.sweep * 0.5;
    const half = P.span / 2;
    // wings
    body += `<path d="M${wingRoot - 60} ${cy - Wd * 0.3} L${wingTip + 60} ${cy - half} L${wingTip + 120} ${cy - half} L${wingRoot + 150} ${cy - Wd * 0.3} Z" fill="${white}" opacity="0.96"/>`;
    body += `<path d="M${wingRoot - 60} ${cy + Wd * 0.3} L${wingTip + 60} ${cy + half} L${wingTip + 120} ${cy + half} L${wingRoot + 150} ${cy + Wd * 0.3} Z" fill="${white}" opacity="0.96"/>`;
    if (P.wingletsR) body += `<rect x="${wingTip + 60}" y="${cy - half - 14}" width="60" height="6" fill="${white}"/><rect x="${wingTip + 60}" y="${cy + half + 8}" width="60" height="6" fill="${white}"/>`;
    // stabilizers
    const stabX = tailX - L * 0.16;
    body += `<path d="M${stabX} ${cy - Wd * 0.25} L${stabX + 70} ${cy - Wd * 0.25 - 120} L${stabX + 110} ${cy - Wd * 0.25 - 120} L${stabX + 90} ${cy - Wd * 0.25} Z" fill="${white}"/><path d="M${stabX} ${cy + Wd * 0.25} L${stabX + 70} ${cy + Wd * 0.25 + 120} L${stabX + 110} ${cy + Wd * 0.25 + 120} L${stabX + 90} ${cy + Wd * 0.25} Z" fill="${white}"/>`;
    // engines
    if (P.eng === 'rear') { body += `<rect x="${tailX - L * 0.28}" y="${cy - Wd * 0.5 - 30}" width="120" height="30" rx="14" fill="${white}"/><rect x="${tailX - L * 0.28}" y="${cy + Wd * 0.5}" width="120" height="30" rx="14" fill="${white}"/>`; }
    else { body += `<rect x="${wingRoot + 10}" y="${cy - half * 0.5 - 22}" width="150" height="44" rx="20" fill="${white}"/><rect x="${wingRoot + 10}" y="${cy + half * 0.5 - 22}" width="150" height="44" rx="20" fill="${white}"/>`; }
    // fuselage
    body += `<path d="M${nose} ${cy} Q${nose + 40} ${cy - Wd / 2} ${nose + 140} ${cy - Wd / 2} L${tailX - 40} ${cy - Wd * 0.3} Q${tailX} ${cy - Wd * 0.2} ${tailX + 6} ${cy} Q${tailX} ${cy + Wd * 0.2} ${tailX - 40} ${cy + Wd * 0.3} L${nose + 140} ${cy + Wd / 2} Q${nose + 40} ${cy + Wd / 2} ${nose} ${cy} Z" fill="${white}"/>`;
    // windows
    for (let x = nose + 170; x < tailX - 110; x += 26) body += `<rect x="${x}" y="${cy - Wd * 0.34}" width="9" height="8" rx="2" fill="#070b12" opacity="0.85"/>`;
    body += `<path d="M${nose + 30} ${cy} Q${nose + 60} ${cy - Wd * 0.42} ${nose + 100} ${cy - Wd * 0.42} L${nose + 100} ${cy + Wd * 0.42} Q${nose + 60} ${cy + Wd * 0.42} ${nose + 30} ${cy} Z" fill="#070b12" opacity="0.75"/>`;
    // dimension line
    body += `<line x1="${nose}" y1="${cy + half + 60}" x2="${tailX}" y2="${cy + half + 60}" stroke="${line}" stroke-width="1"/><line x1="${nose}" y1="${cy + half + 50}" x2="${nose}" y2="${cy + half + 70}" stroke="${line}"/><line x1="${tailX}" y1="${cy + half + 50}" x2="${tailX}" y2="${cy + half + 70}" stroke="${line}"/>`;
  }
  const label = `<text x="60" y="${H - 60}" font-family="JetBrains Mono, ui-monospace, monospace" font-size="26" letter-spacing="6" fill="rgba(34,211,238,0.85)">${a.name.toUpperCase()}</text><text x="60" y="${H - 96}" font-family="Inter, system-ui, sans-serif" font-size="16" letter-spacing="4" fill="rgba(255,255,255,0.4)">${(a.manufacturer || '').toUpperCase()} · ${a.cruiseSpeedKTAS} KTAS · ${a.rangeNM.toLocaleString()} NM</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><defs><radialGradient id="g-${id}" cx="0.5" cy="0.5" r="0.7"><stop offset="0" stop-color="#132238"/><stop offset="1" stop-color="#070b12"/></radialGradient><radialGradient id="glow-${id}" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="rgba(34,211,238,0.35)"/><stop offset="1" stop-color="rgba(34,211,238,0)"/></radialGradient></defs><rect width="${W}" height="${H}" fill="url(#g-${id})"/>${grid}<ellipse cx="${cx}" cy="${cy}" rx="560" ry="300" fill="url(#glow-${id})"/><g>${body}</g>${label}<rect x="18" y="18" width="${W - 36}" height="${H - 36}" fill="none" stroke="rgba(255,255,255,0.10)"/></svg>`;
}

// ----------------------------------------------------------------- yacht (side profile at sea) & residences
function yachtPlate(y) {
  const id = y.id; const r = rng(id); const pal = paletteFor('lagoon', (r() - 0.5) * 20);
  const len = Math.min(980, 380 + (y.lengthMeters || 60) * 4.5);
  const cx = W / 2, base = 520;
  let s = stars(r, 24, 260, pal.sunA(0.4)) + sun(pal, 300 + r() * 600, 280, 64) + sea(pal, base, pal.mid, r);
  const white = '#f3f6fa';
  // hull
  s += `<path d="M${cx - len / 2} ${base} Q${cx - len / 2 + 30} ${base - 40} ${cx - len / 2 + 120} ${base - 44} L${cx + len / 2 - 30} ${base - 36} Q${cx + len / 2 + 10} ${base - 30} ${cx + len / 2} ${base} Z" fill="${white}"/>`;
  const sail = /^S\/Y/.test(y.name || '');
  if (sail) {
    s += `<rect x="${cx - 6}" y="${base - 440}" width="8" height="400" fill="${white}"/><path d="M${cx + 8} ${base - 430} L${cx + 8} ${base - 60} L${cx + len * 0.36} ${base - 60} Z" fill="${white}" opacity="0.9"/><path d="M${cx - 12} ${base - 380} L${cx - 12} ${base - 60} L${cx - len * 0.34} ${base - 60} Z" fill="${white}" opacity="0.8"/>`;
  } else {
    const decks = (y.lengthMeters || 60) > 100 ? 3 : (y.lengthMeters || 60) > 50 ? 2 : 1;
    for (let d = 0; d < decks; d++) { const inset = 60 + d * 70; const h = 42; s += `<rect x="${cx - len / 2 + inset}" y="${base - 44 - (d + 1) * h}" width="${len - inset * 1.9}" height="${h}" rx="14" fill="${white}" opacity="${1 - d * 0.06}"/>`; for (let x = cx - len / 2 + inset + 20; x < cx + len / 2 - inset * 0.9 - 20; x += 22) s += `<rect x="${x}" y="${base - 44 - (d + 1) * h + 14}" width="12" height="10" rx="2" fill="#070b12" opacity="0.7"/>`; }
    s += `<rect x="${cx + len * 0.05}" y="${base - 44 - decks * 42 - 60}" width="6" height="60" fill="${white}"/><ellipse cx="${cx + len * 0.05 + 3}" cy="${base - 44 - decks * 42 - 60}" rx="22" ry="6" fill="${white}"/>`;
  }
  s += wave(r, 560, 10, 1.2, pal.near, 1) + `<text x="60" y="${H - 60}" font-family="JetBrains Mono, ui-monospace, monospace" font-size="26" letter-spacing="6" fill="rgba(255,255,255,0.8)">${(y.name || '').toUpperCase()}</text><text x="60" y="${H - 96}" font-family="Inter, system-ui, sans-serif" font-size="16" letter-spacing="4" fill="rgba(255,255,255,0.45)">${(y.builder || '').toUpperCase()} · ${y.lengthMeters} M</text>`;
  return plate(id, pal, s);
}

function residencePlate(res) {
  const id = res.id; const r = rng(id);
  const type = res.type;
  const palName = { estate: 'lagoon', townhouse: 'midnight', chalet: 'alpine', villa: 'dawn', 'pied-a-terre': 'midnight', island: 'lagoon', penthouse: 'midnight' }[type] || 'midnight';
  const pal = paletteFor(palName, (r() - 0.5) * 16);
  const white = '#e9eef5';
  let s = stars(r, 30, 300, pal.sunA(0.5)) + sun(pal, 300 + r() * 600, 260, 60);
  const win = (x, y, w = 18, h = 26) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="${pal.sun}" opacity="0.9"/>`;
  if (type === 'penthouse' || type === 'pied-a-terre') {
    s += skyline(r, 640, pal.far, pal.sunA(0.6), 20) + `<rect x="430" y="120" width="340" height="560" fill="${pal.near}"/>`;
    for (let y = 150; y < 640; y += 40) for (let x = 450; x < 760; x += 34) if (r() > 0.35) s += win(x, y, 16, 22);
    s += `<rect x="430" y="120" width="340" height="70" fill="${pal.sunA(0.25)}"/>`;
    s += `<rect x="0" y="680" width="${W}" height="${H - 680}" fill="${pal.near}"/>`;
  } else if (type === 'chalet') {
    s += peaks(r, 520, 300, 6, pal.far, pal.sunA(0.4)) + `<rect x="0" y="560" width="${W}" height="${H - 560}" fill="${pal.mid}"/>`;
    s += `<path d="M300 560 L600 300 L900 560 Z" fill="${pal.near}"/><rect x="360" y="440" width="480" height="120" fill="${pal.near}"/>` + win(430, 470, 40, 40) + win(580, 470, 40, 40) + win(730, 470, 40, 40) + `<path d="M300 560 L600 300 L900 560" stroke="${white}" stroke-width="8" fill="none"/>`;
    for (let i = 0; i < 4; i++) s += cypress(120 + r() * 120, 600, 220, 20, pal.near) + cypress(960 + r() * 160, 600, 200, 18, pal.near);
  } else if (type === 'island') {
    s += sea(pal, 420, pal.mid, r) + wave(r, 470, 20, 1.6, pal.near, 1) + palm(280, 660, 260, pal.near, -30) + palm(960, 640, 300, pal.near, 40);
    s += `<rect x="470" y="420" width="260" height="110" rx="6" fill="${pal.near}"/><path d="M450 420 L600 340 L750 420 Z" fill="${pal.near}"/>` + win(520, 460, 30, 34) + win(650, 460, 30, 34);
  } else {
    // estate / villa / townhouse
    s += wave(r, 470, 30, 1.2, pal.far, 0.5) + `<rect x="0" y="540" width="${W}" height="${H - 540}" fill="${pal.mid}"/>`;
    const floors = type === 'townhouse' ? 4 : 2, wdt = type === 'townhouse' ? 300 : 620, x0 = (W - wdt) / 2, fh = 90;
    s += `<rect x="${x0}" y="${540 - floors * fh}" width="${wdt}" height="${floors * fh}" fill="${pal.near}"/>`;
    if (type !== 'townhouse') s += `<path d="M${x0 - 30} ${540 - floors * fh} L${x0 + wdt / 2} ${540 - floors * fh - 110} L${x0 + wdt + 30} ${540 - floors * fh} Z" fill="${pal.near}"/>`;
    for (let f = 0; f < floors; f++) for (let x = x0 + 30; x < x0 + wdt - 30; x += 64) if (r() > 0.2) s += win(x, 540 - (f + 1) * fh + 28, 26, 36);
    s += `<rect x="${x0 + wdt / 2 - 22}" y="${540 - 70}" width="44" height="70" rx="4" fill="${pal.sunA(0.9)}"/>`;
    if (type !== 'townhouse') { s += `<rect x="${x0 - 200}" y="560" width="${wdt + 400}" height="70" rx="35" fill="${pal.accentA(0.35)}"/>`; s += cypress(x0 - 80, 540, 240, 18, pal.near) + cypress(x0 + wdt + 80, 540, 240, 18, pal.near); }
  }
  s += `<text x="60" y="${H - 60}" font-family="Fraunces, Georgia, serif" font-size="34" fill="rgba(255,255,255,0.85)">${res.name}</text><text x="60" y="${H - 104}" font-family="Inter, system-ui, sans-serif" font-size="16" letter-spacing="4" fill="rgba(255,255,255,0.45)">${(res.city || '').toUpperCase()} · ${(res.type || '').toUpperCase()}</text>`;
  return plate(id, pal, s);
}

// ----------------------------------------------------------------- build
const events = JSON.parse(readFileSync('data/events.json', 'utf8'));
for (const e of events) {
  const scene = eventScene(e); const r = rng(e.id);
  const pal = paletteFor(PALETTE_OF_SCENE[scene] || 'midnight', (r() - 0.5) * 24);
  out('events', e.id, plate(e.id, pal, SCENES[scene](r, pal)));
  e.imageUrl = `/art/events/${e.id}.svg`;
}
writeFileSync('data/events.json', JSON.stringify(events, null, 2) + '\n');

const resorts = JSON.parse(readFileSync('data/resorts.json', 'utf8'));
for (const x of resorts) {
  const scene = SCENE_OF_RESORT[x.category] || 'coast'; const r = rng(x.id);
  const pal = paletteFor(PALETTE_OF_SCENE[scene] || 'midnight', (r() - 0.5) * 24);
  out('resorts', x.id, plate(x.id, pal, SCENES[scene](r, pal)));
  x.imageUrl = `/art/resorts/${x.id}.svg`;
}
writeFileSync('data/resorts.json', JSON.stringify(resorts, null, 2) + '\n');

const aircraft = JSON.parse(readFileSync('data/aircraft.json', 'utf8'));
for (const a of aircraft) { out('aircraft', a.id, jetPlate(a)); a.imageUrl = `/art/aircraft/${a.id}.svg`; }
writeFileSync('data/aircraft.json', JSON.stringify(aircraft, null, 2) + '\n');

for (const [file, dir, fn] of [['yachts', 'yachts', yachtPlate], ['residences', 'residences', residencePlate]]) {
  const src = existsSync(`data/${file}.json`) ? `data/${file}.json` : `jetstream-spec/${file}.json`;
  const items = JSON.parse(readFileSync(src, 'utf8'));
  for (const it of items) { out(dir, it.id, fn(it)); it.imageUrl = `/art/${dir}/${it.id}.svg`; }
  writeFileSync(`data/${file}.json`, JSON.stringify(items, null, 2) + '\n');
}
console.log('art:', events.length, 'events,', resorts.length, 'resorts,', aircraft.length, 'aircraft');
