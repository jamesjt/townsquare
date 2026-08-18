// Golem fork (FT-856 slice C): restyle ANY image toward the official BOTC
// icon look — rebuilt from the ground up as an ENGRAVER, not a color filter.
//
// The silhouette is treated as geometry:
//   knockout -> edge roughening (warp field) -> signed distance transform ->
//   relief lighting (the SDF as a height field, lit upper-left) ->
//   noise-wobbled ink contour -> hatching in the shadow bands ->
//   data-driven color ramp (sampled from the 139 official icons: good is
//   blue-monochrome, evil oxblood, highlights near-white) ->
//   two-octave paper mottle -> cast shadow.
//
// Pure canvas, no dependencies; deterministic per seed (the re-roll contract).

// Luminance-banded palettes EXTRACTED from the bundled official art
// (claude_temp_test/2026-08-17-ramp-extract.mjs) — 8 stops, dark -> light.
const RAMPS = {
  good: [
    [2, 11, 186],
    [2, 45, 220],
    [4, 89, 243],
    [16, 131, 252],
    [59, 162, 253],
    [114, 189, 252],
    [178, 213, 248],
    [244, 248, 252]
  ],
  evil: [
    [80, 2, 2],
    [158, 3, 4],
    [215, 11, 11],
    [189, 78, 78],
    [201, 119, 118],
    [214, 160, 159],
    [229, 200, 198],
    [250, 246, 245]
  ],
  neutral: [
    [34, 19, 51],
    [65, 40, 71],
    [93, 66, 90],
    [113, 108, 123],
    [144, 142, 147],
    [179, 175, 171],
    [216, 207, 195],
    [255, 247, 225]
  ]
};

// The official icons' measured tonal DISTRIBUTION (fraction of opaque pixels
// at or below each band — claude_temp_test/2026-08-17-tone-assess.mjs).
// Evil art is 56% deep red; good is mid-blue-heavy; highlights are sparse.
// Every bake is histogram-MATCHED to this, so the output is exactly as dark
// as the source material.
const CDFS = {
  good: [0.0047, 0.0892, 0.3198, 0.5915, 0.7287, 0.8155, 0.8627, 1],
  evil: [0.074, 0.5654, 0.7627, 0.7919, 0.8158, 0.8401, 0.8746, 1],
  neutral: [0.039, 0.327, 0.541, 0.692, 0.772, 0.828, 0.869, 1]
};

// Mean |high-pass residual| of the official art per tone band (measured,
// claude_temp_test/2026-08-17-grain-assess.mjs) — the grain is quiet inside
// the deep color pools and ROARS in the highlights.
const GRAIN_AMP = [16.5, 7.2, 8.3, 9.9, 14.6, 16.1, 20.5, 33.2];

/** percentile (0..1) -> tone (0..1) through an alignment's inverse CDF. */
function invCdf(cdf, p) {
  let prev = 0;
  for (let b = 0; b < cdf.length; b++) {
    if (p <= cdf[b] || b === cdf.length - 1) {
      const span = cdf[b] - prev || 1e-6;
      return (b + (p - prev) / span) / cdf.length;
    }
    prev = cdf[b];
  }
  return 1;
}

/** Deterministic hash noise in [0, 1). */
function hash2(x, y, seed) {
  let h = (x | 0) * 374761393 + (y | 0) * 668265263 + (seed | 0) * 2654435761;
  h = (h ^ (h >> 13)) * 1274126177;
  h ^= h >> 16;
  return (h >>> 0) / 4294967296;
}

/** Gridded value noise, bilinear, cell size `sc` px. */
function vnoise(x, y, sc, seed) {
  const gx = Math.floor(x / sc),
    gy = Math.floor(y / sc);
  const fx = x / sc - gx,
    fy = y / sc - gy;
  const sx = fx * fx * (3 - 2 * fx),
    sy = fy * fy * (3 - 2 * fy);
  const a = hash2(gx, gy, seed),
    b = hash2(gx + 1, gy, seed),
    c = hash2(gx, gy + 1, seed),
    d = hash2(gx + 1, gy + 1, seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

/** Two octaves — enough structure for paper and warp fields. */
function fbm(x, y, sc, seed) {
  return 0.65 * vnoise(x, y, sc, seed) + 0.35 * vnoise(x, y, sc / 2, seed + 7);
}

/**
 * If the image has no alpha and a near-uniform border color, flood it away
 * from the edges. Photos with busy edges are left alone.
 */
function knockoutBackground(data, w, h) {
  let transparent = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] < 250) transparent++;
  if (transparent > data.length / 400) return; // already has real alpha

  const border = [];
  for (let x = 0; x < w; x++) border.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) border.push(y * w, y * w + w - 1);
  let r = 0,
    g = 0,
    b = 0;
  border.forEach(p => {
    r += data[p * 4];
    g += data[p * 4 + 1];
    b += data[p * 4 + 2];
  });
  r /= border.length;
  g /= border.length;
  b /= border.length;
  const dist = p => {
    const dr = data[p * 4] - r,
      dg = data[p * 4 + 1] - g,
      db = data[p * 4 + 2] - b;
    return Math.sqrt(dr * dr + dg * dg + db * db);
  };
  const uniform = border.filter(p => dist(p) < 40).length / border.length;
  if (uniform < 0.7) return;

  const seen = new Uint8Array(w * h);
  const stack = border.filter(p => dist(p) < 48);
  stack.forEach(p => (seen[p] = 1));
  while (stack.length) {
    const p = stack.pop();
    data[p * 4 + 3] = 0;
    const x = p % w,
      y = (p / w) | 0;
    [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1]
    ].forEach(([nx, ny]) => {
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) return;
      const np = ny * w + nx;
      if (seen[np]) return;
      if (dist(np) < 48) {
        seen[np] = 1;
        stack.push(np);
      }
    });
  }
}

