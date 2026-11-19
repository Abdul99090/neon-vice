# NEON VICE — Cover Art Maker

[![make.fun — gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/c/gta6-cover-art-01)
[![Rank](https://make.fun/badge/gta6-cover-art-01/Abdul99090/neon-vice/rank.svg)](https://make.fun/c/gta6-cover-art-01)
[![Reward](https://make.fun/badge/gta6-cover-art-01/Abdul99090/neon-vice/reward.svg)](https://make.fun/c/gta6-cover-art-01)

**NEON VICE** turns your photos and a caption into a GTA-6-style
multi-panel poster cover, exported as a PNG — entirely offline, in your
browser. Your photos never leave your machine.

Built for the make.fun competition
[gta6-cover-art-01](https://make.fun/c/gta6-cover-art-01).

## The look: "Dusk Collage"

Flat panels cut like paper on **angled dividers**, cream keylines between
every cut, and typography treated as architecture: a giant stacked Anton
headline standing on the hero panel. Every photo gets the **Vice grade** —
teal-lifted shadows, warm pink-orange highlights, an S-curve and a sunset
wash — in two variants (Sunset / Neon Night) that alternate across panels
for collage rhythm.

## What it does

- **Opens with a finished demo cover** composed from bundled sample
  photos — the first screen is the product.
- **4 layouts** (Poster, Strip, Grid, Focus) × **3 export sizes**
  (1080×1080, 1080×1350, 1920×1080), panel geometry recomputed per aspect.
- **Up to 4 photos**: file picker or drag-and-drop. Click a panel to
  select it, drag on the canvas to pan its photo, zoom per panel, toggle
  its grade, swap panels — layout switches keep your assignments.
- **No empty boxes**: a panel without a photo is filled with a procedural
  illustrated backdrop (dusk beach, neon skyline, coast highway, sun-disc
  ocean) drawn on canvas in the same grade, with seeded film grain.
- **Editable words**: headline and kicker line, set in the bundled
  OFL-licensed Anton typeface with a hard offset shadow over a feathered
  scrim.
- **Export PNG** at the exact chosen pixel size.

## Running it

Open `app/index.html` in a desktop browser — it is a plain static app
with zero network requests. For a local preview server:

```sh
node serve.ts        # http://localhost:8080
```

## Entry plumbing (make.fun)

`main.ts` copies `app/` and `screenshots/` to `/output` and writes
`/output/dossier.json` using `buildDossier` from the kit's vendored
library (`vendor/makefun-app.ts`, unmodified):

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Screenshots are produced from the app itself via its deterministic
`?shot=` modes; `shots.json` lists them.

## Licenses

Code: MIT (see `LICENSE`). Fonts: Anton and Archivo, SIL Open Font
License 1.1 (see `app/fonts/OFL-*.txt`). Sample photos in `app/samples/`
were made with an image model for make.fun and are free to use. No
Rockstar logos, fonts, or artwork are used anywhere.
