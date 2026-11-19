// NEON VICE cover renderer: angled multi-panel poster layouts, a per-photo
// "Vice grade", cream keylines, Anton headline lettering and a unifying grain.
// Pure canvas, deterministic — same state always draws the same cover.
import { drawBackdrop } from './backdrops.js';

export const SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
};

export function aspectOf(w, h) {
  if (w === h) return 'square';
  return w > h ? 'landscape' : 'portrait';
}

// Panel polygons in 0..1 space. Headline spec: x/y fractions, align, anchor
// ('top' = y is the top of the text block, 'bottom' = y is the last baseline,
// 'middle' = y is the block centre), size = cap-height fraction of height.
export const LAYOUTS = {
  poster: {
    name: 'Poster — hero panel',
    landscape: {
      panels: [
        [[0, 0], [0.585, 0], [0.505, 1], [0, 1]],
        [[0.585, 0], [1, 0], [1, 0.545], [0.5414, 0.545]],
        [[0.5414, 0.545], [1, 0.545], [1, 1], [0.505, 1]],
      ],
      headline: { x: 0.045, y: 0.935, align: 'left', anchor: 'bottom', size: 0.175, maxW: 0.60 },
    },
    portrait: {
      panels: [
        [[0, 0], [1, 0], [1, 0.545], [0, 0.615]],
        [[0, 0.615], [0.52, 0.578], [0.465, 1], [0, 1]],
        [[0.52, 0.578], [1, 0.545], [1, 1], [0.465, 1]],
      ],
      headline: { x: 0.05, y: 0.038, align: 'left', anchor: 'top', size: 0.098, maxW: 0.90 },
    },
    square: {
      panels: [
        [[0, 0], [0.575, 0], [0.50, 1], [0, 1]],
        [[0.575, 0], [1, 0], [1, 0.52], [0.536, 0.52]],
        [[0.536, 0.52], [1, 0.52], [1, 1], [0.50, 1]],
      ],
      headline: { x: 0.05, y: 0.94, align: 'left', anchor: 'bottom', size: 0.145, maxW: 0.64 },
    },
  },
  strip: {
    name: 'Strip — hero band',
    landscape: {
      panels: [
        [[0, 0], [1, 0], [1, 0.60], [0, 0.66]],
        [[0, 0.66], [0.505, 0.615], [0.47, 1], [0, 1]],
        [[0.505, 0.615], [1, 0.60], [1, 1], [0.47, 1]],
      ],
      headline: { x: 0.045, y: 0.045, align: 'left', anchor: 'top', size: 0.155, maxW: 0.72 },
    },
    portrait: {
      panels: [
        [[0, 0], [1, 0], [1, 0.58], [0, 0.63]],
        [[0, 0.63], [0.52, 0.60], [0.48, 1], [0, 1]],
        [[0.52, 0.60], [1, 0.58], [1, 1], [0.48, 1]],
      ],
      headline: { x: 0.05, y: 0.035, align: 'left', anchor: 'top', size: 0.098, maxW: 0.90 },
    },
    square: {
      panels: [
        [[0, 0], [1, 0], [1, 0.58], [0, 0.64]],
        [[0, 0.64], [0.52, 0.605], [0.48, 1], [0, 1]],
        [[0.52, 0.605], [1, 0.58], [1, 1], [0.48, 1]],
      ],
      headline: { x: 0.05, y: 0.04, align: 'left', anchor: 'top', size: 0.135, maxW: 0.85 },
    },
  },
  focus: {
    name: 'Focus — one big cut',
    landscape: {
      panels: [
        [[0, 0], [1, 0], [1, 1], [0, 1]],
      ],
      headline: { x: 0.045, y: 0.935, align: 'left', anchor: 'bottom', size: 0.20, maxW: 0.66 },
    },
    portrait: {
      panels: [
        [[0, 0], [1, 0], [1, 1], [0, 1]],
      ],
      headline: { x: 0.05, y: 0.038, align: 'left', anchor: 'top', size: 0.115, maxW: 0.90 },
    },
    square: {
      panels: [
        [[0, 0], [1, 0], [1, 1], [0, 1]],
      ],
      headline: { x: 0.05, y: 0.94, align: 'left', anchor: 'bottom', size: 0.165, maxW: 0.70 },
    },
  },
  grid: {
    name: 'Grid — four cuts',
    landscape: {
      panels: [
        [[0, 0], [0.52, 0], [0.50, 0.52], [0, 0.55]],
        [[0.52, 0], [1, 0], [1, 0.49], [0.50, 0.52]],
        [[0, 0.55], [0.50, 0.52], [0.47, 1], [0, 1]],
        [[0.50, 0.52], [1, 0.49], [1, 1], [0.47, 1]],
      ],
      headline: { x: 0.5, y: 0.515, align: 'center', anchor: 'middle', size: 0.165, maxW: 0.82 },
    },
    portrait: {
      panels: [
        [[0, 0], [0.54, 0], [0.51, 0.47], [0, 0.50]],
        [[0.54, 0], [1, 0], [1, 0.44], [0.51, 0.47]],
        [[0, 0.50], [0.51, 0.47], [0.48, 1], [0, 1]],
        [[0.51, 0.47], [1, 0.44], [1, 1], [0.48, 1]],
      ],
      headline: { x: 0.5, y: 0.475, align: 'center', anchor: 'middle', size: 0.10, maxW: 0.88 },
    },
    square: {
      panels: [
        [[0, 0], [0.54, 0], [0.51, 0.47], [0, 0.50]],
        [[0.54, 0], [1, 0], [1, 0.44], [0.51, 0.47]],
        [[0, 0.50], [0.51, 0.47], [0.48, 1], [0, 1]],
        [[0.51, 0.47], [1, 0.44], [1, 1], [0.48, 1]],
      ],
      headline: { x: 0.5, y: 0.475, align: 'center', anchor: 'middle', size: 0.125, maxW: 0.86 },
    },
  },
};

