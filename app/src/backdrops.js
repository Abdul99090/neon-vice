// Procedural illustrated backdrop panels for NEON VICE.
// Flat, graphic scenes that share the cover's dusk grade, drawn on canvas with a
// seeded RNG so every render (and every screenshot) is identical. They fill
// panels the user has no photo for, as deliberate art panels — never fake photos.

/** Deterministic RNG (mulberry32). */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function vGrad(ctx, x, y, w, h, stops) {
  const g = ctx.createLinearGradient(x, y, x, y + h);
  for (const [o, c] of stops) g.addColorStop(o, c);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}

/** A palm silhouette: curved trunk + 7 tapered fronds. (x, y) = base, s = height. */
export function palm(ctx, x, y, s, flip, tone) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(flip * s, s);
  ctx.fillStyle = tone;
  // trunk: a tapering curved sliver
  ctx.beginPath();
  ctx.moveTo(-0.035, 0);
  ctx.quadraticCurveTo(0.05, -0.5, 0.16, -0.92);
  ctx.quadraticCurveTo(0.20, -0.94, 0.225, -0.90);
  ctx.quadraticCurveTo(0.13, -0.48, 0.045, 0);
  ctx.closePath();
  ctx.fill();
  // fronds
  const hx = 0.185, hy = -0.925;
  const fronds = [
    [-0.95, -0.28, -0.62, 0.16], [-0.72, -0.52, -0.30, 0.22], [-0.38, -0.66, 0.02, 0.24],
    [0.02, -0.70, 0.38, 0.20], [0.42, -0.58, 0.66, 0.14], [0.74, -0.38, 0.86, 0.05],
    [0.92, -0.12, 0.94, 0.22],
  ];
  for (const [ex, ey, cx, cy] of fronds) {
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.quadraticCurveTo(hx + cx * 0.55, hy + cy * 0.55 - 0.06, hx + ex * 0.62, hy + ey * 0.62);
    ctx.quadraticCurveTo(hx + cx * 0.40, hy + cy * 0.40 + 0.045, hx, hy + 0.018);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function sunDisc(ctx, cx, cy, r, stops) {
  const g = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r);
  for (const [o, c] of stops) g.addColorStop(o, c);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

const INK = '#160a24';

/** Sunset beach: banded dusk sky, low sun, ocean with light streaks, palms. */
function beach(ctx, x, y, w, h, R) {
  vGrad(ctx, x, y, w, h, [
    [0, '#2a1052'], [0.34, '#8e2a63'], [0.55, '#e34e6b'], [0.72, '#ff8a4c'], [0.86, '#ffc46b'], [1, '#ffd98a'],
  ]);
  sunDisc(ctx, x + w * 0.62, y + h * 0.66, h * 0.20, [[0, '#fff3c4'], [0.55, '#ffd166'], [1, 'rgba(255,140,66,0)']]);
  // ocean
  const oy = y + h * 0.68;
  vGrad(ctx, x, oy, w, h * 0.32, [[0, '#7a2d5e'], [0.25, '#4a2560'], [1, '#1c1038']]);
  ctx.fillStyle = 'rgba(255,196,107,0.75)';
  for (let i = 0; i < 26; i++) {
    const sy = oy + R() * h * 0.28 + h * 0.02;
    const sw = w * (0.03 + R() * 0.13) * (1 - (sy - oy) / (h * 0.34));
    ctx.globalAlpha = 0.25 + R() * 0.5;
    ctx.fillRect(x + w * 0.62 - sw / 2 + (R() - 0.5) * w * 0.05, sy, sw, Math.max(1.5, h * 0.006));
  }
  ctx.globalAlpha = 1;
  // sand strip
  ctx.fillStyle = '#2a1430';
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x, y + h * 0.93);
  ctx.quadraticCurveTo(x + w * 0.5, y + h * 0.885, x + w, y + h * 0.95);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
  ctx.fill();
  palm(ctx, x + w * 0.10, y + h * 0.97, h * 0.52, 1, INK);
  palm(ctx, x + w * 0.97, y + h * 0.99, h * 0.40, -1, INK);
}

