// Golem fork (FT-856 slice C/D): restyle ANY image toward the official BOTC
// icon look. The full-res comparison (2026-08-17) reset the target: the
// official art is BRIGHT, saturated, LUMINOUS watercolor — flat washes, no
// cast shadow, color staying saturated into the highlights. Not an emboss,
// not a duotone, not chalk dust.
//
// Pipeline: knockout -> warp-roughened mask -> SDF -> near-flat shading with
// broad watercolor washes -> wobbled ink contour + light-side rim -> tone
// histogram-matched to the measured official distribution -> hue-locked
// saturated ramp -> soft wash mottle + restrained grain -> optional shadow.
//
// EVERY dial lives in `engraver` (persisted, Vue-observable) — the Ik lab
// panel drags them live. Deterministic per seed (the re-roll contract).
import Vue from "vue";

// Hue-locked ramps: lightness climbs, SATURATION HOLDS — the measured band
// colors muddied toward pink/grey at the top because averaging mixed
// linework with washes; the real art keeps its color. Dark -> light.
const RAMPS = {
  // the top stops stay CLEARLY colored — the officials' white lives in thin
  // linework, not area, so an area-wash pipeline must never hand out
  // near-white in bulk (user call: far too much white)
  good: [
    [2, 18, 110],
    [3, 42, 185],
    [8, 78, 232],
    [24, 110, 250],
    [48, 138, 255],
    [82, 168, 255],
    [122, 196, 255],
    [178, 224, 255]
  ],
  evil: [
    [58, 2, 2],
    [108, 3, 3],
    [162, 8, 8],
    [204, 18, 16],
    [222, 44, 38],
    [234, 82, 74],
    [244, 126, 116],
    [252, 176, 166]
  ],
  neutral: [
    [40, 24, 52],
    [72, 46, 76],
    [102, 72, 94],
    [128, 106, 118],
    [156, 140, 142],
    [186, 172, 164],
    [216, 204, 190],
    [246, 238, 218]
  ]
};

// The officials' measured tonal distribution (fraction of opaque pixels at
// or below each band — claude_temp_test/2026-08-17-tone-assess.mjs).
const CDFS = {
  good: [0.0047, 0.0892, 0.3198, 0.5915, 0.7287, 0.8155, 0.8627, 1],
  evil: [0.074, 0.5654, 0.7627, 0.7919, 0.8158, 0.8401, 0.8746, 1],
  neutral: [0.039, 0.327, 0.541, 0.692, 0.772, 0.828, 0.869, 1]
};

// Measured mean |high-pass residual| per tone band (grain assessment).
const GRAIN_AMP = [16.5, 7.2, 8.3, 9.9, 14.6, 16.1, 20.5, 33.2];