export function layoutFor(layoutId, w, h) {
  return LAYOUTS[layoutId][aspectOf(w, h)];
}

function polyPath(ctx, poly, w, h, grow = 0) {
  let cx = 0, cy = 0;
  for (const [px, py] of poly) { cx += px; cy += py; }
  cx /= poly.length; cy /= poly.length;
  ctx.beginPath();
  poly.forEach(([px, py], i) => {
    const gx = cx + (px - cx) * (1 + grow);
    const gy = cy + (py - cy) * (1 + grow);
    if (i === 0) ctx.moveTo(gx * w, gy * h); else ctx.lineTo(gx * w, gy * h);
  });
  ctx.closePath();
}

export function panelAt(layout, w, h, nx, ny) {
  const { panels } = layoutFor(layout, w, h);
  for (let i = panels.length - 1; i >= 0; i--) {
    const poly = panels[i];
    let inside = false;
    for (let a = 0, b = poly.length - 1; a < poly.length; b = a++) {
      const [ax, ay] = poly[a], [bx, by] = poly[b];
      if ((ay > ny) !== (by > ny) && nx < ((bx - ax) * (ny - ay)) / (by - ay) + ax) inside = !inside;
    }
    if (inside) return i;
  }
  return -1;
}

// ---- Vice grade -------------------------------------------------------------
const gradeCache = new Map();

/** The photo, colour-graded. Cached per (photo, variant); strength is applied
 *  as wash alphas at draw time so the slider stays live without re-grading. */