/** Neon skyline: teal night, lit towers, wet street reflections. */
function skyline(ctx, x, y, w, h, R) {
  vGrad(ctx, x, y, w, h, [[0, '#150a2e'], [0.42, '#3a1547'], [0.72, '#8a3055'], [0.88, '#4a2547'], [1, '#0d2b3d']]);
  sunDisc(ctx, x + w * 0.78, y + h * 0.20, h * 0.075, [[0, '#e8fbff'], [0.7, '#bfeef7'], [1, 'rgba(160,230,245,0)']]);
  const base = y + h * 0.82;
  const tower = (bx, bw, bh, tone) => {
    ctx.fillStyle = tone;
    ctx.fillRect(bx, base - bh, bw, bh);
    const cols = Math.max(3, Math.floor(bw / (w * 0.019)));
    const rows = Math.max(4, Math.floor(bh / (h * 0.033)));
    for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
      if (R() < 0.52) continue;
      const pick = R();
      ctx.fillStyle = pick < 0.62 ? 'rgba(255,209,102,0.95)' : (pick < 0.84 ? 'rgba(255,150,90,0.9)' : (R() < 0.5 ? 'rgba(255,120,180,0.9)' : 'rgba(94,234,212,0.9)'));
      ctx.fillRect(bx + bw * (0.10 + 0.80 * (c / cols)), base - bh + bh * (0.06 + 0.88 * (r / rows)), bw * 0.46 / cols, bh * 0.42 / rows);
    }
    ctx.fillStyle = tone;
  };
  tower(x + w * 0.02, w * 0.20, h * 0.52, '#081826');
  tower(x + w * 0.20, w * 0.15, h * 0.38, '#0a2033');
  tower(x + w * 0.60, w * 0.17, h * 0.58, '#081826');
  tower(x + w * 0.80, w * 0.19, h * 0.44, '#0a2033');
  tower(x + w * 0.38, w * 0.13, h * 0.30, '#061420');
  // street + reflections
  vGrad(ctx, x, base, w, h * 0.18, [[0, '#0e2436'], [1, '#050b16']]);
  for (let i = 0; i < 30; i++) {
    ctx.fillStyle = R() < 0.5 ? 'rgba(255,120,180,0.35)' : 'rgba(94,234,212,0.35)';
    const sx = x + R() * w;
    ctx.fillRect(sx, base + R() * h * 0.13, w * (0.02 + R() * 0.05), Math.max(1.2, h * 0.005));
  }
  palm(ctx, x + w * 0.52, y + h * 0.86, h * 0.34, 1, '#04101c');
}

