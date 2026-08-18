// Golem fork (FT-856 slice A): restyle ANY uploaded image toward the official
// BOTC icon look — ink engraving over parchment with a soft baked shadow.
// The pipeline is the community's recipe made deterministic (Tre West's
// icon-generation notes: noise fill + tone mapping over flat art):
//   background knockout -> grayscale + contrast curve -> posterize ->
//   duotone (ink shadows / tint mids / parchment highlights) -> grain ->
//   baked soft drop shadow.
// Pure canvas, no dependencies; deterministic (seeded noise) so the same
// upload always yields the same icon.

const TINTS = {
  // mid-tone hue between the ink and the parchment
  neutral: [122, 106, 79], // sepia — scripts, unaligned art
  good: [74, 109, 156], // the steel blue of good role art
  evil: [138, 32, 32] // the dried red of evil role art
};

const INK = [24, 8, 8];
const PARCHMENT = [232, 220, 194];

function lerp3(a, b, t) {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t
  ];
}

/** Deterministic per-pixel noise in [-1, 1] (xorshift on the index). */
function noiseAt(i) {
  let x = (i + 1) * 2654435761;
  x ^= x << 13;
  x ^= x >> 17;
  x ^= x << 5;
  return ((x >>> 0) % 2000) / 1000 - 1;
}

/**
 * If the image has no alpha and a near-uniform border color, flood it away
 * from the edges (tolerance in RGB distance). Photos with busy edges are
 * left alone — posterize still carries them.
 */
function knockoutBackground(data, w, h) {
  let transparent = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] < 250) transparent++;
  if (transparent > data.length / 400) return; // already has real alpha

  // median-ish border color
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
  const uniform =
    border.filter(p => dist(p) < 40).length / border.length;
  if (uniform < 0.7) return; // busy edges — not a flat background

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

/**
 * srcDataUrl -> Promise<dataUrl of the stylized icon> (PNG, `size` px).
 * tint: "neutral" | "good" | "evil". seed shifts the grain field — a
 * re-roll keeps the art and re-prints the texture (0 = the classic bake).
 */
export function stylizeIcon(
  srcDataUrl,
  { tint = "neutral", size = 128, seed = 0 } = {}
) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const WORK = 192; // process resolution; filters fall apart tiny
        const work = document.createElement("canvas");
        work.width = WORK;
        work.height = WORK;
        const g = work.getContext("2d");
        const scale = Math.min(WORK / img.width, WORK / img.height);
        const w = img.width * scale,
          h = img.height * scale;
        g.drawImage(img, (WORK - w) / 2, (WORK - h) / 2, w, h);

        const id = g.getImageData(0, 0, WORK, WORK);
        const d = id.data;
        knockoutBackground(d, WORK, WORK);

        const mid = TINTS[tint] || TINTS.neutral;
        const BANDS = 5;
        for (let i = 0; i < d.length; i += 4) {
          if (d[i + 3] === 0) continue;
          // grayscale + a gentle S-curve for contrast
          let lum =
            (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255;
          lum = lum * lum * (3 - 2 * lum);
          // posterize into ink bands
          lum = Math.round(lum * (BANDS - 1)) / (BANDS - 1);
          // grain BEFORE the duotone so it prints as tone, not confetti
          lum = Math.min(
            1,
            Math.max(0, lum + noiseAt(i / 4 + seed * 7919) * 0.06)
          );
          // duotone: ink -> tint -> parchment
          const c =
            lum < 0.5
              ? lerp3(INK, mid, lum * 2)
              : lerp3(mid, PARCHMENT, (lum - 0.5) * 2);
          d[i] = c[0];
          d[i + 1] = c[1];
          d[i + 2] = c[2];
        }
        g.putImageData(id, 0, 0);

        // bake the soft shadow into the final size
        const out = document.createElement("canvas");
        out.width = size;
        out.height = size;
        const og = out.getContext("2d");
        og.shadowColor = "rgba(0, 0, 0, 0.55)";
        og.shadowBlur = size / 20;
        og.shadowOffsetY = size / 42;
        og.drawImage(work, size * 0.04, size * 0.02, size * 0.92, size * 0.92);
        resolve(out.toDataURL("image/png"));
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error("could not read the image"));
    img.src = srcDataUrl;
  });
}