export function gradedPhoto(img, variant) {
  const key = `${img.src.slice(-48)}|${variant}`;
  if (gradeCache.has(key)) return gradeCache.get(key);
  const cap = 1600;
  const scale = Math.min(1, cap / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement('canvas');
  c.width = Math.round(img.naturalWidth * scale);
  c.height = Math.round(img.naturalHeight * scale);
  const g = c.getContext('2d');
  g.filter = variant === 'neon'
    ? 'saturate(1.42) contrast(1.14) brightness(0.97)'
    : 'saturate(1.27) contrast(1.08) brightness(1.03) sepia(0.16)';
  g.drawImage(img, 0, 0, c.width, c.height);
  g.filter = 'none';
  gradeCache.set(key, c);
  return c;
}

function gradeWashes(ctx, x, y, w, h, variant, s) {
  if (s <= 0.01) return;
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  if (variant === 'neon') {
    let gr = ctx.createLinearGradient(x, y, x + w, y + h);
    gr.addColorStop(0, `rgba(34,211,238,${0.20 * s})`);
    gr.addColorStop(0.55, 'rgba(0,0,0,0)');
    gr.addColorStop(1, `rgba(255,46,136,${0.24 * s})`);
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = gr; ctx.fillRect(x, y, w, h);
    gr = ctx.createLinearGradient(x, y + h * 0.5, x, y + h);
    gr.addColorStop(0, 'rgba(0,0,0,0)');
    gr.addColorStop(1, `rgba(8,10,40,${0.34 * s})`);
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = gr; ctx.fillRect(x, y, w, h);
  } else {
    let gr = ctx.createLinearGradient(x, y, x, y + h);
    gr.addColorStop(0, `rgba(255,110,80,${0.20 * s})`);
    gr.addColorStop(0.5, 'rgba(0,0,0,0)');
    gr.addColorStop(1, `rgba(24,16,72,${0.30 * s})`);
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = gr; ctx.fillRect(x, y, w, h);
    gr = ctx.createRadialGradient(x + w * 0.8, y + h * 0.1, 0, x + w * 0.8, y + h * 0.1, w * 0.9);
    gr.addColorStop(0, `rgba(255,150,90,${0.16 * s})`);
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = gr; ctx.fillRect(x, y, w, h);
  }
  ctx.restore();
  ctx.globalCompositeOperation = 'source-over';
}

/** Frame math for a photo in a panel of bw x bh: drawn size + overflow. */
export function photoFrame(img, variant, bw, bh, zoom = 1) {
  const gc = gradedPhoto(img, variant);
  const scale = Math.max(bw / gc.width, bh / gc.height) * zoom;
  const dw = gc.width * scale, dh = gc.height * scale;
  return { dw, dh, overflowX: Math.max(0, dw - bw), overflowY: Math.max(0, dh - bh) };
}

// ---- grain ------------------------------------------------------------------
let grainPattern = null;
function getGrain(ctx) {
  if (grainPattern) return grainPattern;
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const g = c.getContext('2d');
  const data = g.createImageData(256, 256);
  let a = 424243;
  const rnd = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  for (let i = 0; i < data.data.length; i += 4) {
    const v = Math.floor(rnd() * 255);
    data.data[i] = v; data.data[i + 1] = v; data.data[i + 2] = v; data.data[i + 3] = 255;
  }
  g.putImageData(data, 0, 0);
  grainPattern = ctx.createPattern(c, 'repeat');
  return grainPattern;
}

// ---- lettering ---------------------------------------------------------------
function splitLines(text, ctx, maxW) {
  const words = text.trim().toUpperCase().split(/\s+/).filter(Boolean);
  if (words.length <= 1) return words.length ? [words[0]] : [];
  if (words.length === 2) return words;
  // 3+ words: greedy two lines by measured width
  const lines = [words[0]];
  for (let i = 1; i < words.length; i++) {
    const cur = lines[lines.length - 1];
    if (lines.length < 2 && ctx.measureText(`${cur} ${words[i]}`).width < maxW * 0.72) lines[lines.length - 1] = `${cur} ${words[i]}`;
    else if (lines.length < 2) lines.push(words[i]);
    else lines[lines.length - 1] = `${cur} ${words[i]}`;
  }
  return lines;
}

function star(ctx, cx, cy, r, colour) {
  ctx.fillStyle = colour;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const ang = (i * Math.PI) / 4 - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.38;
    const px = cx + Math.cos(ang) * rad, py = cy + Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

function drawHeadline(ctx, W, H, spec, caption, kicker) {
  const maxW = spec.maxW * W;
  let size = spec.size * H;
  ctx.textAlign = spec.align === 'center' ? 'center' : 'left';
  ctx.textBaseline = 'alphabetic';
  let lines = [];
  for (let iter = 0; iter < 40; iter++) {
    ctx.font = `${size}px Anton, sans-serif`;
    lines = splitLines(caption, ctx, maxW);
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width), 0);
    if (widest <= maxW || size < 14) break;
    size *= (maxW / widest) * 0.99;
  }
  if (!lines.length) return;
  ctx.font = `${size}px Anton, sans-serif`;
  const lh = size * 0.94;
  const kickSize = Math.max(11, size * 0.155);
  const blockH = lh * lines.length + kickSize * 1.9;
  let baseY;
  if (spec.anchor === 'top') baseY = spec.y * H + blockH - size * 0.22;
  else if (spec.anchor === 'middle') baseY = spec.y * H + blockH / 2 - size * 0.22;
  else baseY = spec.y * H;
  const x = spec.x * W;
  // Soft scrim behind the text block: a feathered radial dim so the lettering
  // keeps its hierarchy over busy photo areas without a visible box edge.
  const widest = Math.max(...lines.map((l) => ctx.measureText(l).width), 0);
  const scx = spec.align === 'center' ? x : x + widest / 2;
  const scy = baseY - blockH / 2 + size * 0.08;
  const sr = Math.max(widest, blockH) * 0.78;
  const scrim = ctx.createRadialGradient(scx, scy, sr * 0.08, scx, scy, sr);
  scrim.addColorStop(0, 'rgba(14,3,22,0.30)');
  scrim.addColorStop(1, 'rgba(14,3,22,0)');
  ctx.fillStyle = scrim;
  ctx.fillRect(scx - sr, scy - sr, sr * 2, sr * 2);
  // kicker
  if (kicker && kicker.trim()) {
    ctx.font = `700 ${kickSize}px Archivo, sans-serif`;
    try { ctx.letterSpacing = `${kickSize * 0.32}px`; } catch { /* older canvas */ }
    ctx.fillStyle = '#ffd166';
    ctx.shadowColor = 'rgba(20,4,24,0.65)';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = kickSize * 0.10;
    ctx.shadowOffsetY = kickSize * 0.12;
    const ky = baseY - lh * lines.length - kickSize * 0.55;
    ctx.fillText(kicker.trim().toUpperCase(), x, ky);
    const kw = ctx.measureText(kicker.trim().toUpperCase()).width;
    const sx = spec.align === 'center' ? x + kw / 2 + kickSize * 0.9 : x + kw + kickSize * 0.9;
    star(ctx, sx, ky - kickSize * 0.32, kickSize * 0.42, '#ffd166');
    try { ctx.letterSpacing = '0px'; } catch { /* noop */ }
  }
  // headline lines, bottom-up
  ctx.font = `${size}px Anton, sans-serif`;
  for (let i = lines.length - 1; i >= 0; i--) {
    const ly = baseY - (lines.length - 1 - i) * lh;
    ctx.shadowColor = 'rgba(24,4,28,0.9)';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = size * 0.045;
    ctx.shadowOffsetY = size * 0.055;
    ctx.fillStyle = '#2a0a2e';
    ctx.fillText(lines[i], x, ly);
    ctx.shadowColor = 'transparent';
    ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
    const grad = ctx.createLinearGradient(0, ly - size, 0, ly);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.75, '#fff6e8');
    grad.addColorStop(1, '#ffd9a8');
    ctx.fillStyle = grad;
    ctx.fillText(lines[i], x, ly);
  }
  ctx.shadowColor = 'transparent';
}

