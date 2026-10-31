/*
 * Procedural wood textures.
 * One generator feeds the 3D models, the wood swatches and the wood guide, so every
 * place that shows "Teak" shows the same teak.
 */
window.Wood = (() => {
  // light/dark: earlywood and latewood colours. rings: growth rings across the board.
  // pow: how sharply a ring darkens. arch: cathedral figure. pores/spalt: surface character.
  const SPECIES = {
    acacia:   { light: [186, 122, 64],  dark: [88, 48, 21],    rings: 11, pow: 2.2, ring: 0.66, fiber: 0.24, pores: 0.1,  warp: 0.6,  arch: 0.7,  vary: 0.4,  rough: 0.52 },
    teak:     { light: [184, 124, 66],  dark: [112, 68, 30],   rings: 9,  pow: 2.8, ring: 0.52, fiber: 0.2,  pores: 0.14, warp: 0.45, arch: 0.55, vary: 0.32, rough: 0.48 },
    sheesham: { light: [156, 96, 58],   dark: [60, 31, 17],    rings: 13, pow: 2.1, ring: 0.68, fiber: 0.24, pores: 0.12, warp: 0.6,  arch: 0.4,  vary: 0.38, rough: 0.5 },
    walnut:   { light: [128, 89, 61],   dark: [50, 32, 21],    rings: 8,  pow: 2.6, ring: 0.55, fiber: 0.2,  pores: 0.12, warp: 0.45, arch: 0.55, vary: 0.3,  rough: 0.5 },
    mango:    { light: [208, 170, 118], dark: [136, 98, 60],   rings: 6,  pow: 3.2, ring: 0.4,  fiber: 0.16, pores: 0.05, warp: 0.5,  arch: 0.4,  vary: 0.44, spalt: 0.55, rough: 0.58 },
    neem:     { light: [206, 172, 124], dark: [146, 110, 70],  rings: 10, pow: 3.0, ring: 0.36, fiber: 0.18, pores: 0.04, warp: 0.3,  arch: 0.3,  vary: 0.28, rough: 0.58 },
    maple:    { light: [230, 202, 160], dark: [190, 150, 102], rings: 7,  pow: 3.0, ring: 0.34, fiber: 0.12, pores: 0,    warp: 0.3,  arch: 0.45, vary: 0.22, rough: 0.46 },
    bamboo:   { light: [226, 196, 134], dark: [168, 124, 66],  bamboo: true, vary: 0.42, rough: 0.42 }
  };

  // ---- value noise ----
  const P = new Uint8Array(512);
  const V = new Float32Array(256);
  let seedState = 20261031;
  const rnd = () => (seedState = (seedState * 16807) % 2147483647) / 2147483647;
  const perm = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  for (let i = 0; i < 512; i++) P[i] = perm[i & 255];
  for (let i = 0; i < 256; i++) V[i] = rnd();

  function noise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const X = xi & 255, Y = yi & 255;
    const a = V[P[P[X] + Y]], b = V[P[P[X + 1] + Y]];
    const c = V[P[P[X] + Y + 1]], d = V[P[P[X + 1] + Y + 1]];
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }

  function fbm(x, y, octaves) {
    let total = 0, amp = 0.5, norm = 0;
    for (let i = 0; i < octaves; i++) {
      total += amp * noise(x, y);
      norm += amp;
      x *= 2.03; y *= 2.03; amp *= 0.5;
    }
    return total / norm;
  }

  // ---- small LRU so big canvases don't pile up ----
  const cache = new Map();
  function remember(key, make) {
    if (cache.has(key)) {
      const hit = cache.get(key);
      cache.delete(key);
      cache.set(key, hit);
      return hit;
    }
    const value = make();
    cache.set(key, value);
    if (cache.size > 28) cache.delete(cache.keys().next().value);
    return value;
  }

  function blank(w, h) {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    return c;
  }

  // Grain runs along x by default; along "y" for turned (lathe) pieces.
  function paint(sp, w, h, along, seed) {
    const S = SPECIES[sp] || SPECIES.teak;
    const cv = blank(w, h);
    const ctx = cv.getContext("2d");
    const img = ctx.createImageData(w, h);
    const d = img.data;
    const cross = along === "y" ? w : h;
    const L = S.light, D = S.dark;
    const ox = seed * 17.31 + 3.7, oy = seed * 5.77 + 1.3;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const a = (along === "y" ? y : x) / cross; // along the grain
        const b = (along === "y" ? x : y) / cross; // across the grain
        let k;
        if (S.bamboo) {
          const fib = noise(a * 1.5 + oy, b * cross * 0.25);
          const fine = noise(a * 6 + ox, b * cross * 0.9);
          const col = fbm(a * 2 + oy, b * 3 + ox, 3);
          const mott = fbm(a * 5 + ox, b * 8 + oy, 2);
          k = 0.12 + (fib - 0.5) * 0.34 + (fine - 0.5) * 0.12 + (col - 0.5) * S.vary + (mott > 0.6 ? (mott - 0.6) * 1.7 : 0);
        } else {
          const wv = fbm(a * 0.55 + ox, b * 1.8 + oy, 3);
          const arch = S.arch * 0.16 * Math.sin(a * 0.9 + ox);
          let t = (b + arch * (1 - Math.abs(b - 0.5) * 2)) * S.rings + (wv - 0.5) * S.warp * 2.8;
          t -= Math.floor(t);
          const ring = Math.pow(t, S.pow);
          const fib = noise(a * 2.5 + oy, b * cross * 0.32);
          const fine = noise(a * 10 + ox, b * cross * 0.85);
          const col = fbm(a * 1.1 + oy, b * 1.7 + ox, 2);
          k = ring * S.ring + (fib - 0.5) * S.fiber + (fine - 0.5) * S.fiber * 0.6 + (col - 0.5) * S.vary;
          if (S.pores) {
            const pn = noise(a * 38 + ox, b * cross * 0.45);
            if (pn > 0.84) k += (pn - 0.84) * S.pores * 9;
          }
          if (S.spalt) {
            const sn = Math.abs(fbm(a * 1.6 + 3.1, b * 2.2 + 1.7, 2) - 0.5);
            if (sn < 0.012) k += ((0.012 - sn) / 0.012) * S.spalt;
          }
        }
        k = k < 0 ? 0 : k > 1 ? 1 : k;
        const i = (y * w + x) << 2;
        d[i] = L[0] + (D[0] - L[0]) * k;
        d[i + 1] = L[1] + (D[1] - L[1]) * k;
        d[i + 2] = L[2] + (D[2] - L[2]) * k;
        d[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return cv;
  }

  function canvas(sp, w, h, along = "x", seed = 1) {
    w = Math.round(w); h = Math.round(h);
    return remember(`c|${sp}|${w}x${h}|${along}|${seed}`, () => paint(sp, w, h, along, seed));
  }

  // Height map for bump: light, low-contrast grain so a routed groove reads as recessed.
  function bump(sp, w, h, along = "x", seed = 1) {
    w = Math.round(w); h = Math.round(h);
    return remember(`b|${sp}|${w}x${h}|${along}|${seed}`, () => {
      const src = canvas(sp, w, h, along, seed);
      const cv = blank(w, h);
      const ctx = cv.getContext("2d");
      const id = src.getContext("2d").getImageData(0, 0, w, h);
      const d = id.data;
      for (let i = 0; i < d.length; i += 4) {
        const l = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11;
        const v = 205 + (l - 128) * 0.25;
        d[i] = d[i + 1] = d[i + 2] = v;
      }
      ctx.putImageData(id, 0, 0);
      return cv;
    });
  }

  // Painted surfaces (toys) — flat colour with a faint brush texture.
  function solid(color, w, h) {
    w = Math.round(w); h = Math.round(h);
    return remember(`s|${color}|${w}x${h}`, () => {
      const cv = blank(w, h);
      const ctx = cv.getContext("2d");
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, w, h);
      const id = ctx.getImageData(0, 0, w, h);
      const d = id.data;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const n = (noise(x * 0.02, y * 0.6) - 0.5) * 14;
          const i = (y * w + x) << 2;
          d[i] += n; d[i + 1] += n; d[i + 2] += n;
        }
      }
      ctx.putImageData(id, 0, 0);
      return cv;
    });
  }

  const urls = new Map();
  function swatch(sp, size = 120) {
    const key = `${sp}|${size}`;
    if (!urls.has(key)) urls.set(key, canvas(sp, size, size, "x", 3).toDataURL("image/jpeg", 0.86));
    return urls.get(key);
  }

  function image(sp, w, h, seed = 2) {
    const key = `img|${sp}|${w}x${h}|${seed}`;
    if (!urls.has(key)) urls.set(key, canvas(sp, w, h, "x", seed).toDataURL("image/jpeg", 0.84));
    return urls.get(key);
  }

  return {
    species: SPECIES,
    canvas,
    bump,
    solid,
    swatch,
    image,
    roughness: sp => (SPECIES[sp] || SPECIES.teak).rough,
    isDark: sp => {
      const L = (SPECIES[sp] || SPECIES.teak).light;
      return L[0] * 0.3 + L[1] * 0.59 + L[2] * 0.11 < 120;
    }
  };
})();
