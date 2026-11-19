/*
 * NEON VICE — procedural backdrops.
 *
 * When a poster panel has no photo, it is filled with a flat illustrated
 * "art panel" drawn right here on canvas: bold colour fields cut like
 * paper (the Dusk Collage movement), deco silhouettes, and a seeded film
 * grain so every render is pixel-stable. The palette is the same sunset /
 * neon grade the photos get, so an illustrated panel sits beside a photo
 * panel as a deliberate piece of the collage, never as an empty box.
 *
 * Exposes window.NVBackdrops = { KINDS, draw(ctx, kind, x, y, w, h) }.
 * `kind` is an index into KINDS. All drawing happens inside the rect the
 * caller has already clipped to the panel shape.
 */
(function () {
  'use strict';

  var KINDS = [
    { id: 'beach', label: 'Dusk Beach' },
    { id: 'skyline', label: 'Neon Skyline' },
    { id: 'highway', label: 'Coast Highway' },
    { id: 'ocean', label: 'Sun-Disc Ocean' }
  ];

  /* Deterministic PRNG (mulberry32): same seed, same picture, every run. */
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function sky(ctx, x, y, w, h, stops) {
    var g = ctx.createLinearGradient(0, y, 0, y + h);
    for (var i = 0; i < stops.length; i++) g.addColorStop(stops[i][0], stops[i][1]);
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
  }

  function sunDisc(ctx, cx, cy, r, top, bottom) {
    var g = ctx.createLinearGradient(0, cy - r, 0, cy + r);
    g.addColorStop(0, top);
    g.addColorStop(1, bottom);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  /* One palm: a curved trunk and a fan of fronds, drawn as a silhouette. */
  function palm(ctx, bx, by, s, lean, colour) {
    ctx.strokeStyle = colour;
    ctx.fillStyle = colour;
    ctx.lineCap = 'round';
    var topX = bx + lean * s, topY = by - s;
    ctx.lineWidth = Math.max(2, s * 0.055);
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(bx + lean * s * 0.3, by - s * 0.6, topX, topY);
    ctx.stroke();
    ctx.lineWidth = Math.max(1.5, s * 0.035);
    var fronds = 7;
    for (var i = 0; i < fronds; i++) {
      var a = Math.PI * (0.08 + 0.84 * (i / (fronds - 1)));
      var fx = topX + Math.cos(a) * s * 0.52;
      var fy = topY - Math.sin(a) * s * 0.30 + s * 0.16;
      ctx.beginPath();
      ctx.moveTo(topX, topY);
      ctx.quadraticCurveTo(
        topX + Math.cos(a) * s * 0.30, topY - Math.sin(a) * s * 0.42,
        fx, fy);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(topX, topY, Math.max(1.5, s * 0.045), 0, Math.PI * 2);
    ctx.fill();
  }

  /* A deco building: stepped massing, a fin, and a grid of lit windows. */
  function decoTower(ctx, bx, by, w, h, body, trim, seed) {
    var r = rng(seed);
    ctx.fillStyle = body;
    ctx.fillRect(bx, by - h, w, h);
    ctx.fillRect(bx + w * 0.22, by - h - h * 0.10, w * 0.56, h * 0.10);
    ctx.fillStyle = trim;
    ctx.fillRect(bx + w * 0.44, by - h - h * 0.22, w * 0.12, h * 0.22);
    ctx.fillRect(bx, by - h, w, Math.max(2, h * 0.02));
    var cols = Math.max(2, Math.floor(w / 16));
    var rows = Math.max(3, Math.floor(h / 26));
    for (var cx = 0; cx < cols; cx++) {
      for (var cy = 0; cy < rows; cy++) {
        if (r() < 0.42) continue;
        ctx.fillStyle = r() < 0.22 ? '#ffd9ec' : '#ffe9a8';
        ctx.globalAlpha = 0.55 + r() * 0.45;
        ctx.fillRect(
          bx + 4 + cx * ((w - 8) / cols),
          by - h + 8 + cy * ((h - 14) / rows),
          Math.max(2, w / cols * 0.42),
          Math.max(2, h / rows * 0.4));
      }
    }
    ctx.globalAlpha = 1;
  }

  function grain(ctx, x, y, w, h, seed, amount) {
    var r = rng(seed);
    var n = Math.floor(w * h / 900 * amount);
    for (var i = 0; i < n; i++) {
      var gx = x + r() * w, gy = y + r() * h;
      ctx.fillStyle = r() < 0.5 ? 'rgba(255,240,214,0.05)' : 'rgba(24,6,32,0.06)';
      ctx.fillRect(gx, gy, 1.4, 1.4);
    }
  }

  function drawBeach(ctx, x, y, w, h) {
    sky(ctx, x, y, w, h, [
      [0, '#ff9d5c'], [0.45, '#ff7e79'], [0.72, '#c95d8f'], [1, '#5b2a6e']
    ]);
    sunDisc(ctx, x + w * 0.5, y + h * 0.52, h * 0.30, '#ffd98a', '#ff7e5f');
    /* sea band */
    ctx.fillStyle = '#1f8a9e';
    ctx.fillRect(x, y + h * 0.55, w, h * 0.16);
    ctx.fillStyle = 'rgba(255,217,138,0.5)';
    ctx.fillRect(x, y + h * 0.55, w, Math.max(2, h * 0.012));
    /* sand */
    ctx.fillStyle = '#f2c184';
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x, y + h * 0.71);
    ctx.quadraticCurveTo(x + w * 0.5, y + h * 0.64, x + w, y + h * 0.74);
    ctx.lineTo(x + w, y + h);
    ctx.closePath();
    ctx.fill();
    /* deco hotels flanking the shore */
    decoTower(ctx, x + w * 0.015, y + h * 0.72, w * 0.15, h * 0.52, '#f7e8d0', '#e2607f', 11);
    decoTower(ctx, x + w * 0.845, y + h * 0.73, w * 0.14, h * 0.46, '#bfe6dd', '#2f7f8f', 23);
    var ink = '#33204a';
    palm(ctx, x + w * 0.24, y + h * 0.78, h * 0.30, 0.35, ink);
    palm(ctx, x + w * 0.33, y + h * 0.82, h * 0.22, -0.3, ink);
    palm(ctx, x + w * 0.70, y + h * 0.80, h * 0.27, -0.4, ink);
    palm(ctx, x + w * 0.60, y + h * 0.86, h * 0.18, 0.3, ink);
    grain(ctx, x, y, w, h, 101, 1);
  }

  function drawSkyline(ctx, x, y, w, h) {
    sky(ctx, x, y, w, h, [
      [0, '#160a33'], [0.55, '#3d1560'], [0.8, '#7c2a6d'], [1, '#c94f7c']
    ]);
    sunDisc(ctx, x + w * 0.78, y + h * 0.30, h * 0.16, '#ff5da2', '#ff2e88');
    var r = rng(7);
    var bx = x - w * 0.04;
    var i = 0;
    while (bx < x + w) {
      var bw = w * (0.10 + r() * 0.10);
      var bh = h * (0.34 + r() * 0.42);
      var tone = ['#241243', '#2c1650', '#1d0d3a'][i % 3];
      decoTower(ctx, bx, y + h * 0.86, bw, bh, tone, i % 2 ? '#ff2e88' : '#19e3d0', 40 + i * 13);
      bx += bw + w * 0.015;
      i++;
    }
    /* wet street with neon reflections */
    ctx.fillStyle = '#120826';
    ctx.fillRect(x, y + h * 0.86, w, h * 0.14);
    ctx.fillStyle = 'rgba(255,46,136,0.35)';
    ctx.fillRect(x + w * 0.62, y + h * 0.88, w * 0.3, Math.max(2, h * 0.014));
    ctx.fillStyle = 'rgba(25,227,208,0.30)';
    ctx.fillRect(x + w * 0.08, y + h * 0.92, w * 0.34, Math.max(2, h * 0.012));
    palm(ctx, x + w * 0.10, y + h * 0.88, h * 0.34, 0.3, '#0d0518');
    palm(ctx, x + w * 0.93, y + h * 0.88, h * 0.28, -0.35, '#0d0518');
    grain(ctx, x, y, w, h, 202, 1);
  }

  function drawHighway(ctx, x, y, w, h) {
    sky(ctx, x, y, w, h, [
      [0, '#ffb35c'], [0.5, '#ff7e79'], [0.78, '#8a3d78'], [1, '#3a1c5e']
    ]);
    sunDisc(ctx, x + w * 0.30, y + h * 0.46, h * 0.24, '#ffe3a1', '#ff8a5f');
    /* sea on the right of the causeway */
    ctx.fillStyle = '#177e94';
    ctx.fillRect(x + w * 0.58, y + h * 0.52, w * 0.42, h * 0.2);
    /* road sweeping to a vanishing point */
    ctx.fillStyle = '#2b2140';
    ctx.beginPath();
    ctx.moveTo(x + w * 0.06, y + h);
    ctx.lineTo(x + w * 0.44, y + h * 0.55);
    ctx.lineTo(x + w * 0.56, y + h * 0.55);
    ctx.lineTo(x + w * 0.98, y + h);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffd98a';
    ctx.lineWidth = Math.max(2, h * 0.008);
    ctx.setLineDash([h * 0.05, h * 0.045]);
    ctx.beginPath();
    ctx.moveTo(x + w * 0.52, y + h * 0.58);
    ctx.lineTo(x + w * 0.52, y + h);
    ctx.stroke();
    ctx.setLineDash([]);
    /* convertible silhouette, low and long */
    var cw = w * 0.52, ch = h * 0.16, cx0 = x + w * 0.16, cy0 = y + h * 0.86;
    ctx.fillStyle = '#170b2a';
    ctx.beginPath();
    ctx.moveTo(cx0, cy0);
    ctx.quadraticCurveTo(cx0 + cw * 0.04, cy0 - ch * 0.55, cx0 + cw * 0.24, cy0 - ch * 0.62);
    ctx.lineTo(cx0 + cw * 0.38, cy0 - ch * 1.05);
    ctx.quadraticCurveTo(cx0 + cw * 0.42, cy0 - ch * 1.3, cx0 + cw * 0.55, cy0 - ch * 1.28);
    ctx.lineTo(cx0 + cw * 0.66, cy0 - ch * 0.95);
    ctx.quadraticCurveTo(cx0 + cw * 0.92, cy0 - ch * 0.8, cx0 + cw, cy0 - ch * 0.3);
    ctx.quadraticCurveTo(cx0 + cw, cy0, cx0 + cw * 0.9, cy0);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx0 + cw * 0.22, cy0, ch * 0.30, 0, Math.PI * 2);
    ctx.arc(cx0 + cw * 0.80, cy0, ch * 0.30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff2e88';
    ctx.fillRect(cx0 + cw * 0.02, cy0 - ch * 0.42, cw * 0.05, ch * 0.12);
    palm(ctx, x + w * 0.90, y + h * 0.98, h * 0.34, -0.3, '#241038');
    palm(ctx, x + w * 0.06, y + h * 0.72, h * 0.22, 0.35, '#241038');
    grain(ctx, x, y, w, h, 303, 1);
  }

  function drawOcean(ctx, x, y, w, h) {
    sky(ctx, x, y, w, h * 0.52, [
      [0, '#ffd98a'], [0.6, '#ff9d5c'], [1, '#ff7e79']
    ]);
    ctx.fillStyle = '#ff7e79';
    ctx.fillRect(x, y + h * 0.52, w, 2);
    sunDisc(ctx, x + w * 0.5, y + h * 0.52, h * 0.26, '#fff0b8', '#ff8a5f');
    /* sea */
    var g = ctx.createLinearGradient(0, y + h * 0.52, 0, y + h);
    g.addColorStop(0, '#2aa7b8');
    g.addColorStop(1, '#0d5d78');
    ctx.fillStyle = g;
    ctx.fillRect(x, y + h * 0.52, w, h * 0.48);
    /* sun path glitter */
    var r = rng(55);
    ctx.fillStyle = 'rgba(255,224,150,0.55)';
    for (var i = 0; i < 46; i++) {
      var gy = y + h * (0.56 + r() * 0.40);
      var spread = (gy - y) / h * w * 0.16;
      var gx = x + w * 0.5 + (r() - 0.5) * spread;
      ctx.fillRect(gx, gy, 4 + r() * w * 0.03, Math.max(1.5, h * 0.006));
    }
    /* skyline silhouette on the horizon */
    ctx.fillStyle = 'rgba(59,32,84,0.75)';
    var bx = x + w * 0.04;
    var j = 0;
    while (bx < x + w * 0.96) {
      var bw = w * (0.03 + r() * 0.035);
      var bh = h * (0.03 + r() * 0.05);
      ctx.fillRect(bx, y + h * 0.52 - bh, bw, bh);
      bx += bw + w * 0.012;
      j++;
    }
    /* boat rail corner, bottom right */
    ctx.strokeStyle = '#f7e8d0';
    ctx.lineWidth = Math.max(3, h * 0.012);
    ctx.beginPath();
    ctx.moveTo(x + w * 0.72, y + h);
    ctx.lineTo(x + w * 0.86, y + h * 0.80);
    ctx.lineTo(x + w, y + h * 0.78);
    ctx.stroke();
    grain(ctx, x, y, w, h, 404, 1);
  }

  var PAINTERS = [drawBeach, drawSkyline, drawHighway, drawOcean];

  function draw(ctx, kind, x, y, w, h) {
    var p = PAINTERS[((kind % PAINTERS.length) + PAINTERS.length) % PAINTERS.length];
    p(ctx, x, y, w, h);
  }

  window.NVBackdrops = { KINDS: KINDS, draw: draw };
})();