// ---- main render --------------------------------------------------------------
/**
 * state: { size, layout, caption, kicker, grade, panels: [...] }
 * assets: { photos: [HTMLImageElement] }
 * panel: { kind:'photo', photo, panX, panY, zoom, variant } |
 *        { kind:'backdrop', backdrop }
 */
export function renderCover(canvas, state, assets) {
  const [W, H] = SIZES[state.size];
  if (canvas.width !== W) canvas.width = W;
  if (canvas.height !== H) canvas.height = H;
  const ctx = canvas.getContext('2d');
  const layout = layoutFor(state.layout, W, H);
  ctx.fillStyle = '#1c0b2e';
  ctx.fillRect(0, 0, W, H);

  layout.panels.forEach((poly, i) => {
    const panel = state.panels[i];
    if (!panel) return;
    const xs = poly.map((p) => p[0]), ys = poly.map((p) => p[1]);
    const bx = Math.min(...xs) * W, by = Math.min(...ys) * H;
    const bw = (Math.max(...xs) - Math.min(...xs)) * W, bh = (Math.max(...ys) - Math.min(...ys)) * H;
    ctx.save();
    polyPath(ctx, poly, W, H, 0.012);
    ctx.clip();
    if (panel.kind === 'photo' && assets.photos[panel.photo]) {
      const img = assets.photos[panel.photo];
      const gc = gradedPhoto(img, panel.variant);
      const scale = Math.max(bw / gc.width, bh / gc.height) * (panel.zoom || 1);
      const dw = gc.width * scale, dh = gc.height * scale;
      const dx = bx + (bw - dw) / 2 + (panel.panX || 0) * Math.max(0, (dw - bw) / 2);
      const dy = by + (bh - dh) / 2 + (panel.panY || 0) * Math.max(0, (dh - bh) / 2);
      ctx.drawImage(gc, dx, dy, dw, dh);
      gradeWashes(ctx, bx, by, bw, bh, panel.variant, state.grade);
    } else {
      drawBackdrop(ctx, panel.backdrop || 'beach', bx, by, bw, bh, 1000 + i * 37);
      gradeWashes(ctx, bx, by, bw, bh, 'sunset', state.grade * 0.35);
    }
    ctx.restore();
  });

  // keylines: soft shadow pass, then cream
  const lw = Math.max(7, W * 0.0105);
  for (const pass of [0, 1]) {
    ctx.lineJoin = 'round';
    for (const poly of layout.panels) {
      polyPath(ctx, poly, W, H, 0);
      if (pass === 0) {
        ctx.strokeStyle = 'rgba(18,4,26,0.45)';
        ctx.lineWidth = lw * 1.5;
        ctx.save();
        ctx.translate(0, lw * 0.28);
        ctx.stroke();
        ctx.restore();
      } else {
        ctx.strokeStyle = '#fff6e8';
        ctx.lineWidth = lw;
        ctx.stroke();
      }
    }
  }
  ctx.strokeStyle = '#fff6e8';
  ctx.lineWidth = lw;
  ctx.strokeRect(lw / 2, lw / 2, W - lw, H - lw);

  drawHeadline(ctx, W, H, layout.headline, state.caption, state.kicker);

  // brand mark
  ctx.textAlign = 'right';
  ctx.font = `600 ${Math.round(H * 0.017)}px Archivo, sans-serif`;
  ctx.fillStyle = 'rgba(255,246,232,0.88)';
  ctx.fillText('NEON VICE', W - W * 0.028, H - H * 0.024);
  star(ctx, W - W * 0.028 - ctx.measureText('NEON VICE').width - H * 0.016, H - H * 0.024 - H * 0.006, H * 0.008, 'rgba(255,209,102,0.95)');
  ctx.textAlign = 'left';

  // vignette + grain (the panel's unifying print-film pass)
  const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.78);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(12,3,22,0.30)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = getGrain(ctx);
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}