/** The engraver's dials — dragged live by the Ik lab, read at bake time. */
const DEFAULTS = {
  relief: 2, // 0 flat .. 8 embossed
  base: 0.5, // ambient tone floor
  wash: 0.6, // broad watercolor patch amplitude
  brush: 0.24, // vertical brush-pull amplitude
  mottle: 0.42, // mid-scale paint mottle amplitude
  grain: 0.45, // multiplier on the measured film grain
  contour: 1, // ink contour width multiplier (0 = no outline)
  hatch: 0.6, // shadow-band hatching strength
  pool: 0.85, // band-pooling dither width
  rim: 0.35, // light-side pale rim strength
  top: 6.6, // tone ceiling in bands for AREA pixels (rim may exceed it)
  shadow: 0 // cast shadow opacity (officials have NONE)
};
let stored = {};
try {
  stored = JSON.parse(localStorage.getItem("golem.engraver") || "{}");
} catch (e) {
  stored = {};
}
export const engraver = Vue.observable({ ...DEFAULTS, ...stored });
export const ENGRAVER_DIALS = [
  { key: "relief", label: "Relief", min: 0, max: 8, step: 0.25 },
  { key: "base", label: "Base tone", min: 0.2, max: 0.9, step: 0.02 },
  { key: "wash", label: "Wash", min: 0, max: 1.2, step: 0.05 },
  { key: "brush", label: "Brush pull", min: 0, max: 0.8, step: 0.04 },
  { key: "mottle", label: "Mottle", min: 0, max: 1, step: 0.05 },
  { key: "grain", label: "Grain", min: 0, max: 2, step: 0.05 },
  { key: "contour", label: "Contour", min: 0, max: 2.5, step: 0.1 },
  { key: "hatch", label: "Hatch", min: 0, max: 1, step: 0.05 },
  { key: "pool", label: "Pooling", min: 0, max: 2, step: 0.05 },
  { key: "rim", label: "Rim light", min: 0, max: 1, step: 0.05 },
  { key: "top", label: "Tone ceiling", min: 4, max: 8, step: 0.1 },
  { key: "shadow", label: "Shadow", min: 0, max: 1, step: 0.05 }
];
export function saveEngraver() {
  localStorage.setItem("golem.engraver", JSON.stringify({ ...engraver }));
}
export function resetEngraver() {
  Object.assign(engraver, DEFAULTS);
  saveEngraver();
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

/**
 * srcDataUrl -> Promise<dataUrl of the stylized icon> (PNG, `size` px).
 * tint: "neutral" | "good" | "evil". seed re-rolls every noise field.
 */
export function stylizeIcon(
  srcDataUrl,
  { tint = "neutral", size = 128, seed = 0 } = {}
) {
  const K = { ...engraver };
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const W = 256;
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

        // edge roughening: one warp field displaces every sample
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

        const CAP = 15;
        const hgt = new Float32Array(W * W);
        for (let i = 0; i < W * W; i++) {
          const t = Math.min(dist[i], CAP) / CAP;
          hgt[i] = t * t * (3 - 2 * t);
        }

        const LX = -0.55,
          LY = -0.7,
          LZ = 0.62;

        const ramp = RAMPS[tint] || RAMPS.neutral;
        const cdfT = CDFS[tint] || CDFS.neutral;

        // ---- pass 1: raw value + rim mask ----
        const vmap = new Float32Array(W * W);
        const rim = new Uint8Array(W * W);
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
            const gx = (hgt[iR] - hgt[iL]) * K.relief;
            const gy = (hgt[iD] - hgt[iU]) * K.relief;
            const inv = 1 / Math.sqrt(gx * gx + gy * gy + 1);
            const ndl = (-gx * LX - gy * LY + LZ) * inv;
            let v = K.base + 0.2 * Math.max(0, ndl);

            // broad watercolor washes carry the tone, like wet ink
            v *= 1 - K.wash / 2 + K.wash * fbm(x, y, 78, seed + 7);
            v *= 0.6 + 0.55 * detail[i];

            // wobbled ink contour
            if (K.contour > 0) {
              const cw = (1.6 + 2.2 * fbm(x, y, 17, seed + 43)) * K.contour;
              if (dist[i] < cw) v *= 0.16 + 0.5 * (dist[i] / cw);
            }

            // hatching in the shadow bands
            if (K.hatch > 0 && v < 0.46 && dist[i] > 1.5) {
              const ph = fbm(x, y, 31, seed + 57) * 6;
              const s = Math.sin((x + y) * 0.82 + ph);
              if (s > 0.25) v *= 1 - 0.28 * K.hatch;
            }

            // paint mottle + brush pull
            v *= 1 - K.mottle / 2 + K.mottle * fbm(x, y, 34, seed + 71);
            v *= 1 - K.brush / 2 + K.brush * fbm(x * 0.35, y, 13, seed + 83);

            // the LIGHT-side edge wears a pale rim (officials' white edge
            // highlights) — never the whole contour
            if (
              dist[i] > 0.8 &&
              dist[i] < 3 &&
              -gx * LX - gy * LY > 0.004
            )
              rim[i] = 1;

            vmap[i] = v;
            vhist[Math.max(0, Math.min(255, (v * 128) | 0))]++;
            vcount++;
          }

        const vcdf = new Float32Array(256);
        let runsum = 0;
        for (let b = 0; b < 256; b++) {
          runsum += vhist[b];
          vcdf[b] = vcount ? runsum / vcount : 0;
        }

        // ---- pass 2: histogram match -> pooled bands -> color + grain ----
        const out = g.createImageData(W, W);
        const od = out.data;
        for (let i = 0; i < W * W; i++) {
          if (!alpha[i]) continue;
          const x = i % W,
            y = (i / W) | 0;
          const p = vcdf[Math.max(0, Math.min(255, (vmap[i] * 128) | 0))];
          let tone = invCdf(cdfT, p);
          // AREA pixels stop short of white — only the rim may pass the
          // ceiling (their white is linework, never a wash)
          tone = Math.min(tone, K.top / 8);
          if (rim[i]) tone = Math.min(1, tone + K.rim * 0.55);
          const dith = (fbm(x, y, 11, seed + 113) - 0.5) * K.pool;
          const band = Math.max(0, Math.min(7.999, tone * 8 + dith));
          const b0 = band | 0,
            f = band - b0;
          const c0 = ramp[b0],
            c1 = ramp[Math.min(7, b0 + 1)];
          const amp = GRAIN_AMP[b0] * 1.8 * K.grain;
          const clump = (vnoise(x, y, 2, seed + 149) - 0.5) * 0.5;
          for (let c = 0; c < 3; c++) {
            const gN =
              hash2(x, y, seed + 131 + c * 17) +
              hash2(x + 911, y, seed + 173 + c * 17) -
              1;
            const base = c0[c] + (c1[c] - c0[c]) * f;
            od[i * 4 + c] = Math.max(
              0,
              Math.min(255, base + (0.8 * gN + clump) * amp)
            );
          }
          od[i * 4 + 3] = alpha[i];
        }
        g.putImageData(out, 0, 0);

        // ---- final size; shadow only if the dial asks (officials: none) ----
        const fin = document.createElement("canvas");
        fin.width = size;
        fin.height = size;
        const og = fin.getContext("2d");
        if (K.shadow > 0.01) {
          og.shadowColor = `rgba(0, 0, 0, ${0.6 * K.shadow})`;
          og.shadowBlur = (size / 16) * K.shadow;
          og.shadowOffsetY = (size / 36) * K.shadow;
        }
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