/** Chamfer 3-4 distance to the nearest outside pixel, in px. */
function distanceField(mask, w, h) {
  const INF = 1e7;
  const d = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) d[i] = mask[i] ? INF : 0;
  // forward
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!d[i]) continue;
      let m = d[i];
      if (x > 0) m = Math.min(m, d[i - 1] + 3);
      if (y > 0) {
        m = Math.min(m, d[i - w] + 3);
        if (x > 0) m = Math.min(m, d[i - w - 1] + 4);
        if (x < w - 1) m = Math.min(m, d[i - w + 1] + 4);
      }
      d[i] = m;
    }
  // backward
  for (let y = h - 1; y >= 0; y--)
    for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x;
      if (!d[i]) continue;
      let m = d[i];
      if (x < w - 1) m = Math.min(m, d[i + 1] + 3);
      if (y < h - 1) {
        m = Math.min(m, d[i + w] + 3);
        if (x < w - 1) m = Math.min(m, d[i + w + 1] + 4);
        if (x > 0) m = Math.min(m, d[i + w - 1] + 4);
      }
      d[i] = m;
    }
  for (let i = 0; i < w * h; i++) d[i] /= 3;
  return d;
}

/**
 * srcDataUrl -> Promise<dataUrl of the stylized icon> (PNG, `size` px).
 * tint: "neutral" | "good" | "evil". seed re-rolls every noise field.
 */