/** Coastal highway at dusk: road to a low sun, a lone car silhouette. */
function highway(ctx, x, y, w, h, R) {
  vGrad(ctx, x, y, w, h, [
    [0, '#33135c'], [0.4, '#93335f'], [0.62, '#f2604d'], [0.78, '#ff9a52'], [1, '#ffc46b'],
  ]);
  sunDisc(ctx, x + w * 0.5, y + h * 0.60, h * 0.17, [[0, '#fff3c4'], [0.6, '#ffd166'], [1, 'rgba(255,140,66,0)']]);
  // sea shoulders
  ctx.fillStyle = '#57254f';
  ctx.fillRect(x, y + h * 0.62, w, h * 0.06);
  // road trapezoid
  const vx = x + w * 0.5, vy = y + h * 0.66;
  ctx.fillStyle = '#241228';
  ctx.beginPath();
  ctx.moveTo(vx - w * 0.035, vy);
  ctx.lineTo(vx + w * 0.035, vy);
  ctx.lineTo(x + w * 0.92, y + h);
  ctx.lineTo(x + w * 0.08, y + h);
  ctx.closePath();
  ctx.fill();
  // centre dashes, perspective-scaled
  ctx.fillStyle = '#ffd98a';
  for (let i = 0; i < 6; i++) {
    const t = i / 6, yy = vy + (y + h - vy) * Math.pow(t, 1.6);
    const ww = w * 0.004 + w * 0.02 * t;
    ctx.fillRect(vx - ww / 2, yy, ww, h * 0.012 + h * 0.03 * t);
  }
  // car silhouette (rear three-quarter, simple bold shapes)
  const cw = w * 0.30, ch = h * 0.16, cx = vx - cw / 2, cy = y + h * 0.80;
  ctx.fillStyle = INK;
  ctx.beginPath(); // body
  ctx.moveTo(cx, cy + ch);
  ctx.lineTo(cx, cy + ch * 0.45);
  ctx.quadraticCurveTo(cx + cw * 0.06, cy + ch * 0.18, cx + cw * 0.24, cy + ch * 0.12);
  ctx.lineTo(cx + cw * 0.30, cy);
  ctx.lineTo(cx + cw * 0.70, cy);
  ctx.lineTo(cx + cw * 0.78, cy + ch * 0.14);
  ctx.quadraticCurveTo(cx + cw * 0.96, cy + ch * 0.22, cx + cw, cy + ch * 0.5);
  ctx.lineTo(cx + cw, cy + ch);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ff5e7a'; // tail lights
  ctx.fillRect(cx + cw * 0.05, cy + ch * 0.52, cw * 0.20, ch * 0.10);
  ctx.fillRect(cx + cw * 0.75, cy + ch * 0.52, cw * 0.20, ch * 0.10);
  ctx.fillStyle = INK;
  ctx.beginPath(); ctx.arc(cx + cw * 0.20, cy + ch, ch * 0.20, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + cw * 0.80, cy + ch, ch * 0.20, 0, Math.PI * 2); ctx.fill();
  palm(ctx, x + w * 0.05, y + h * 0.70, h * 0.30, 1, INK);
  palm(ctx, x + w * 0.99, y + h * 0.72, h * 0.26, -1, INK);
}

/** Retro sun: striped sun disc over a pink-purple field, fronds framing. */
function retropalms(ctx, x, y, w, h, R) {
  vGrad(ctx, x, y, w, h, [[0, '#3b1154'], [0.55, '#a12c5e'], [1, '#ff7e47']]);
  const cx = x + w * 0.5, cy = y + h * 0.46, r = h * 0.30;
  const g = ctx.createLinearGradient(0, cy - r, 0, cy + r);
  g.addColorStop(0, '#ffd166');
  g.addColorStop(0.6, '#ff8a5c');
  g.addColorStop(1, '#ff5e7a');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  // retro stripes cut across the lower sun
  ctx.fillStyle = 'rgba(59,17,84,0.55)';
  let sy = cy + r * 0.12;
  let th = h * 0.012;
  while (sy < cy + r) {
    ctx.fillRect(cx - r, sy, r * 2, th);
    sy += th + h * 0.045;
    th *= 1.5;
  }
  // horizon sea line
  ctx.fillStyle = 'rgba(22,10,36,0.85)';
  ctx.fillRect(x, y + h * 0.86, w, h * 0.14);
  ctx.fillStyle = 'rgba(255,196,107,0.6)';
  for (let i = 0; i < 14; i++) ctx.fillRect(x + R() * w, y + h * (0.88 + R() * 0.09), w * (0.02 + R() * 0.05), Math.max(1.2, h * 0.005));
  palm(ctx, x + w * 0.03, y + h * 0.90, h * 0.46, 1, INK);
  palm(ctx, x + w * 1.0, y + h * 0.92, h * 0.52, -1, INK);
}

export const BACKDROPS = [
  { id: 'beach', name: 'Dusk Beach', draw: beach },
  { id: 'skyline', name: 'Neon Skyline', draw: skyline },
  { id: 'highway', name: 'Coast Highway', draw: highway },
  { id: 'retropalms', name: 'Retro Palms', draw: retropalms },
];

/** Draw backdrop `id` into the rect (caller clips to the panel polygon). */
export function drawBackdrop(ctx, id, x, y, w, h, seed) {
  const b = BACKDROPS.find((v) => v.id === id) ?? BACKDROPS[0];
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  b.draw(ctx, x, y, w, h, rng(seed * 7919 + 13));
  ctx.restore();
}
