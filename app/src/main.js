// NEON VICE editor: wires the page to the cover renderer (./cover.js).
// Photos fill the poster panels in order; every panel can be re-framed by
// dragging, re-graded, or swapped for an illustrated backdrop. A `?shot=`
// query sets up a fixed scene for screenshots instead (deterministic).
import { SIZES, LAYOUTS, layoutFor, panelAt, photoFrame, renderCover } from './cover.js';
import { BACKDROPS } from './backdrops.js';

const $ = (id) => document.getElementById(id);
const canvas = $('cover');
const status = $('status');

const SAMPLE_NAMES = ['hero', 'car', 'boat', 'street'];
const PREFERENCE = {
  landscape: ['hero', 'car', 'boat'],
  portrait: ['hero', 'street', 'car'],
  square: ['hero', 'boat', 'street'],
};
const BACKDROP_FILL = ['skyline', 'beach', 'retropalms', 'highway'];

const state = {
  size: '1920x1080',
  layout: 'poster',
  caption: 'Neon Shores',
  kicker: 'Sunset County • Est. 1987',
  grade: 0.85,
  panels: [],
};
let photos = []; // { img, name }
let selected = 0;

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function panelCount() {
  const [w, h] = SIZES[state.size];
  return layoutFor(state.layout, w, h).panels.length;
}

function freshPanel(i) {
  if (photos[i]) {
    return { kind: 'photo', photo: i, panX: 0, panY: 0, zoom: 1, variant: i % 2 === 1 ? 'neon' : 'sunset' };
  }
  return { kind: 'backdrop', backdrop: BACKDROP_FILL[i % BACKDROP_FILL.length] };
}

function rebuildPanels(keep = true) {
  const n = panelCount();
  const old = state.panels;
  state.panels = Array.from({ length: n }, (_, i) => {
    if (keep && old[i]) {
      const p = { ...old[i] };
      if (p.kind === 'photo' && !photos[p.photo]) return freshPanel(i);
      return p;
    }
    return freshPanel(i);
  });
  if (selected >= n) selected = 0;
}

function redraw() {
  renderCover(canvas, state, { photos: photos.map((p) => p.img) });
  refreshPanelUI();
}

function panelLabel(p) {
  if (!p) return '';
  if (p.kind === 'photo') return photos[p.photo]?.name ?? 'photo';
  return BACKDROPS.find((b) => b.id === p.backdrop)?.name ?? 'backdrop';
}

function refreshPanelUI() {
  const chips = $('panelChips');
  chips.innerHTML = '';
  state.panels.forEach((p, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `chip${i === selected ? ' on' : ''}`;
    b.textContent = `${i + 1} · ${panelLabel(p)}`;
    b.addEventListener('click', () => { selected = i; syncControls(); redraw(); });
    chips.appendChild(b);
  });
  const p = state.panels[selected];
  $('selName').textContent = `Panel ${selected + 1} — ${panelLabel(p)}`;
  $('gradeToggle').textContent = p && p.kind === 'photo' ? `Grade: ${p.variant === 'neon' ? 'Neon Night' : 'Sunset'}` : 'Grade: —';
  $('backdropBtn').textContent = `Backdrop: ${p && p.kind === 'backdrop' ? panelLabel(p) : BACKDROPS[0].name}`;
  if (p && p.kind === 'photo') $('zoom').value = p.zoom || 1;
}

function refreshThumbs() {
  const t = $('thumbs');
  t.innerHTML = '';
  photos.forEach((p, i) => {
    const img = document.createElement('img');
    img.className = 'thumb';
    img.src = p.img.src;
    img.alt = p.name;
    img.title = `${p.name} — click to place in the selected panel`;
    img.addEventListener('click', () => {
      const cur = state.panels[selected];
      state.panels[selected] = {
        kind: 'photo', photo: i,
        panX: cur?.panX || 0, panY: cur?.panY || 0, zoom: cur?.zoom || 1,
        variant: cur?.variant || (selected % 2 === 1 ? 'neon' : 'sunset'),
      };
      redraw();
    });
    t.appendChild(img);
  });
}

function syncControls() {
  $('size').value = state.size;
  $('layout').value = state.layout;
  $('caption').value = state.caption;
  $('kicker').value = state.kicker;
  $('grade').value = state.grade;
  refreshPanelUI();
}

