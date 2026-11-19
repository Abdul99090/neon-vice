/*
 * NEON VICE — editor wiring.
 *
 * The editor opens with the demo cover already composed from the bundled
 * sample photos: the first screen IS the product. From there: add up to
 * four photos (file picker or drag-drop), click a panel to select it,
 * drag on the canvas to pan its photo, zoom, toggle its grade, swap
 * panels, switch layout and size, edit the words, export an exact-size
 * PNG. Everything runs locally; no photo ever leaves the machine.
 *
 * `?shot=` modes render fixed scenes from the bundled samples only, so
 * the screenshot capture flow is deterministic:
 *   ?shot=cover    landscape Poster cover, full-bleed
 *   ?shot=portrait portrait Poster cover (hero band + backdrop + car)
 *   ?shot=square   square Poster cover (hero + boat + backdrop)
 *   ?shot=editor   the editor itself, demo photos loaded
 */
(function () {
  'use strict';

  var SAMPLES = [
    { src: 'samples/hero.jpg', name: 'hero' },
    { src: 'samples/car.jpg', name: 'car' },
    { src: 'samples/boat.jpg', name: 'boat' },
    { src: 'samples/street.jpg', name: 'street' }
  ];
  var MAX_PHOTOS = 4;
  var nextPhotoId = 1;

  var state = {
    sizeKey: '1920x1080',
    layout: 'poster',
    headline: 'Neon Shores',
    kicker: 'Sunset County • Est. 1987',
    gradeStrength: 0.85,
    selected: 0,
    photos: [],   // { img, name }
    panels: []    // { photoIndex, backdrop, panX, panY, zoom, grade }
  };

  function freshPanel(photoIndex) {
    return {
      photoIndex: photoIndex,
      backdrop: 0,
      panX: 0.5, panY: 0.5,
      zoom: 1,
      grade: true
    };
  }
  for (var i = 0; i < 4; i++) state.panels.push(freshPanel(i));

  /* ---------- DOM ---------- */
  var $ = function (id) { return document.getElementById(id); };
  var canvas = $('coverCanvas');
  var ctx = canvas.getContext('2d');
  var thumbsEl = $('thumbs');
  var chipsEl = $('panelChips');
  var panelNameEl = $('panelName');

  /* ---------- photos ---------- */

  function registerPhoto(img, name) {
    img.__nvId = nextPhotoId++;
    state.photos.push({ img: img, name: name });
  }

  function loadSample(def) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { registerPhoto(img, def.name); resolve(); };
      img.onerror = reject;
      img.src = def.src;
    });
  }

  function loadFile(file) {
    return new Promise(function (resolve) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        registerPhoto(img, file.name.replace(/\.[^.]+$/, '').slice(0, 14) || 'photo');
        resolve();
      };
      img.onerror = function () { resolve(); };
      img.src = url;
    });
  }

  async function addFiles(files) {
    var room = MAX_PHOTOS - state.photos.length;
    var list = Array.prototype.slice.call(files).slice(0, Math.max(0, room));
    for (var f of list) await loadFile(f);
    /* fill any empty panel slots in order */
    var used = {};
    state.panels.forEach(function (p) { if (p.photoIndex >= 0) used[p.photoIndex] = true; });
    var free = [];
    state.photos.forEach(function (_, idx) { if (!used[idx]) free.push(idx); });
    state.panels.forEach(function (p) {
      if (p.photoIndex < 0 && free.length) p.photoIndex = free.shift();
    });
    syncUI();
    render();
  }

  async function resetDemo() {
    state.photos = [];
    nextPhotoId = 1;
    for (var def of SAMPLES) await loadSample(def);
    state.panels = [freshPanel(0), freshPanel(1), freshPanel(2), freshPanel(3)];
    state.selected = 0;
    syncUI();
    render();
  }

  /* ---------- rendering ---------- */

  function renderState() {
    return {
      layout: state.layout,
      headline: state.headline,
      kicker: state.kicker,
      gradeStrength: state.gradeStrength,
      panels: state.panels.map(function (p, idx) {
        var photo = p.photoIndex >= 0 && state.photos[p.photoIndex]
          ? { img: state.photos[p.photoIndex].img, variant: idx % 2 }
          : null;
        return {
          photo: photo,
          backdrop: p.backdrop,
          panX: p.panX, panY: p.panY,
          zoom: p.zoom,
          grade: p.grade
        };
      })
    };
  }

  function render() {
    var size = window.NVCover.SIZES[state.sizeKey];
    if (canvas.width !== size[0] || canvas.height !== size[1]) {
      canvas.width = size[0];
      canvas.height = size[1];
    }
    window.NVCover.render(ctx, size[0], size[1], renderState());
  }

  /* ---------- panel selection + dragging ---------- */

  function pointInPoly(fx, fy, poly) {
    var inside = false;
    for (var a = 0, b = poly.length - 1; a < poly.length; b = a++) {
      var xa = poly[a][0], ya = poly[a][1];
      var xb = poly[b][0], yb = poly[b][1];
      if ((ya > fy) !== (yb > fy) &&
          fx < (xb - xa) * (fy - ya) / (yb - ya) + xa) inside = !inside;
    }
    return inside;
  }

  function panelAt(clientX, clientY) {
    var rect = canvas.getBoundingClientRect();
    var fx = (clientX - rect.left) / rect.width;
    var fy = (clientY - rect.top) / rect.height;
    var size = window.NVCover.SIZES[state.sizeKey];
    var panels = window.NVCover.panelsFor(state.layout, size[0], size[1]);
    for (var i = 0; i < panels.length; i++) {
      if (pointInPoly(fx, fy, panels[i].poly)) return i;
    }
    return -1;
  }

  var drag = null;
  canvas.addEventListener('pointerdown', function (ev) {
    var idx = panelAt(ev.clientX, ev.clientY);
    if (idx >= 0) {
      state.selected = idx;
      syncPanelUI();
    }
    drag = { x: ev.clientX, y: ev.clientY };
    canvas.setPointerCapture(ev.pointerId);
  });
  canvas.addEventListener('pointermove', function (ev) {
    if (!drag) return;
    var rect = canvas.getBoundingClientRect();
    var slot = state.panels[state.selected];
    var dx = (ev.clientX - drag.x) / rect.width;
    var dy = (ev.clientY - drag.y) / rect.height;
    drag = { x: ev.clientX, y: ev.clientY };
    slot.panX = Math.min(1, Math.max(0, slot.panX - dx * 1.6));
    slot.panY = Math.min(1, Math.max(0, slot.panY - dy * 1.6));
    render();
  });
  canvas.addEventListener('pointerup', function () { drag = null; });
  canvas.addEventListener('pointercancel', function () { drag = null; });

  /* ---------- UI sync ---------- */

  function syncThumbs() {
    thumbsEl.innerHTML = '';
    state.photos.forEach(function (photo, idx) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'thumb';
      b.title = photo.name;
      var im = document.createElement('img');
      im.src = photo.img.src;
      im.alt = photo.name;
      b.appendChild(im);
      b.addEventListener('click', function () {
        state.panels[state.selected].photoIndex = idx;
        syncPanelUI();
        render();
      });
      thumbsEl.appendChild(b);
    });
  }

  function syncPanelUI() {
    var count = window.NVCover.panelCount(state.layout);
    var size = window.NVCover.SIZES[state.sizeKey];
    var defs = window.NVCover.panelsFor(state.layout, size[0], size[1]);
    chipsEl.innerHTML = '';
    for (var i = 0; i < count; i++) {
      (function (idx) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'chip' + (idx === state.selected ? ' active' : '');
        var fill = state.panels[idx].photoIndex >= 0 && state.photos[state.panels[idx].photoIndex]
          ? state.photos[state.panels[idx].photoIndex].name
          : 'art';
        b.textContent = (idx + 1) + ' · ' + fill;
        b.addEventListener('click', function () {
          state.selected = idx;
          syncPanelUI();
        });
        chipsEl.appendChild(b);
      })(i);
    }
    var slot = state.panels[state.selected];
    panelNameEl.textContent =
      'Panel ' + (state.selected + 1) + ' — ' + defs[state.selected].name;
    $('zoomRange').value = Math.round(slot.zoom * 100);
    $('gradeBtn').textContent =
      'Grade: ' + (slot.grade ? (state.selected % 2 ? 'Neon Night' : 'Sunset') : 'Off');
    $('backdropBtn').textContent =
      'Backdrop: ' + window.NVBackdrops.KINDS[slot.backdrop].label;
  }

  function syncUI() {
    syncThumbs();
    syncPanelUI();
    document.querySelectorAll('#layoutChips .chip').forEach(function (b) {
      b.classList.toggle('active', b.dataset.layout === state.layout);
    });
    $('sizeSelect').value = state.sizeKey;
    $('headlineInput').value = state.headline;
    $('kickerInput').value = state.kicker;
  }

  /* ---------- controls ---------- */

  $('addPhotosBtn').addEventListener('click', function () { $('fileInput').click(); });
  $('fileInput').addEventListener('change', function (ev) {
    addFiles(ev.target.files);
    ev.target.value = '';
  });
  $('resetDemoBtn').addEventListener('click', resetDemo);

  var stage = $('stage');
  stage.addEventListener('dragover', function (ev) {
    ev.preventDefault();
    stage.classList.add('dragging');
  });
  stage.addEventListener('dragleave', function () { stage.classList.remove('dragging'); });
  stage.addEventListener('drop', function (ev) {
    ev.preventDefault();
    stage.classList.remove('dragging');
    if (ev.dataTransfer.files.length) addFiles(ev.dataTransfer.files);
  });

  $('zoomRange').addEventListener('input', function (ev) {
    state.panels[state.selected].zoom = ev.target.value / 100;
    render();
  });
  $('gradeBtn').addEventListener('click', function () {
    var slot = state.panels[state.selected];
    slot.grade = !slot.grade;
    syncPanelUI();
    render();
  });
  $('backdropBtn').addEventListener('click', function () {
    var slot = state.panels[state.selected];
    slot.backdrop = (slot.backdrop + 1) % window.NVBackdrops.KINDS.length;
    syncPanelUI();
    render();
  });
  $('clearPhotoBtn').addEventListener('click', function () {
    state.panels[state.selected].photoIndex = -1;
    syncPanelUI();
    render();
  });
  $('swapBtn').addEventListener('click', function () {
    var count = window.NVCover.panelCount(state.layout);
    var other = (state.selected + 1) % count;
    var a = state.panels[state.selected];
    state.panels[state.selected] = state.panels[other];
    state.panels[other] = a;
    syncPanelUI();
    render();
  });

  $('headlineInput').addEventListener('input', function (ev) {
    state.headline = ev.target.value;
    render();
  });
  $('kickerInput').addEventListener('input', function (ev) {
    state.kicker = ev.target.value;
    render();
  });
  $('gradeRange').addEventListener('input', function (ev) {
    state.gradeStrength = ev.target.value / 100;
    render();
  });
  $('sizeSelect').addEventListener('change', function (ev) {
    state.sizeKey = ev.target.value;
    render();
  });
  document.querySelectorAll('#layoutChips .chip').forEach(function (b) {
    b.addEventListener('click', function () {
      state.layout = b.dataset.layout;
      if (state.selected >= window.NVCover.panelCount(state.layout)) state.selected = 0;
      syncUI();
      render();
    });
  });

  $('exportBtn').addEventListener('click', function () {
    var size = window.NVCover.SIZES[state.sizeKey];
    var out = document.createElement('canvas');
    out.width = size[0];
    out.height = size[1];
    window.NVCover.render(out.getContext('2d'), size[0], size[1], renderState());
    out.toBlob(function (blob) {
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'neon-vice-cover-' + state.sizeKey + '.png';
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
    }, 'image/png');
  });

  /* ---------- shot modes + boot ---------- */

  function applyShotMode(mode) {
    if (mode === 'cover') {
      document.body.classList.add('shot');
      state.sizeKey = '1920x1080';
      state.layout = 'poster';
    } else if (mode === 'portrait') {
      document.body.classList.add('shot');
      state.sizeKey = '1080x1350';
      state.layout = 'poster';
      state.panels[0].panY = 0.22; // hero face sits clear of the headline
      state.panels[1].photoIndex = -1;
      state.panels[1].backdrop = 0;
      state.panels[2].photoIndex = 1; // car below-right
    } else if (mode === 'square') {
      document.body.classList.add('shot');
      state.sizeKey = '1080x1080';
      state.layout = 'poster';
      state.panels[1].photoIndex = 2; // boat top-right
      state.panels[2].photoIndex = -1;
      state.panels[2].backdrop = 0;   // illustrated beach bottom-right
    } else if (mode === 'editor') {
      state.sizeKey = '1920x1080';
      state.layout = 'poster';
    }
  }

  async function boot() {
    var mode = new URLSearchParams(location.search).get('shot');
    for (var def of SAMPLES) await loadSample(def);
    if (mode) applyShotMode(mode);
    syncUI();
    render();
    /* Anton must be in before the lettering is final: re-render on ready. */
    if (document.fonts && document.fonts.ready) {
      await document.fonts.load('100px Anton');
      await document.fonts.load('700 20px Archivo');
      await document.fonts.ready;
      render();
    }
    window.__shotReady = true;
  }

  boot();
})();
