/*
 * NEON VICE — the cover renderer.
 *
 * "Dusk Collage": flat panels cut like paper on angled dividers, cream
 * keylines between every cut, a soft inner shadow for cut-paper depth,
 * and typography treated as architecture — a giant stacked Anton headline
 * standing on the hero panel over a feathered scrim. Photos get the Vice
 * grade (teal-lifted shadows, warm highlights, S-curve, sunset wash,
 * vignette) in two variants that alternate across panels for rhythm.
 *
 * Exposes window.NVCover:
 *   SIZES, LAYOUTS          — the export sizes and layout names
 *   panelCount(layout)      — how many panels a layout uses
 *   panelsFor(layout, W, H) — panel polygons for a canvas of W x H
 *   render(ctx, W, H, state)— draw the whole cover
 *
 * state = {
 *   layout, headline, kicker, gradeStrength,
 *   panels: [{ photo: {img, variant} | null, backdrop, panX, panY,
 *              zoom, grade }]   // one entry per panel slot
 * }
 * Rendering is deterministic: all grain is seeded.
 */
(function () {
  'use strict';

  var SIZES = {
    '1080x1080': [1080, 1080],
    '1080x1350': [1080, 1350],
    '1920x1080': [1920, 1080]
  };
  var LAYOUTS = ['poster', 'strip', 'grid', 'focus'];
  var CREAM = '#f7ead2';
  var GOLD = '#f5c542';
  var INK = '#2a0a2e';

  function panelCount(layout) {
    if (layout === 'focus') return 1;
    if (layout === 'grid') return 4;
    return 3; // poster, strip
  }

  /* Point on the slanted hero divider at height fraction t. */
  function dividerPoint(hx, slant, W, t) {
    return [hx + slant * (1 - 2 * t), t];
  }

  /*
   * Panel polygons. The signature move is the ANGLED divider: the hero
   * split leans by `slant` (a fraction of width), and the cross split
   * leans the other way, so no two panels share a right angle.
   */
  function panelsFor(layout, W, H) {
    var landscape = W >= H;
    var slant = 0.045;
    var panels = [];
    var i, t, p;

    if (layout === 'focus') {
      return [{ name: 'hero', poly: [[0, 0], [1, 0], [1, 1], [0, 1]] }];
    }

    if (layout === 'grid') {
      var mx = 0.5, my = 0.5, sx = slant * 0.8, sy = slant * (W / H) * 0.8;
      var topMid = [mx + sx, 0], botMid = [mx - sx, 1];
      var leftMid = [0, my + sy], rightMid = [1, my - sy];
      var centre = [mx, my];
      return [
        { name: 'cut 1', poly: [[0, 0], topMid, centre, leftMid] },
        { name: 'cut 2', poly: [topMid, [1, 0], rightMid, centre] },
        { name: 'cut 3', poly: [leftMid, centre, botMid, [0, 1]] },
        { name: 'cut 4', poly: [centre, rightMid, [1, 1], botMid] }
      ];
    }

    if (layout === 'strip') {
      var hy = 0.60, hs = slant * (W / H);
      var l = [0, hy + hs], r = [1, hy - hs];
      var bx = 0.52;
      var bTop = [bx + slant * 0.5, hy - hs + (hs * 2) * bx];
      var bBot = [bx - slant * 0.5, 1];
      panels = [
        { name: 'hero', poly: [[0, 0], [1, 0], r, l] },
        { name: 'strip 1', poly: [l, bTop, bBot, [0, 1]] },
        { name: 'strip 2', poly: [bTop, r, [1, 1], bBot] }
      ];
      return panels;
    }

    /* poster */
    if (landscape) {
      var hx = 0.575, ry = 0.52;
      var a = dividerPoint(hx, slant, W, 0);       // divider top
      var b = dividerPoint(hx, slant, W, 1);       // divider bottom
      t = ry; p = dividerPoint(hx, slant, W, t);   // divider at split
      var splitR = [1, ry - slant * 0.7];
      return [
        { name: 'hero', poly: [[0, 0], a, b, [0, 1]] },
        { name: 'panel 2', poly: [a, [1, 0], splitR, p] },
        { name: 'panel 3', poly: [p, splitR, [1, 1], b] }
      ];
    }
    /* portrait poster: hero band on top, two cuts below */
    var hyy = 0.60, hss = slant * (W / H) * 1.4;
    var ll = [0, hyy + hss], rr = [1, hyy - hss];
    var vx = 0.46;
    var vTop = [vx + slant * 0.6, hyy - hss + (hss * 2) * vx];
    var vBot = [vx - slant * 0.6, 1];
    return [
      { name: 'hero', poly: [[0, 0], [1, 0], rr, ll] },
      { name: 'panel 2', poly: [ll, vTop, vBot, [0, 1]] },
      { name: 'panel 3', poly: [vTop, rr, [1, 1], vBot] }
    ];
  }

  function polyPath(ctx, poly, W, H) {
    ctx.beginPath();
    for (var i = 0; i < poly.length; i++) {
      var x = poly[i][0] * W, y = poly[i][1] * H;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  function polyBBox(poly) {
    var xs = poly.map(function (p) { return p[0]; });
    var ys = poly.map(function (p) { return p[1]; });
    return {
      x: Math.min.apply(null, xs), y: Math.min.apply(null, ys),
      w: Math.max.apply(null, xs) - Math.min.apply(null, xs),
      h: Math.max.apply(null, ys) - Math.min.apply(null, ys)
    };
  }

  /* ---------------- the Vice grade ---------------- */

  var gradeCache = {};

  /*
   * Grade a photo into an offscreen canvas. variant 0 = Sunset,
   * 1 = Neon Night. strength 0..1 blends the grade over the original.
   * Results are cached per image + variant + strength bucket.
   */
  function graded(img, variant, strength) {
    var bucket = Math.round(strength * 20);
    var key = (img.__nvId || 0) + '|' + variant + '|' + bucket;
    if (gradeCache[key]) return gradeCache[key];

    var maxSide = 1600;
    var scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    var w = Math.max(2, Math.round(img.naturalWidth * scale));
    var h = Math.max(2, Math.round(img.naturalHeight * scale));
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);

    var s = bucket / 20;
    if (s > 0) {
      var data = ctx.getImageData(0, 0, w, h);
      var px = data.data;
      var teal = variant === 1 ? 1.5 : 1.0;
      var pink = variant === 1 ? 1.35 : 1.0;
      for (var i = 0; i < px.length; i += 4) {
        var r = px[i] / 255, g = px[i + 1] / 255, bl = px[i + 2] / 255;
        /* S-curve contrast */
        var cr = curve(r, s), cg = curve(g, s), cb = curve(bl, s);
        /* saturation around the curved luminance */
        var lum = 0.2126 * cr + 0.7152 * cg + 0.0722 * cb;
        var sat = 1 + 0.28 * s;
        cr = lum + (cr - lum) * sat;
        cg = lum + (cg - lum) * sat;
        cb = lum + (cb - lum) * sat;
        /* teal shadows, warm pink-orange highlights */
        var sh = (1 - lum) * (1 - lum) * s;
        var hi = lum * lum * s;
        cr += (-0.015 * teal) * sh + 0.055 * pink * hi;
        cg += (0.045 * teal) * sh + 0.018 * hi;
        cb += (0.065 * teal) * sh + (-0.030 + 0.03 * (pink - 1)) * hi;
        px[i] = clamp255(cr * 255);
        px[i + 1] = clamp255(cg * 255);
        px[i + 2] = clamp255(cb * 255);
      }
      ctx.putImageData(data, 0, 0);
      /* sunset wash + vignette, baked into the panel photo */
      var wash = ctx.createLinearGradient(0, 0, 0, h);
      wash.addColorStop(0, 'rgba(255,130,80,' + (0.10 * s) + ')');
      wash.addColorStop(0.55, 'rgba(255,80,140,' + (0.04 * s) + ')');
      wash.addColorStop(1, 'rgba(16,8,48,' + (0.14 * s) + ')');
      ctx.fillStyle = wash;
      ctx.fillRect(0, 0, w, h);
      var vg = ctx.createRadialGradient(
        w / 2, h / 2, Math.min(w, h) * 0.42,
        w / 2, h / 2, Math.max(w, h) * 0.78);
      vg.addColorStop(0, 'rgba(10,0,24,0)');
      vg.addColorStop(1, 'rgba(10,0,24,' + (0.20 * s) + ')');
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, w, h);
    }
    gradeCache[key] = c;
    return c;
  }

  function curve(v, s) {
    var smooth = v * v * (3 - 2 * v);
    return v + (smooth - v) * 0.55 * s;
  }

  function clamp255(v) {
    return v < 0 ? 0 : v > 255 ? 255 : v;
  }

  /* ---------------- panel fills ---------------- */

  function drawPhoto(ctx, src, bbox, W, H, slot) {
    var bw = bbox.w * W, bh = bbox.h * H;
    var iw = src.width, ih = src.height;
    var scale = Math.max(bw / iw, bh / ih) * (slot.zoom || 1);
    var dw = iw * scale, dh = ih * scale;
    /* pan: 0..1 maps across the overflow on each axis */
    var ox = bbox.x * W + (bw - dw) * (slot.panX != null ? slot.panX : 0.5);
    var oy = bbox.y * H + (bh - dh) * (slot.panY != null ? slot.panY : 0.5);
    ctx.drawImage(src, ox, oy, dw, dh);
  }

  function grainOver(ctx, W, H, seed) {
    var a = seed >>> 0;
    function rnd() {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    var n = Math.floor(W * H / 2600);
    for (var i = 0; i < n; i++) {
      ctx.fillStyle = rnd() < 0.5 ? 'rgba(255,240,214,0.045)' : 'rgba(20,4,30,0.05)';
      ctx.fillRect(rnd() * W, rnd() * H, 1.5, 1.5);
    }
  }

  /* ---------------- lettering ---------------- */

  function drawLettering(ctx, W, H, state, panels) {
    var hero = panels[0];
    var hb = polyBBox(hero.poly);
    var portraitHero = hb.h < 0.75 && hb.w > 0.9; // hero band across the top
    var margin = W * 0.035;
    var baseX = margin;
    var blockW = Math.min(hb.w * W * 0.94, W * 0.62);

    var headline = (state.headline || '').toUpperCase().trim() || 'NEON SHORES';
    var words = headline.split(/\s+/);
    var lines = words.length > 1 ? words : [headline];

    /* Fit the Anton stack: shrink until the widest line fits blockW. */
    var size = H * 0.175;
    ctx.textBaseline = 'alphabetic';
    function setFont(px) {
      ctx.font = px + 'px Anton, "Archivo", sans-serif';
    }
    setFont(size);
    var widest = 0;
    lines.forEach(function (ln) { widest = Math.max(widest, ctx.measureText(ln).width); });
    if (widest > blockW) {
      size = Math.floor(size * blockW / widest);
      setFont(size);
    }
    var leading = size * 0.94;
    var blockH = leading * lines.length;

    var kickerSize = Math.max(13, H * 0.021);
    var kickerGap = kickerSize * 1.15;

    var blockBottom = portraitHero ? margin + kickerGap + blockH + H * 0.01
                                   : H - margin - H * 0.012;
    var blockTop = blockBottom - blockH;

    /* Feathered scrim behind the lettering block. */
    var scrimH = blockH + kickerGap + H * 0.10;
    var scrimY = portraitHero ? 0 : blockBottom - blockH - kickerGap - H * 0.03;
    var grad = ctx.createLinearGradient(0, scrimY, 0, scrimY + scrimH + H * 0.06);
    if (portraitHero) {
      grad.addColorStop(0, 'rgba(24,6,34,0.52)');
      grad.addColorStop(1, 'rgba(24,6,34,0)');
    } else {
      grad.addColorStop(0, 'rgba(24,6,34,0)');
      grad.addColorStop(1, 'rgba(24,6,34,0.55)');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, scrimY, W * 0.72, scrimH + H * 0.06);

    /* Kicker: small gold tracked capitals. */
    var kicker = (state.kicker || '').toUpperCase();
    if (kicker && !/✦\s*$/.test(kicker)) kicker += ' ✦';
    ctx.font = '700 ' + kickerSize + 'px Archivo, sans-serif';
    try { ctx.letterSpacing = (kickerSize * 0.32) + 'px'; } catch (e) {}
    ctx.fillStyle = GOLD;
    ctx.shadowColor = 'rgba(20,4,26,0.65)';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = kickerSize * 0.08;
    ctx.shadowOffsetY = kickerSize * 0.10;
    var kickerY = portraitHero ? margin + kickerSize : blockTop - kickerGap * 0.55;
    if (kicker) ctx.fillText(kicker, baseX, kickerY);
    try { ctx.letterSpacing = '0px'; } catch (e) {}
    ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;

    /* Headline: cream Anton, warm gradient face, hard dark offset shadow. */
    setFont(size);
    var face = ctx.createLinearGradient(0, blockTop - size, 0, blockBottom);
    face.addColorStop(0, '#fff6df');
    face.addColorStop(0.75, CREAM);
    face.addColorStop(1, '#f3d9ae');
    for (var i = 0; i < lines.length; i++) {
      var y = blockTop + leading * (i + 0.82);
      ctx.fillStyle = INK;
      ctx.fillText(lines[i], baseX + size * 0.045, y + size * 0.05);
      ctx.fillStyle = face;
      ctx.fillText(lines[i], baseX, y);
    }

    /* Watermark, bottom-right. */
    var wmSize = Math.max(12, H * 0.017);
    ctx.font = '700 ' + wmSize + 'px Archivo, sans-serif';
    var wm = '✦ NEON VICE';
    var wmW = ctx.measureText(wm).width;
    ctx.fillStyle = 'rgba(20,4,26,0.45)';
    ctx.fillText(wm, W - margin - wmW + 1.5, H - margin * 0.72 + 1.5);
    ctx.fillStyle = '#ffe9a8';
    ctx.fillText(wm, W - margin - wmW, H - margin * 0.72);
  }

  /* ---------------- the whole cover ---------------- */

  function render(ctx, W, H, state) {
    var panels = panelsFor(state.layout, W, H);
    var key = Math.max(9, Math.round(Math.min(W, H) * 0.011));
    var frame = Math.max(12, Math.round(W * 0.011));

    ctx.fillStyle = CREAM;
    ctx.fillRect(0, 0, W, H);

    for (var i = 0; i < panels.length; i++) {
      var slot = state.panels[i] || {};
      var bbox = polyBBox(panels[i].poly);
      ctx.save();
      polyPath(ctx, panels[i].poly, W, H);
      ctx.clip();
      if (slot.photo && slot.photo.img) {
        var src = slot.grade === false
          ? slot.photo.img
          : graded(slot.photo.img, slot.photo.variant || 0, state.gradeStrength);
        drawPhoto(ctx, src, bbox, W, H, slot);
      } else {
        window.NVBackdrops.draw(ctx,
          slot.backdrop != null ? slot.backdrop : i,
          bbox.x * W, bbox.y * H, bbox.w * W, bbox.h * H);
      }
      /* cut-paper inner shadow */
      ctx.shadowColor = 'rgba(22,6,32,0.38)';
      ctx.shadowBlur = key * 2.0;
      ctx.strokeStyle = 'rgba(22,6,32,0.55)';
      ctx.lineWidth = key * 1.1;
      polyPath(ctx, panels[i].poly, W, H);
      ctx.stroke();
      ctx.restore();

      /* cream keyline on the cut edge */
      polyPath(ctx, panels[i].poly, W, H);
      ctx.strokeStyle = CREAM;
      ctx.lineWidth = key;
      ctx.stroke();
    }

    grainOver(ctx, W, H, 90210);
    drawLettering(ctx, W, H, state, panels);

    /* cream outer frame */
    ctx.strokeStyle = CREAM;
    ctx.lineWidth = frame;
    ctx.strokeRect(frame / 2, frame / 2, W - frame, H - frame);
  }

  window.NVCover = {
    SIZES: SIZES,
    LAYOUTS: LAYOUTS,
    panelCount: panelCount,
    panelsFor: panelsFor,
    render: render,
    _graded: graded
  };
})();