export function stylizeIcon(
  srcDataUrl,
  { tint = "neutral", size = 128, seed = 0 } = {}
) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const W = 256; // working resolution
        const work = document.createElement("canvas");
        work.width = W;
        work.height = W;
        const g = work.getContext("2d");
        const scale = Math.min((W * 0.86) / img.width, (W * 0.86) / img.height);
        const dw = img.width * scale,
          dh = img.height * scale;
        g.drawImage(img, (W - dw) / 2, (W - dh) / 2, dw, dh);

        const id = g.getImageData(0, 0, W, W);
        const src = id.data;
        knockoutBackground(src, W, W);

        // ---- edge roughening: one warp field displaces every sample ----
        const AMP = 2.6;
        const warp = (x, y) => {
          const nx = fbm(x, y, 23, seed + 11) - 0.5;
          const ny = fbm(x, y, 23, seed + 29) - 0.5;
          return [
            Math.max(0, Math.min(W - 1, Math.round(x + nx * 2 * AMP))),
            Math.max(0, Math.min(W - 1, Math.round(y + ny * 2 * AMP)))
          ];
        };
        const mask = new Uint8Array(W * W);
        const alpha = new Uint8ClampedArray(W * W);
        const detail = new Float32Array(W * W);
        for (let y = 0; y < W; y++)
          for (let x = 0; x < W; x++) {
            const [wx, wy] = warp(x, y);
            const sp = (wy * W + wx) * 4;
            const i = y * W + x;
            alpha[i] = src[sp + 3];
            mask[i] = src[sp + 3] > 100 ? 1 : 0;
            detail[i] =
              (0.299 * src[sp] + 0.587 * src[sp + 1] + 0.114 * src[sp + 2]) /
              255;
          }

        const dist = distanceField(mask, W, W);

        // ---- relief height from the SDF ----
        const CAP = 15;
        const hgt = new Float32Array(W * W);
        for (let i = 0; i < W * W; i++) {
          const t = Math.min(dist[i], CAP) / CAP;
          hgt[i] = t * t * (3 - 2 * t);
        }

        // light from the upper-left — a WHISPER: the official art is flat
        // paint with texture, not an embossed relief (user call 2026-08-17)
        const LX = -0.55,
          LY = -0.7,
          LZ = 0.62;
        const HSCALE = 2.0;

        const ramp = RAMPS[tint] || RAMPS.neutral;
        const cdfT = CDFS[tint] || CDFS.neutral;

        // ---- pass 1: raw value per pixel (light + detail + ink + texture) ----
        const vmap = new Float32Array(W * W);
        const vhist = new Float32Array(256);
        let vcount = 0;
        for (let y = 0; y < W; y++)
          for (let x = 0; x < W; x++) {
            const i = y * W + x;
            if (!alpha[i]) continue;
            const iL = x > 0 ? i - 1 : i,
              iR = x < W - 1 ? i + 1 : i,
              iU = y > 0 ? i - W : i,
              iD = y < W - 1 ? i + W : i;
            // normal from the height gradient
            const gx = (hgt[iR] - hgt[iL]) * HSCALE;
            const gy = (hgt[iD] - hgt[iU]) * HSCALE;
            const inv = 1 / Math.sqrt(gx * gx + gy * gy + 1);
            const ndl = (-gx * LX - gy * LY + LZ) * inv;
            // near-flat base; tone comes from PAINT, not elevation —
            // broad soft patches like brushwork over the whole shape
            let v = 0.48 + 0.2 * Math.max(0, ndl);
            v *= 0.7 + 0.6 * fbm(x, y, 78, seed + 7);

            // the source's own tones carry interior features (uploads);
            // flat fills leave this neutral
            v *= 0.6 + 0.55 * detail[i];

            // wobbled ink contour
            const cw = 1.6 + 2.2 * fbm(x, y, 17, seed + 43);
            if (dist[i] < cw) v *= 0.16 + 0.5 * (dist[i] / cw);

            // hatching in the shadow bands — the engraver's stroke
            if (v < 0.46 && dist[i] > 1.5) {
              const ph = fbm(x, y, 31, seed + 57) * 6;
              const s = Math.sin((x + y) * 0.82 + ph);
              if (s > 0.25) v *= 0.72;
            }

            // low-frequency TEXTURE: broad paint mottle + a brush pull
            // stretched along the vertical (fine grain joins in pass 2,
            // AFTER the histogram match — matching would flatten it here)
            v *= 0.78 + 0.42 * fbm(x, y, 34, seed + 71);
            v *= 0.86 + 0.24 * fbm(x * 0.35, y, 13, seed + 83);

            vmap[i] = v;
            vhist[Math.max(0, Math.min(255, (v * 128) | 0))]++;
            vcount++;
          }

        // per-icon CDF of the raw values -> percentile per pixel
        const vcdf = new Float32Array(256);
        let runsum = 0;
        for (let b = 0; b < 256; b++) {
          runsum += vhist[b];
          vcdf[b] = vcount ? runsum / vcount : 0;
        }

        // ---- pass 2: histogram-match to the official distribution ----
        const out = g.createImageData(W, W);
        const od = out.data;
        for (let i = 0; i < W * W; i++) {
          if (!alpha[i]) continue;
          const x = i % W,
            y = (i / W) | 0;
          const p = vcdf[Math.max(0, Math.min(255, (vmap[i] * 128) | 0))];
          let tone = invCdf(cdfT, p);
          // noise-dithered posterize: paint POOLS in its band, the band
          // borders wobble instead of tracing the geometry
          const dith = (fbm(x, y, 11, seed + 113) - 0.5) * 0.85;
          const band = Math.max(
            0,
            Math.min(7.999, tone * 8 + dith)
          );
          const b0 = band | 0,
            f = band - b0;
          const c0 = ramp[b0],
            c1 = ramp[Math.min(7, b0 + 1)];
          // MEASURED film grain (the official residual: std ~19/255,
          // near-per-pixel with light clumping, largely per-channel,
          // strongest in the highlights) — injected at the color stage so
          // the histogram match cannot iron it out. The 1.8x compensates
          // the final downscale's averaging.
          const amp = GRAIN_AMP[b0] * 1.8;
          const clump = (vnoise(x, y, 2, seed + 149) - 0.5) * 0.5;
          for (let c = 0; c < 3; c++) {
            const gN =
              hash2(x, y, seed + 131 + c * 17) +
              hash2(x + 911, y, seed + 173 + c * 17) -
              1; // triangular in [-1, 1]
            const base = c0[c] + (c1[c] - c0[c]) * f;
            od[i * 4 + c] = Math.max(
              0,
              Math.min(255, base + (0.8 * gN + clump) * amp)
            );
          }
          od[i * 4 + 3] = alpha[i];
        }
        g.putImageData(out, 0, 0);

        // ---- bake the cast shadow into the final size ----
        const fin = document.createElement("canvas");
        fin.width = size;
        fin.height = size;
        const og = fin.getContext("2d");
        og.shadowColor = "rgba(0, 0, 0, 0.6)";
        og.shadowBlur = size / 16;
        og.shadowOffsetY = size / 36;
        og.drawImage(work, size * 0.03, size * 0.015, size * 0.94, size * 0.94);
        resolve(fin.toDataURL("image/png"));
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error("could not read the image"));
    img.src = srcDataUrl;
  });
}