async function loadSamples(order) {
  photos = [];
  for (const name of order) {
    const img = await loadImage(`samples/${name}.jpg`);
    photos.push({ img, name });
  }
  refreshThumbs();
}

async function addPhotoFiles(files) {
  let added = 0;
  for (const f of files) {
    if (!f.type.startsWith('image/')) continue;
    const img = await loadImage(URL.createObjectURL(f));
    photos.push({ img, name: f.name.replace(/\.[^.]+$/, '').slice(0, 18) || 'photo' });
    added++;
  }
  if (!added) return;
  // New photos take over backdrop panels first, in panel order.
  state.panels = state.panels.map((p, i) => (p.kind === 'backdrop' && photos[i] ? freshPanel(i) : p));
  // Any photo still homeless (panel was already a photo) appends by replacing nothing;
  // it stays available in the thumbs row for manual placement.
  refreshThumbs();
  redraw();
  status.textContent = `${photos.length} photo${photos.length === 1 ? '' : 's'} in the poster. Drag a panel to re-frame it.`;
}

// ---- controls ---------------------------------------------------------------
$('photo').addEventListener('change', (e) => { addPhotoFiles([...e.target.files]); e.target.value = ''; });
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (e) => { e.preventDefault(); addPhotoFiles([...e.dataTransfer.files]); });
$('samples').addEventListener('click', async () => {
  const [w, h] = SIZES[state.size];
  const aspect = w === h ? 'square' : w > h ? 'landscape' : 'portrait';
  await loadSamples(PREFERENCE[aspect]);
  state.panels = [];
  rebuildPanels(false);
  redraw();
});
$('size').addEventListener('change', (e) => { state.size = e.target.value; rebuildPanels(); redraw(); });
$('layout').addEventListener('change', (e) => { state.layout = e.target.value; rebuildPanels(); redraw(); });
$('caption').addEventListener('input', (e) => { state.caption = e.target.value; redraw(); });
$('kicker').addEventListener('input', (e) => { state.kicker = e.target.value; redraw(); });
$('grade').addEventListener('input', (e) => { state.grade = Number(e.target.value); redraw(); });
$('zoom').addEventListener('input', (e) => {
  const p = state.panels[selected];
  if (p && p.kind === 'photo') { p.zoom = Number(e.target.value); redraw(); }
});
$('gradeToggle').addEventListener('click', () => {
  const p = state.panels[selected];
  if (p && p.kind === 'photo') { p.variant = p.variant === 'neon' ? 'sunset' : 'neon'; redraw(); }
});
$('backdropBtn').addEventListener('click', () => {
  const p = state.panels[selected];
  if (!p) return;
  if (p.kind === 'backdrop') {
    const idx = BACKDROPS.findIndex((b) => b.id === p.backdrop);
    p.backdrop = BACKDROPS[(idx + 1) % BACKDROPS.length].id;
  } else {
    state.panels[selected] = { kind: 'backdrop', backdrop: BACKDROPS[0].id };
  }
  redraw();
});
$('export').addEventListener('click', () => {
  const off = document.createElement('canvas');
  renderCover(off, state, { photos: photos.map((p) => p.img) });
  off.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `neon-vice-cover-${state.size}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    status.textContent = `Saved neon-vice-cover-${state.size}.png — ready to post.`;
  }, 'image/png');
});

// ---- canvas drag / zoom -------------------------------------------------------
let drag = null;
function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return {
    nx: (e.clientX - r.left) / r.width,
    ny: (e.clientY - r.top) / r.height,
    px: (e.clientX - r.left) * (canvas.width / r.width),
    py: (e.clientY - r.top) * (canvas.height / r.height),
    sx: canvas.width / r.width,
  };
}
canvas.addEventListener('pointerdown', (e) => {
  const pt = canvasPoint(e);
  const idx = panelAt(state.layout, canvas.width, canvas.height, pt.nx, pt.ny);
  if (idx < 0) return;
  selected = idx;
  syncControls();
  const p = state.panels[idx];
  if (p && p.kind === 'photo') {
    const layout = layoutFor(state.layout, canvas.width, canvas.height);
    const poly = layout.panels[idx];
    const xs = poly.map((q) => q[0]), ys = poly.map((q) => q[1]);
    const bw = (Math.max(...xs) - Math.min(...xs)) * canvas.width;
    const bh = (Math.max(...ys) - Math.min(...ys)) * canvas.height;
    drag = {
      x: e.clientX, y: e.clientY, panX: p.panX || 0, panY: p.panY || 0,
      frame: photoFrame(photos[p.photo].img, p.variant, bw, bh, p.zoom || 1),
      sx: pt.sx,
    };
    canvas.setPointerCapture(e.pointerId);
  }
  redraw();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const p = state.panels[selected];
  if (!p || p.kind !== 'photo') return;
  const dx = (e.clientX - drag.x) * drag.sx;
  const dy = (e.clientY - drag.y) * drag.sx;
  if (drag.frame.overflowX > 0) p.panX = Math.max(-1, Math.min(1, drag.panX + dx / (drag.frame.overflowX / 2)));
  if (drag.frame.overflowY > 0) p.panY = Math.max(-1, Math.min(1, drag.panY + dy / (drag.frame.overflowY / 2)));
  redraw();
});
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('wheel', (e) => {
  const p = state.panels[selected];
  if (!p || p.kind !== 'photo') return;
  e.preventDefault();
  p.zoom = Math.max(1, Math.min(3, (p.zoom || 1) * (e.deltaY < 0 ? 1.07 : 0.93)));
  $('zoom').value = p.zoom;
  redraw();
}, { passive: false });

// ---- init ---------------------------------------------------------------------
async function init() {
  await Promise.all([
    document.fonts.load('16px Anton'),
    document.fonts.load('700 16px Archivo'),
    document.fonts.load('600 16px Archivo'),
  ]);
  const q = new URLSearchParams(location.search);
  const shot = q.get('shot');
  if (q.get('size') && SIZES[q.get('size')]) state.size = q.get('size');
  if (q.get('layout') && LAYOUTS[q.get('layout')]) state.layout = q.get('layout');
  if (q.get('caption')) state.caption = q.get('caption');
  if (q.get('kicker')) state.kicker = q.get('kicker');
  if (q.get('grade')) state.grade = Math.max(0, Math.min(1, Number(q.get('grade')) || 0));

  if (shot === 'cover') {
    document.body.classList.add('shot');
    const list = (q.get('photos') || 'car,hero,boat').split(',').map((s) => s.trim()).filter(Boolean);
    const entries = [];
    for (const item of list) {
      if (item.startsWith('bd:')) entries.push({ backdrop: item.slice(3) });
      else {
        const img = await loadImage(`samples/${item}.jpg`);
        photos.push({ img, name: item });
        entries.push({ photo: photos.length - 1 });
      }
    }
    const n = panelCount();
    state.panels = Array.from({ length: n }, (_, i) => {
      const en = entries[i];
      if (!en) return freshPanel(i);
      if (en.backdrop) return { kind: 'backdrop', backdrop: en.backdrop };
      return { kind: 'photo', photo: en.photo, panX: 0, panY: 0, zoom: 1, variant: i % 2 === 1 ? 'neon' : 'sunset' };
    });
  } else {
    const [w, h] = SIZES[state.size];
    const aspect = w === h ? 'square' : w > h ? 'landscape' : 'portrait';
    await loadSamples(PREFERENCE[aspect]);
    rebuildPanels(false);
  }
  // Optional ?frame=panX,panY,zoom;... (one triple per panel) — the same
  // per-panel framing the drag / zoom controls write, settable from a shot
  // URL so staged screenshots can frame faces inside the wide panels.
  if (shot && q.get('frame')) {
    const frames = q.get('frame').split(';').map((s) => s.split(',').map(Number));
    state.panels.forEach((p, i) => {
      const f = frames[i];
      if (p && p.kind === 'photo' && f && f.length >= 3 && f.every((v) => Number.isFinite(v))) {
        p.panX = Math.max(-1, Math.min(1, f[0]));
        p.panY = Math.max(-1, Math.min(1, f[1]));
        p.zoom = Math.max(1, Math.min(3, f[2]));
      }
    });
  }
  syncControls();
  redraw();
  if (shot) {
    requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
  }
}

init();
